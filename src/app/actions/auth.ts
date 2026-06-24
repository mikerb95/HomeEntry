"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { residents } from "@/db/schema";
import {
  getConjuntoBySlug,
  getResident,
  getResidentByPhone,
  getStaff,
} from "@/db/queries";
import { hashSecret, verifySecret } from "@/lib/password";
import { encryptPII, piiHash } from "@/lib/crypto";
import {
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "@/lib/auth";
import { digits } from "@/lib/format";
import { isLocked, recordFailure, recordSuccess } from "@/lib/throttle";
import {
  makeOtpCode,
  hashOtpCode,
  signOtpToken,
  verifyOtpToken,
} from "@/lib/otp";
import { sendWhatsApp } from "@/lib/whatsapp";
import { createHash, timingSafeEqual } from "crypto";

type Result = { ok: boolean; error?: string };

const LOCKED_MSG = "Demasiados intentos. Intenta de nuevo en unos minutos.";

// Constant-time string compare (length-independent: both sides are hashed to a
// fixed width first, so neither value nor its length leaks via timing).
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// PIN brute-force protection.
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function normalizeUser(u: string): string {
  return (u || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export async function residentLogin(
  slug: string,
  phoneRaw: string,
  pin: string,
): Promise<Result> {
  const conjunto = await getConjuntoBySlug(slug);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const phone = digits(phoneRaw);
  const resident = await getResidentByPhone(conjunto.id, phone);
  if (!resident) {
    return {
      ok: false,
      error: "No encontramos ese número. ¿Primera vez? Regístrate.",
    };
  }

  if (resident.lockedUntil && resident.lockedUntil > new Date()) {
    return {
      ok: false,
      error: "Demasiados intentos. Intenta de nuevo en unos minutos.",
    };
  }

  if (!verifySecret(pin, resident.pinHash)) {
    const failed = resident.failedPins + 1;
    const lockedUntil =
      failed >= MAX_FAILED
        ? new Date(Date.now() + LOCK_MINUTES * 60000)
        : null;
    await db
      .update(residents)
      .set({ failedPins: failed, lockedUntil })
      .where(
        and(
          eq(residents.conjuntoId, conjunto.id),
          eq(residents.aptoKey, resident.aptoKey),
        ),
      );
    return {
      ok: false,
      error: lockedUntil
        ? "PIN incorrecto. Cuenta bloqueada temporalmente."
        : "PIN incorrecto.",
    };
  }

  // Success — clear any failed-attempt state.
  if (resident.failedPins !== 0 || resident.lockedUntil) {
    await db
      .update(residents)
      .set({ failedPins: 0, lockedUntil: null })
      .where(
        and(
          eq(residents.conjuntoId, conjunto.id),
          eq(residents.aptoKey, resident.aptoKey),
        ),
      );
  }

  await setSessionCookie({
    role: "resident",
    conjuntoId: conjunto.id,
    conjuntoSlug: conjunto.slug,
    aptoKey: resident.aptoKey,
    tower: resident.tower,
    apt: resident.apt,
    v: resident.sessionVersion,
  });
  redirect(`/${slug}/residente`);
}

// Step 1 of registration: validate, enforce the create-only ownership rule,
// and send a one-time code to the WhatsApp number. Nothing is written to the DB
// here — the pending registration lives in a short-lived signed token so we can
// only persist it once the code (delivered to the phone) is verified. This is
// what proves the caller owns the number and closes the takeover path (S-1/S-5).
export async function requestRegisterOtp(
  slug: string,
  towerId: string,
  aptId: string,
  phoneRaw: string,
  pin: string,
): Promise<{ ok: boolean; token?: string; devCode?: string; error?: string }> {
  const conjunto = await getConjuntoBySlug(slug);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const phone = digits(phoneRaw);
  if (!towerId || !aptId)
    return { ok: false, error: "Selecciona torre y apartamento" };
  if (phone.length < 10)
    return { ok: false, error: "Ingresa un celular válido (10 dígitos)" };
  if (digits(pin).length < 4)
    return { ok: false, error: "Crea un PIN de 4 dígitos" };

  const aptoKey = `${towerId}-${aptId}`;

  // An existing apartment can only be re-registered by its own authenticated
  // resident; an anonymous caller picking someone else's tower/apt is refused.
  const existing = await getResident(conjunto.id, aptoKey);
  if (existing) {
    const s = await getSession();
    const isOwner =
      s?.role === "resident" &&
      s.conjuntoId === conjunto.id &&
      s.aptoKey === aptoKey;
    if (!isOwner) {
      return {
        ok: false,
        error:
          "Este apartamento ya está registrado. Inicia sesión para actualizar tus datos.",
      };
    }
  }

  const code = makeOtpCode();
  const token = await signOtpToken({
    purpose: "register-otp",
    conjuntoId: conjunto.id,
    slug: conjunto.slug,
    aptoKey,
    tower: towerId,
    apt: aptId,
    phoneEnc: encryptPII(phone),
    phoneHash: piiHash(phone),
    pinHash: hashSecret(digits(pin)),
    codeHash: hashOtpCode(code),
  });

  const send = await sendWhatsApp(
    phone,
    `Tu código de verificación para ${conjunto.name} es ${code}. Vence en 10 minutos.`,
  );

  // Without Meta WhatsApp credentials a code cannot actually be delivered, so in
  // non-production we surface it to keep the flow testable (mirrors the demo
  // affordances). In production this requires WHATSAPP_TOKEN/WHATSAPP_PHONE_ID.
  const devCode =
    process.env.NODE_ENV !== "production" && !send.delivered ? code : undefined;
  return { ok: true, token, devCode };
}

// Step 2: verify the code against the signed token and only then persist the
// resident (insert, or update for the authenticated owner).
export async function verifyRegisterOtp(
  token: string,
  code: string,
): Promise<Result> {
  const claims = await verifyOtpToken(token);
  if (!claims)
    return { ok: false, error: "El código expiró. Solicítalo de nuevo." };

  const throttleKey = `otp:${claims.conjuntoId}:${claims.aptoKey}`;
  if (isLocked(throttleKey)) return { ok: false, error: LOCKED_MSG };

  if (!safeEqual(hashOtpCode(digits(code)), claims.codeHash)) {
    const locked = recordFailure(throttleKey);
    return { ok: false, error: locked ? LOCKED_MSG : "Código incorrecto." };
  }
  recordSuccess(throttleKey);

  const fields = {
    phoneEnc: claims.phoneEnc,
    phoneHash: claims.phoneHash,
    pinHash: claims.pinHash,
    tower: claims.tower,
    apt: claims.apt,
  };
  const existing = await getResident(claims.conjuntoId, claims.aptoKey);
  if (existing) {
    await db
      .update(residents)
      .set(fields)
      .where(
        and(
          eq(residents.conjuntoId, claims.conjuntoId),
          eq(residents.aptoKey, claims.aptoKey),
        ),
      );
  } else {
    await db.insert(residents).values({
      conjuntoId: claims.conjuntoId,
      aptoKey: claims.aptoKey,
      ...fields,
    });
  }
  return { ok: true };
}

export async function guardLogin(
  slug: string,
  user: string,
  pass: string,
): Promise<Result> {
  const conjunto = await getConjuntoBySlug(slug);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const username = normalizeUser(user);
  const throttleKey = `staff:${conjunto.id}:guard:${username}`;
  if (isLocked(throttleKey)) return { ok: false, error: LOCKED_MSG };

  const u = await getStaff(conjunto.id, username);
  if (!u || u.role !== "guard" || !verifySecret(pass, u.passwordHash)) {
    const locked = recordFailure(throttleKey);
    return { ok: false, error: locked ? LOCKED_MSG : "Usuario o clave incorrectos." };
  }
  recordSuccess(throttleKey);
  await setSessionCookie({
    role: "guard",
    conjuntoId: conjunto.id,
    conjuntoSlug: conjunto.slug,
    username: u.username,
    v: u.sessionVersion,
  });
  redirect(`/${slug}/porteria`);
}

export async function adminLogin(
  slug: string,
  user: string,
  pass: string,
): Promise<Result> {
  const conjunto = await getConjuntoBySlug(slug);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const username = normalizeUser(user);
  const throttleKey = `staff:${conjunto.id}:admin:${username}`;
  if (isLocked(throttleKey)) return { ok: false, error: LOCKED_MSG };

  const u = await getStaff(conjunto.id, username);
  if (!u || u.role !== "admin" || !verifySecret(pass, u.passwordHash)) {
    const locked = recordFailure(throttleKey);
    return { ok: false, error: locked ? LOCKED_MSG : "Usuario o contraseña incorrectos." };
  }
  recordSuccess(throttleKey);
  await setSessionCookie({
    role: "admin",
    conjuntoId: conjunto.id,
    conjuntoSlug: conjunto.slug,
    username: u.username,
    v: u.sessionVersion,
  });
  redirect(`/${slug}/admin`);
}

export async function superadminLogin(
  user: string,
  pass: string,
): Promise<Result> {
  const envUser = process.env.SUPERADMIN_USER;
  const envPass = process.env.SUPERADMIN_PASS;
  if (!envUser || !envPass) {
    return {
      ok: false,
      error: "Superadmin no configurado (SUPERADMIN_USER/PASS).",
    };
  }
  if (process.env.NODE_ENV === "production" && envPass === "change-me") {
    return {
      ok: false,
      error: "Superadmin sin configurar: cambia SUPERADMIN_PASS.",
    };
  }

  const throttleKey = `superadmin:${normalizeUser(user)}`;
  if (isLocked(throttleKey)) return { ok: false, error: LOCKED_MSG };

  const okUser = safeEqual(normalizeUser(user), normalizeUser(envUser));
  const okPass = safeEqual(pass, envPass);
  if (!okUser || !okPass) {
    const locked = recordFailure(throttleKey);
    return { ok: false, error: locked ? LOCKED_MSG : "Credenciales incorrectas." };
  }
  recordSuccess(throttleKey);
  await setSessionCookie({ role: "superadmin", username: normalizeUser(envUser) });
  redirect("/superadmin");
}

export async function logout(): Promise<void> {
  const s = await getSession();
  await clearSessionCookie();
  if (s && s.role === "superadmin") redirect("/superadmin/login");
  if (s && "conjuntoSlug" in s) redirect(`/${s.conjuntoSlug}`);
  redirect("/");
}

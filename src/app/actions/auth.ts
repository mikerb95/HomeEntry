"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { owners, residents } from "@/db/schema";
import {
  getConjuntoBySlug,
  getOwnerByPhone,
  getResident,
  getResidentByPhone,
  getStaff,
  listResidentAccountsByPhone,
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

  // PIN is correct — but a registration still awaiting approval cannot enter.
  // Checked only after the PIN so the account's existence/state isn't revealed
  // to someone who doesn't already hold the credentials.
  if (resident.status === "pending") {
    return {
      ok: false,
      error:
        "Tu registro está pendiente de aprobación por la portería o la administración.",
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

// One entry a resident can log into, offered when the same phone is
// registered in more than one conjunto (or apartment).
export type ResidentAccountChoice = {
  slug: string;
  conjuntoName: string;
  aptoKey: string;
  tower: string;
  apt: string;
};

export type UnifiedLoginResult = Result & {
  choices?: ResidentAccountChoice[];
};

// Unified resident login: the phone alone determines the conjunto, so nobody
// types a conjunto code. If the phone+PIN matches accounts in more than one
// conjunto (or apartment), the caller gets `choices` back and retries with the
// chosen one via `pick`. Choices are revealed only after the PIN verifies, so
// probing a phone number without its PIN learns nothing about where it lives.
export async function unifiedResidentLogin(
  phoneRaw: string,
  pin: string,
  pick?: { slug: string; aptoKey: string },
): Promise<UnifiedLoginResult> {
  const phone = digits(phoneRaw);
  if (phone.length < 10)
    return { ok: false, error: "Ingresa un celular válido (10 dígitos)" };

  const accounts = await listResidentAccountsByPhone(phone);
  const candidates = pick
    ? accounts.filter(
        (a) => a.conjuntoSlug === pick.slug && a.aptoKey === pick.aptoKey,
      )
    : accounts;
  if (candidates.length === 0) {
    return {
      ok: false,
      error: "No encontramos ese número. ¿Primera vez? Regístrate.",
    };
  }

  const now = new Date();
  const open = candidates.filter(
    (a) => !(a.lockedUntil && a.lockedUntil > now),
  );
  if (open.length === 0) return { ok: false, error: LOCKED_MSG };

  const matches = open.filter((a) => verifySecret(pin, a.pinHash));
  if (matches.length === 0) {
    // Same per-account brute-force accounting as the per-conjunto login.
    let anyLocked = false;
    for (const a of open) {
      const failed = a.failedPins + 1;
      const lockedUntil =
        failed >= MAX_FAILED
          ? new Date(Date.now() + LOCK_MINUTES * 60000)
          : null;
      if (lockedUntil) anyLocked = true;
      await db
        .update(residents)
        .set({ failedPins: failed, lockedUntil })
        .where(
          and(
            eq(residents.conjuntoId, a.conjuntoId),
            eq(residents.aptoKey, a.aptoKey),
          ),
        );
    }
    return {
      ok: false,
      error: anyLocked
        ? "PIN incorrecto. Cuenta bloqueada temporalmente."
        : "PIN incorrecto.",
    };
  }

  // PIN is correct — pending registrations still cannot enter. Checked after
  // the PIN so the account's state isn't revealed without the credentials.
  const active = matches.filter((a) => a.status === "active");
  if (active.length === 0) {
    return {
      ok: false,
      error:
        "Tu registro está pendiente de aprobación por la portería o la administración.",
    };
  }

  if (active.length > 1) {
    return {
      ok: true,
      choices: active.map((a) => ({
        slug: a.conjuntoSlug,
        conjuntoName: a.conjuntoName,
        aptoKey: a.aptoKey,
        tower: a.tower,
        apt: a.apt,
      })),
    };
  }

  const account = active[0];
  if (account.failedPins !== 0 || account.lockedUntil) {
    await db
      .update(residents)
      .set({ failedPins: 0, lockedUntil: null })
      .where(
        and(
          eq(residents.conjuntoId, account.conjuntoId),
          eq(residents.aptoKey, account.aptoKey),
        ),
      );
  }

  await setSessionCookie({
    role: "resident",
    conjuntoId: account.conjuntoId,
    conjuntoSlug: account.conjuntoSlug,
    aptoKey: account.aptoKey,
    tower: account.tower,
    apt: account.apt,
    v: account.sessionVersion,
  });
  redirect(`/${account.conjuntoSlug}/residente`);
}

// Registration: validate, enforce the create-only ownership rule, and persist
// the resident directly. Phone-ownership verification (the old WhatsApp OTP
// step) was removed because the deployment has no WhatsApp Cloud API to deliver
// a code with. Takeover of an *existing* apartment is still blocked: it can only
// be re-registered by its own authenticated resident (the `existing`/`isOwner`
// check below); an anonymous caller can only claim an apartment nobody holds.
export async function registerResident(
  slug: string,
  towerId: string,
  aptId: string,
  phoneRaw: string,
  pin: string,
): Promise<Result & { pending?: boolean }> {
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

  const fields = {
    phoneEnc: encryptPII(phone),
    phoneHash: piiHash(phone),
    pinHash: hashSecret(digits(pin)),
    tower: towerId,
    apt: aptId,
  };
  if (existing) {
    // An update only reaches here for the authenticated owner (checked above),
    // so it stays active — no re-approval needed. `status` is left untouched.
    await db
      .update(residents)
      .set(fields)
      .where(
        and(
          eq(residents.conjuntoId, conjunto.id),
          eq(residents.aptoKey, aptoKey),
        ),
      );
    return { ok: true, pending: false };
  }

  // A brand-new self-registration must be approved by staff before it can log
  // in — this is the identity check that replaces the WhatsApp OTP.
  await db.insert(residents).values({
    conjuntoId: conjunto.id,
    aptoKey,
    ...fields,
    status: "pending",
  });
  return { ok: true, pending: true };
}

export async function ownerLogin(
  phoneRaw: string,
  pin: string,
): Promise<Result> {
  const phone = digits(phoneRaw);
  const owner = await getOwnerByPhone(phone);
  if (!owner) {
    return { ok: false, error: "No encontramos ese número." };
  }

  if (owner.lockedUntil && owner.lockedUntil > new Date()) {
    return {
      ok: false,
      error: "Demasiados intentos. Intenta de nuevo en unos minutos.",
    };
  }

  if (!verifySecret(pin, owner.pinHash)) {
    const failed = owner.failedPins + 1;
    const lockedUntil =
      failed >= MAX_FAILED
        ? new Date(Date.now() + LOCK_MINUTES * 60000)
        : null;
    await db
      .update(owners)
      .set({ failedPins: failed, lockedUntil })
      .where(eq(owners.id, owner.id));
    return {
      ok: false,
      error: lockedUntil
        ? "PIN incorrecto. Cuenta bloqueada temporalmente."
        : "PIN incorrecto.",
    };
  }

  if (owner.failedPins !== 0 || owner.lockedUntil) {
    await db
      .update(owners)
      .set({ failedPins: 0, lockedUntil: null })
      .where(eq(owners.id, owner.id));
  }

  await setSessionCookie({
    role: "owner",
    ownerId: owner.id,
    v: owner.sessionVersion,
  });
  redirect("/propietario");
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
  if (s && s.role === "owner") redirect("/propietario/login");
  if (s && "conjuntoSlug" in s) redirect(`/${s.conjuntoSlug}`);
  redirect("/");
}

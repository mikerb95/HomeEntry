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

type Result = { ok: boolean; error?: string };

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

export async function residentRegister(
  slug: string,
  towerId: string,
  aptId: string,
  phoneRaw: string,
  pin: string,
): Promise<Result> {
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
  const pinHash = hashSecret(digits(pin));

  // Account-takeover guard: registration is *create-only*. An existing
  // apartment can only be updated by its own authenticated resident — never by
  // an anonymous caller selecting someone else's tower/apt. (See auditoria1.MD
  // S-1; full ownership proof should move to a WhatsApp OTP flow.)
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
    await db
      .update(residents)
      .set({
        phoneEnc: encryptPII(phone),
        phoneHash: piiHash(phone),
        pinHash,
        tower: towerId,
        apt: aptId,
      })
      .where(
        and(
          eq(residents.conjuntoId, conjunto.id),
          eq(residents.aptoKey, aptoKey),
        ),
      );
    return { ok: true };
  }

  await db.insert(residents).values({
    conjuntoId: conjunto.id,
    aptoKey,
    tower: towerId,
    apt: aptId,
    phoneEnc: encryptPII(phone),
    phoneHash: piiHash(phone),
    pinHash,
  });
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
  const u = await getStaff(conjunto.id, username);
  if (!u || u.role !== "guard" || !verifySecret(pass, u.passwordHash)) {
    return { ok: false, error: "Usuario o clave incorrectos." };
  }
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
  const u = await getStaff(conjunto.id, username);
  if (!u || u.role !== "admin" || !verifySecret(pass, u.passwordHash)) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }
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
  if (normalizeUser(user) !== normalizeUser(envUser) || pass !== envPass) {
    return { ok: false, error: "Credenciales incorrectas." };
  }
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

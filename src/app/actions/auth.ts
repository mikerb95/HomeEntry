"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { residents, staffUsers } from "@/db/schema";
import { getResidentByPhone } from "@/db/queries";
import { hashSecret, verifySecret } from "@/lib/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { digits } from "@/lib/format";

type Result = { ok: boolean; error?: string };

function normalizeUser(u: string): string {
  return (u || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export async function residentLogin(
  phoneRaw: string,
  pin: string,
): Promise<Result> {
  const phone = digits(phoneRaw);
  const resident = await getResidentByPhone(phone);
  if (!resident) {
    return {
      ok: false,
      error: "No encontramos ese número. ¿Primera vez? Regístrate.",
    };
  }
  if (!verifySecret(pin, resident.pinHash)) {
    return { ok: false, error: "PIN incorrecto. (demo: 1234)" };
  }
  await setSessionCookie({
    role: "resident",
    aptoKey: resident.aptoKey,
    tower: resident.tower,
    apt: resident.apt,
    phone: resident.phone,
  });
  redirect("/residente");
}

export async function residentRegister(
  towerId: string,
  aptId: string,
  phoneRaw: string,
  pin: string,
): Promise<Result> {
  const phone = digits(phoneRaw);
  if (!towerId || !aptId)
    return { ok: false, error: "Selecciona torre y apartamento" };
  if (phone.length < 10)
    return { ok: false, error: "Ingresa un celular válido (10 dígitos)" };
  if (digits(pin).length < 4)
    return { ok: false, error: "Crea un PIN de 4 dígitos" };

  const aptoKey = `${towerId}-${aptId}`;
  const pinHash = hashSecret(digits(pin));
  await db
    .insert(residents)
    .values({ aptoKey, tower: towerId, apt: aptId, phone, pinHash })
    .onConflictDoUpdate({
      target: residents.aptoKey,
      set: { phone, pinHash, tower: towerId, apt: aptId },
    });
  return { ok: true };
}

export async function guardLogin(
  user: string,
  pass: string,
): Promise<Result> {
  const username = normalizeUser(user);
  const rows = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.username, username))
    .limit(1);
  const u = rows[0];
  if (!u || u.role !== "guard" || !verifySecret(pass, u.passwordHash)) {
    return {
      ok: false,
      error: "Usuario o clave incorrectos. (demo: portería / 1234)",
    };
  }
  await setSessionCookie({ role: "guard", username: u.username });
  redirect("/porteria");
}

export async function adminLogin(
  user: string,
  pass: string,
): Promise<Result> {
  const username = normalizeUser(user);
  const rows = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.username, username))
    .limit(1);
  const u = rows[0];
  if (!u || u.role !== "admin" || !verifySecret(pass, u.passwordHash)) {
    return {
      ok: false,
      error: "Usuario o contraseña incorrectos. (demo: admin / admin)",
    };
  }
  await setSessionCookie({ role: "admin", username: u.username });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

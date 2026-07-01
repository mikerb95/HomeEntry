"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { staffUsers } from "@/db/schema";
import { getStaff, listGuards, logAccess } from "@/db/queries";
import { requireAdmin } from "@/lib/auth";
import { hashSecret } from "@/lib/password";

type Result = { ok: boolean; error?: string };

function normalizeUser(u: string): string {
  return (u || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export async function createGuard(
  slug: string,
  input: { username: string; password: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const username = normalizeUser(input.username);
  if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { ok: false, error: "Usuario inválido (3-32 caracteres)" };
  }
  if (!input.password || input.password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
  }
  const existing = await getStaff(cid, username);
  if (existing) return { ok: false, error: "Ese usuario ya existe" };

  await db.insert(staffUsers).values({
    conjuntoId: cid,
    username,
    passwordHash: hashSecret(input.password),
    role: "guard",
  });
  await logAccess(cid, `admin:${session.username}`, "create_guard", username);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function resetGuardPassword(
  slug: string,
  input: { username: string; password: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const username = normalizeUser(input.username);
  if (!input.password || input.password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
  }
  const existing = await getStaff(cid, username);
  if (!existing || existing.role !== "guard") {
    return { ok: false, error: "Vigilante no encontrado" };
  }
  await db
    .update(staffUsers)
    .set({
      passwordHash: hashSecret(input.password),
      sessionVersion: existing.sessionVersion + 1,
    })
    .where(
      and(eq(staffUsers.conjuntoId, cid), eq(staffUsers.username, username)),
    );
  await logAccess(cid, `admin:${session.username}`, "reset_guard_password", username);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function deleteGuard(slug: string, username: string): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const normalized = normalizeUser(username);
  const guards = await listGuards(cid);
  if (guards.length <= 1) {
    return { ok: false, error: "Debe existir al menos un vigilante" };
  }
  await db
    .delete(staffUsers)
    .where(
      and(
        eq(staffUsers.conjuntoId, cid),
        eq(staffUsers.username, normalized),
        eq(staffUsers.role, "guard"),
      ),
    );
  await logAccess(cid, `admin:${session.username}`, "delete_guard", normalized);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

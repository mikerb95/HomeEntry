"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { clampText } from "@/lib/format";

type Result = { ok: boolean; error?: string };

const CATEGORIES = ["general", "mantenimiento", "seguridad", "evento", "pago"];

function clampCategory(v: unknown): string {
  const s = String(v ?? "");
  return CATEGORIES.includes(s) ? s : "general";
}

// The board is conjunto-wide and residents read it on their dashboard and in
// /residente/cartelera, so every mutation revalidates both sides.
function revalidateBoard(slug: string) {
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/residente`);
  revalidatePath(`/${slug}/residente/cartelera`);
}

export async function createAnnouncement(
  slug: string,
  input: { category: string; title: string; body: string; pinned: boolean },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const title = clampText(input.title, 120);
  if (!title) return { ok: false, error: "Ingresa el título del comunicado" };
  const body = clampText(input.body, 2000);
  if (!body) return { ok: false, error: "Escribe el contenido del comunicado" };

  await db.insert(announcements).values({
    conjuntoId: session.conjuntoId,
    category: clampCategory(input.category),
    title,
    body,
    pinned: input.pinned ? 1 : 0,
    // Residents see this byline on the board, so it stays the institutional
    // name rather than the admin's username.
    createdBy: "Administración",
  });

  revalidateBoard(slug);
  return { ok: true };
}

export async function setAnnouncementPinned(
  slug: string,
  id: string,
  pinned: boolean,
): Promise<Result> {
  const session = await requireAdmin(slug);
  await db
    .update(announcements)
    .set({ pinned: pinned ? 1 : 0 })
    .where(
      and(
        eq(announcements.conjuntoId, session.conjuntoId),
        eq(announcements.id, id),
      ),
    );
  revalidateBoard(slug);
  return { ok: true };
}

export async function deleteAnnouncement(
  slug: string,
  id: string,
): Promise<Result> {
  const session = await requireAdmin(slug);
  await db
    .delete(announcements)
    .where(
      and(
        eq(announcements.conjuntoId, session.conjuntoId),
        eq(announcements.id, id),
      ),
    );
  revalidateBoard(slug);
  return { ok: true };
}

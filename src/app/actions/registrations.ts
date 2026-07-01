"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { residents } from "@/db/schema";
import { logAccess } from "@/db/queries";
import { requireStaff } from "@/lib/auth";

type Result = { ok: boolean; error?: string };

// Both actions are usable by either staff role (portería or administración) and
// only ever touch a *pending* row, so an approve/reject can never disturb an
// already-active resident. After mutating we revalidate both panels so the
// pending list stays in sync whichever role is looking.

export async function approveResident(
  slug: string,
  aptoKey: string,
): Promise<Result> {
  const session = await requireStaff(slug);
  const cid = session.conjuntoId;

  const updated = await db
    .update(residents)
    .set({ status: "active" })
    .where(
      and(
        eq(residents.conjuntoId, cid),
        eq(residents.aptoKey, aptoKey),
        eq(residents.status, "pending"),
      ),
    )
    .returning({ aptoKey: residents.aptoKey });

  if (updated.length === 0)
    return { ok: false, error: "La solicitud ya no está pendiente." };

  await logAccess(
    cid,
    `${session.role}:${session.username}`,
    "approve_registration",
    aptoKey,
  );
  revalidatePath(`/${slug}/porteria`);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function rejectResident(
  slug: string,
  aptoKey: string,
): Promise<Result> {
  const session = await requireStaff(slug);
  const cid = session.conjuntoId;

  // Delete rather than flag: it frees the apartment so the real resident can
  // register again. Guarded by status='pending' so an active account is safe.
  const deleted = await db
    .delete(residents)
    .where(
      and(
        eq(residents.conjuntoId, cid),
        eq(residents.aptoKey, aptoKey),
        eq(residents.status, "pending"),
      ),
    )
    .returning({ aptoKey: residents.aptoKey });

  if (deleted.length === 0)
    return { ok: false, error: "La solicitud ya no está pendiente." };

  await logAccess(
    cid,
    `${session.role}:${session.username}`,
    "reject_registration",
    aptoKey,
  );
  revalidatePath(`/${slug}/porteria`);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

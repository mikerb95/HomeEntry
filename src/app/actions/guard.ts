"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { authGrants, events } from "@/db/schema";
import { getConjuntoById, getResident, logAccess } from "@/db/queries";
import { requireGuard } from "@/lib/auth";
import { AlertType, buildMessage, sendWhatsApp } from "@/lib/whatsapp";

type PrepareResult =
  | { ok: true; phone: string; text: string; apto: string }
  | { ok: false; error: string };

// Build the preview (does not send or log the event). Mirrors the design's
// preview step. Reading the resident's phone here is recorded in the audit log.
export async function prepareAlert(
  slug: string,
  input: {
    type: AlertType;
    tower: string;
    apto: string;
    note?: string;
  },
): Promise<PrepareResult> {
  const session = await requireGuard(slug);
  const cid = session.conjuntoId;
  if (!input.tower || !input.apto)
    return { ok: false, error: "Selecciona torre y apartamento" };

  const key = `${input.tower}-${input.apto}`;
  const resident = await getResident(cid, key);
  if (!resident)
    return { ok: false, error: "Ese apartamento no tiene WhatsApp registrado" };

  await logAccess(cid, `guard:${session.username}`, "view_phone", key);

  const cfg = await getConjuntoById(cid);
  const place = `${input.tower} - Apto ${input.apto}`;
  const text = buildMessage(input.type, cfg?.name ?? "Conjunto", place, input.note);
  return { ok: true, phone: resident.phone, text, apto: key };
}

type SendResultOut =
  | { ok: true; delivered: boolean; link?: string }
  | { ok: false; error: string };

export async function confirmAlert(
  slug: string,
  input: {
    type: AlertType;
    tower: string;
    apto: string;
    note?: string;
  },
): Promise<SendResultOut> {
  const session = await requireGuard(slug);
  const cid = session.conjuntoId;
  const prep = await prepareAlert(slug, input);
  if (!prep.ok) return prep;

  const result = await sendWhatsApp(prep.phone, prep.text);

  const labels: Record<AlertType, string> = {
    visita: "Alerta de visita",
    encomienda: "Aviso de paquete",
    mensaje: "Mensaje de administración",
  };
  await db.insert(events).values({
    conjuntoId: cid,
    type: input.type,
    tower: input.tower,
    apto: input.apto,
    detail: `${labels[input.type]} enviado por WhatsApp`,
  });
  revalidatePath(`/${slug}/porteria`);
  revalidatePath(`/${slug}/admin`);

  return result.delivered
    ? { ok: true, delivered: true }
    : { ok: true, delivered: false, link: result.link };
}

// Confirm a scanned/selected authorization: mark used + log entry.
export async function confirmScan(
  slug: string,
  authId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireGuard(slug);
  const cid = session.conjuntoId;
  const rows = await db
    .select()
    .from(authGrants)
    .where(and(eq(authGrants.conjuntoId, cid), eq(authGrants.id, authId)))
    .limit(1);
  const a = rows[0];
  if (!a) return { ok: false, error: "Autorización no encontrada" };
  if (a.status !== "vigente")
    return { ok: false, error: "La autorización no está vigente" };

  await db
    .update(authGrants)
    .set({ status: "usado" })
    .where(and(eq(authGrants.conjuntoId, cid), eq(authGrants.id, authId)));
  await db.insert(events).values({
    conjuntoId: cid,
    type: "visita",
    tower: a.tower,
    apto: a.apt,
    detail: `Ingreso autorizado — ${a.visitor}${a.plate ? ` (${a.plate})` : ""}`,
  });
  revalidatePath(`/${slug}/porteria`);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

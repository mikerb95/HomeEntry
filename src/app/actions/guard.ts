"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { authGrants, events } from "@/db/schema";
import { getConjuntoById, getResident, logAccess } from "@/db/queries";
import { requireGuard } from "@/lib/auth";
import { clampText } from "@/lib/format";
import { isGrantExpired } from "@/lib/code";
import { AlertType, buildMessage, sendWhatsApp } from "@/lib/whatsapp";

type AlertInput = {
  type: AlertType;
  tower: string;
  apto: string;
  note?: string;
};

type PrepareResult =
  | { ok: true; phone: string; text: string; apto: string }
  | { ok: false; error: string };

// Resolve the resident's phone + build the WhatsApp text. Pure: no audit log,
// no event row — callers decide what to record so we never double-log.
async function resolveAlert(
  cid: string,
  input: AlertInput,
): Promise<PrepareResult> {
  if (!input.tower || !input.apto)
    return { ok: false, error: "Selecciona torre y apartamento" };

  const key = `${input.tower}-${input.apto}`;
  const resident = await getResident(cid, key);
  if (!resident)
    return { ok: false, error: "Ese apartamento no tiene WhatsApp registrado" };

  const cfg = await getConjuntoById(cid);
  const place = `${input.tower} - Apto ${input.apto}`;
  const note = clampText(input.note, 280);
  const text = buildMessage(input.type, cfg?.name ?? "Conjunto", place, note);
  return { ok: true, phone: resident.phone, text, apto: key };
}

// Build the preview. Showing the number to the guard is the access we audit
// (view_phone). The send itself is audited separately in confirmAlert, so a
// preview-then-confirm flow no longer logs view_phone twice (auditoria1.MD S-6).
export async function prepareAlert(
  slug: string,
  input: AlertInput,
): Promise<PrepareResult> {
  const session = await requireGuard(slug);
  const cid = session.conjuntoId;
  const prep = await resolveAlert(cid, input);
  if (prep.ok) {
    await logAccess(cid, `guard:${session.username}`, "view_phone", prep.apto);
  }
  return prep;
}

type SendResultOut =
  | { ok: true; delivered: boolean; link?: string }
  | { ok: false; error: string };

export async function confirmAlert(
  slug: string,
  input: AlertInput,
): Promise<SendResultOut> {
  const session = await requireGuard(slug);
  const cid = session.conjuntoId;
  const prep = await resolveAlert(cid, input);
  if (!prep.ok) return prep;

  await logAccess(cid, `guard:${session.username}`, "send_alert", prep.apto);
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

  // Expired grants are no longer valid: mark them so and refuse entry (S-8).
  if (isGrantExpired(a.whenTs)) {
    await db
      .update(authGrants)
      .set({ status: "vencido" })
      .where(and(eq(authGrants.conjuntoId, cid), eq(authGrants.id, authId)));
    revalidatePath(`/${slug}/porteria`);
    revalidatePath(`/${slug}/admin`);
    return { ok: false, error: "La autorización está vencida" };
  }

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

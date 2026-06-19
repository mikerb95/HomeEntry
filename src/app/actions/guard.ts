"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { authGrants, events } from "@/db/schema";
import { getConfig, getResident } from "@/db/queries";
import { requireGuard } from "@/lib/auth";
import {
  AlertType,
  buildMessage,
  sendWhatsApp,
} from "@/lib/whatsapp";

type PrepareResult =
  | { ok: true; phone: string; text: string; apto: string }
  | { ok: false; error: string };

// Build the preview (does not send or log). Mirrors the design's preview step.
export async function prepareAlert(input: {
  type: AlertType;
  tower: string;
  apto: string;
  note?: string;
}): Promise<PrepareResult> {
  await requireGuard();
  if (!input.tower || !input.apto)
    return { ok: false, error: "Selecciona torre y apartamento" };

  const key = `${input.tower}-${input.apto}`;
  const resident = await getResident(key);
  if (!resident)
    return {
      ok: false,
      error: "Ese apartamento no tiene WhatsApp registrado",
    };

  const cfg = await getConfig();
  const place = `${input.tower} - Apto ${input.apto}`;
  const text = buildMessage(input.type, cfg.name, place, input.note);
  return { ok: true, phone: resident.phone, text, apto: key };
}

type SendResultOut =
  | { ok: true; delivered: boolean; link?: string }
  | { ok: false; error: string };

// Sends (via API if configured) and logs the event.
export async function confirmAlert(input: {
  type: AlertType;
  tower: string;
  apto: string;
  note?: string;
}): Promise<SendResultOut> {
  await requireGuard();
  const prep = await prepareAlert(input);
  if (!prep.ok) return prep;

  const result = await sendWhatsApp(prep.phone, prep.text);

  const labels: Record<AlertType, string> = {
    visita: "Alerta de visita",
    encomienda: "Aviso de paquete",
    mensaje: "Mensaje de administración",
  };
  await db.insert(events).values({
    type: input.type,
    tower: input.tower,
    apto: input.apto,
    detail: `${labels[input.type]} enviado por WhatsApp`,
  });
  revalidatePath("/porteria");
  revalidatePath("/admin");

  return result.delivered
    ? { ok: true, delivered: true }
    : { ok: true, delivered: false, link: result.link };
}

// Confirm a scanned/selected authorization: mark used + log entry.
export async function confirmScan(authId: string): Promise<{ ok: boolean; error?: string }> {
  await requireGuard();
  const rows = await db
    .select()
    .from(authGrants)
    .where(eq(authGrants.id, authId))
    .limit(1);
  const a = rows[0];
  if (!a) return { ok: false, error: "Autorización no encontrada" };
  if (a.status !== "vigente")
    return { ok: false, error: "La autorización no está vigente" };

  await db
    .update(authGrants)
    .set({ status: "usado" })
    .where(eq(authGrants.id, authId));
  await db.insert(events).values({
    type: "visita",
    tower: a.tower,
    apto: a.apt,
    detail: `Ingreso autorizado — ${a.visitor}${a.plate ? ` (${a.plate})` : ""}`,
  });
  revalidatePath("/porteria");
  revalidatePath("/admin");
  return { ok: true };
}

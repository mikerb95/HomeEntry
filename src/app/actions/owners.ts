"use server";

import { revalidatePath } from "next/cache";
import {
  createNotice,
  createServiceRequest,
  listOwnerUnitsForConjunto,
  removeOwnerLink,
  resolveNotice,
  updateServiceRequestStatus,
  upsertOwnerLink,
} from "@/db/queries";
import { requireAdmin } from "@/lib/auth";
import { clampText, digits } from "@/lib/format";

type Result = { ok: boolean; error?: string };

export async function linkOwner(
  slug: string,
  input: { phone: string; pin: string; aptoKey: string; tower: string; apt: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const phone = digits(input.phone);
  if (phone.length < 10) {
    return { ok: false, error: "Ingresa un celular válido (10 dígitos)" };
  }
  if (digits(input.pin).length < 4) {
    return { ok: false, error: "El PIN debe tener 4 dígitos" };
  }
  if (!input.tower || !input.apt) {
    return { ok: false, error: "Selecciona torre y apartamento" };
  }
  await upsertOwnerLink({
    phone,
    pin: digits(input.pin),
    conjuntoId: cid,
    aptoKey: input.aptoKey,
    tower: input.tower,
    apt: input.apt,
  });
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function unlinkOwner(
  slug: string,
  ownerId: string,
  aptoKey: string,
): Promise<Result> {
  const session = await requireAdmin(slug);
  await removeOwnerLink(ownerId, session.conjuntoId, aptoKey);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function listOwnerLinks(slug: string) {
  const session = await requireAdmin(slug);
  return listOwnerUnitsForConjunto(session.conjuntoId);
}

export async function registerNotice(
  slug: string,
  input: { aptoKey: string; tower: string; apt: string; category: string; detail: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const detail = clampText(input.detail, 500);
  if (!detail) return { ok: false, error: "Describe el llamado de atención" };
  await createNotice({
    conjuntoId: session.conjuntoId,
    aptoKey: input.aptoKey,
    tower: input.tower,
    apt: input.apt,
    category: input.category || "otro",
    detail,
    registeredBy: `admin:${session.username}`,
  });
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function closeNotice(slug: string, id: string): Promise<Result> {
  const session = await requireAdmin(slug);
  await resolveNotice(session.conjuntoId, id);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function registerServiceRequest(
  slug: string,
  input: { aptoKey: string; tower: string; apt: string; subject: string; detail: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const subject = clampText(input.subject, 140);
  const detail = clampText(input.detail, 500);
  if (!subject) return { ok: false, error: "Ingresa el asunto de la solicitud" };
  await createServiceRequest({
    conjuntoId: session.conjuntoId,
    aptoKey: input.aptoKey,
    tower: input.tower,
    apt: input.apt,
    subject,
    detail,
    registeredBy: `admin:${session.username}`,
  });
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function setServiceRequestStatus(
  slug: string,
  id: string,
  status: "abierto" | "en_proceso" | "resuelto",
): Promise<Result> {
  const session = await requireAdmin(slug);
  await updateServiceRequestStatus(session.conjuntoId, id, status);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

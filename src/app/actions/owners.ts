"use server";

import { revalidatePath } from "next/cache";
import {
  createNotice,
  createServiceRequest,
  logAccess,
  ownerLinkedToConjunto,
  removeOwnerLink,
  resolveNotice,
  updateOwnerPin,
  updateServiceRequestStatus,
  upsertOwnerLink,
} from "@/db/queries";
import { requireAdmin } from "@/lib/auth";
import { clampText, digits } from "@/lib/format";

type Result = { ok: boolean; error?: string };

const NOTICE_CATEGORIES = [
  "ruido",
  "mascotas",
  "zonas_comunes",
  "convivencia",
  "otro",
] as const;
type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

function clampNoticeCategory(v: unknown): NoticeCategory {
  const s = String(v ?? "");
  return (NOTICE_CATEGORIES as readonly string[]).includes(s)
    ? (s as NoticeCategory)
    : "otro";
}

// `created:false` means the phone already belonged to an owner: the unit was
// linked but the typed PIN was NOT applied (the owner keeps their current
// one). The UI surfaces this so the admin isn't misled.
export async function linkOwner(
  slug: string,
  input: { phone: string; pin: string; aptoKey: string; tower: string; apt: string },
): Promise<Result & { created?: boolean }> {
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
  const { created } = await upsertOwnerLink({
    phone,
    pin: digits(input.pin),
    conjuntoId: cid,
    aptoKey: input.aptoKey,
    tower: input.tower,
    apt: input.apt,
  });
  revalidatePath(`/${slug}/admin`);
  return { ok: true, created };
}

// Owners have no self-service recovery, so the admin is the escape hatch when
// a PIN is forgotten. Scoped: only admins of a conjunto where the owner holds
// a unit can reset, and the reset revokes the owner's active sessions.
export async function resetOwnerPin(
  slug: string,
  ownerId: string,
  pin: string,
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  if (digits(pin).length < 4) {
    return { ok: false, error: "El PIN debe tener 4 dígitos" };
  }
  if (!(await ownerLinkedToConjunto(ownerId, cid))) {
    return { ok: false, error: "Propietario no vinculado a este conjunto" };
  }
  await updateOwnerPin(ownerId, digits(pin));
  await logAccess(cid, `admin:${session.username}`, "reset_owner_pin", ownerId);
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
    category: clampNoticeCategory(input.category),
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

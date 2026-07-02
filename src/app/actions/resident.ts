"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { authGrants } from "@/db/schema";
import { createServiceRequest, getAuthByCode } from "@/db/queries";
import { requireResident } from "@/lib/auth";
import { makeAuthCode } from "@/lib/code";
import { qrDataUrl } from "@/lib/qr";
import { clampText, fmtDateTime, isValidPlate } from "@/lib/format";

type Result = { ok: boolean; error?: string };

// Generate a code that is unique within the conjunto. Collisions are already
// astronomically unlikely (32^8), but a few retries make it a guarantee.
async function uniqueCode(conjuntoId: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = makeAuthCode();
    if (!(await getAuthByCode(conjuntoId, code))) return code;
  }
  // Extremely improbable; widen the space rather than fail the request.
  return makeAuthCode(12);
}

type GenResult =
  | {
      ok: true;
      code: string;
      qr: string;
      visitor: string;
      whenStr: string;
    }
  | { ok: false; error: string };

export async function generateAuth(
  slug: string,
  input: {
    visitor: string;
    doc: string;
    plate: string;
    vehicleKind: "car" | "moto";
    foreign?: boolean;
    date: string;
    time: string;
  },
): Promise<GenResult> {
  const session = await requireResident(slug);
  const visitor = clampText(input.visitor, 80);
  if (!visitor)
    return { ok: false, error: "Ingresa el nombre del visitante" };

  // Plate is optional here, but when provided it must match the chosen format.
  const plate = clampText(input.plate, 12).toUpperCase();
  if (plate && !isValidPlate(plate, input.vehicleKind, input.foreign)) {
    return {
      ok: false,
      error: input.foreign
        ? "Placa extranjera no válida"
        : input.vehicleKind === "moto"
          ? "Placa de moto inválida (formato ABC12D)"
          : "Placa de carro inválida (formato ABC123)",
    };
  }

  let when = Date.now() + 2 * 3600000;
  if (input.date) {
    const t = input.time || "12:00";
    const parsed = new Date(`${input.date}T${t}`);
    if (!isNaN(parsed.getTime())) when = parsed.getTime();
  }

  const code = await uniqueCode(session.conjuntoId);
  await db.insert(authGrants).values({
    conjuntoId: session.conjuntoId,
    code,
    aptoKey: session.aptoKey,
    tower: session.tower,
    apt: session.apt,
    visitor,
    doc: clampText(input.doc, 40) || "—",
    plate,
    whenTs: new Date(when),
    status: "vigente",
  });

  revalidatePath(`/${slug}/residente`);
  return {
    ok: true,
    code,
    qr: await qrDataUrl(code),
    visitor,
    whenStr: fmtDateTime(when),
  };
}

// A resident files a service request for their own apartment — the only
// creation path that isn't gated behind requireAdmin (see
// registerServiceRequest in actions/owners.ts for the staff-side one).
// `registeredBy` is tagged "residente:" so the admin/owner views can tell
// who raised it apart from the staff-registered ones.
export async function submitServiceRequest(
  slug: string,
  input: { subject: string; detail: string },
): Promise<Result> {
  const session = await requireResident(slug);
  const subject = clampText(input.subject, 140);
  if (!subject) return { ok: false, error: "Ingresa el asunto de la solicitud" };
  const detail = clampText(input.detail, 500);
  if (!detail) return { ok: false, error: "Describe la solicitud" };

  await createServiceRequest({
    conjuntoId: session.conjuntoId,
    aptoKey: session.aptoKey,
    tower: session.tower,
    apt: session.apt,
    subject,
    detail,
    registeredBy: `residente:${session.aptoKey}`,
  });

  revalidatePath(`/${slug}/residente/solicitudes`);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

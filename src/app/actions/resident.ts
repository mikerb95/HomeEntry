"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { authGrants } from "@/db/schema";
import { getAuthByCode } from "@/db/queries";
import { requireResident } from "@/lib/auth";
import { makeAuthCode } from "@/lib/code";
import { qrDataUrl } from "@/lib/qr";
import { clampText, fmtDateTime } from "@/lib/format";

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
    date: string;
    time: string;
  },
): Promise<GenResult> {
  const session = await requireResident(slug);
  const visitor = clampText(input.visitor, 80);
  if (!visitor)
    return { ok: false, error: "Ingresa el nombre del visitante" };

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
    plate: clampText(input.plate, 12).toUpperCase(),
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

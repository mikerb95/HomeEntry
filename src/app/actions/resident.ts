"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { authGrants } from "@/db/schema";
import { requireResident } from "@/lib/auth";
import { qrDataUrl } from "@/lib/qr";
import { fmtDateTime } from "@/lib/format";

function makeCode(): string {
  return randomBytes(3)
    .toString("base64")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
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
  if (!input.visitor.trim())
    return { ok: false, error: "Ingresa el nombre del visitante" };

  let when = Date.now() + 2 * 3600000;
  if (input.date) {
    const t = input.time || "12:00";
    const parsed = new Date(`${input.date}T${t}`);
    if (!isNaN(parsed.getTime())) when = parsed.getTime();
  }

  const code = makeCode();
  await db.insert(authGrants).values({
    conjuntoId: session.conjuntoId,
    code,
    aptoKey: session.aptoKey,
    tower: session.tower,
    apt: session.apt,
    visitor: input.visitor.trim(),
    doc: input.doc.trim() || "—",
    plate: input.plate.trim().toUpperCase(),
    whenTs: new Date(when),
    status: "vigente",
  });

  revalidatePath(`/${slug}/residente`);
  return {
    ok: true,
    code,
    qr: await qrDataUrl(code),
    visitor: input.visitor.trim(),
    whenStr: fmtDateTime(when),
  };
}

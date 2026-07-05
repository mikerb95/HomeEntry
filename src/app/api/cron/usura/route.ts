import { NextResponse } from "next/server";
import { eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { conjuntos } from "@/db/schema";
import { getEffectiveMoraCapPct, logAccess, upsertUsuraRate } from "@/db/queries";

export const dynamic = "force-dynamic";

// Monthly watchdog for the legal mora ceiling (§6.1 of PLAN-CRM.md). The
// Superfinanciera certifies the IBC every month; art. 884 C.Co caps mora at
// 1.5× that rate and punishes overcharging with the loss of ALL interest.
// This job pulls the latest certified IBC (modalidad consumo y ordinario)
// from the official open-data mirror, stores the derived monthly cap in
// `usura_rates`, and lowers any conjunto whose configured mora rate would
// exceed the new effective ceiling — staying conservative without a human
// in the loop. Scheduled via vercel.json; Vercel sends
// `Authorization: Bearer $CRON_SECRET`.
const DATASET_URL =
  "https://www.datos.gov.co/resource/pare-7x5i.json" +
  "?$select=interes_bancario_corriente,vigencia_desde" +
  "&$where=modalidad='CONSUMO Y ORDINARIO'" +
  "&$order=vigencia_desde DESC&$limit=1";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = await fetch(DATASET_URL, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `datos.gov.co respondió ${res.status}` },
      { status: 502 },
    );
  }
  const rows: { interes_bancario_corriente?: string; vigencia_desde?: string }[] =
    await res.json();
  const row = rows[0];
  // "19.19%" → 1919 (the % × 100 encoding used across the app).
  const ibcEaPct = Math.round(
    parseFloat(row?.interes_bancario_corriente?.replace("%", "") ?? "") * 100,
  );
  const vigenciaDesde = new Date(row?.vigencia_desde ?? "");
  if (!Number.isFinite(ibcEaPct) || ibcEaPct <= 0 || isNaN(vigenciaDesde.getTime())) {
    return NextResponse.json(
      { error: "respuesta del dataset inválida", row },
      { status: 502 },
    );
  }

  const { usuraEaPct, monthlyCapPct } = await upsertUsuraRate({
    vigenciaDesde,
    ibcEaPct,
  });

  // Clamp any conjunto configured above the new effective ceiling so accrual
  // never runs at an illegal rate between admin visits.
  const cap = await getEffectiveMoraCapPct();
  const over = await db
    .select({ id: conjuntos.id, moraRatePct: conjuntos.moraRatePct })
    .from(conjuntos)
    .where(gt(conjuntos.moraRatePct, cap));
  for (const c of over) {
    await db
      .update(conjuntos)
      .set({ moraRatePct: cap })
      .where(eq(conjuntos.id, c.id));
    await logAccess(
      c.id,
      "cron:usura",
      "clamp_mora_rate",
      `${c.moraRatePct} -> ${cap} (tope legal vigente)`,
    );
  }

  return NextResponse.json({
    ok: true,
    vigenciaDesde: vigenciaDesde.toISOString().slice(0, 10),
    ibcEaPct,
    usuraEaPct,
    monthlyCapPct,
    effectiveCapPct: cap,
    conjuntosClamped: over.length,
  });
}

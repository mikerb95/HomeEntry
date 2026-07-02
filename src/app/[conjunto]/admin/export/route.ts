import { requireAdmin } from "@/lib/auth";
import {
  getConjuntoById,
  getFinancialSummary,
  listCharges,
  listExpenses,
  listPayments,
  logAccess,
} from "@/db/queries";

// CSV downloads for the contador: cartera (per-apt balances), ingresos
// (payments) and gastos (expenses). Semicolon separator + BOM so Excel in
// es-CO locale opens them with columns already split and tildes intact.
const SEP = ";";

function csv(rows: (string | number)[][]): string {
  const body = rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v);
          return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(SEP),
    )
    .join("\n");
  return "﻿" + body;
}

function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conjunto: string }> },
) {
  const { conjunto: slug } = await params;
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const type = new URL(request.url).searchParams.get("type") ?? "cartera";

  const conjunto = await getConjuntoById(cid);
  if (!conjunto) return new Response("Conjunto no encontrado", { status: 404 });

  let rows: (string | number)[][];
  if (type === "ingresos") {
    const payments = await listPayments(cid);
    rows = [
      ["Fecha", "Torre", "Apto", "Monto", "Método", "Registrado por", "Nota"],
      ...payments.map((p) => [
        fmtDay(p.paidAt),
        p.tower,
        p.apt,
        p.amount,
        p.method,
        p.registeredBy,
        p.note,
      ]),
    ];
  } else if (type === "gastos") {
    const expenses = await listExpenses(cid);
    rows = [
      ["Fecha", "Proveedor", "Categoría", "Monto", "Descripción", "Factura"],
      ...expenses.map((e) => [
        fmtDay(e.expenseDate),
        e.vendorName,
        e.category,
        e.amount,
        e.description,
        e.invoiceRef,
      ]),
    ];
  } else if (type === "cargos") {
    const charges = await listCharges(cid);
    rows = [
      ["Período", "Torre", "Apto", "Concepto", "Monto", "Vence"],
      ...charges.map((c) => [
        c.period,
        c.tower,
        c.apt,
        c.concept,
        c.amount,
        fmtDay(c.dueDate),
      ]),
    ];
  } else {
    const summary = await getFinancialSummary(cid);
    rows = [
      [
        "Apartamento",
        "Cargado",
        "Pagado",
        "Saldo",
        "Mora",
        "Total",
        "Vencido 1-30",
        "Vencido 31-60",
        "Vencido 61-90",
        "Vencido +90",
      ],
      ...summary.aptBalances.map((b) => [
        b.aptoKey,
        b.totalCargado,
        b.totalPagado,
        b.saldo,
        Math.round(b.mora),
        Math.round(b.total),
        b.aging.d30,
        b.aging.d60,
        b.aging.d90,
        b.aging.d90plus,
      ]),
    ];
  }

  await logAccess(cid, `admin:${session.username}`, "export_csv", type);

  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${type}-${today}.csv"`,
    },
  });
}

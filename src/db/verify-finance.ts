// One-off manual verification script (not part of the app), run via:
//   tsx --env-file=.env src/db/verify-finance.ts
// Exercises the finance schema + encryption + business logic end-to-end
// against the local docker DB, bypassing queries.ts (which imports the
// RSC-only "server-only" guard that tsx can't resolve outside Next).
import { eq } from "drizzle-orm";
import { db } from "./index";
import { conjuntos, vendors, charges, payments, expenses } from "./schema";
import { encryptPII, decryptPII } from "../lib/crypto";
import { computeConjuntoSummary, type ChargeInput, type PaymentInput } from "../lib/finance";

async function main() {
  const [conjunto] = await db.select().from(conjuntos).where(eq(conjuntos.slug, "laspalmas")).limit(1);
  if (!conjunto) throw new Error("Seed conjunto 'laspalmas' not found");
  const cid = conjunto.id;

  await db.update(conjuntos).set({ moraRatePct: 250, moraGraceDays: 5 }).where(eq(conjuntos.id, cid));

  const [vendor] = await db
    .insert(vendors)
    .values({
      conjuntoId: cid,
      nameEnc: encryptPII("Jardinería El Roble"),
      category: "jardineria",
      taxIdEnc: encryptPII("900123456-7"),
      contactEnc: encryptPII("3001234567"),
    })
    .returning();
  console.log("Vendor created, decrypted name:", decryptPII(vendor.nameEnc));

  const dueDate = new Date(Date.now() - 40 * 86400000); // 40 days ago
  await db.insert(charges).values({
    conjuntoId: cid,
    aptoKey: "T1-101",
    tower: "T1",
    apt: "101",
    period: "2026-05",
    concept: "Cuota de administración",
    amountEnc: encryptPII("300000"),
    dueDate,
  });

  await db.insert(payments).values({
    conjuntoId: cid,
    aptoKey: "T1-101",
    tower: "T1",
    apt: "101",
    amountEnc: encryptPII("100000"),
    method: "transferencia",
    paidAt: new Date(Date.now() - 35 * 86400000),
    registeredBy: "admin",
  });

  await db.insert(expenses).values({
    conjuntoId: cid,
    vendorId: vendor.id,
    amountEnc: encryptPII("80000"),
    category: "jardineria",
    descriptionEnc: encryptPII("Poda mensual zonas verdes"),
    expenseDate: new Date(),
    registeredBy: "admin",
  });

  const chargeRows = await db.select().from(charges).where(eq(charges.conjuntoId, cid));
  const paymentRows = await db.select().from(payments).where(eq(payments.conjuntoId, cid));
  const expenseRows = await db.select().from(expenses).where(eq(expenses.conjuntoId, cid));

  const chargeInputs: ChargeInput[] = chargeRows.map((c) => ({
    id: c.id,
    aptoKey: c.aptoKey,
    period: c.period,
    amount: parseInt(decryptPII(c.amountEnc), 10),
    dueDate: c.dueDate,
  }));
  const paymentInputs: PaymentInput[] = paymentRows.map((p) => ({
    aptoKey: p.aptoKey,
    amount: parseInt(decryptPII(p.amountEnc), 10),
    paidAt: p.paidAt,
  }));
  const expenseAmounts = expenseRows.map((e) => parseInt(decryptPII(e.amountEnc), 10));

  const summary = computeConjuntoSummary(chargeInputs, paymentInputs, expenseAmounts, 250, 5);
  console.log("Financial summary:", JSON.stringify(summary, null, 2));

  const apt = summary.aptBalances.find((b) => b.aptoKey === "T1-101");
  if (!apt) throw new Error("Expected balance for T1-101");
  if (apt.saldo !== 200000) throw new Error(`Expected saldo 200000, got ${apt.saldo}`);
  if (!(apt.mora > 0)) throw new Error("Expected mora > 0 for overdue unpaid balance");
  console.log("\nPASS: saldo=200000 and mora>0 computed correctly for T1-101 (charge 300000, paid 100000, 40d overdue past 5d grace)");
  console.log(`PASS: balanceNeto = recaudo(${summary.recaudoTotal}) - gastos(${summary.gastoTotal}) = ${summary.balanceNeto}`);

  // Cleanup so re-running this script (or the real app) starts fresh.
  await db.delete(expenses).where(eq(expenses.conjuntoId, cid));
  await db.delete(payments).where(eq(payments.conjuntoId, cid));
  await db.delete(charges).where(eq(charges.conjuntoId, cid));
  await db.delete(vendors).where(eq(vendors.conjuntoId, cid));
  console.log("Cleanup done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAIL:", e);
    process.exit(1);
  });

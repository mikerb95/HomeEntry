// One-off manual verification script (not part of the app), run via:
//   tsx --env-file=.env src/db/verify-finance.ts
// Exercises the finance module end-to-end against the local docker DB.
import { db } from "./index";
import { conjuntos } from "./schema";
import { eq } from "drizzle-orm";
import {
  getConjuntoBySlug,
  listVendors,
  listCharges,
  listPayments,
  listExpenses,
  getFinancialSummary,
} from "./queries";

async function main() {
  const conjunto = await getConjuntoBySlug("laspalmas");
  if (!conjunto) throw new Error("Seed conjunto 'laspalmas' not found");
  const cid = conjunto.id;

  // 1) Configure mora: 2.5% monthly, 5-day grace.
  await db.update(conjuntos).set({ moraRatePct: 250, moraGraceDays: 5 }).where(eq(conjuntos.id, cid));

  // 2) Create a vendor (encrypted at rest).
  const { encryptPII, decryptPII } = await import("../lib/crypto");
  const [vendor] = await db
    .insert((await import("./schema")).vendors)
    .values({
      conjuntoId: cid,
      nameEnc: encryptPII("Jardinería El Roble"),
      category: "jardineria",
      taxIdEnc: encryptPII("900123456-7"),
      contactEnc: encryptPII("3001234567"),
    })
    .returning();
  console.log("Vendor created, decrypted name:", decryptPII(vendor.nameEnc));

  // 3) Generate a charge for one apartment, due in the past (overdue past grace).
  const dueDate = new Date(Date.now() - 40 * 86400000); // 40 days ago
  const { charges, payments, expenses } = await import("./schema");
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

  // 4) Partial payment.
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

  // 5) Expense against the vendor.
  await db.insert(expenses).values({
    conjuntoId: cid,
    vendorId: vendor.id,
    amountEnc: encryptPII("80000"),
    category: "jardineria",
    descriptionEnc: encryptPII("Poda mensual zonas verdes"),
    expenseDate: new Date(),
    registeredBy: "admin",
  });

  // 6) Read back through the app's query layer.
  const vendors = await listVendors(cid);
  const chargeRows = await listCharges(cid);
  const paymentRows = await listPayments(cid);
  const expenseRows = await listExpenses(cid);
  const summary = await getFinancialSummary(cid);

  console.log("Vendors:", vendors);
  console.log("Charges:", chargeRows);
  console.log("Payments:", paymentRows);
  console.log("Expenses:", expenseRows);
  console.log("Financial summary:", JSON.stringify(summary, null, 2));

  const apt = summary.aptBalances.find((b) => b.aptoKey === "T1-101");
  if (!apt) throw new Error("Expected balance for T1-101");
  if (apt.saldo !== 200000) throw new Error(`Expected saldo 200000, got ${apt.saldo}`);
  if (!(apt.mora > 0)) throw new Error("Expected mora > 0 for overdue unpaid balance");
  console.log("\nPASS: saldo and mora computed as expected for T1-101");
  console.log(`PASS: balanceNeto (recaudo ${summary.recaudoTotal} - gastos ${summary.gastoTotal}) = ${summary.balanceNeto}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAIL:", e);
    process.exit(1);
  });

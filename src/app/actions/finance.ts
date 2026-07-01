"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { charges, conjuntos, expenses, payments, vendors } from "@/db/schema";
import {
  countExpensesForVendor,
  getConjuntoById,
  logAccess,
} from "@/db/queries";
import { requireAdmin } from "@/lib/auth";
import { encryptPII } from "@/lib/crypto";
import { clampText } from "@/lib/format";
import { allAptsArr } from "@/lib/meta";

type Result = { ok: boolean; error?: string };

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampAmount(v: unknown): number {
  return Math.max(0, parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10));
}

const CATEGORIES = ["mantenimiento", "aseo", "jardineria", "seguridad", "otro"];

function clampCategory(v: unknown): string {
  const s = String(v ?? "");
  return CATEGORIES.includes(s) ? s : "otro";
}

// --- Mora config -------------------------------------------------------------

export async function updateMoraConfig(
  slug: string,
  input: { moraRatePct: string; moraGraceDays: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const moraRatePct = clampInt(input.moraRatePct, 0, 10000, 0); // up to 100.00%
  const moraGraceDays = clampInt(input.moraGraceDays, 0, 90, 0);
  await db
    .update(conjuntos)
    .set({ moraRatePct, moraGraceDays })
    .where(eq(conjuntos.id, cid));
  await logAccess(cid, `admin:${session.username}`, "update_mora_config", cid);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

// --- Vendors ("proveedores") -------------------------------------------------

export async function createVendor(
  slug: string,
  input: { name: string; category: string; taxId?: string; contact?: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const name = clampText(input.name, 80);
  if (!name) return { ok: false, error: "Ingresa el nombre del proveedor" };
  const [row] = await db
    .insert(vendors)
    .values({
      conjuntoId: cid,
      nameEnc: encryptPII(name),
      category: clampCategory(input.category),
      taxIdEnc: input.taxId ? encryptPII(clampText(input.taxId, 30)) : null,
      contactEnc: input.contact ? encryptPII(clampText(input.contact, 120)) : null,
    })
    .returning({ id: vendors.id });
  await logAccess(cid, `admin:${session.username}`, "create_vendor", row.id);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function updateVendor(
  slug: string,
  vendorId: string,
  input: { name: string; category: string; taxId?: string; contact?: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const name = clampText(input.name, 80);
  if (!name) return { ok: false, error: "Ingresa el nombre del proveedor" };
  await db
    .update(vendors)
    .set({
      nameEnc: encryptPII(name),
      category: clampCategory(input.category),
      taxIdEnc: input.taxId ? encryptPII(clampText(input.taxId, 30)) : null,
      contactEnc: input.contact ? encryptPII(clampText(input.contact, 120)) : null,
    })
    .where(and(eq(vendors.conjuntoId, cid), eq(vendors.id, vendorId)));
  await logAccess(cid, `admin:${session.username}`, "update_vendor", vendorId);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function deleteVendor(slug: string, vendorId: string): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const used = await countExpensesForVendor(cid, vendorId);
  if (used > 0) {
    return {
      ok: false,
      error: "No se puede eliminar: tiene gastos registrados asociados",
    };
  }
  await db
    .delete(vendors)
    .where(and(eq(vendors.conjuntoId, cid), eq(vendors.id, vendorId)));
  await logAccess(cid, `admin:${session.username}`, "delete_vendor", vendorId);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

// --- Charges (cuotas) ---------------------------------------------------------

export async function generateMonthlyCharges(
  slug: string,
  input: { period: string; amount: string; dueDate: string; concept?: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const period = /^\d{4}-\d{2}$/.test(input.period) ? input.period : "";
  if (!period) return { ok: false, error: "Período inválido (usa YYYY-MM)" };
  const amount = clampAmount(input.amount);
  if (amount <= 0) return { ok: false, error: "Ingresa un monto válido" };
  const dueDate = new Date(input.dueDate);
  if (isNaN(dueDate.getTime())) return { ok: false, error: "Fecha límite inválida" };
  const concept = clampText(input.concept, 80) || "Cuota de administración";

  const conjunto = await getConjuntoById(cid);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const apts = allAptsArr(conjunto.towers, conjunto.aptsPerTower);
  const amountEnc = encryptPII(String(amount));
  const rows = apts.map((a) => {
    const [tower, apt] = a.id.split("-");
    return {
      conjuntoId: cid,
      aptoKey: a.id,
      tower,
      apt,
      period,
      concept,
      amountEnc,
      dueDate,
    };
  });
  if (rows.length) {
    // One row per (conjunto, apto, period) is desired; skip apts that
    // already have a charge for this period instead of erroring, so a
    // double-click doesn't double-bill anyone.
    const existing = await db
      .select({ aptoKey: charges.aptoKey })
      .from(charges)
      .where(and(eq(charges.conjuntoId, cid), eq(charges.period, period)));
    const already = new Set(existing.map((e) => e.aptoKey));
    const toInsert = rows.filter((r) => !already.has(r.aptoKey));
    if (toInsert.length) await db.insert(charges).values(toInsert);
  }

  await logAccess(cid, `admin:${session.username}`, "generate_monthly_charges", period);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

// --- Payments (pagos) ----------------------------------------------------------

export async function recordPayment(
  slug: string,
  input: {
    aptoKey: string;
    amount: string;
    method: string;
    paidAt: string;
    note?: string;
  },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  if (!input.aptoKey) return { ok: false, error: "Selecciona el apartamento" };
  const amount = clampAmount(input.amount);
  if (amount <= 0) return { ok: false, error: "Ingresa un monto válido" };
  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
  if (isNaN(paidAt.getTime())) return { ok: false, error: "Fecha inválida" };
  const method = ["transferencia", "efectivo", "otro"].includes(input.method)
    ? input.method
    : "transferencia";
  const [tower, apt] = input.aptoKey.split("-");

  await db.insert(payments).values({
    conjuntoId: cid,
    aptoKey: input.aptoKey,
    tower,
    apt,
    amountEnc: encryptPII(String(amount)),
    method,
    paidAt,
    registeredBy: session.username,
    noteEnc: input.note ? encryptPII(clampText(input.note, 200)) : null,
  });

  await logAccess(cid, `admin:${session.username}`, "record_payment", input.aptoKey);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

// --- Expenses (gastos por proveedor) --------------------------------------------

export async function recordExpense(
  slug: string,
  input: {
    vendorId: string;
    amount: string;
    category: string;
    description: string;
    invoiceRef?: string;
    expenseDate: string;
  },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  if (!input.vendorId) return { ok: false, error: "Selecciona el proveedor" };
  const amount = clampAmount(input.amount);
  if (amount <= 0) return { ok: false, error: "Ingresa un monto válido" };
  const description = clampText(input.description, 200);
  if (!description) return { ok: false, error: "Describe el gasto" };
  const expenseDate = input.expenseDate ? new Date(input.expenseDate) : new Date();
  if (isNaN(expenseDate.getTime())) return { ok: false, error: "Fecha inválida" };

  const vendor = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(and(eq(vendors.conjuntoId, cid), eq(vendors.id, input.vendorId)))
    .limit(1);
  if (!vendor[0]) return { ok: false, error: "Proveedor no encontrado" };

  const [row] = await db
    .insert(expenses)
    .values({
      conjuntoId: cid,
      vendorId: input.vendorId,
      amountEnc: encryptPII(String(amount)),
      category: clampCategory(input.category),
      descriptionEnc: encryptPII(description),
      invoiceRefEnc: input.invoiceRef
        ? encryptPII(clampText(input.invoiceRef, 60))
        : null,
      expenseDate,
      registeredBy: session.username,
    })
    .returning({ id: expenses.id });

  await logAccess(cid, `admin:${session.username}`, "record_expense", row.id);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function deleteExpense(slug: string, expenseId: string): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  await db
    .delete(expenses)
    .where(and(eq(expenses.conjuntoId, cid), eq(expenses.id, expenseId)));
  await logAccess(cid, `admin:${session.username}`, "delete_expense", expenseId);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

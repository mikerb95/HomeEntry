import "server-only";
import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { GRANT_GRACE_MS, makeConjuntoCode } from "@/lib/code";
import { db } from "./index";
import {
  accessLog,
  authGrants,
  charges,
  conjuntos,
  events,
  expenses,
  parkingSessions,
  parkingSpots,
  payments,
  residents,
  staffUsers,
  vendors,
} from "./schema";
import { decryptPII, piiHash } from "@/lib/crypto";
import {
  computeConjuntoSummary,
  type ChargeInput,
  type PaymentInput,
} from "@/lib/finance";

// A resident with the phone decrypted for display, and the raw PII columns
// (phoneEnc/phoneHash) stripped so they never leak past this layer.
export type ResidentView = {
  conjuntoId: string;
  aptoKey: string;
  tower: string;
  apt: string;
  phone: string;
  pinHash: string;
  sessionVersion: number;
  failedPins: number;
  lockedUntil: Date | null;
};

function toView(r: typeof residents.$inferSelect): ResidentView {
  return {
    conjuntoId: r.conjuntoId,
    aptoKey: r.aptoKey,
    tower: r.tower,
    apt: r.apt,
    phone: decryptPII(r.phoneEnc),
    pinHash: r.pinHash,
    sessionVersion: r.sessionVersion,
    failedPins: r.failedPins,
    lockedUntil: r.lockedUntil,
  };
}

// --- Conjuntos (tenants) -------------------------------------------------

export async function getConjuntoBySlug(slug: string) {
  const rows = await db
    .select()
    .from(conjuntos)
    .where(eq(conjuntos.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getConjuntoById(id: string) {
  const rows = await db
    .select()
    .from(conjuntos)
    .where(eq(conjuntos.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listConjuntos() {
  return db.select().from(conjuntos).orderBy(asc(conjuntos.name));
}

// --- Residents -----------------------------------------------------------

export async function getResident(conjuntoId: string, aptoKey: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(
      and(eq(residents.conjuntoId, conjuntoId), eq(residents.aptoKey, aptoKey)),
    )
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}

export async function listResidents(conjuntoId: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(eq(residents.conjuntoId, conjuntoId));
  return rows.map(toView);
}

export async function getResidentByPhone(conjuntoId: string, phone: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(
      and(
        eq(residents.conjuntoId, conjuntoId),
        eq(residents.phoneHash, piiHash(phone)),
      ),
    )
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}

export async function getResidentVersion(
  conjuntoId: string,
  aptoKey: string,
): Promise<number | null> {
  const rows = await db
    .select({ v: residents.sessionVersion })
    .from(residents)
    .where(
      and(eq(residents.conjuntoId, conjuntoId), eq(residents.aptoKey, aptoKey)),
    )
    .limit(1);
  return rows[0]?.v ?? null;
}

// --- Staff ---------------------------------------------------------------

export async function getStaff(conjuntoId: string, username: string) {
  const rows = await db
    .select()
    .from(staffUsers)
    .where(
      and(
        eq(staffUsers.conjuntoId, conjuntoId),
        eq(staffUsers.username, username),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getStaffVersion(
  conjuntoId: string,
  username: string,
): Promise<number | null> {
  const rows = await db
    .select({ v: staffUsers.sessionVersion })
    .from(staffUsers)
    .where(
      and(
        eq(staffUsers.conjuntoId, conjuntoId),
        eq(staffUsers.username, username),
      ),
    )
    .limit(1);
  return rows[0]?.v ?? null;
}

export async function listGuards(conjuntoId: string) {
  return db
    .select({ username: staffUsers.username })
    .from(staffUsers)
    .where(
      and(eq(staffUsers.conjuntoId, conjuntoId), eq(staffUsers.role, "guard")),
    )
    .orderBy(staffUsers.username);
}

// --- Events --------------------------------------------------------------

export async function listEvents(conjuntoId: string) {
  return db
    .select()
    .from(events)
    .where(eq(events.conjuntoId, conjuntoId))
    .orderBy(desc(events.ts));
}

export async function listEventsForApt(
  conjuntoId: string,
  tower: string,
  apt: string,
) {
  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.conjuntoId, conjuntoId),
        eq(events.tower, tower),
        eq(events.apto, apt),
      ),
    )
    .orderBy(desc(events.ts));
}

// --- Parking -------------------------------------------------------------

export async function listParking(conjuntoId: string) {
  return db
    .select()
    .from(parkingSpots)
    .where(eq(parkingSpots.conjuntoId, conjuntoId))
    .orderBy(asc(parkingSpots.id));
}

export async function listSessions(conjuntoId: string) {
  return db
    .select()
    .from(parkingSessions)
    .where(eq(parkingSessions.conjuntoId, conjuntoId));
}

// --- Authorizations ------------------------------------------------------

// Idempotent sweep: flip still-"vigente" grants whose visit time is past the
// grace window to "vencido". Runs before listing so the persisted status stays
// truthful for the admin audit views, not just at scan time (auditoria1.MD S-8).
async function expireStaleGrants(conjuntoId: string): Promise<void> {
  const cutoff = new Date(Date.now() - GRANT_GRACE_MS);
  await db
    .update(authGrants)
    .set({ status: "vencido" })
    .where(
      and(
        eq(authGrants.conjuntoId, conjuntoId),
        eq(authGrants.status, "vigente"),
        lt(authGrants.whenTs, cutoff),
      ),
    );
}

export async function listAuths(conjuntoId: string) {
  await expireStaleGrants(conjuntoId);
  return db
    .select()
    .from(authGrants)
    .where(eq(authGrants.conjuntoId, conjuntoId))
    .orderBy(desc(authGrants.createdAt));
}

// Authorizations created strictly after `since`, used by the guard screen to
// poll for new visitor authorizations without reloading the whole panel.
export async function listAuthsSince(conjuntoId: string, since: Date) {
  return db
    .select()
    .from(authGrants)
    .where(
      and(eq(authGrants.conjuntoId, conjuntoId), gt(authGrants.createdAt, since)),
    )
    .orderBy(desc(authGrants.createdAt));
}

export async function listAuthsForApt(conjuntoId: string, aptoKey: string) {
  await expireStaleGrants(conjuntoId);
  return db
    .select()
    .from(authGrants)
    .where(
      and(
        eq(authGrants.conjuntoId, conjuntoId),
        eq(authGrants.aptoKey, aptoKey),
      ),
    )
    .orderBy(desc(authGrants.createdAt));
}

export async function getAuthByCode(conjuntoId: string, code: string) {
  const rows = await db
    .select()
    .from(authGrants)
    .where(
      and(eq(authGrants.conjuntoId, conjuntoId), eq(authGrants.code, code)),
    )
    .limit(1);
  return rows[0] ?? null;
}

// --- Audit trail ---------------------------------------------------------

export async function logAccess(
  conjuntoId: string,
  actor: string,
  action: string,
  target: string,
) {
  await db.insert(accessLog).values({ conjuntoId, actor, action, target });
}

const FINANCE_ACTIONS = new Set([
  "view_finance_summary",
  "update_mora_config",
  "create_vendor",
  "update_vendor",
  "delete_vendor",
  "generate_monthly_charges",
  "record_payment",
  "record_expense",
  "delete_expense",
]);

export async function listRecentFinanceAccessLog(conjuntoId: string, limit = 20) {
  const rows = await db
    .select()
    .from(accessLog)
    .where(eq(accessLog.conjuntoId, conjuntoId))
    .orderBy(desc(accessLog.ts))
    .limit(300);
  return rows.filter((r) => FINANCE_ACTIONS.has(r.action)).slice(0, limit);
}

// --- Vendors ("proveedores") ----------------------------------------------

export type VendorView = {
  id: string;
  category: string;
  name: string;
  taxId: string;
  contact: string;
  createdAt: Date;
};

function toVendorView(v: typeof vendors.$inferSelect): VendorView {
  return {
    id: v.id,
    category: v.category,
    name: decryptPII(v.nameEnc),
    taxId: v.taxIdEnc ? decryptPII(v.taxIdEnc) : "",
    contact: v.contactEnc ? decryptPII(v.contactEnc) : "",
    createdAt: v.createdAt,
  };
}

export async function listVendors(conjuntoId: string): Promise<VendorView[]> {
  const rows = await db
    .select()
    .from(vendors)
    .where(eq(vendors.conjuntoId, conjuntoId));
  return rows.map(toVendorView).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getVendor(
  conjuntoId: string,
  vendorId: string,
): Promise<VendorView | null> {
  const rows = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.conjuntoId, conjuntoId), eq(vendors.id, vendorId)))
    .limit(1);
  return rows[0] ? toVendorView(rows[0]) : null;
}

// --- Charges (cuotas) ------------------------------------------------------

export type ChargeView = {
  id: string;
  aptoKey: string;
  tower: string;
  apt: string;
  period: string;
  concept: string;
  amount: number;
  dueDate: Date;
};

function toChargeView(c: typeof charges.$inferSelect): ChargeView {
  return {
    id: c.id,
    aptoKey: c.aptoKey,
    tower: c.tower,
    apt: c.apt,
    period: c.period,
    concept: c.concept,
    amount: parseInt(decryptPII(c.amountEnc) || "0", 10),
    dueDate: c.dueDate,
  };
}

export async function listCharges(conjuntoId: string): Promise<ChargeView[]> {
  const rows = await db
    .select()
    .from(charges)
    .where(eq(charges.conjuntoId, conjuntoId));
  return rows.map(toChargeView);
}

export async function listChargesForApt(
  conjuntoId: string,
  aptoKey: string,
): Promise<ChargeView[]> {
  const rows = await db
    .select()
    .from(charges)
    .where(and(eq(charges.conjuntoId, conjuntoId), eq(charges.aptoKey, aptoKey)));
  return rows.map(toChargeView);
}

// --- Payments (pagos) -------------------------------------------------------

export type PaymentView = {
  id: string;
  aptoKey: string;
  tower: string;
  apt: string;
  amount: number;
  method: string;
  paidAt: Date;
  registeredBy: string;
  note: string;
};

function toPaymentView(p: typeof payments.$inferSelect): PaymentView {
  return {
    id: p.id,
    aptoKey: p.aptoKey,
    tower: p.tower,
    apt: p.apt,
    amount: parseInt(decryptPII(p.amountEnc) || "0", 10),
    method: p.method,
    paidAt: p.paidAt,
    registeredBy: p.registeredBy,
    note: p.noteEnc ? decryptPII(p.noteEnc) : "",
  };
}

export async function listPayments(conjuntoId: string): Promise<PaymentView[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.conjuntoId, conjuntoId))
    .orderBy(desc(payments.paidAt));
  return rows.map(toPaymentView);
}

export async function listPaymentsForApt(
  conjuntoId: string,
  aptoKey: string,
): Promise<PaymentView[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.conjuntoId, conjuntoId), eq(payments.aptoKey, aptoKey)))
    .orderBy(desc(payments.paidAt));
  return rows.map(toPaymentView);
}

// --- Expenses (gastos por proveedor) ---------------------------------------

export type ExpenseView = {
  id: string;
  vendorId: string;
  vendorName: string;
  category: string;
  amount: number;
  description: string;
  invoiceRef: string;
  expenseDate: Date;
  registeredBy: string;
};

export async function listExpenses(conjuntoId: string): Promise<ExpenseView[]> {
  const rows = await db
    .select({ expense: expenses, vendor: vendors })
    .from(expenses)
    .innerJoin(vendors, eq(expenses.vendorId, vendors.id))
    .where(eq(expenses.conjuntoId, conjuntoId))
    .orderBy(desc(expenses.expenseDate));
  return rows.map(({ expense: e, vendor: v }) => ({
    id: e.id,
    vendorId: e.vendorId,
    vendorName: decryptPII(v.nameEnc),
    category: e.category,
    amount: parseInt(decryptPII(e.amountEnc) || "0", 10),
    description: decryptPII(e.descriptionEnc),
    invoiceRef: e.invoiceRefEnc ? decryptPII(e.invoiceRefEnc) : "",
    expenseDate: e.expenseDate,
    registeredBy: e.registeredBy,
  }));
}

export async function countExpensesForVendor(
  conjuntoId: string,
  vendorId: string,
): Promise<number> {
  const rows = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.conjuntoId, conjuntoId), eq(expenses.vendorId, vendorId)));
  return rows.length;
}

// --- Financial summary -------------------------------------------------------

export async function getFinancialSummary(conjuntoId: string) {
  const conjunto = await getConjuntoById(conjuntoId);
  const [chargeRows, paymentRows, expenseRows] = await Promise.all([
    listCharges(conjuntoId),
    listPayments(conjuntoId),
    listExpenses(conjuntoId),
  ]);
  const chargeInputs: ChargeInput[] = chargeRows.map((c) => ({
    id: c.id,
    aptoKey: c.aptoKey,
    period: c.period,
    amount: c.amount,
    dueDate: c.dueDate,
  }));
  const paymentInputs: PaymentInput[] = paymentRows.map((p) => ({
    aptoKey: p.aptoKey,
    amount: p.amount,
    paidAt: p.paidAt,
  }));
  return computeConjuntoSummary(
    chargeInputs,
    paymentInputs,
    expenseRows.map((e) => e.amount),
    conjunto?.moraRatePct ?? 0,
    conjunto?.moraGraceDays ?? 0,
  );
}

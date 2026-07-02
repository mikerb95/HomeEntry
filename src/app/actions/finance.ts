"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  charges,
  conjuntos,
  expenses,
  paymentAgreements,
  payments,
  reserveFundMovements,
  vendors,
} from "@/db/schema";
import {
  countExpensesForVendor,
  getConjuntoById,
  getFinancialSummary,
  listChargesForApt,
  listFondoMovements,
  listPaymentsForApt,
  listResidents,
  listUnits,
  logAccess,
  upsertUnitCoefficients,
} from "@/db/queries";
import { requireAdmin } from "@/lib/auth";
import { encryptPII } from "@/lib/crypto";
import {
  computeAptBalance,
  distributeByCoefficient,
  FONDO_IMPREVISTOS_MIN_PCT,
  MORA_RATE_CAP_PCT,
  splitEvenly,
} from "@/lib/finance";
import { clampText, fmtCOP } from "@/lib/format";
import { allAptsArr } from "@/lib/meta";
import { sendPushToApt } from "@/lib/push";
import { sendWhatsApp, waLink } from "@/lib/whatsapp";

type Result = { ok: boolean; error?: string };

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampAmount(v: unknown): number {
  return Math.max(0, parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10));
}

const CATEGORIES = [
  "mantenimiento",
  "aseo",
  "jardineria",
  "seguridad",
  "otro",
] as const;
type ServiceCategory = (typeof CATEGORIES)[number];

function clampCategory(v: unknown): ServiceCategory {
  const s = String(v ?? "");
  return (CATEGORIES as readonly string[]).includes(s)
    ? (s as ServiceCategory)
    : "otro";
}

const PAYMENT_METHODS = ["transferencia", "efectivo", "otro"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function clampPaymentMethod(v: unknown): PaymentMethod {
  const s = String(v ?? "");
  return (PAYMENT_METHODS as readonly string[]).includes(s)
    ? (s as PaymentMethod)
    : "transferencia";
}

// --- Mora config -------------------------------------------------------------

export async function updateMoraConfig(
  slug: string,
  input: { moraRatePct: string; moraGraceDays: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const moraRatePct = clampInt(input.moraRatePct, 0, 100000, -1);
  if (moraRatePct < 0) return { ok: false, error: "Tasa de mora inválida" };
  if (moraRatePct > MORA_RATE_CAP_PCT)
    return {
      ok: false,
      error: `La tasa de mora no puede superar el tope legal de ${(MORA_RATE_CAP_PCT / 100).toFixed(2)}% mensual (1.5x el interés bancario corriente certificado por la Superfinanciera)`,
    };
  const moraGraceDays = clampInt(input.moraGraceDays, 0, 90, 0);
  await db
    .update(conjuntos)
    .set({ moraRatePct, moraGraceDays })
    .where(eq(conjuntos.id, cid));
  await logAccess(cid, `admin:${session.username}`, "update_mora_config", cid);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

// --- Units (coeficientes de copropiedad) --------------------------------------

// Saves the coeficiente of every apartment. Values arrive as human percent
// strings ("0.8542") and are stored as integers × 10 000. The sum is not
// forced to 100% here — the admin may assign them progressively; the UI
// shows a live sum so they can tell when the conjunto is fully assigned.
export async function updateUnitCoefficients(
  slug: string,
  input: { coefficients: Record<string, string> },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const conjunto = await getConjuntoById(cid);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const valid = new Set(
    allAptsArr(conjunto.towers, conjunto.aptsPerTower).map((a) => a.id),
  );
  const entries: { aptoKey: string; tower: string; apt: string; coefficient: number }[] =
    [];
  for (const [aptoKey, raw] of Object.entries(input.coefficients || {})) {
    if (!valid.has(aptoKey)) continue;
    const pct = parseFloat(String(raw ?? "").replace(",", "."));
    if (isNaN(pct) || pct < 0 || pct > 100)
      return { ok: false, error: `Coeficiente inválido para ${aptoKey}` };
    const [tower, apt] = aptoKey.split("-");
    entries.push({ aptoKey, tower, apt, coefficient: Math.round(pct * 10000) });
  }
  if (!entries.length)
    return { ok: false, error: "No hay coeficientes para guardar" };

  await upsertUnitCoefficients(cid, entries);
  await logAccess(cid, `admin:${session.username}`, "update_coefficients", cid);
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

// `mode` selects how `amount` is interpreted: "fijo" (default) bills that
// exact amount to every apartment; "coeficiente" treats it as the total
// monthly budget and splits it by each unit's coeficiente de copropiedad
// (units with coefficient 0 — or never assigned — get no charge).
export async function generateMonthlyCharges(
  slug: string,
  input: {
    period: string;
    amount: string;
    dueDate: string;
    concept?: string;
    mode?: string;
  },
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
  const mode = input.mode === "coeficiente" ? "coeficiente" : "fijo";

  const conjunto = await getConjuntoById(cid);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const apts = allAptsArr(conjunto.towers, conjunto.aptsPerTower);

  let amountByApt: Map<string, number>;
  if (mode === "coeficiente") {
    const unitRows = await listUnits(cid);
    amountByApt = distributeByCoefficient(amount, unitRows);
    if (!amountByApt.size)
      return {
        ok: false,
        error:
          "No hay coeficientes asignados — guarda los coeficientes de copropiedad primero",
      };
  } else {
    amountByApt = new Map(apts.map((a) => [a.id, amount]));
  }

  const rows = apts
    .filter((a) => (amountByApt.get(a.id) ?? 0) > 0)
    .map((a) => {
      const [tower, apt] = a.id.split("-");
      return {
        conjuntoId: cid,
        aptoKey: a.id,
        tower,
        apt,
        period,
        concept,
        amountEnc: encryptPII(String(amountByApt.get(a.id))),
        dueDate,
      };
    });
  if (rows.length) {
    // One row per (conjunto, apto, period, concept) is desired: skip apts
    // that already have a charge with this exact concept this period, so a
    // double-click doesn't double-bill anyone — but still allow a distinct
    // concept (e.g. an extraordinary charge) alongside the regular cuota in
    // the same period, since `concept` is admin-editable for exactly that.
    const existing = await db
      .select({ aptoKey: charges.aptoKey, concept: charges.concept })
      .from(charges)
      .where(and(eq(charges.conjuntoId, cid), eq(charges.period, period)));
    const already = new Set(existing.map((e) => `${e.aptoKey}::${e.concept}`));
    const toInsert = rows.filter((r) => !already.has(`${r.aptoKey}::${r.concept}`));
    if (toInsert.length) {
      await db.insert(charges).values(toInsert);

      // Ley 675/2001 art. 35: the fondo de imprevistos grows with a fixed
      // percentage of the presupuesto — this batch of cuotas is the closest
      // proxy this system has to "presupuesto" (no separate budget object
      // exists yet), so every batch contributes automatically. Skipped
      // duplicate rows (double-click) correctly don't count twice since
      // they're already excluded from toInsert.
      const totalGenerated = toInsert.reduce(
        (a, r) => a + (amountByApt.get(r.aptoKey) ?? 0),
        0,
      );
      const fondoAmount = Math.round(
        (totalGenerated * conjunto.fondoImprevistosPct) / 10000,
      );
      if (fondoAmount > 0) {
        await db.insert(reserveFundMovements).values({
          conjuntoId: cid,
          type: "aporte",
          amountEnc: encryptPII(String(fondoAmount)),
          conceptEnc: encryptPII(
            `Aporte automático al fondo de imprevistos (${period}, ${(conjunto.fondoImprevistosPct / 100).toFixed(2)}% de ${fmtCOP(totalGenerated)})`,
          ),
          movementDate: new Date(),
          registeredBy: session.username,
        });
      }
    }
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
  const method = clampPaymentMethod(input.method);
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

// --- Payment reminders ("recordatorios de cobro") ------------------------------

export type ReminderResult =
  | {
      ok: true;
      notified: number; // apts reached by WhatsApp API and/or push
      pushSent: number; // total devices that got a push
      // wa.me fallbacks for apts whose WhatsApp couldn't be sent server-side
      // (no Meta credentials). The admin opens them one by one.
      links: { aptoKey: string; amount: number; link: string }[];
      skipped: number; // apts in debt with no registered resident
    }
  | { ok: false; error: string };

// Sends a payment reminder to every apartment that currently owes money
// (saldo + mora > 0): a web push to its registered devices and a WhatsApp —
// direct when Meta credentials exist, otherwise returned as a wa.me link.
export async function sendPaymentReminders(
  slug: string,
): Promise<ReminderResult> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const conjunto = await getConjuntoById(cid);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const [summary, residents] = await Promise.all([
    getFinancialSummary(cid),
    listResidents(cid),
  ]);
  const phoneByApt = new Map(
    residents
      .filter((r) => r.status === "active")
      .map((r) => [r.aptoKey, r.phone]),
  );
  const debtors = summary.aptBalances.filter((b) => b.total > 0);
  if (!debtors.length)
    return { ok: true, notified: 0, pushSent: 0, links: [], skipped: 0 };

  let notified = 0;
  let pushSent = 0;
  let skipped = 0;
  const links: { aptoKey: string; amount: number; link: string }[] = [];

  for (const b of debtors) {
    const amount = Math.round(b.total);
    const [tower, apt] = b.aptoKey.split("-");
    const text =
      `Administración ${conjunto.name}: el apartamento ${apt} de la torre ` +
      `${(tower || "").replace(/^T/, "")} presenta un saldo pendiente de ` +
      `${fmtCOP(amount)} por cuotas de administración` +
      (b.mora > 0 ? " (incluye intereses de mora)" : "") +
      `. Puede consultar su estado de cuenta en el portal de residentes.`;

    const push = await sendPushToApt(cid, b.aptoKey, {
      title: "Recordatorio de pago",
      body: text,
      url: `/${slug}/residente/cuenta`,
      tag: `recordatorio-${b.aptoKey}`,
    });
    pushSent += push.sent;

    const phone = phoneByApt.get(b.aptoKey);
    if (!phone) {
      if (push.sent === 0) skipped++;
      else notified++;
      continue;
    }
    try {
      const wa = await sendWhatsApp(phone, text);
      if (wa.delivered || push.sent > 0) notified++;
      if (!wa.delivered) links.push({ aptoKey: b.aptoKey, amount, link: wa.link });
    } catch {
      // Meta API hiccup for this number: the wa.me link needs no credentials,
      // so it still works even though the automatic send failed — falling
      // back to "" would strand the admin with no way to reach the resident.
      if (push.sent > 0) notified++;
      links.push({ aptoKey: b.aptoKey, amount, link: waLink(phone, text) });
    }
  }

  await logAccess(
    cid,
    `admin:${session.username}`,
    "send_payment_reminders",
    `${debtors.length} unidades`,
  );
  revalidatePath(`/${slug}/admin`);
  return { ok: true, notified, pushSent, links, skipped };
}

// --- Payment agreements (acuerdos de pago) --------------------------------------

// Consolidates a unit's current debt (saldo + mora) into an installment plan:
// inserts a synthetic payment for the consolidated amount (so the old charges
// stop accruing further mora) plus one new charge per installment. From then
// on the installments behave like any other charge — mora accrues normally
// if one goes unpaid, so a broken agreement needs no special handling.
export async function createPaymentAgreement(
  slug: string,
  input: { aptoKey: string; installments: string; startDate: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const conjunto = await getConjuntoById(cid);
  if (!conjunto) return { ok: false, error: "Conjunto no encontrado" };

  const valid = new Set(
    allAptsArr(conjunto.towers, conjunto.aptsPerTower).map((a) => a.id),
  );
  if (!valid.has(input.aptoKey))
    return { ok: false, error: "Apartamento inválido" };

  const installments = clampInt(input.installments, 2, 36, 0);
  if (installments < 2)
    return { ok: false, error: "Elige entre 2 y 36 cuotas" };

  const startDate = new Date(input.startDate);
  if (isNaN(startDate.getTime()))
    return { ok: false, error: "Fecha de inicio inválida" };

  const [aptCharges, aptPayments] = await Promise.all([
    listChargesForApt(cid, input.aptoKey),
    listPaymentsForApt(cid, input.aptoKey),
  ]);
  const balance = computeAptBalance(
    aptCharges,
    aptPayments,
    conjunto.moraRatePct,
    conjunto.moraGraceDays,
  );
  const totalAmount = Math.round(balance.total);
  if (totalAmount <= 0)
    return { ok: false, error: "La unidad no tiene saldo pendiente que acordar" };

  const [tower, apt] = input.aptoKey.split("-");
  const cuotas = splitEvenly(totalAmount, installments);

  // Consolidating payment: offsets every existing overdue charge (oldest
  // first, per computeAptBalance's rules) so mora stops accruing on them.
  await db.insert(payments).values({
    conjuntoId: cid,
    aptoKey: input.aptoKey,
    tower,
    apt,
    amountEnc: encryptPII(String(totalAmount)),
    method: "acuerdo_pago",
    paidAt: new Date(),
    registeredBy: session.username,
    noteEnc: encryptPII(`Consolidado en acuerdo de pago a ${installments} cuotas`),
  });

  await db.insert(charges).values(
    cuotas.map((amount, i) => {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      return {
        conjuntoId: cid,
        aptoKey: input.aptoKey,
        tower,
        apt,
        period: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`,
        concept: `Acuerdo de pago (cuota ${i + 1}/${installments})`,
        amountEnc: encryptPII(String(amount)),
        dueDate,
      };
    }),
  );

  await db.insert(paymentAgreements).values({
    conjuntoId: cid,
    aptoKey: input.aptoKey,
    tower,
    apt,
    totalAmountEnc: encryptPII(String(totalAmount)),
    installments,
    startDate,
    registeredBy: session.username,
  });

  await logAccess(
    cid,
    `admin:${session.username}`,
    "create_payment_agreement",
    input.aptoKey,
  );
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

// --- Fondo de imprevistos (reserve fund) ----------------------------------------

// Ley 675/2001 art. 35 sets the floor, not a ceiling: raising the percentage
// is always allowed, only going below the legal minimum is blocked.
export async function updateFondoConfig(
  slug: string,
  input: { fondoImprevistosPct: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const pct = clampInt(input.fondoImprevistosPct, 0, 100000, -1);
  if (pct < 0) return { ok: false, error: "Porcentaje inválido" };
  if (pct < FONDO_IMPREVISTOS_MIN_PCT)
    return {
      ok: false,
      error: `El fondo de imprevistos no puede ser menor al mínimo legal de ${(FONDO_IMPREVISTOS_MIN_PCT / 100).toFixed(2)}% del presupuesto (Ley 675 de 2001, art. 35)`,
    };
  await db
    .update(conjuntos)
    .set({ fondoImprevistosPct: pct })
    .where(eq(conjuntos.id, cid));
  await logAccess(cid, `admin:${session.username}`, "update_fondo_config", cid);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

// Manual movement: a rendimiento financiero, an assembly-approved extra
// aporte, or a retiro to cover an approved imprevisto. Automatic aportes from
// generateMonthlyCharges don't go through here.
export async function registerFondoMovement(
  slug: string,
  input: { type: string; amount: string; concept: string; date: string },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const type = input.type === "retiro" ? "retiro" : "aporte";
  const amount = clampAmount(input.amount);
  if (amount <= 0) return { ok: false, error: "Ingresa un monto válido" };
  const concept = clampText(input.concept, 200);
  if (!concept) return { ok: false, error: "Ingresa un concepto" };
  const movementDate = input.date ? new Date(input.date) : new Date();
  if (isNaN(movementDate.getTime()))
    return { ok: false, error: "Fecha inválida" };

  if (type === "retiro") {
    const movements = await listFondoMovements(cid);
    const balance = movements.reduce(
      (a, m) => a + (m.type === "aporte" ? m.amount : -m.amount),
      0,
    );
    if (amount > balance)
      return {
        ok: false,
        error: `El retiro (${fmtCOP(amount)}) supera el saldo disponible del fondo (${fmtCOP(balance)})`,
      };
  }

  await db.insert(reserveFundMovements).values({
    conjuntoId: cid,
    type,
    amountEnc: encryptPII(String(amount)),
    conceptEnc: encryptPII(concept),
    movementDate,
    registeredBy: session.username,
  });
  await logAccess(
    cid,
    `admin:${session.username}`,
    "register_fondo_movement",
    type,
  );
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

// Pure balance/mora math, kept independent of the DB layer so it's easy to
// unit test. Amounts are plain numbers here — encryption/decryption happens
// at the query layer (src/db/queries.ts), same split as resident phones.

// Legal ceiling for `conjuntos.moraRatePct` (percent × 100, same encoding as
// the column). Colombian mora on cuotas de administración is capped at 1.5×
// the interés bancario corriente (art. 884 Código de Comercio, modificado por
// el art. 111 de la Ley 510 de 1999) — for Ley 675/2001 expensas comunes that
// is the same "tasa de usura" the Superfinanciera certifies MONTHLY (not
// quarterly). As of julio 2026 it's 28.79% EA (1.5× un IBC de 19.19% EA),
// ≈ 2.13% efectivo mensual — https://www.superfinanciera.gov.co.
//
// That rate moves every month. /api/cron/usura fetches the certified IBC
// from the Superfinanciera dataset on datos.gov.co into `usura_rates`, and
// getEffectiveMoraCapPct (src/db/queries.ts) enforces min(this constant,
// latest derived monthly cap) — so this constant is the conservative
// fallback for when the cron hasn't run yet, and a hard ceiling it can
// never raise. Setting mora above the true legal cap doesn't just risk a
// fine: art. 884 says the creditor loses ALL the interest, not just the
// excess.
export const MORA_RATE_CAP_PCT = 200; // 2.00% mensual (margen bajo ~2.13% actual)

// Derives the monthly mora ceiling from a certified IBC (efectivo anual):
// usura EA = 1.5 × IBC (art. 884 C.Co), converted to its monthly effective
// equivalent (1 + EA)^(1/12) − 1. Input and output use the app-wide % × 100
// encoding (19.19% EA → 1919 → returns 212 = 2.12% mensual). Math.floor,
// not round: always err below the legal cap, never above it.
export function monthlyCapFromIbcEa(ibcEaPct: number): number {
  const usuraEaFrac = (ibcEaPct * 1.5) / 10000;
  const monthlyFrac = Math.pow(1 + usuraEaFrac, 1 / 12) - 1;
  return Math.floor(monthlyFrac * 10000);
}

export type ChargeInput = {
  id: string;
  aptoKey: string;
  period: string; // "YYYY-MM"
  amount: number;
  dueDate: Date;
};

export type PaymentInput = {
  aptoKey: string;
  amount: number;
  paidAt: Date;
};

// Past-due amounts bucketed by days overdue ("antigüedad de cartera").
// Only unpaid remainders past their dueDate count; d90plus is > 90 days.
export type Aging = {
  d30: number;
  d60: number;
  d90: number;
  d90plus: number;
};

export type AptBalance = {
  aptoKey: string;
  totalCargado: number;
  totalPagado: number;
  saldo: number; // > 0 = owes money (after payments, before mora)
  mora: number;
  total: number; // saldo + mora
  enMora: boolean;
  aging: Aging;
};

const DAY_MS = 86_400_000;

// Applies payments to charges oldest-period-first (the common "pay the
// oldest debt first" convention for condo fees), then accrues simple
// (non-compounding) mora interest on whatever remains unpaid past
// dueDate + graceDays, prorated by days overdue / 30.
export function computeAptBalance(
  charges: ChargeInput[],
  payments: PaymentInput[],
  moraRatePct: number,
  moraGraceDays: number,
  asOf: Date = new Date(),
): AptBalance {
  const aptoKey = charges[0]?.aptoKey ?? payments[0]?.aptoKey ?? "";
  const totalCargado = charges.reduce((a, c) => a + c.amount, 0);
  const totalPagado = payments.reduce((a, p) => a + p.amount, 0);

  const ordered = [...charges].sort((a, b) => a.period.localeCompare(b.period));
  let pool = totalPagado;
  let mora = 0;
  const aging: Aging = { d30: 0, d60: 0, d90: 0, d90plus: 0 };

  for (const c of ordered) {
    const applied = Math.min(pool, c.amount);
    pool -= applied;
    const remaining = c.amount - applied;
    if (remaining <= 0) continue;

    const dueWithGrace = c.dueDate.getTime() + moraGraceDays * DAY_MS;
    const daysOverdue = (asOf.getTime() - dueWithGrace) / DAY_MS;
    if (daysOverdue > 0) {
      mora += remaining * (moraRatePct / 100 / 100) * (daysOverdue / 30);
    }

    // Aging buckets ignore the grace period: they answer "how old is the
    // debt", while mora answers "what does the delay cost".
    const daysPastDue = (asOf.getTime() - c.dueDate.getTime()) / DAY_MS;
    if (daysPastDue > 90) aging.d90plus += remaining;
    else if (daysPastDue > 60) aging.d90 += remaining;
    else if (daysPastDue > 30) aging.d60 += remaining;
    else if (daysPastDue > 0) aging.d30 += remaining;
  }

  const saldo = totalCargado - totalPagado;
  return {
    aptoKey,
    totalCargado,
    totalPagado,
    saldo,
    mora,
    total: saldo + mora,
    enMora: mora > 0,
    aging,
  };
}

// Splits a monthly budget among units proportionally to their coeficiente de
// copropiedad (integer, percent × 10 000; see units.coefficient in the
// schema). Distribution is over the actual sum of coefficients, so it still
// works while the admin has only partially assigned them. Largest-remainder
// rounding guarantees the per-unit amounts add up to exactly `budget`.
// Zero-coefficient units get no charge.
export function distributeByCoefficient(
  budget: number,
  coefficients: { aptoKey: string; coefficient: number }[],
): Map<string, number> {
  const out = new Map<string, number>();
  const positive = coefficients.filter((c) => c.coefficient > 0);
  const totalCoef = positive.reduce((a, c) => a + c.coefficient, 0);
  if (budget <= 0 || totalCoef <= 0) return out;

  let assigned = 0;
  const shares = positive.map((c) => {
    const exact = (budget * c.coefficient) / totalCoef;
    const floor = Math.floor(exact);
    assigned += floor;
    return { aptoKey: c.aptoKey, floor, frac: exact - floor };
  });

  shares.sort((a, b) => b.frac - a.frac);
  let remainder = budget - assigned;
  for (const s of shares) {
    out.set(s.aptoKey, s.floor + (remainder > 0 ? 1 : 0));
    remainder--;
  }
  return out;
}

// Splits a total into `n` whole-peso installments that sum back to exactly
// `total` (largest-remainder rounding, same technique as
// distributeByCoefficient) — used to turn a unit's consolidated debt into an
// acuerdo de pago's monthly cuotas.
export function splitEvenly(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  let remainder = total - base * n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(base + (remainder > 0 ? 1 : 0));
    remainder--;
  }
  return out;
}

// Ley 675/2001 art. 35: floor an admin can't configure `fondoImprevistosPct`
// below — 1.00% (percent × 100, same encoding as the column). Raising it is
// always allowed; this only blocks going under the legal minimum.
export const FONDO_IMPREVISTOS_MIN_PCT = 100; // 1.00%

export type FondoMovementInput = {
  type: "aporte" | "retiro";
  amount: number;
};

// Running balance of the fondo de imprevistos: aportes minus retiros, in the
// order they were recorded (order doesn't actually matter for a plain sum,
// but callers pass movements chronologically for a readable running ledger).
export function computeFondoBalance(movements: FondoMovementInput[]): number {
  return movements.reduce(
    (a, m) => a + (m.type === "aporte" ? m.amount : -m.amount),
    0,
  );
}

export type ConjuntoSummary = {
  aptBalances: AptBalance[];
  carteraTotal: number;
  recaudoTotal: number;
  moraTotal: number;
  gastoTotal: number;
  parqueaderoTotal: number;
  balanceNeto: number;
  agingTotals: Aging;
};

// `allParkingIncomes` are the COP amounts charged on visitor-parking exits
// (parking_sessions.amount) — the guard's caja. They count as income in the
// net balance alongside the recaudo of cuotas.
export function computeConjuntoSummary(
  allCharges: ChargeInput[],
  allPayments: PaymentInput[],
  allExpenses: number[],
  allParkingIncomes: number[],
  moraRatePct: number,
  moraGraceDays: number,
  asOf: Date = new Date(),
): ConjuntoSummary {
  const aptoKeys = new Set([
    ...allCharges.map((c) => c.aptoKey),
    ...allPayments.map((p) => p.aptoKey),
  ]);

  const aptBalances = [...aptoKeys].map((aptoKey) =>
    computeAptBalance(
      allCharges.filter((c) => c.aptoKey === aptoKey),
      allPayments.filter((p) => p.aptoKey === aptoKey),
      moraRatePct,
      moraGraceDays,
      asOf,
    ),
  );

  const carteraTotal = aptBalances.reduce((a, b) => a + Math.max(0, b.saldo), 0);
  const recaudoTotal = allPayments.reduce((a, p) => a + p.amount, 0);
  const moraTotal = aptBalances.reduce((a, b) => a + b.mora, 0);
  const gastoTotal = allExpenses.reduce((a, b) => a + b, 0);
  const parqueaderoTotal = allParkingIncomes.reduce((a, b) => a + b, 0);
  const agingTotals = aptBalances.reduce(
    (a, b) => ({
      d30: a.d30 + b.aging.d30,
      d60: a.d60 + b.aging.d60,
      d90: a.d90 + b.aging.d90,
      d90plus: a.d90plus + b.aging.d90plus,
    }),
    { d30: 0, d60: 0, d90: 0, d90plus: 0 },
  );

  return {
    aptBalances,
    carteraTotal,
    recaudoTotal,
    moraTotal,
    gastoTotal,
    parqueaderoTotal,
    balanceNeto: recaudoTotal + parqueaderoTotal - gastoTotal,
    agingTotals,
  };
}

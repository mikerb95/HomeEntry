// Pure balance/mora math, kept independent of the DB layer so it's easy to
// unit test. Amounts are plain numbers here — encryption/decryption happens
// at the query layer (src/db/queries.ts), same split as resident phones.

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

export type AptBalance = {
  aptoKey: string;
  totalCargado: number;
  totalPagado: number;
  saldo: number; // > 0 = owes money (after payments, before mora)
  mora: number;
  total: number; // saldo + mora
  enMora: boolean;
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

export type ConjuntoSummary = {
  aptBalances: AptBalance[];
  carteraTotal: number;
  recaudoTotal: number;
  moraTotal: number;
  gastoTotal: number;
  parqueaderoTotal: number;
  balanceNeto: number;
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

  return {
    aptBalances,
    carteraTotal,
    recaudoTotal,
    moraTotal,
    gastoTotal,
    parqueaderoTotal,
    balanceNeto: recaudoTotal + parqueaderoTotal - gastoTotal,
  };
}

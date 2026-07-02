import { describe, it, expect } from "vitest";
import {
  computeAptBalance,
  computeConjuntoSummary,
  distributeByCoefficient,
} from "./finance";

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

describe("computeAptBalance", () => {
  it("charge not yet due accrues no mora", () => {
    const b = computeAptBalance(
      [{ id: "1", aptoKey: "T1-101", period: "2026-01", amount: 100000, dueDate: day(31) }],
      [],
      250, // 2.50%
      0,
      day(10),
    );
    expect(b.saldo).toBe(100000);
    expect(b.mora).toBe(0);
    expect(b.enMora).toBe(false);
  });

  it("unpaid overdue charge accrues mora proportional to days overdue", () => {
    // Due day(1), grace 0, asOf day(31) -> 30 days overdue -> 1 month of mora.
    const b = computeAptBalance(
      [{ id: "1", aptoKey: "T1-101", period: "2026-01", amount: 100000, dueDate: day(1) }],
      [],
      250, // 2.50% per month
      0,
      day(31),
    );
    expect(b.saldo).toBe(100000);
    expect(b.mora).toBeCloseTo(2500, 0); // 2.5% of 100000
    expect(b.enMora).toBe(true);
  });

  it("grace period delays mora accrual", () => {
    const b = computeAptBalance(
      [{ id: "1", aptoKey: "T1-101", period: "2026-01", amount: 100000, dueDate: day(1) }],
      [],
      250,
      10, // 10-day grace
      day(5), // still within grace
    );
    expect(b.mora).toBe(0);
    expect(b.enMora).toBe(false);
  });

  it("payment fully covering the charge stops mora", () => {
    const b = computeAptBalance(
      [{ id: "1", aptoKey: "T1-101", period: "2026-01", amount: 100000, dueDate: day(1) }],
      [{ aptoKey: "T1-101", amount: 100000, paidAt: day(2) }],
      250,
      0,
      day(31),
    );
    expect(b.saldo).toBe(0);
    expect(b.mora).toBe(0);
  });

  it("partial payment applies to the oldest charge first", () => {
    const charges = [
      { id: "2", aptoKey: "T1-101", period: "2026-02", amount: 100000, dueDate: day(28) },
      { id: "1", aptoKey: "T1-101", period: "2026-01", amount: 100000, dueDate: day(1) },
    ];
    const payments = [{ aptoKey: "T1-101", amount: 100000, paidAt: day(2) }];
    const b = computeAptBalance(charges, payments, 250, 0, day(31));
    // The Jan charge (oldest) is fully paid, so only Feb's 100000 remains
    // and Feb isn't overdue yet on day(31) relative to due day(28)+grace0
    // -> actually day(31) is 3 days past Feb due date.
    expect(b.saldo).toBe(100000);
    expect(b.mora).toBeGreaterThan(0);
    expect(b.mora).toBeLessThan(2500); // less than a full month's mora
  });
});

describe("computeConjuntoSummary", () => {
  it("aggregates cartera, recaudo, mora and net balance across apartments", () => {
    const charges = [
      { id: "1", aptoKey: "T1-101", period: "2026-01", amount: 100000, dueDate: day(1) },
      { id: "2", aptoKey: "T1-102", period: "2026-01", amount: 100000, dueDate: day(1) },
    ];
    const payments = [{ aptoKey: "T1-102", amount: 100000, paidAt: day(2) }];
    const summary = computeConjuntoSummary(
      charges,
      payments,
      [30000, 20000],
      [3000, 6000], // visitor-parking charges collected at the gate
      250,
      0,
      day(31),
    );
    expect(summary.carteraTotal).toBe(100000); // only T1-101 owes
    expect(summary.recaudoTotal).toBe(100000);
    expect(summary.moraTotal).toBeCloseTo(2500, 0);
    expect(summary.gastoTotal).toBe(50000);
    expect(summary.parqueaderoTotal).toBe(9000);
    // 100000 recaudo + 9000 parqueadero - 50000 gastos
    expect(summary.balanceNeto).toBe(59000);
  });
});

describe("distributeByCoefficient", () => {
  it("splits the budget proportionally and sums exactly to the budget", () => {
    // Coefficients 40% / 35% / 25% over a budget that doesn't divide evenly.
    const out = distributeByCoefficient(1000001, [
      { aptoKey: "T1-101", coefficient: 400000 },
      { aptoKey: "T1-102", coefficient: 350000 },
      { aptoKey: "T1-103", coefficient: 250000 },
    ]);
    const total = [...out.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(1000001);
    expect(out.get("T1-101")).toBeGreaterThan(out.get("T1-102")!);
    expect(out.get("T1-102")).toBeGreaterThan(out.get("T1-103")!);
  });

  it("distributes over the actual coefficient sum when partially assigned", () => {
    // Only two units have coefficients (sum 50%): they split the whole budget.
    const out = distributeByCoefficient(300000, [
      { aptoKey: "T1-101", coefficient: 300000 },
      { aptoKey: "T1-102", coefficient: 200000 },
      { aptoKey: "T1-103", coefficient: 0 },
    ]);
    expect(out.get("T1-101")).toBe(180000);
    expect(out.get("T1-102")).toBe(120000);
    expect(out.has("T1-103")).toBe(false);
  });

  it("equal coefficients with an indivisible budget stay within 1 peso", () => {
    const out = distributeByCoefficient(100, [
      { aptoKey: "A", coefficient: 10000 },
      { aptoKey: "B", coefficient: 10000 },
      { aptoKey: "C", coefficient: 10000 },
    ]);
    const values = [...out.values()];
    expect(values.reduce((a, b) => a + b, 0)).toBe(100);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });

  it("returns empty when there is no budget or no coefficients", () => {
    expect(distributeByCoefficient(0, [{ aptoKey: "A", coefficient: 1 }]).size).toBe(0);
    expect(distributeByCoefficient(1000, []).size).toBe(0);
  });
});

describe("aging (antigüedad de cartera)", () => {
  it("buckets unpaid remainders by days past due", () => {
    const charges = [
      { id: "1", aptoKey: "T1-101", period: "2025-09", amount: 100000, dueDate: day(-95) },
      { id: "2", aptoKey: "T1-101", period: "2025-11", amount: 100000, dueDate: day(-45) },
      { id: "3", aptoKey: "T1-101", period: "2026-01", amount: 100000, dueDate: day(5) },
    ];
    // Payment covers the oldest charge in full; the -45d one stays unpaid.
    const b = computeAptBalance(
      charges,
      [{ aptoKey: "T1-101", amount: 100000, paidAt: day(1) }],
      0,
      0,
      day(10),
    );
    expect(b.aging.d90plus).toBe(0); // oldest was paid
    expect(b.aging.d60).toBe(100000); // 55 days past due
    expect(b.aging.d30).toBe(0); // 2026-01 charge is not yet due (due day 5 vs asOf day 10 → 5 days past due)
  });

  it("a charge overdue 5 days lands in the 1-30 bucket", () => {
    const b = computeAptBalance(
      [{ id: "1", aptoKey: "T1-101", period: "2026-01", amount: 50000, dueDate: day(5) }],
      [],
      0,
      0,
      day(10),
    );
    expect(b.aging.d30).toBe(50000);
  });
});

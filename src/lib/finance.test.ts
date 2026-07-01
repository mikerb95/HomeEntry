import { describe, it, expect } from "vitest";
import { computeAptBalance, computeConjuntoSummary } from "./finance";

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

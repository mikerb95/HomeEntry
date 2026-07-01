import { describe, it, expect } from "vitest";
import { computeParkingCharge } from "./parking";

const t0 = new Date("2026-07-01T08:00:00-05:00");
const after = (min: number) => new Date(t0.getTime() + min * 60000);

describe("computeParkingCharge", () => {
  it("bills the started hour in full (hora o fracción)", () => {
    const c = computeParkingCharge(t0, after(5), 3000, true);
    expect(c.hours).toBe(1);
    expect(c.amount).toBe(3000);
  });

  it("rounds up to the next hour past the boundary", () => {
    const c = computeParkingCharge(t0, after(61), 3000, true);
    expect(c.hours).toBe(2);
    expect(c.amount).toBe(6000);
  });

  it("bills an exact multiple of an hour without rounding up", () => {
    const c = computeParkingCharge(t0, after(120), 3000, true);
    expect(c.hours).toBe(2);
    expect(c.amount).toBe(6000);
  });

  it("charges residents nothing but still reports hours", () => {
    const c = computeParkingCharge(t0, after(200), 3000, false);
    expect(c.hours).toBe(4);
    expect(c.amount).toBe(0);
  });

  it("uses the per-kind rate it is given (moto)", () => {
    const c = computeParkingCharge(t0, after(90), 1500, true);
    expect(c.hours).toBe(2);
    expect(c.amount).toBe(3000);
  });

  it("bills the 1-hour minimum when enteredAt is missing (legacy rows)", () => {
    const c = computeParkingCharge(null, after(0), 3000, true);
    expect(c.hours).toBe(1);
    expect(c.amount).toBe(3000);
  });

  it("bills the 1-hour minimum on clock skew (enteredAt in the future)", () => {
    const c = computeParkingCharge(after(10), t0, 3000, true);
    expect(c.hours).toBe(1);
    expect(c.amount).toBe(3000);
  });
});

// Pure entry/exit billing math for visitor parking, kept independent of the
// DB layer so it's easy to unit test (same split as src/lib/finance.ts).
// Amounts are plain COP integers; rates come from the conjunto config the
// admin maintains (visitorRate for cars, visitorRateMoto for motos).

const HOUR_MS = 3_600_000;

export type ParkingCharge = {
  hours: number; // billed hours (entry→exit rounded up, minimum 1)
  amount: number; // COP to collect on exit (0 for residents)
};

// Started hours are billed in full — the standard Colombian "hora o fracción"
// parking convention — so 5 minutes bills 1 hour and 61 minutes bills 2.
// Residents park free but their session still records the real duration for
// the usage-ranking audit views. A missing/future enteredAt (legacy rows
// assigned before billing existed, or clock skew) bills the 1-hour minimum
// rather than something absurd.
export function computeParkingCharge(
  enteredAt: Date | null,
  exitedAt: Date,
  ratePerHour: number,
  isVisitor: boolean,
): ParkingCharge {
  const elapsed = enteredAt ? exitedAt.getTime() - enteredAt.getTime() : 0;
  const hours = Math.max(1, Math.ceil(elapsed / HOUR_MS));
  return { hours, amount: isVisitor ? hours * ratePerHour : 0 };
}

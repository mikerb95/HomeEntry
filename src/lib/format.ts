export function digits(s: string | null | undefined): string {
  return (s || "").replace(/\D/g, "");
}

// Trim + hard length cap for free-text fields persisted from user input, so a
// single field can't be used to store unbounded content (auditoria1.MD S-11).
export function clampText(
  s: string | null | undefined,
  max: number,
): string {
  return (s || "").trim().slice(0, max);
}

// Colombian plate patterns. Cars: 3 letters + 3 digits (ABC123).
// Motos: 3 letters + 2 digits + 1 letter (ABC12D).
const PLATE_CAR = /^[A-Z]{3}\d{3}$/;
const PLATE_MOTO = /^[A-Z]{3}\d{2}[A-Z]$/;

export type VehicleKind = "car" | "moto";

// Uppercase + strip anything that isn't a letter or digit, so "abc-123" and
// "abc 123" both normalize to the canonical "ABC123" used for storage/checks.
export function normalizePlate(s: string | null | undefined): string {
  return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Validate a plate. Colombian plates must match the car/moto pattern; foreign
// plates skip the pattern and only require some plausible alphanumeric content.
export function isValidPlate(
  plate: string | null | undefined,
  kind: VehicleKind,
  foreign = false,
): boolean {
  const p = normalizePlate(plate);
  if (foreign) return p.length >= 4 && p.length <= 10;
  return (kind === "moto" ? PLATE_MOTO : PLATE_CAR).test(p);
}

export function fmtPhone(p: string | null | undefined): string {
  const d = digits(p);
  return d.length === 10
    ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
    : d;
}

// Masks all but the last two digits, e.g. "3001234567" -> "•••• ••• ••67".
// Used when staff need to cross-check a phone during approval without the full
// number being exposed to them (keeps the PII discipline of the guard screen).
export function maskPhone(p: string | null | undefined): string {
  const d = digits(p);
  if (d.length < 2) return "••••";
  const shown = d.slice(-2);
  return `•••• ••• ••${shown}`;
}

export function fmtCOP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

export function fmtTime(ts: Date | number | string): string {
  try {
    return new Date(ts).toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function fmtDateTime(ts: Date | number | string): string {
  try {
    return new Date(ts).toLocaleString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function todayStr(): string {
  return new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isToday(ts: Date | number | string): boolean {
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
}

export function isThisMonth(ts: Date | number | string): boolean {
  const d = new Date(ts);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

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

export function fmtPhone(p: string | null | undefined): string {
  const d = digits(p);
  return d.length === 10
    ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
    : d;
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

// Shared visual metadata mirrored from the design prototype.

export type ParkingStatus = "free" | "resident" | "visitor";
export type EventType = "visita" | "encomienda" | "parqueadero" | "mensaje";
export type GrantStatus = "vigente" | "usado" | "vencido";

export const statusMeta: Record<
  ParkingStatus,
  { bg: string; border: string; fg: string; label: string; dot: string }
> = {
  free: {
    bg: "#E9F8EE",
    border: "#7FD79B",
    fg: "#15803D",
    label: "Libre",
    dot: "#22C55E",
  },
  resident: {
    bg: "#FDE7EA",
    border: "#F19AA8",
    fg: "#BE123C",
    label: "Residente",
    dot: "#E11D48",
  },
  visitor: {
    bg: "#FEF3DC",
    border: "#F4CE7A",
    fg: "#B45309",
    label: "Visitante",
    dot: "#F59E0B",
  },
};

export const typeMeta: Record<
  EventType,
  { label: string; bg: string; fg: string }
> = {
  visita: { label: "Visita", bg: "#EAF1FF", fg: "#1E4FD6" },
  encomienda: { label: "Paquete", bg: "#FEF3DC", fg: "#B45309" },
  parqueadero: { label: "Parqueadero", bg: "#E9F8EE", fg: "#15803D" },
  mensaje: { label: "Mensaje", bg: "#EEE9FF", fg: "#6D28D9" },
};

export const notifMeta: Record<
  EventType,
  { icon: string; color: string; soft: string; title: string }
> = {
  visita: { icon: "V", color: "#2F6BFF", soft: "#EAF1FF", title: "Visita" },
  encomienda: {
    icon: "P",
    color: "#D97706",
    soft: "#FEF3DC",
    title: "Paquete",
  },
  parqueadero: {
    icon: "C",
    color: "#16A34A",
    soft: "#E9F8EE",
    title: "Parqueadero",
  },
  mensaje: {
    icon: "!",
    color: "#6D28D9",
    soft: "#EEE9FF",
    title: "Administración",
  },
};

export const authStMeta: Record<
  GrantStatus,
  { bg: string; fg: string; label: string }
> = {
  vigente: { bg: "#E9F8EE", fg: "#15803D", label: "Vigente" },
  usado: { bg: "#EAF1FF", fg: "#1E4FD6", label: "Usado" },
  vencido: { bg: "#FDE7EA", fg: "#BE123C", label: "Vencido" },
};

// Tower / apartment helpers derived from config.
export function towersArr(towers: number) {
  return Array.from({ length: towers }, (_, i) => ({
    id: "T" + (i + 1),
    label: "Torre " + (i + 1),
  }));
}

export function aptsArr(aptsPerTower: number, towerId: string) {
  if (!towerId) return [];
  return Array.from({ length: aptsPerTower }, (_, i) => {
    const n = String(101 + i);
    return { id: n, label: "Apto " + n };
  });
}

export function allAptsArr(towers: number, aptsPerTower: number) {
  const out: { id: string; label: string }[] = [];
  towersArr(towers).forEach((t) => {
    for (let i = 0; i < aptsPerTower; i++) {
      const n = String(101 + i);
      out.push({ id: t.id + "-" + n, label: t.id + " · Apto " + n });
    }
  });
  return out;
}

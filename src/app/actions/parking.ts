"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conjuntos, events, parkingSessions, parkingSpots } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { fmtCOP, clampText, isValidPlate } from "@/lib/format";
import { computeParkingCharge } from "@/lib/parking";

type Result = { ok: boolean; error?: string };

// What freeParking reports back so the guard UI can tell the vigilante how
// much to collect at the gate before the vehicle leaves.
export type FreeResult = Result & {
  charge?: { hours: number; amount: number; plate: string };
};

// Parking can be managed by either guard or admin of the conjunto in the URL.
async function requireStaff(slug: string) {
  const s = await getSession();
  if (
    !s ||
    (s.role !== "guard" && s.role !== "admin") ||
    s.conjuntoSlug !== slug
  ) {
    throw new Error("No autorizado");
  }
  return s;
}

export async function assignParking(
  slug: string,
  input: {
    spotId: string;
    plate: string;
    aptoKey: string;
    kind: "resident" | "visitor";
    foreign?: boolean;
  },
): Promise<Result> {
  const session = await requireStaff(slug);
  const cid = session.conjuntoId;
  const plate = clampText(input.plate, 12).toUpperCase();
  if (!plate) return { ok: false, error: "Ingresa la placa del vehículo" };
  if (!input.aptoKey) return { ok: false, error: "Selecciona el apartamento" };

  // The spot itself determines whether the plate must match the car or moto
  // pattern; foreign plates skip that check.
  const [spot] = await db
    .select({ kind: parkingSpots.kind })
    .from(parkingSpots)
    .where(
      and(eq(parkingSpots.conjuntoId, cid), eq(parkingSpots.id, input.spotId)),
    );
  if (!spot) return { ok: false, error: "Parqueadero no encontrado" };

  const vehicleKind = spot.kind === "moto" ? "moto" : "car";
  if (!isValidPlate(plate, vehicleKind, input.foreign)) {
    return {
      ok: false,
      error: input.foreign
        ? "Placa extranjera no válida"
        : vehicleKind === "moto"
          ? "Placa de moto inválida (formato ABC12D)"
          : "Placa de carro inválida (formato ABC123)",
    };
  }

  const status = input.kind === "visitor" ? "visitor" : "resident";
  await db
    .update(parkingSpots)
    .set({ status, plate, aptoKey: input.aptoKey, enteredAt: new Date() })
    .where(
      and(eq(parkingSpots.conjuntoId, cid), eq(parkingSpots.id, input.spotId)),
    );

  const [tower, apt] = input.aptoKey.split("-");
  await db.insert(events).values({
    conjuntoId: cid,
    type: "parqueadero",
    tower,
    apto: apt,
    detail: `Placa ${plate} en ${input.spotId} (${
      status === "visitor" ? "Visitante" : "Residente"
    })`,
  });

  revalidatePath(`/${slug}/porteria`);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

export async function freeParking(
  slug: string,
  spotId: string,
): Promise<Result> {
  const session = await requireStaff(slug);
  const cid = session.conjuntoId;
  await db
    .update(parkingSpots)
    .set({ status: "free", plate: "", aptoKey: "" })
    .where(and(eq(parkingSpots.conjuntoId, cid), eq(parkingSpots.id, spotId)));
  revalidatePath(`/${slug}/porteria`);
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

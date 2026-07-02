"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
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

  // Conditional on the spot still being free: with two guards (or a stale
  // panel) an unconditional update would silently overwrite an active
  // assignment — losing the previous vehicle's entry and its exit charge.
  const status = input.kind === "visitor" ? "visitor" : "resident";
  const updated = await db
    .update(parkingSpots)
    .set({ status, plate, aptoKey: input.aptoKey, enteredAt: new Date() })
    .where(
      and(
        eq(parkingSpots.conjuntoId, cid),
        eq(parkingSpots.id, input.spotId),
        eq(parkingSpots.status, "free"),
      ),
    )
    .returning({ id: parkingSpots.id });
  if (updated.length === 0) {
    revalidatePath(`/${slug}/porteria`);
    revalidatePath(`/${slug}/admin`);
    return { ok: false, error: "Ese parqueadero ya está ocupado" };
  }

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

// Registers the vehicle's exit: frees the spot, closes the parking session
// with the billed hours/amount (visitors pay hora o fracción at the per-kind
// rate the admin configured; residents park free) and logs the event. The
// session row is what the daily caja and the financial summary aggregate.
export async function freeParking(
  slug: string,
  spotId: string,
): Promise<FreeResult> {
  const session = await requireStaff(slug);
  const cid = session.conjuntoId;

  const [spot] = await db
    .select()
    .from(parkingSpots)
    .where(and(eq(parkingSpots.conjuntoId, cid), eq(parkingSpots.id, spotId)));
  if (!spot) return { ok: false, error: "Parqueadero no encontrado" };
  if (spot.status === "free") {
    revalidatePath(`/${slug}/porteria`);
    revalidatePath(`/${slug}/admin`);
    return { ok: true };
  }

  const [config] = await db
    .select({
      visitorRate: conjuntos.visitorRate,
      visitorRateMoto: conjuntos.visitorRateMoto,
    })
    .from(conjuntos)
    .where(eq(conjuntos.id, cid));
  const rate =
    spot.kind === "moto" ? config.visitorRateMoto : config.visitorRate;
  const isVisitor = spot.status === "visitor";
  const now = new Date();
  const { hours, amount } = computeParkingCharge(
    spot.enteredAt,
    now,
    rate,
    isVisitor,
  );

  // Free the spot first, conditionally: only the caller that actually flips
  // it (still occupied, same plate we read) records the session, so two
  // simultaneous exits can't double-bill the caja. The plate check also
  // protects against the spot having been reassigned mid-flight.
  const freed = await db
    .update(parkingSpots)
    .set({ status: "free", plate: "", aptoKey: "", enteredAt: null })
    .where(
      and(
        eq(parkingSpots.conjuntoId, cid),
        eq(parkingSpots.id, spotId),
        ne(parkingSpots.status, "free"),
        eq(parkingSpots.plate, spot.plate),
      ),
    )
    .returning({ id: parkingSpots.id });
  if (freed.length === 0) {
    // Someone else already freed (or reassigned) it — nothing to bill here.
    revalidatePath(`/${slug}/porteria`);
    revalidatePath(`/${slug}/admin`);
    return { ok: true };
  }

  await db.insert(parkingSessions).values({
    conjuntoId: cid,
    type: isVisitor ? "visitor" : "resident",
    aptoKey: spot.aptoKey,
    kind: spot.kind,
    plate: spot.plate,
    hours,
    amount,
    start: spot.enteredAt ?? now,
  });

  const [tower, apt] = spot.aptoKey.split("-");
  await db.insert(events).values({
    conjuntoId: cid,
    type: "parqueadero",
    tower: tower ?? "",
    apto: apt ?? "",
    detail:
      `Salida placa ${spot.plate} de ${spotId} · ${hours} h` +
      (isVisitor ? ` · Cobro ${fmtCOP(amount)}` : " (Residente)"),
  });

  revalidatePath(`/${slug}/porteria`);
  revalidatePath(`/${slug}/admin`);
  return { ok: true, charge: { hours, amount, plate: spot.plate } };
}

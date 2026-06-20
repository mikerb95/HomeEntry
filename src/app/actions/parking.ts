"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, parkingSpots } from "@/db/schema";
import { getSession } from "@/lib/auth";

type Result = { ok: boolean; error?: string };

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
  },
): Promise<Result> {
  const session = await requireStaff(slug);
  const cid = session.conjuntoId;
  if (!input.plate.trim())
    return { ok: false, error: "Ingresa la placa del vehículo" };
  if (!input.aptoKey) return { ok: false, error: "Selecciona el apartamento" };

  const status = input.kind === "visitor" ? "visitor" : "resident";
  const plate = input.plate.trim().toUpperCase();
  await db
    .update(parkingSpots)
    .set({ status, plate, aptoKey: input.aptoKey })
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

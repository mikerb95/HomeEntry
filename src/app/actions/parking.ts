"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, parkingSpots } from "@/db/schema";
import { getSession } from "@/lib/auth";

type Result = { ok: boolean; error?: string };

async function requireStaff() {
  const s = await getSession();
  if (!s || (s.role !== "guard" && s.role !== "admin")) {
    throw new Error("No autorizado");
  }
  return s;
}

export async function assignParking(input: {
  spotId: string;
  plate: string;
  aptoKey: string;
  kind: "resident" | "visitor";
}): Promise<Result> {
  await requireStaff();
  if (!input.plate.trim())
    return { ok: false, error: "Ingresa la placa del vehículo" };
  if (!input.aptoKey) return { ok: false, error: "Selecciona el apartamento" };

  const status = input.kind === "visitor" ? "visitor" : "resident";
  const plate = input.plate.trim().toUpperCase();
  await db
    .update(parkingSpots)
    .set({ status, plate, aptoKey: input.aptoKey })
    .where(eq(parkingSpots.id, input.spotId));

  const [tower, apt] = input.aptoKey.split("-");
  await db.insert(events).values({
    type: "parqueadero",
    tower,
    apto: apt,
    detail: `Placa ${plate} en ${input.spotId} (${
      status === "visitor" ? "Visitante" : "Residente"
    })`,
  });

  revalidatePath("/porteria");
  revalidatePath("/admin");
  return { ok: true };
}

export async function freeParking(spotId: string): Promise<Result> {
  await requireStaff();
  await db
    .update(parkingSpots)
    .set({ status: "free", plate: "", aptoKey: "" })
    .where(eq(parkingSpots.id, spotId));
  revalidatePath("/porteria");
  revalidatePath("/admin");
  return { ok: true };
}

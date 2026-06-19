"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { config, parkingSpots } from "@/db/schema";
import { listParking, getConfig } from "@/db/queries";
import { requireAdmin } from "@/lib/auth";

type Result = { ok: boolean; error?: string };

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function updateConfig(input: {
  name: string;
  towers: string;
  aptsPerTower: string;
  carSpots: string;
  motoSpots: string;
}): Promise<Result> {
  await requireAdmin();
  const current = await getConfig();

  const next = {
    name: (input.name || "").trim() || "Conjunto",
    towers: clamp(input.towers, 1, 12, 1),
    aptsPerTower: clamp(input.aptsPerTower, 1, 40, 1),
    carSpots: clamp(input.carSpots, 0, 80, 0),
    motoSpots: clamp(input.motoSpots, 0, 80, 0),
    visitorRate: current.visitorRate,
  };

  await db.update(config).set(next).where(eq(config.id, 1));

  // Reconcile parking spots, preserving existing assignments where possible.
  const existing = await listParking();
  const byId = new Map(existing.map((p) => [p.id, p]));
  const desired: typeof parkingSpots.$inferInsert[] = [];
  const keepIds = new Set<string>();
  for (let i = 1; i <= next.carSpots; i++) {
    const id = "P-" + String(i).padStart(2, "0");
    keepIds.add(id);
    const cur = byId.get(id);
    desired.push(
      cur && cur.kind === "car"
        ? cur
        : { id, kind: "car", status: "free", plate: "", aptoKey: "" },
    );
  }
  for (let i = 1; i <= next.motoSpots; i++) {
    const id = "M-" + String(i).padStart(2, "0");
    keepIds.add(id);
    const cur = byId.get(id);
    desired.push(
      cur && cur.kind === "moto"
        ? cur
        : { id, kind: "moto", status: "free", plate: "", aptoKey: "" },
    );
  }

  // Delete spots no longer in range, upsert the rest.
  for (const p of existing) {
    if (!keepIds.has(p.id)) {
      await db.delete(parkingSpots).where(eq(parkingSpots.id, p.id));
    }
  }
  for (const d of desired) {
    await db
      .insert(parkingSpots)
      .values(d)
      .onConflictDoUpdate({ target: parkingSpots.id, set: { kind: d.kind } });
  }

  revalidatePath("/admin");
  revalidatePath("/porteria");
  return { ok: true };
}

export async function updateRate(rate: string): Promise<Result> {
  await requireAdmin();
  const value = Math.max(0, parseInt(String(rate).replace(/\D/g, "") || "0", 10));
  await db.update(config).set({ visitorRate: value }).where(eq(config.id, 1));
  revalidatePath("/admin");
  return { ok: true };
}

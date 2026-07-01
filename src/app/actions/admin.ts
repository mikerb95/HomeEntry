"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { conjuntos, parkingSpots } from "@/db/schema";
import { getConjuntoById, listParking } from "@/db/queries";
import { requireAdmin } from "@/lib/auth";
import { clampText } from "@/lib/format";

type Result = { ok: boolean; error?: string };

// Logo upload constraints. 1MB keeps us under Next's default Server Action body
// limit and is plenty for a logo. Extensions map 1:1 to the accepted types.
const LOGO_MAX_BYTES = 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function updateConfig(
  slug: string,
  input: {
    name: string;
    towers: string;
    aptsPerTower: string;
    carSpots: string;
    motoSpots: string;
  },
): Promise<Result> {
  const session = await requireAdmin(slug);
  const cid = session.conjuntoId;
  const current = await getConjuntoById(cid);
  if (!current) return { ok: false, error: "Conjunto no encontrado" };

  const next = {
    name: clampText(input.name, 80) || "Conjunto",
    towers: clamp(input.towers, 1, 12, 1),
    aptsPerTower: clamp(input.aptsPerTower, 1, 40, 1),
    carSpots: clamp(input.carSpots, 0, 80, 0),
    motoSpots: clamp(input.motoSpots, 0, 80, 0),
  };

  await db.update(conjuntos).set(next).where(eq(conjuntos.id, cid));

  // Reconcile parking spots, preserving existing assignments where possible.
  const existing = await listParking(cid);
  const byId = new Map(existing.map((p) => [p.id, p]));
  const desired: (typeof parkingSpots.$inferInsert)[] = [];
  const keepIds = new Set<string>();
  for (let i = 1; i <= next.carSpots; i++) {
    const id = "P-" + String(i).padStart(2, "0");
    keepIds.add(id);
    const cur = byId.get(id);
    desired.push(
      cur && cur.kind === "car"
        ? cur
        : {
            conjuntoId: cid,
            id,
            kind: "car",
            status: "free",
            plate: "",
            aptoKey: "",
          },
    );
  }
  for (let i = 1; i <= next.motoSpots; i++) {
    const id = "M-" + String(i).padStart(2, "0");
    keepIds.add(id);
    const cur = byId.get(id);
    desired.push(
      cur && cur.kind === "moto"
        ? cur
        : {
            conjuntoId: cid,
            id,
            kind: "moto",
            status: "free",
            plate: "",
            aptoKey: "",
          },
    );
  }

  // Delete spots no longer in range (one statement) and upsert the rest (one
  // multi-row statement) instead of a query per spot (auditoria1.MD BP-2).
  const toDelete = existing.filter((p) => !keepIds.has(p.id)).map((p) => p.id);
  if (toDelete.length) {
    await db
      .delete(parkingSpots)
      .where(
        and(
          eq(parkingSpots.conjuntoId, cid),
          inArray(parkingSpots.id, toDelete),
        ),
      );
  }
  if (desired.length) {
    await db
      .insert(parkingSpots)
      .values(desired)
      .onConflictDoUpdate({
        target: [parkingSpots.conjuntoId, parkingSpots.id],
        set: { kind: sql`excluded.kind` },
      });
  }

  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/porteria`);
  return { ok: true };
}

export async function updateRate(slug: string, rate: string): Promise<Result> {
  const session = await requireAdmin(slug);
  const value = Math.max(
    0,
    parseInt(String(rate).replace(/\D/g, "") || "0", 10),
  );
  await db
    .update(conjuntos)
    .set({ visitorRate: value })
    .where(eq(conjuntos.id, session.conjuntoId));
  revalidatePath(`/${slug}/admin`);
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { conjuntos, parkingSpots, staffUsers } from "@/db/schema";
import { getConjuntoBySlug } from "@/db/queries";
import { requireSuperadmin } from "@/lib/auth";
import { hashSecret } from "@/lib/password";

type Result = { ok: boolean; error?: string };

// Slugs that would collide with real routes.
const RESERVED = new Set([
  "superadmin",
  "actions",
  "api",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

function normalizeUser(u: string): string {
  return (u || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function createConjunto(input: {
  slug: string;
  name: string;
  towers: string;
  aptsPerTower: string;
  carSpots: string;
  motoSpots: string;
  visitorRate: string;
  adminUser: string;
  adminPass: string;
  guardUser: string;
  guardPass: string;
}): Promise<Result> {
  await requireSuperadmin();

  const slug = (input.slug || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length < 2)
    return { ok: false, error: "El identificador (slug) es muy corto" };
  if (RESERVED.has(slug))
    return { ok: false, error: "Ese identificador está reservado" };
  if (await getConjuntoBySlug(slug))
    return { ok: false, error: "Ya existe un conjunto con ese identificador" };

  const name = (input.name || "").trim();
  if (!name) return { ok: false, error: "Ingresa el nombre del conjunto" };

  const adminUser = normalizeUser(input.adminUser);
  const guardUser = normalizeUser(input.guardUser);
  if (!adminUser || !input.adminPass)
    return { ok: false, error: "Define usuario y clave del administrador" };
  if (!guardUser || !input.guardPass)
    return { ok: false, error: "Define usuario y clave de portería" };

  const cfg = {
    towers: clamp(input.towers, 1, 12, 1),
    aptsPerTower: clamp(input.aptsPerTower, 1, 40, 1),
    carSpots: clamp(input.carSpots, 0, 80, 0),
    motoSpots: clamp(input.motoSpots, 0, 80, 0),
    visitorRate: Math.max(
      0,
      parseInt(String(input.visitorRate).replace(/\D/g, "") || "0", 10),
    ),
  };

  const inserted = await db
    .insert(conjuntos)
    .values({ slug, name, ...cfg })
    .returning({ id: conjuntos.id });
  const cid = inserted[0].id;

  await db.insert(staffUsers).values([
    {
      conjuntoId: cid,
      username: adminUser,
      passwordHash: hashSecret(input.adminPass),
      role: "admin",
    },
    {
      conjuntoId: cid,
      username: guardUser,
      passwordHash: hashSecret(input.guardPass),
      role: "guard",
    },
  ]);

  const spots: (typeof parkingSpots.$inferInsert)[] = [];
  for (let i = 1; i <= cfg.carSpots; i++) {
    spots.push({
      conjuntoId: cid,
      id: "P-" + String(i).padStart(2, "0"),
      kind: "car",
    });
  }
  for (let i = 1; i <= cfg.motoSpots; i++) {
    spots.push({
      conjuntoId: cid,
      id: "M-" + String(i).padStart(2, "0"),
      kind: "moto",
    });
  }
  if (spots.length) await db.insert(parkingSpots).values(spots);

  revalidatePath("/superadmin");
  return { ok: true };
}

// Throwaway: add a 2nd conjunto + same phone, verify multi-account lookup.
import { eq } from "drizzle-orm";
import { db } from "./src/db";
import { cities, conjuntos, residents } from "./src/db/schema";
import { encryptPII, piiHash } from "./src/lib/crypto";
import { hashSecret } from "./src/lib/password";

async function main() {
  await db.insert(cities).values({ code: "MDE", name: "Medellín", department: "Antioquia" }).onConflictDoNothing();
  const [c2] = await db.insert(conjuntos).values({
    slug: "prueba-dos", cityCode: "MDE", code: "MDE9999", name: "Conjunto Prueba Dos",
    towers: 2, aptsPerTower: 4, carSpots: 4, motoSpots: 4, visitorRate: 2000,
  }).onConflictDoNothing().returning();
  const target = c2 ?? (await db.select().from(conjuntos).where(eq(conjuntos.slug, "prueba-dos")))[0];
  await db.insert(residents).values({
    conjuntoId: target.id, aptoKey: "T1-201", tower: "T1", apt: "201",
    phoneEnc: encryptPII("3014567890"), phoneHash: piiHash("3014567890"),
    pinHash: hashSecret("1234"),
  }).onConflictDoNothing();

  const rows = await db
    .select({ name: conjuntos.name, aptoKey: residents.aptoKey })
    .from(residents)
    .innerJoin(conjuntos, eq(residents.conjuntoId, conjuntos.id))
    .where(eq(residents.phoneHash, piiHash("3014567890")));
  console.log("accounts:", rows);
  process.exit(0);
}
main();

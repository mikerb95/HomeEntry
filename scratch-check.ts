// Throwaway sanity check for the unified login lookup (deleted after run).
// Replicates listResidentAccountsByPhone (queries.ts imports "server-only",
// which can't load outside Next).
import { eq } from "drizzle-orm";
import { db } from "./src/db";
import { conjuntos, residents } from "./src/db/schema";
import { encryptPII, piiHash } from "./src/lib/crypto";
import { hashSecret, verifySecret } from "./src/lib/password";

async function byPhone(phone: string) {
  return db
    .select({ resident: residents, slug: conjuntos.slug, name: conjuntos.name })
    .from(residents)
    .innerJoin(conjuntos, eq(residents.conjuntoId, conjuntos.id))
    .where(eq(residents.phoneHash, piiHash(phone)));
}

async function main() {
  const one = await byPhone("3014567890");
  console.log("phone in", one.length, "account(s):",
    one.map((a) => `${a.name} ${a.resident.aptoKey} status=${a.resident.status} pinOk=${verifySecret("1234", a.resident.pinHash)}`));

  const cjs = await db.select().from(conjuntos);
  console.log("conjuntos:", cjs.map((c) => c.slug));
  const other = cjs.find((c) => c.id !== one[0]?.resident.conjuntoId);
  if (other) {
    await db.insert(residents).values({
      conjuntoId: other.id,
      aptoKey: "T9-999", tower: "T9", apt: "999",
      phoneEnc: encryptPII("3014567890"),
      phoneHash: piiHash("3014567890"),
      pinHash: hashSecret("1234"),
    }).onConflictDoNothing();
    const two = await byPhone("3014567890");
    console.log("after 2nd conjunto:", two.map((a) => `${a.name} ${a.resident.aptoKey}`));
  }
  process.exit(0);
}
main();

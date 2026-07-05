// Throwaway sanity check for the unified login lookup (deleted after run).
import { listResidentAccountsByPhone, listConjuntos } from "./src/db/queries";
import { db } from "./src/db";
import { residents } from "./src/db/schema";
import { encryptPII, piiHash } from "./src/lib/crypto";
import { hashSecret } from "./src/lib/password";

async function main() {
  const one = await listResidentAccountsByPhone("3014567890");
  console.log("phone in", one.length, "account(s):",
    one.map((a) => `${a.conjuntoName} ${a.tower}-${a.apt} status=${a.status}`));

  const cjs = await listConjuntos();
  console.log("conjuntos:", cjs.map((c) => c.slug));
  if (cjs.length > 1) {
    const other = cjs.find((c) => c.id !== one[0]?.conjuntoId) ?? cjs[1];
    await db.insert(residents).values({
      conjuntoId: other.id,
      aptoKey: "T9-999", tower: "T9", apt: "999",
      phoneEnc: encryptPII("3014567890"),
      phoneHash: piiHash("3014567890"),
      pinHash: hashSecret("1234"),
    }).onConflictDoNothing();
    const two = await listResidentAccountsByPhone("3014567890");
    console.log("after 2nd conjunto:", two.map((a) => `${a.conjuntoName} ${a.aptoKey}`));
  }
  process.exit(0);
}
main();

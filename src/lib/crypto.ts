// NOTE: not marked "server-only" because the seed script (tsx) imports it.
// It is effectively server-side anyway: it relies on Node's crypto module and
// the PII_SECRET env var, neither of which exist in the browser.
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} from "crypto";

// Symmetric encryption + deterministic hashing for sensitive PII (phone numbers,
// and any future address fields). The encrypted blob protects data at rest; the
// HMAC lets us look a record up by phone without ever storing it in the clear.
//
// Requires PII_SECRET in the environment (any long random string).

function piiSecret(): string {
  const s = process.env.PII_SECRET;
  if (!s) throw new Error("PII_SECRET is not set. Copy .env.example to .env.");
  if (process.env.NODE_ENV === "production") {
    if (s === "change-me-to-another-long-random-string" || s.length < 32) {
      throw new Error(
        "PII_SECRET is using the example value or is too short (<32 chars). Set a strong secret.",
      );
    }
  }
  return s;
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = scryptSync(piiSecret(), "portal-pii-v1", 32);
  return cachedKey;
}

// Format: ivB64:tagB64:cipherB64
export function encryptPII(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptPII(blob: string): string {
  try {
    const [ivB, tagB, encB] = blob.split(":");
    if (!ivB || !tagB || !encB) return "";
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(ivB, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encB, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

// Deterministic keyed hash for equality lookups (e.g. login by phone).
export function piiHash(plain: string): string {
  return createHmac("sha256", piiSecret()).update(plain).digest("hex");
}

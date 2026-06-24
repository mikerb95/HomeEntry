import { SignJWT, jwtVerify } from "jose";
import { createHmac, randomInt } from "crypto";

// Stateless OTP for resident registration. The registration payload + a *hash*
// of the one-time code travel inside a short-lived signed JWT (HS256 with
// AUTH_SECRET); the plaintext code is only ever delivered over WhatsApp. This
// proves the caller controls the phone number — closing the account-takeover
// path (auditoria1.MD S-1) and adding a second factor (S-5) — without needing a
// DB table. Replay is bounded by the short TTL; guessing is bounded by the
// in-memory verify throttle.

const OTP_TTL_SECONDS = 10 * 60;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return new TextEncoder().encode(s);
}

// Cryptographically secure 6-digit code (000000–999999).
export function makeOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(code: string): string {
  const s = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", s).update(code).digest("hex");
}

export type RegisterOtpClaims = {
  purpose: "register-otp";
  conjuntoId: string;
  slug: string;
  aptoKey: string;
  tower: string;
  apt: string;
  phoneEnc: string; // already AES-GCM encrypted — no plaintext PII in the token
  phoneHash: string;
  pinHash: string; // bcrypt hash
  codeHash: string; // HMAC of the 6-digit code
};

export async function signOtpToken(claims: RegisterOtpClaims): Promise<string> {
  return new SignJWT(claims as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyOtpToken(
  token: string,
): Promise<RegisterOtpClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "register-otp") return null;
    return payload as unknown as RegisterOtpClaims;
  } catch {
    return null;
  }
}

import { randomBytes } from "crypto";

// Crockford-style base32 without ambiguous glyphs (no 0/O/1/I) so codes are
// safe to read aloud and type. 32 symbols => 5 bits each.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// Visitor authorization code. Default length 8 => 32^8 ≈ 1.1e12 possibilities,
// vs. the old 4-char (often X-padded) code that was trivially guessable
// (auditoria1.MD S-7). Uses rejection-free masking (& 31) over a 32-char
// alphabet, so the distribution is uniform.
export function makeAuthCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] & 31];
  return out;
}

// Public conjunto selector: a curated 3-letter city tag + 4 random digits,
// e.g. "BOG4821". 10_000 codes per city (uniform, not sequential, so they are
// neither guessable nor enumerable). Caller must ensure the full code is UNIQUE
// per city — retry on the rare collision (see createConjuntoCode in queries).
//
// The digits are drawn with rejection sampling: a raw byte pair spans 0..65535,
// so we discard anything at/above 60000 (the largest multiple of 10000 that
// fits) before taking % 10000. That keeps every 4-digit value equally likely.
export function makeConjuntoCode(cityCode: string): string {
  let n: number;
  do {
    const b = randomBytes(2);
    n = (b[0] << 8) | b[1];
  } while (n >= 60000);
  const digits = String(n % 10000).padStart(4, "0");
  return `${cityCode.toUpperCase()}${digits}`;
}

// A grant is for a visit scheduled at whenTs. We accept arrivals up to this
// grace window past the scheduled time, then the grant is expired (S-8).
export const GRANT_GRACE_MS = 12 * 60 * 60 * 1000;

export function isGrantExpired(
  whenTs: Date | number,
  now: number = Date.now(),
): boolean {
  const t = whenTs instanceof Date ? whenTs.getTime() : whenTs;
  return now > t + GRANT_GRACE_MS;
}

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "portal_session";

// `v` is the session version snapshot — compared against the DB row so a
// resident/staff account can be force-logged-out by bumping its sessionVersion.
// Note: no PII (phone, etc.) is stored in the token; it is resolved server-side.
export type Session =
  | {
      role: "resident";
      conjuntoId: string;
      conjuntoSlug: string;
      aptoKey: string;
      tower: string;
      apt: string;
      v: number;
    }
  | {
      role: "guard";
      conjuntoId: string;
      conjuntoSlug: string;
      username: string;
      v: number;
    }
  | {
      role: "admin";
      conjuntoId: string;
      conjuntoSlug: string;
      username: string;
      v: number;
    }
  | { role: "superadmin"; username: string }
  // An owner can hold units across several conjuntos, so unlike resident/staff
  // the session carries only an identity — unit membership is checked per
  // request against `owner_units`, not embedded in the token.
  | { role: "owner"; ownerId: string; v: number };

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  if (process.env.NODE_ENV === "production") {
    if (s === "change-me-to-a-long-random-string" || s.length < 32) {
      throw new Error(
        "AUTH_SECRET is using the example value or is too short (<32 chars). Set a strong secret.",
      );
    }
  }
  return new TextEncoder().encode(s);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

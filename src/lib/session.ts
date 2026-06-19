import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "portal_session";

export type Session =
  | { role: "resident"; aptoKey: string; tower: string; apt: string; phone: string }
  | { role: "guard"; username: string }
  | { role: "admin"; username: string };

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
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

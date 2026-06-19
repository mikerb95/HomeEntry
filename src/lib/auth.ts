import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  Session,
  signSession,
  verifySession,
} from "./session";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(session: Session): Promise<void> {
  const token = await signSession(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireResident() {
  const s = await getSession();
  if (!s || s.role !== "resident") redirect("/residente/login");
  return s;
}

export async function requireGuard() {
  const s = await getSession();
  if (!s || s.role !== "guard") redirect("/porteria/login");
  return s;
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "admin") redirect("/admin/login");
  return s;
}

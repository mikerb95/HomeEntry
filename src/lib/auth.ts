import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  Session,
  signSession,
  verifySession,
} from "./session";
import {
  getOwnerVersion,
  getResidentVersion,
  getStaffVersion,
} from "@/db/queries";

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

// Guards verify, in order: role, that the session belongs to the conjunto in the
// URL (no cross-tenant access), and that the session has not been revoked.
export async function requireResident(slug: string) {
  const s = await getSession();
  if (!s || s.role !== "resident") redirect(`/${slug}/residente/login`);
  if (s.conjuntoSlug !== slug) redirect(`/${slug}`);
  const v = await getResidentVersion(s.conjuntoId, s.aptoKey);
  if (v === null || v !== s.v) redirect(`/${slug}/residente/login`);
  return s;
}

export async function requireGuard(slug: string) {
  const s = await getSession();
  if (!s || s.role !== "guard") redirect(`/${slug}/porteria/login`);
  if (s.conjuntoSlug !== slug) redirect(`/${slug}`);
  const v = await getStaffVersion(s.conjuntoId, s.username);
  if (v === null || v !== s.v) redirect(`/${slug}/porteria/login`);
  return s;
}

export async function requireAdmin(slug: string) {
  const s = await getSession();
  if (!s || s.role !== "admin") redirect(`/${slug}/admin/login`);
  if (s.conjuntoSlug !== slug) redirect(`/${slug}`);
  const v = await getStaffVersion(s.conjuntoId, s.username);
  if (v === null || v !== s.v) redirect(`/${slug}/admin/login`);
  return s;
}

// Either staff role (guard or admin) for this conjunto. Used by actions both
// panels share — e.g. approving resident registrations.
export async function requireStaff(slug: string) {
  const s = await getSession();
  if (!s || (s.role !== "guard" && s.role !== "admin")) redirect(`/${slug}`);
  if (s.conjuntoSlug !== slug) redirect(`/${slug}`);
  const v = await getStaffVersion(s.conjuntoId, s.username);
  if (v === null || v !== s.v) redirect(`/${slug}`);
  return s;
}

// Not slug-scoped: an owner's units can span conjuntos, so there is no single
// tenant to compare against here — pages that show one unit must separately
// verify the owner holds that (conjuntoId, aptoKey) via `listUnitsForOwner`.
export async function requireOwner() {
  const s = await getSession();
  if (!s || s.role !== "owner") redirect("/propietario/login");
  const v = await getOwnerVersion(s.ownerId);
  if (v === null || v !== s.v) redirect("/propietario/login");
  return s;
}

export async function requireSuperadmin() {
  const s = await getSession();
  if (!s || s.role !== "superadmin") redirect("/superadmin/login");
  return s;
}

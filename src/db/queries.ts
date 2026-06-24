import "server-only";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import { GRANT_GRACE_MS } from "@/lib/code";
import { db } from "./index";
import {
  accessLog,
  authGrants,
  conjuntos,
  events,
  parkingSessions,
  parkingSpots,
  residents,
  staffUsers,
} from "./schema";
import { decryptPII, piiHash } from "@/lib/crypto";

// A resident with the phone decrypted for display, and the raw PII columns
// (phoneEnc/phoneHash) stripped so they never leak past this layer.
export type ResidentView = {
  conjuntoId: string;
  aptoKey: string;
  tower: string;
  apt: string;
  phone: string;
  pinHash: string;
  sessionVersion: number;
  failedPins: number;
  lockedUntil: Date | null;
};

function toView(r: typeof residents.$inferSelect): ResidentView {
  return {
    conjuntoId: r.conjuntoId,
    aptoKey: r.aptoKey,
    tower: r.tower,
    apt: r.apt,
    phone: decryptPII(r.phoneEnc),
    pinHash: r.pinHash,
    sessionVersion: r.sessionVersion,
    failedPins: r.failedPins,
    lockedUntil: r.lockedUntil,
  };
}

// --- Conjuntos (tenants) -------------------------------------------------

export async function getConjuntoBySlug(slug: string) {
  const rows = await db
    .select()
    .from(conjuntos)
    .where(eq(conjuntos.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getConjuntoById(id: string) {
  const rows = await db
    .select()
    .from(conjuntos)
    .where(eq(conjuntos.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listConjuntos() {
  return db.select().from(conjuntos).orderBy(asc(conjuntos.name));
}

// --- Residents -----------------------------------------------------------

export async function getResident(conjuntoId: string, aptoKey: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(
      and(eq(residents.conjuntoId, conjuntoId), eq(residents.aptoKey, aptoKey)),
    )
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}

export async function listResidents(conjuntoId: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(eq(residents.conjuntoId, conjuntoId));
  return rows.map(toView);
}

export async function getResidentByPhone(conjuntoId: string, phone: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(
      and(
        eq(residents.conjuntoId, conjuntoId),
        eq(residents.phoneHash, piiHash(phone)),
      ),
    )
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}

export async function getResidentVersion(
  conjuntoId: string,
  aptoKey: string,
): Promise<number | null> {
  const rows = await db
    .select({ v: residents.sessionVersion })
    .from(residents)
    .where(
      and(eq(residents.conjuntoId, conjuntoId), eq(residents.aptoKey, aptoKey)),
    )
    .limit(1);
  return rows[0]?.v ?? null;
}

// --- Staff ---------------------------------------------------------------

export async function getStaff(conjuntoId: string, username: string) {
  const rows = await db
    .select()
    .from(staffUsers)
    .where(
      and(
        eq(staffUsers.conjuntoId, conjuntoId),
        eq(staffUsers.username, username),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getStaffVersion(
  conjuntoId: string,
  username: string,
): Promise<number | null> {
  const rows = await db
    .select({ v: staffUsers.sessionVersion })
    .from(staffUsers)
    .where(
      and(
        eq(staffUsers.conjuntoId, conjuntoId),
        eq(staffUsers.username, username),
      ),
    )
    .limit(1);
  return rows[0]?.v ?? null;
}

// --- Events --------------------------------------------------------------

export async function listEvents(conjuntoId: string) {
  return db
    .select()
    .from(events)
    .where(eq(events.conjuntoId, conjuntoId))
    .orderBy(desc(events.ts));
}

export async function listEventsForApt(
  conjuntoId: string,
  tower: string,
  apt: string,
) {
  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.conjuntoId, conjuntoId),
        eq(events.tower, tower),
        eq(events.apto, apt),
      ),
    )
    .orderBy(desc(events.ts));
}

// --- Parking -------------------------------------------------------------

export async function listParking(conjuntoId: string) {
  return db
    .select()
    .from(parkingSpots)
    .where(eq(parkingSpots.conjuntoId, conjuntoId))
    .orderBy(asc(parkingSpots.id));
}

export async function listSessions(conjuntoId: string) {
  return db
    .select()
    .from(parkingSessions)
    .where(eq(parkingSessions.conjuntoId, conjuntoId));
}

// --- Authorizations ------------------------------------------------------

// Idempotent sweep: flip still-"vigente" grants whose visit time is past the
// grace window to "vencido". Runs before listing so the persisted status stays
// truthful for the admin audit views, not just at scan time (auditoria1.MD S-8).
async function expireStaleGrants(conjuntoId: string): Promise<void> {
  const cutoff = new Date(Date.now() - GRANT_GRACE_MS);
  await db
    .update(authGrants)
    .set({ status: "vencido" })
    .where(
      and(
        eq(authGrants.conjuntoId, conjuntoId),
        eq(authGrants.status, "vigente"),
        lt(authGrants.whenTs, cutoff),
      ),
    );
}

export async function listAuths(conjuntoId: string) {
  await expireStaleGrants(conjuntoId);
  return db
    .select()
    .from(authGrants)
    .where(eq(authGrants.conjuntoId, conjuntoId))
    .orderBy(desc(authGrants.createdAt));
}

export async function listAuthsForApt(conjuntoId: string, aptoKey: string) {
  await expireStaleGrants(conjuntoId);
  return db
    .select()
    .from(authGrants)
    .where(
      and(
        eq(authGrants.conjuntoId, conjuntoId),
        eq(authGrants.aptoKey, aptoKey),
      ),
    )
    .orderBy(desc(authGrants.createdAt));
}

export async function getAuthByCode(conjuntoId: string, code: string) {
  const rows = await db
    .select()
    .from(authGrants)
    .where(
      and(eq(authGrants.conjuntoId, conjuntoId), eq(authGrants.code, code)),
    )
    .limit(1);
  return rows[0] ?? null;
}

// --- Audit trail ---------------------------------------------------------

export async function logAccess(
  conjuntoId: string,
  actor: string,
  action: string,
  target: string,
) {
  await db.insert(accessLog).values({ conjuntoId, actor, action, target });
}

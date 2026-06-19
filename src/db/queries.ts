import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  authGrants,
  config,
  events,
  parkingSessions,
  parkingSpots,
  residents,
} from "./schema";

export async function getConfig() {
  const rows = await db.select().from(config).where(eq(config.id, 1)).limit(1);
  return rows[0];
}

export async function getResident(aptoKey: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(eq(residents.aptoKey, aptoKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function getResidentByPhone(phone: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(eq(residents.phone, phone))
    .limit(1);
  return rows[0] ?? null;
}

export async function listEvents() {
  return db.select().from(events).orderBy(desc(events.ts));
}

export async function listEventsForApt(tower: string, apt: string) {
  return db
    .select()
    .from(events)
    .where(and(eq(events.tower, tower), eq(events.apto, apt)))
    .orderBy(desc(events.ts));
}

export async function listParking() {
  return db.select().from(parkingSpots).orderBy(asc(parkingSpots.id));
}

export async function listAuths() {
  return db.select().from(authGrants).orderBy(desc(authGrants.createdAt));
}

export async function listAuthsForApt(aptoKey: string) {
  return db
    .select()
    .from(authGrants)
    .where(eq(authGrants.aptoKey, aptoKey))
    .orderBy(desc(authGrants.createdAt));
}

export async function listSessions() {
  return db.select().from(parkingSessions);
}

export async function getAuthByCode(code: string) {
  const rows = await db
    .select()
    .from(authGrants)
    .where(eq(authGrants.code, code))
    .limit(1);
  return rows[0] ?? null;
}

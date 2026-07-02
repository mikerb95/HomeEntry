import "server-only";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { GRANT_GRACE_MS, makeConjuntoCode } from "@/lib/code";
import { db } from "./index";
import {
  accessLog,
  announcements,
  authGrants,
  charges,
  cities,
  companies,
  conjuntos,
  events,
  expenses,
  notices,
  ownerUnits,
  owners,
  parkingSessions,
  parkingSpots,
  paymentAgreements,
  payments,
  residents,
  serviceRequests,
  staffUsers,
  units,
  vendors,
} from "./schema";
import { decryptAmount, decryptPII, encryptPII, piiHash } from "@/lib/crypto";
import { hashSecret } from "@/lib/password";
import {
  computeConjuntoSummary,
  type ChargeInput,
  type PaymentInput,
} from "@/lib/finance";

// A resident with the phone decrypted for display, and the raw PII columns
// (phoneEnc/phoneHash) stripped so they never leak past this layer.
export type ResidentView = {
  conjuntoId: string;
  aptoKey: string;
  tower: string;
  apt: string;
  phone: string;
  pinHash: string;
  status: (typeof residents.$inferSelect)["status"];
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
    status: r.status,
    sessionVersion: r.sessionVersion,
    failedPins: r.failedPins,
    lockedUntil: r.lockedUntil,
  };
}

// --- Cities (curated catalog) --------------------------------------------

export async function listCities() {
  return db.select().from(cities).orderBy(asc(cities.name));
}

export async function getCityByCode(code: string) {
  const rows = await db
    .select()
    .from(cities)
    .where(eq(cities.code, code.trim().toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
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

// Lookup by the public code any role types to pick a conjunto (e.g. "BOG4821").
// Case-insensitive: codes are stored uppercase, so we normalize the input.
export async function getConjuntoByCode(code: string) {
  const rows = await db
    .select()
    .from(conjuntos)
    .where(eq(conjuntos.code, code.trim().toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function listConjuntos() {
  return db.select().from(conjuntos).orderBy(asc(conjuntos.name));
}

// Generate a unique "CIU+4dígitos" code for a city, retrying on the rare
// collision against the `code` UNIQUE constraint. With 10_000 slots per city
// the odds are tiny until a city is very full, so a handful of tries suffices.
export async function reserveConjuntoCode(
  cityCode: string,
  maxTries = 10,
): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const code = makeConjuntoCode(cityCode);
    const existing = await db
      .select({ code: conjuntos.code })
      .from(conjuntos)
      .where(eq(conjuntos.code, code))
      .limit(1);
    if (existing.length === 0) return code;
  }
  throw new Error(
    `No free conjunto code for city "${cityCode}" after ${maxTries} tries (city may be full)`,
  );
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

// Self-service registrations awaiting approval by portería/administración.
export async function listPendingResidents(conjuntoId: string) {
  const rows = await db
    .select()
    .from(residents)
    .where(
      and(
        eq(residents.conjuntoId, conjuntoId),
        eq(residents.status, "pending"),
      ),
    );
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

export async function listGuards(conjuntoId: string) {
  return db
    .select({ username: staffUsers.username })
    .from(staffUsers)
    .where(
      and(eq(staffUsers.conjuntoId, conjuntoId), eq(staffUsers.role, "guard")),
    )
    .orderBy(staffUsers.username);
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

// --- Cartelera (bulletin board) ------------------------------------------

// Every announcement for a conjunto, pinned ones first and newest first.
// Conjunto-wide: every resident sees the same board (no per-apt scoping).
export async function listAnnouncements(conjuntoId: string) {
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.conjuntoId, conjuntoId))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt));
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

// Authorizations created strictly after `since`, used by the guard screen to
// poll for new visitor authorizations without reloading the whole panel.
export async function listAuthsSince(conjuntoId: string, since: Date) {
  return db
    .select()
    .from(authGrants)
    .where(
      and(eq(authGrants.conjuntoId, conjuntoId), gt(authGrants.createdAt, since)),
    )
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

// --- Owners (propietarios que arriendan) ----------------------------------

export type OwnerView = {
  id: string;
  phone: string;
  pinHash: string;
  sessionVersion: number;
  failedPins: number;
  lockedUntil: Date | null;
};

function toOwnerView(o: typeof owners.$inferSelect): OwnerView {
  return {
    id: o.id,
    phone: decryptPII(o.phoneEnc),
    pinHash: o.pinHash,
    sessionVersion: o.sessionVersion,
    failedPins: o.failedPins,
    lockedUntil: o.lockedUntil,
  };
}

export async function getOwner(ownerId: string) {
  const rows = await db
    .select()
    .from(owners)
    .where(eq(owners.id, ownerId))
    .limit(1);
  return rows[0] ? toOwnerView(rows[0]) : null;
}

export async function getOwnerByPhone(phone: string) {
  const rows = await db
    .select()
    .from(owners)
    .where(eq(owners.phoneHash, piiHash(phone)))
    .limit(1);
  return rows[0] ? toOwnerView(rows[0]) : null;
}

export async function getOwnerVersion(ownerId: string): Promise<number | null> {
  const rows = await db
    .select({ v: owners.sessionVersion })
    .from(owners)
    .where(eq(owners.id, ownerId))
    .limit(1);
  return rows[0]?.v ?? null;
}

// Finds (or creates) the owner identified by `phone`, then links it to a
// unit. Reusing the same phone across links is how one owner ends up with
// several units. Called only from the admin panel — owners never self-serve.
// `created` tells the caller whether the PIN was applied: an existing owner
// keeps their current PIN (use updateOwnerPin for a deliberate reset).
export async function upsertOwnerLink(params: {
  phone: string;
  pin: string;
  conjuntoId: string;
  aptoKey: string;
  tower: string;
  apt: string;
}): Promise<{ ownerId: string; created: boolean }> {
  const existing = await getOwnerByPhone(params.phone);
  const ownerId = existing
    ? existing.id
    : (
        await db
          .insert(owners)
          .values({
            phoneEnc: encryptPII(params.phone),
            phoneHash: piiHash(params.phone),
            pinHash: hashSecret(params.pin),
          })
          .returning({ id: owners.id })
      )[0].id;

  await db
    .insert(ownerUnits)
    .values({
      ownerId,
      conjuntoId: params.conjuntoId,
      aptoKey: params.aptoKey,
      tower: params.tower,
      apt: params.apt,
    })
    .onConflictDoNothing();

  return { ownerId, created: !existing };
}

// True when the owner holds at least one unit in the conjunto — the scope
// check for admin operations on an owner account (e.g. PIN reset).
export async function ownerLinkedToConjunto(
  ownerId: string,
  conjuntoId: string,
): Promise<boolean> {
  const rows = await db
    .select({ ownerId: ownerUnits.ownerId })
    .from(ownerUnits)
    .where(
      and(
        eq(ownerUnits.ownerId, ownerId),
        eq(ownerUnits.conjuntoId, conjuntoId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// Deliberate PIN reset by an admin: new hash, revoke every issued session and
// clear the brute-force lockout so the owner can log in right away.
export async function updateOwnerPin(ownerId: string, pin: string) {
  await db
    .update(owners)
    .set({
      pinHash: hashSecret(pin),
      sessionVersion: sql`${owners.sessionVersion} + 1`,
      failedPins: 0,
      lockedUntil: null,
    })
    .where(eq(owners.id, ownerId));
}

export async function removeOwnerLink(
  ownerId: string,
  conjuntoId: string,
  aptoKey: string,
) {
  await db
    .delete(ownerUnits)
    .where(
      and(
        eq(ownerUnits.ownerId, ownerId),
        eq(ownerUnits.conjuntoId, conjuntoId),
        eq(ownerUnits.aptoKey, aptoKey),
      ),
    );
}

export type OwnerUnitView = {
  conjuntoId: string;
  conjuntoSlug: string;
  conjuntoName: string;
  aptoKey: string;
  tower: string;
  apt: string;
};

export async function listUnitsForOwner(
  ownerId: string,
): Promise<OwnerUnitView[]> {
  const rows = await db
    .select({ unit: ownerUnits, conjunto: conjuntos })
    .from(ownerUnits)
    .innerJoin(conjuntos, eq(ownerUnits.conjuntoId, conjuntos.id))
    .where(eq(ownerUnits.ownerId, ownerId));
  return rows.map(({ unit, conjunto }) => ({
    conjuntoId: unit.conjuntoId,
    conjuntoSlug: conjunto.slug,
    conjuntoName: conjunto.name,
    aptoKey: unit.aptoKey,
    tower: unit.tower,
    apt: unit.apt,
  }));
}

// Every owner linked to units in a given conjunto — used by the admin panel
// to show/manage links without needing every owner's phone by hand.
export async function listOwnerUnitsForConjunto(conjuntoId: string) {
  const rows = await db
    .select({ unit: ownerUnits, owner: owners })
    .from(ownerUnits)
    .innerJoin(owners, eq(ownerUnits.ownerId, owners.id))
    .where(eq(ownerUnits.conjuntoId, conjuntoId));
  return rows.map(({ unit, owner }) => ({
    ownerId: owner.id,
    phone: decryptPII(owner.phoneEnc),
    aptoKey: unit.aptoKey,
    tower: unit.tower,
    apt: unit.apt,
  }));
}

// Authoritative check that an owner actually holds a unit — pages must call
// this before showing anything scoped to (conjuntoId, aptoKey).
export async function ownerHoldsUnit(
  ownerId: string,
  conjuntoId: string,
  aptoKey: string,
): Promise<boolean> {
  const rows = await db
    .select({ ownerId: ownerUnits.ownerId })
    .from(ownerUnits)
    .where(
      and(
        eq(ownerUnits.ownerId, ownerId),
        eq(ownerUnits.conjuntoId, conjuntoId),
        eq(ownerUnits.aptoKey, aptoKey),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// --- Notices (llamados de atención) ---------------------------------------

export type NoticeView = {
  id: string;
  aptoKey: string;
  tower: string;
  apt: string;
  category: (typeof notices.$inferSelect)["category"];
  detail: string;
  status: (typeof notices.$inferSelect)["status"];
  registeredBy: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

function toNoticeView(n: typeof notices.$inferSelect): NoticeView {
  return {
    id: n.id,
    aptoKey: n.aptoKey,
    tower: n.tower,
    apt: n.apt,
    category: n.category,
    detail: decryptPII(n.detailEnc),
    status: n.status,
    registeredBy: n.registeredBy,
    createdAt: n.createdAt,
    resolvedAt: n.resolvedAt,
  };
}

export async function listNotices(conjuntoId: string): Promise<NoticeView[]> {
  const rows = await db
    .select()
    .from(notices)
    .where(eq(notices.conjuntoId, conjuntoId))
    .orderBy(desc(notices.createdAt));
  return rows.map(toNoticeView);
}

export async function listNoticesForApt(
  conjuntoId: string,
  aptoKey: string,
): Promise<NoticeView[]> {
  const rows = await db
    .select()
    .from(notices)
    .where(and(eq(notices.conjuntoId, conjuntoId), eq(notices.aptoKey, aptoKey)))
    .orderBy(desc(notices.createdAt));
  return rows.map(toNoticeView);
}

export async function createNotice(params: {
  conjuntoId: string;
  aptoKey: string;
  tower: string;
  apt: string;
  category: (typeof notices.$inferSelect)["category"];
  detail: string;
  registeredBy: string;
}) {
  await db.insert(notices).values({
    conjuntoId: params.conjuntoId,
    aptoKey: params.aptoKey,
    tower: params.tower,
    apt: params.apt,
    category: params.category,
    detailEnc: encryptPII(params.detail),
    registeredBy: params.registeredBy,
  });
}

export async function resolveNotice(conjuntoId: string, id: string) {
  await db
    .update(notices)
    .set({ status: "cerrado", resolvedAt: new Date() })
    .where(and(eq(notices.conjuntoId, conjuntoId), eq(notices.id, id)));
}

// --- Service requests (solicitudes de mantenimiento/servicio) -------------

export type ServiceRequestView = {
  id: string;
  aptoKey: string;
  tower: string;
  apt: string;
  subject: string;
  detail: string;
  status: (typeof serviceRequests.$inferSelect)["status"];
  registeredBy: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

function toServiceRequestView(
  r: typeof serviceRequests.$inferSelect,
): ServiceRequestView {
  return {
    id: r.id,
    aptoKey: r.aptoKey,
    tower: r.tower,
    apt: r.apt,
    subject: decryptPII(r.subjectEnc),
    detail: decryptPII(r.detailEnc),
    status: r.status,
    registeredBy: r.registeredBy,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  };
}

export async function listServiceRequests(
  conjuntoId: string,
): Promise<ServiceRequestView[]> {
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.conjuntoId, conjuntoId))
    .orderBy(desc(serviceRequests.createdAt));
  return rows.map(toServiceRequestView);
}

export async function listServiceRequestsForApt(
  conjuntoId: string,
  aptoKey: string,
): Promise<ServiceRequestView[]> {
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.conjuntoId, conjuntoId),
        eq(serviceRequests.aptoKey, aptoKey),
      ),
    )
    .orderBy(desc(serviceRequests.createdAt));
  return rows.map(toServiceRequestView);
}

export async function createServiceRequest(params: {
  conjuntoId: string;
  aptoKey: string;
  tower: string;
  apt: string;
  subject: string;
  detail: string;
  registeredBy: string;
}) {
  await db.insert(serviceRequests).values({
    conjuntoId: params.conjuntoId,
    aptoKey: params.aptoKey,
    tower: params.tower,
    apt: params.apt,
    subjectEnc: encryptPII(params.subject),
    detailEnc: encryptPII(params.detail),
    registeredBy: params.registeredBy,
  });
}

export async function updateServiceRequestStatus(
  conjuntoId: string,
  id: string,
  status: "abierto" | "en_proceso" | "resuelto",
) {
  await db
    .update(serviceRequests)
    .set({ status, resolvedAt: status === "resuelto" ? new Date() : null })
    .where(and(eq(serviceRequests.conjuntoId, conjuntoId), eq(serviceRequests.id, id)));
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

const FINANCE_ACTIONS = new Set([
  "view_finance_summary",
  "update_mora_config",
  "create_vendor",
  "update_vendor",
  "delete_vendor",
  "generate_monthly_charges",
  "record_payment",
  "record_expense",
  "delete_expense",
]);

export async function listRecentFinanceAccessLog(conjuntoId: string, limit = 20) {
  const rows = await db
    .select()
    .from(accessLog)
    .where(eq(accessLog.conjuntoId, conjuntoId))
    .orderBy(desc(accessLog.ts))
    .limit(300);
  return rows.filter((r) => FINANCE_ACTIONS.has(r.action)).slice(0, limit);
}

// --- Vendors ("proveedores") ----------------------------------------------

export type VendorView = {
  id: string;
  category: (typeof vendors.$inferSelect)["category"];
  name: string;
  taxId: string;
  contact: string;
  createdAt: Date;
};

function toVendorView(v: typeof vendors.$inferSelect): VendorView {
  return {
    id: v.id,
    category: v.category,
    name: decryptPII(v.nameEnc),
    taxId: v.taxIdEnc ? decryptPII(v.taxIdEnc) : "",
    contact: v.contactEnc ? decryptPII(v.contactEnc) : "",
    createdAt: v.createdAt,
  };
}

export async function listVendors(conjuntoId: string): Promise<VendorView[]> {
  const rows = await db
    .select()
    .from(vendors)
    .where(eq(vendors.conjuntoId, conjuntoId));
  return rows.map(toVendorView).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getVendor(
  conjuntoId: string,
  vendorId: string,
): Promise<VendorView | null> {
  const rows = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.conjuntoId, conjuntoId), eq(vendors.id, vendorId)))
    .limit(1);
  return rows[0] ? toVendorView(rows[0]) : null;
}

// --- Companies (administradoras) ---------------------------------------------

export type CompanyView = {
  id: string;
  name: string;
  nit: string;
  createdAt: Date;
};

export async function listCompanies(): Promise<CompanyView[]> {
  const rows = await db.select().from(companies).orderBy(asc(companies.name));
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    nit: c.nitEnc ? decryptPII(c.nitEnc) : "",
    createdAt: c.createdAt,
  }));
}

// --- Units (coeficientes de copropiedad) ------------------------------------

export type UnitView = {
  aptoKey: string;
  tower: string;
  apt: string;
  coefficient: number; // percent × 10 000 (see schema)
};

export async function listUnits(conjuntoId: string): Promise<UnitView[]> {
  const rows = await db
    .select()
    .from(units)
    .where(eq(units.conjuntoId, conjuntoId))
    .orderBy(asc(units.aptoKey));
  return rows.map(({ aptoKey, tower, apt, coefficient }) => ({
    aptoKey,
    tower,
    apt,
    coefficient,
  }));
}

export async function upsertUnitCoefficients(
  conjuntoId: string,
  entries: { aptoKey: string; tower: string; apt: string; coefficient: number }[],
) {
  if (!entries.length) return;
  await db
    .insert(units)
    .values(entries.map((e) => ({ conjuntoId, ...e })))
    .onConflictDoUpdate({
      target: [units.conjuntoId, units.aptoKey],
      set: { coefficient: sql`excluded.coefficient` },
    });
}

// --- Charges (cuotas) ------------------------------------------------------

export type ChargeView = {
  id: string;
  aptoKey: string;
  tower: string;
  apt: string;
  period: string;
  concept: string;
  amount: number;
  dueDate: Date;
};

function toChargeView(c: typeof charges.$inferSelect): ChargeView {
  return {
    id: c.id,
    aptoKey: c.aptoKey,
    tower: c.tower,
    apt: c.apt,
    period: c.period,
    concept: c.concept,
    amount: decryptAmount(c.amountEnc),
    dueDate: c.dueDate,
  };
}

export async function listCharges(conjuntoId: string): Promise<ChargeView[]> {
  const rows = await db
    .select()
    .from(charges)
    .where(eq(charges.conjuntoId, conjuntoId));
  return rows.map(toChargeView);
}

export async function listChargesForApt(
  conjuntoId: string,
  aptoKey: string,
): Promise<ChargeView[]> {
  const rows = await db
    .select()
    .from(charges)
    .where(and(eq(charges.conjuntoId, conjuntoId), eq(charges.aptoKey, aptoKey)));
  return rows.map(toChargeView);
}

// --- Payments (pagos) -------------------------------------------------------

export type PaymentView = {
  id: string;
  aptoKey: string;
  tower: string;
  apt: string;
  amount: number;
  method: (typeof payments.$inferSelect)["method"];
  paidAt: Date;
  registeredBy: string;
  note: string;
};

function toPaymentView(p: typeof payments.$inferSelect): PaymentView {
  return {
    id: p.id,
    aptoKey: p.aptoKey,
    tower: p.tower,
    apt: p.apt,
    amount: decryptAmount(p.amountEnc),
    method: p.method,
    paidAt: p.paidAt,
    registeredBy: p.registeredBy,
    note: p.noteEnc ? decryptPII(p.noteEnc) : "",
  };
}

export async function listPayments(conjuntoId: string): Promise<PaymentView[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.conjuntoId, conjuntoId))
    .orderBy(desc(payments.paidAt));
  return rows.map(toPaymentView);
}

export async function listPaymentsForApt(
  conjuntoId: string,
  aptoKey: string,
): Promise<PaymentView[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.conjuntoId, conjuntoId), eq(payments.aptoKey, aptoKey)))
    .orderBy(desc(payments.paidAt));
  return rows.map(toPaymentView);
}

// --- Payment agreements (acuerdos de pago) ----------------------------------

export type PaymentAgreementView = {
  id: string;
  aptoKey: string;
  tower: string;
  apt: string;
  totalAmount: number;
  installments: number;
  startDate: Date;
  status: (typeof paymentAgreements.$inferSelect)["status"];
  registeredBy: string;
  createdAt: Date;
};

function toPaymentAgreementView(
  a: typeof paymentAgreements.$inferSelect,
): PaymentAgreementView {
  return {
    id: a.id,
    aptoKey: a.aptoKey,
    tower: a.tower,
    apt: a.apt,
    totalAmount: parseInt(decryptPII(a.totalAmountEnc) || "0", 10),
    installments: a.installments,
    startDate: a.startDate,
    status: a.status,
    registeredBy: a.registeredBy,
    createdAt: a.createdAt,
  };
}

export async function listPaymentAgreements(
  conjuntoId: string,
): Promise<PaymentAgreementView[]> {
  const rows = await db
    .select()
    .from(paymentAgreements)
    .where(eq(paymentAgreements.conjuntoId, conjuntoId))
    .orderBy(desc(paymentAgreements.createdAt));
  return rows.map(toPaymentAgreementView);
}

// --- Expenses (gastos por proveedor) ---------------------------------------

export type ExpenseView = {
  id: string;
  vendorId: string;
  vendorName: string;
  category: (typeof expenses.$inferSelect)["category"];
  amount: number;
  description: string;
  invoiceRef: string;
  expenseDate: Date;
  registeredBy: string;
};

export async function listExpenses(conjuntoId: string): Promise<ExpenseView[]> {
  const rows = await db
    .select({ expense: expenses, vendor: vendors })
    .from(expenses)
    .innerJoin(vendors, eq(expenses.vendorId, vendors.id))
    .where(eq(expenses.conjuntoId, conjuntoId))
    .orderBy(desc(expenses.expenseDate));
  return rows.map(({ expense: e, vendor: v }) => ({
    id: e.id,
    vendorId: e.vendorId,
    vendorName: decryptPII(v.nameEnc),
    category: e.category,
    amount: parseInt(decryptPII(e.amountEnc) || "0", 10),
    description: decryptPII(e.descriptionEnc),
    invoiceRef: e.invoiceRefEnc ? decryptPII(e.invoiceRefEnc) : "",
    expenseDate: e.expenseDate,
    registeredBy: e.registeredBy,
  }));
}

export async function countExpensesForVendor(
  conjuntoId: string,
  vendorId: string,
): Promise<number> {
  const rows = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.conjuntoId, conjuntoId), eq(expenses.vendorId, vendorId)));
  return rows.length;
}

// --- Financial summary -------------------------------------------------------

export async function getFinancialSummary(conjuntoId: string) {
  const conjunto = await getConjuntoById(conjuntoId);
  const [chargeRows, paymentRows, expenseRows, sessionRows] =
    await Promise.all([
      listCharges(conjuntoId),
      listPayments(conjuntoId),
      listExpenses(conjuntoId),
      listSessions(conjuntoId),
    ]);
  const chargeInputs: ChargeInput[] = chargeRows.map((c) => ({
    id: c.id,
    aptoKey: c.aptoKey,
    period: c.period,
    amount: c.amount,
    dueDate: c.dueDate,
  }));
  const paymentInputs: PaymentInput[] = paymentRows.map((p) => ({
    aptoKey: p.aptoKey,
    amount: p.amount,
    paidAt: p.paidAt,
  }));
  return computeConjuntoSummary(
    chargeInputs,
    paymentInputs,
    expenseRows.map((e) => e.amount),
    // Visitor-parking charges collected at the gate (caja del vigilante).
    sessionRows.map((s) => s.amount),
    conjunto?.moraRatePct ?? 0,
    conjunto?.moraGraceDays ?? 0,
  );
}

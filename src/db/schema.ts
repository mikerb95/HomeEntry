import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// One residential complex (tenant). Everything else is scoped by conjuntoId.
// `slug` is what appears in the URL: ejemploapp.vercel.app/<slug>
export const conjuntos = pgTable("conjuntos", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  towers: integer("towers").notNull(),
  aptsPerTower: integer("apts_per_tower").notNull(),
  carSpots: integer("car_spots").notNull(),
  motoSpots: integer("moto_spots").notNull(),
  visitorRate: integer("visitor_rate").notNull(),
  // Late-fee ("mora") config: percent per month * 100 (e.g. 250 = 2.50%),
  // and a grace period in days before a past-due charge starts accruing it.
  moraRatePct: integer("mora_rate_pct").notNull().default(0),
  moraGraceDays: integer("mora_grace_days").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Residents = the WhatsApp registry + PINs, keyed by (conjuntoId, "T1-101").
// Phone is stored encrypted (phoneEnc) plus a deterministic HMAC (phoneHash)
// used for login lookup without exposing the plaintext.
export const residents = pgTable(
  "residents",
  {
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    phoneEnc: text("phone_enc").notNull(),
    phoneHash: text("phone_hash").notNull(),
    pinHash: text("pin_hash").notNull(),
    // Bumping this invalidates every issued session for the resident.
    sessionVersion: integer("session_version").notNull().default(0),
    // PIN brute-force protection.
    failedPins: integer("failed_pins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.conjuntoId, t.aptoKey] }),
    index("residents_phone_hash_idx").on(t.conjuntoId, t.phoneHash),
  ],
);

// Staff accounts (guard / admin), scoped per conjunto.
export const staffUsers = pgTable(
  "staff_users",
  {
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(), // 'guard' | 'admin'
    sessionVersion: integer("session_version").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.conjuntoId, t.username] })],
);

export const parkingSpots = pgTable(
  "parking_spots",
  {
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    id: text("id").notNull(), // 'P-01' | 'M-01'
    kind: text("kind").notNull(), // 'car' | 'moto'
    status: text("status").notNull().default("free"), // 'free' | 'resident' | 'visitor'
    plate: text("plate").notNull().default(""),
    aptoKey: text("apto_key").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.conjuntoId, t.id] })],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    type: text("type").notNull(), // visita | encomienda | parqueadero | mensaje
    tower: text("tower").notNull(),
    apto: text("apto").notNull(),
    detail: text("detail").notNull(),
  },
  (t) => [index("events_conjunto_idx").on(t.conjuntoId)],
);

export const authGrants = pgTable(
  "auth_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    code: text("code").notNull(),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    visitor: text("visitor").notNull(),
    doc: text("doc").notNull().default("—"),
    plate: text("plate").notNull().default(""),
    whenTs: timestamp("when_ts", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("vigente"), // vigente | usado | vencido
  },
  (t) => [index("auth_grants_conjunto_code_idx").on(t.conjuntoId, t.code)],
);

// Parking usage history powering the admin audit views.
export const parkingSessions = pgTable(
  "parking_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    type: text("type").notNull(), // resident | visitor
    aptoKey: text("apto_key").notNull(),
    kind: text("kind").notNull(), // car | moto
    hours: integer("hours").notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
  },
  (t) => [index("parking_sessions_conjunto_idx").on(t.conjuntoId)],
);

// Trail of who accessed sensitive PII (e.g. a resident's phone number).
export const accessLog = pgTable(
  "access_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    actor: text("actor").notNull(), // e.g. "guard:porteria"
    action: text("action").notNull(), // e.g. "view_phone"
    target: text("target").notNull(), // aptoKey or other identifier
  },
  (t) => [index("access_log_conjunto_idx").on(t.conjuntoId, t.ts)],
);

// Web Push subscriptions for resident devices. One row per browser/device that
// opted in, keyed by its unique push endpoint. Scoped by (conjuntoId, aptoKey)
// so an alert for an apartment reaches every device that apartment registered.
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    endpoint: text("endpoint").notNull(),
    // Keys the push service needs to encrypt the payload (from PushSubscription).
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.conjuntoId, t.endpoint] }),
    index("push_subscriptions_apt_idx").on(t.conjuntoId, t.aptoKey),
  ],
);

export type Conjunto = typeof conjuntos.$inferSelect;
export type Resident = typeof residents.$inferSelect;
export type ParkingSpot = typeof parkingSpots.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type AuthGrant = typeof authGrants.$inferSelect;
export type ParkingSession = typeof parkingSessions.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Singleton configuration row for the residential complex (id = 1).
export const config = pgTable("config", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull(),
  towers: integer("towers").notNull(),
  aptsPerTower: integer("apts_per_tower").notNull(),
  carSpots: integer("car_spots").notNull(),
  motoSpots: integer("moto_spots").notNull(),
  visitorRate: integer("visitor_rate").notNull(),
});

// Residents = the WhatsApp registry + PINs, keyed by "T1-101".
export const residents = pgTable("residents", {
  aptoKey: text("apto_key").primaryKey(),
  tower: text("tower").notNull(),
  apt: text("apt").notNull(),
  phone: text("phone").notNull(),
  pinHash: text("pin_hash").notNull(),
});

// Staff accounts (guard / admin).
export const staffUsers = pgTable("staff_users", {
  username: text("username").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // 'guard' | 'admin'
});

export const parkingSpots = pgTable("parking_spots", {
  id: text("id").primaryKey(), // 'P-01' | 'M-01'
  kind: text("kind").notNull(), // 'car' | 'moto'
  status: text("status").notNull().default("free"), // 'free' | 'resident' | 'visitor'
  plate: text("plate").notNull().default(""),
  aptoKey: text("apto_key").notNull().default(""),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  type: text("type").notNull(), // visita | encomienda | parqueadero | mensaje
  tower: text("tower").notNull(),
  apto: text("apto").notNull(),
  detail: text("detail").notNull(),
});

export const authGrants = pgTable("auth_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
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
});

// Parking usage history powering the admin audit views.
export const parkingSessions = pgTable("parking_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // resident | visitor
  aptoKey: text("apto_key").notNull(),
  kind: text("kind").notNull(), // car | moto
  hours: integer("hours").notNull(),
  start: timestamp("start", { withTimezone: true }).notNull(),
});

export type Resident = typeof residents.$inferSelect;
export type ParkingSpot = typeof parkingSpots.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type AuthGrant = typeof authGrants.$inferSelect;
export type ParkingSession = typeof parkingSessions.$inferSelect;
export type Config = typeof config.$inferSelect;

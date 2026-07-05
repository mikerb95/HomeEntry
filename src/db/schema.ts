import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// Curated list of Colombian cities. `code` is a hand-picked 3-letter tag
// (IATA/DANE-based: BOG, MDE, CLO, CTG, BAQ…) kept unique on purpose so
// ambiguous names (Cali/Caldas, Santa Marta/San Andrés) never clash. It is
// the prefix of every conjunto `code`, so it must never be derived blindly
// from a name — an admin curates this table.
export const cities = pgTable("cities", {
  code: text("code").primaryKey(), // "BOG"
  name: text("name").notNull(), // "Bogotá"
  department: text("department").notNull(), // "Cundinamarca"
});

// Administradoras: property-management companies that run several conjuntos.
// A conjunto may belong to at most one company (conjuntos.companyId); nulls
// are self-managed conjuntos. NIT is encrypted like other PII fields.
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nitEnc: text("nit_enc"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One residential complex (tenant). Everything else is scoped by conjuntoId.
// `slug` is what appears in the URL: ejemploapp.vercel.app/<slug>
// `code` is the short public selector any role types to pick this conjunto:
// a city tag + 4 random digits, e.g. "BOG4821" (see src/lib/code.ts). It is
// unique and immutable; the digits are random (not sequential) so codes are
// neither guessable nor enumerable.
export const conjuntos = pgTable("conjuntos", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  cityCode: text("city_code")
    .notNull()
    .references(() => cities.code),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  // Public URL of the conjunto's logo, uploaded by the admin to Vercel Blob.
  // Null until they upload one; the UI falls back to a monogram of the name.
  logoUrl: text("logo_url"),
  towers: integer("towers").notNull(),
  aptsPerTower: integer("apts_per_tower").notNull(),
  carSpots: integer("car_spots").notNull(),
  motoSpots: integer("moto_spots").notNull(),
  // Visitor-parking rates in COP per hour, one per vehicle kind. The admin
  // sets these; the guard's entry/exit flow uses them to compute the charge
  // collected when a visitor vehicle leaves (residents park free).
  visitorRate: integer("visitor_rate").notNull(), // carros
  visitorRateMoto: integer("visitor_rate_moto").notNull().default(0), // motos
  // Late-fee ("mora") config: percent per month * 100 (e.g. 250 = 2.50%),
  // and a grace period in days before a past-due charge starts accruing it.
  moraRatePct: integer("mora_rate_pct").notNull().default(0),
  moraGraceDays: integer("mora_grace_days").notNull().default(0),
  // Fondo de imprevistos (percent × 100, e.g. 100 = 1.00%): Ley 675/2001
  // art. 35 requires copropiedades to set aside a minimum 1% of the
  // presupuesto anual de gastos comunes into a reserve fund every year — the
  // default and the floor enforced in updateFondoConfig are both the legal
  // minimum, so a conjunto is compliant unless the admin explicitly raises it.
  fondoImprevistosPct: integer("fondo_imprevistos_pct").notNull().default(100),
  // Administradora that manages this conjunto; null = self-managed.
  companyId: uuid("company_id").references(() => companies.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Units ("unidades privadas") and their coeficiente de copropiedad. Apartments
// still derive from towers × aptsPerTower; a row exists here only once the
// admin saves coefficients (missing rows behave as coefficient 0).
// `coefficient` is an integer in percent × 10 000 (0.8542 % → 8542), so a
// fully-assigned conjunto sums to 1 000 000 — integer math avoids float drift
// when distributing the monthly budget into per-unit charges.
export const units = pgTable(
  "units",
  {
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    coefficient: integer("coefficient").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.conjuntoId, t.aptoKey] })],
);

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
    // Approval state. A self-service registration lands as "pending" and cannot
    // log in until the portería or administración approves it — this is how we
    // verify the person really belongs to the apartment without a WhatsApp/SMS
    // OTP (the doorman already knows or can confirm the residents). Existing
    // rows and seeds default to "active" (they predate the approval flow).
    status: text("status", { enum: ["active", "pending"] })
      .notNull()
      .default("active"),
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
    role: text("role", { enum: ["guard", "admin"] }).notNull(),
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
    kind: text("kind", { enum: ["car", "moto"] }).notNull(),
    status: text("status", { enum: ["free", "resident", "visitor"] })
      .notNull()
      .default("free"),
    plate: text("plate").notNull().default(""),
    aptoKey: text("apto_key").notNull().default(""),
    // When the vehicle entered (set on assign, cleared on free). Null on free
    // spots and on rows that predate entry/exit billing.
    enteredAt: timestamp("entered_at", { withTimezone: true }),
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
    type: text("type", {
      enum: ["visita", "encomienda", "parqueadero", "mensaje"],
    }).notNull(),
    tower: text("tower").notNull(),
    apto: text("apto").notNull(),
    detail: text("detail").notNull(),
  },
  (t) => [index("events_conjunto_idx").on(t.conjuntoId)],
);

// Bulletin board ("cartelera informativa") posts published by the
// administración for the whole conjunto to read. Body is plain text (no PII —
// it is a notice board visible to every resident). `pinned` keeps important
// notices at the top of the board regardless of date.
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    category: text("category", {
      enum: ["general", "mantenimiento", "seguridad", "evento", "pago"],
    })
      .notNull()
      .default("general"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    pinned: integer("pinned").notNull().default(0), // 0 | 1
    createdBy: text("created_by").notNull().default("Administración"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("announcements_conjunto_idx").on(t.conjuntoId, t.createdAt)],
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
    status: text("status", { enum: ["vigente", "usado", "vencido"] })
      .notNull()
      .default("vigente"),
  },
  (t) => [index("auth_grants_conjunto_code_idx").on(t.conjuntoId, t.code)],
);

// Parking usage history powering the admin audit views and the daily cash
// ("caja") summary. A row is written when the guard frees a spot: `hours` is
// the billed duration (entry→exit, rounded up) and `amount` the COP actually
// charged at that moment's rate — 0 for residents, hours × rate for visitors.
// Storing the amount (not just hours) keeps historic caja totals stable when
// the admin later changes the rates.
export const parkingSessions = pgTable(
  "parking_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    type: text("type", { enum: ["resident", "visitor"] }).notNull(),
    aptoKey: text("apto_key").notNull(),
    kind: text("kind", { enum: ["car", "moto"] }).notNull(),
    plate: text("plate").notNull().default(""),
    hours: integer("hours").notNull(),
    amount: integer("amount").notNull().default(0), // COP charged on exit
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

// Vendors ("proveedores") that the conjunto pays for services (maintenance,
// cleaning, gardening, security, ...). Name/tax id/contact are encrypted at
// rest with the same PII scheme used for resident phones (see src/lib/crypto.ts).
export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    nameEnc: text("name_enc").notNull(),
    category: text("category", {
      enum: ["mantenimiento", "aseo", "jardineria", "seguridad", "otro"],
    })
      .notNull()
      .default("otro"),
    taxIdEnc: text("tax_id_enc"),
    contactEnc: text("contact_enc"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vendors_conjunto_idx").on(t.conjuntoId)],
);

// Monthly (or ad-hoc) charges billed to an apartment. `amountEnc` is the
// encrypted COP amount (see src/lib/crypto.ts) — same protection as phones.
export const charges = pgTable(
  "charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    period: text("period").notNull(), // "YYYY-MM"
    concept: text("concept").notNull().default("Cuota de administración"),
    amountEnc: text("amount_enc").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("charges_conjunto_apt_idx").on(t.conjuntoId, t.aptoKey),
    index("charges_conjunto_period_idx").on(t.conjuntoId, t.period),
  ],
);

// Payments recorded against an apartment. `method` is manual today
// (transferencia | efectivo | otro); `gatewayRef` is left nullable so a
// future payment-gateway integration (PSE/Wompi) can populate it without a
// schema migration.
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    amountEnc: text("amount_enc").notNull(),
    // "acuerdo_pago" is synthetic — inserted by createPaymentAgreement to
    // consolidate a unit's debt, never chosen manually in the payment form.
    method: text("method", {
      enum: ["transferencia", "efectivo", "otro", "acuerdo_pago"],
    })
      .notNull()
      .default("transferencia"),
    gatewayRef: text("gateway_ref"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    registeredBy: text("registered_by").notNull(),
    noteEnc: text("note_enc"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("payments_conjunto_apt_idx").on(t.conjuntoId, t.aptoKey)],
);

// Expenses paid to a vendor, powering the "gastos por proveedor" ledger.
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    amountEnc: text("amount_enc").notNull(),
    category: text("category", {
      enum: ["mantenimiento", "aseo", "jardineria", "seguridad", "otro"],
    })
      .notNull()
      .default("otro"),
    descriptionEnc: text("description_enc").notNull(),
    invoiceRefEnc: text("invoice_ref_enc"),
    expenseDate: timestamp("expense_date", { withTimezone: true }).notNull(),
    registeredBy: text("registered_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("expenses_conjunto_date_idx").on(t.conjuntoId, t.expenseDate),
    index("expenses_conjunto_vendor_idx").on(t.conjuntoId, t.vendorId),
  ],
);

// Owners ("propietarios") who rent out one or more units. Not scoped to a
// single conjunto — a phone/PIN identifies the person; `ownerUnits` links
// them to whichever units they own, possibly across different conjuntos.
export const owners = pgTable(
  "owners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneEnc: text("phone_enc").notNull(),
    phoneHash: text("phone_hash").notNull(),
    pinHash: text("pin_hash").notNull(),
    sessionVersion: integer("session_version").notNull().default(0),
    failedPins: integer("failed_pins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("owners_phone_hash_idx").on(t.phoneHash)],
);

// Bridge table: which units a given owner can see (read-only). An admin
// creates these links — owners never self-register a unit.
export const ownerUnits = pgTable(
  "owner_units",
  {
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => owners.id),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.conjuntoId, t.aptoKey] }),
    index("owner_units_conjunto_apt_idx").on(t.conjuntoId, t.aptoKey),
  ],
);

// Acuerdos de pago: consolidates a unit's outstanding debt (saldo + mora)
// into an installment plan. The admin *proposes* the agreement ("propuesto");
// nothing changes in the ledger until the resident, authenticated in their
// portal, accepts it. Acceptance recomputes the live balance, inserts a
// synthetic `payments` row for the consolidated amount (so the old charges
// stop accruing mora — they're "paid" from the ledger's point of view) and
// one `charges` row per installment, and records the consent trail
// (respondedAt + acceptedByEnc + acceptanceMetaEnc). Mora then accrues
// normally on any installment that goes unpaid past its due date, so no
// special handling is needed elsewhere. "rechazado" = resident declined;
// "anulado" = admin cancelled the proposal (or the debt was cleared before
// acceptance). Rows predating the consent flow default to "activo".
export const paymentAgreements = pgTable(
  "payment_agreements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    totalAmountEnc: text("total_amount_enc").notNull(),
    installments: integer("installments").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    status: text("status", {
      enum: [
        "propuesto",
        "activo",
        "cumplido",
        "incumplido",
        "rechazado",
        "anulado",
      ],
    })
      .notNull()
      .default("activo"),
    registeredBy: text("registered_by").notNull(),
    // Consent trail, set when the resident accepts or rejects the proposal.
    // acceptedByEnc holds the resident's identity (apto + phone) and
    // acceptanceMetaEnc the request context (IP, user agent), both encrypted
    // like all PII — this is the probative record of who agreed and how.
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    acceptedByEnc: text("accepted_by_enc"),
    acceptanceMetaEnc: text("acceptance_meta_enc"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("payment_agreements_conjunto_apt_idx").on(t.conjuntoId, t.aptoKey),
  ],
);

// Fondo de imprevistos ledger (Ley 675/2001 art. 35): "aporte" grows the
// reserve — the automatic ones are inserted by generateMonthlyCharges (a
// cut of every batch of cuotas generated) and admins can also log a manual
// aporte (e.g. rendimientos financieros, an assembly-approved extra
// contribution); "retiro" spends it down for an imprevisto approved by
// asamblea. The running balance is just aportes minus retiros — see
// computeFondoBalance in src/lib/finance.ts.
export const reserveFundMovements = pgTable(
  "reserve_fund_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    type: text("type", { enum: ["aporte", "retiro"] }).notNull(),
    amountEnc: text("amount_enc").notNull(),
    conceptEnc: text("concept_enc").notNull(),
    movementDate: timestamp("movement_date", { withTimezone: true }).notNull(),
    registeredBy: text("registered_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reserve_fund_movements_conjunto_idx").on(t.conjuntoId),
  ],
);

// Monthly snapshots of the certified Interés Bancario Corriente (modalidad
// "consumo y ordinario") fetched from the Superfinanciera dataset on
// datos.gov.co by /api/cron/usura. From it derive the tasa de usura (1.5×
// IBC, art. 884 C.Co) and the effective *monthly* mora ceiling the rest of
// the app enforces. Not tenant data and not PII, so stored in the clear.
// All pct fields use the same encoding as conjuntos.moraRatePct: % × 100.
export const usuraRates = pgTable("usura_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  // First day the certified rate is in force (unique: one row per period).
  vigenciaDesde: timestamp("vigencia_desde", { withTimezone: true })
    .notNull()
    .unique(),
  ibcEaPct: integer("ibc_ea_pct").notNull(), // efectivo anual
  usuraEaPct: integer("usura_ea_pct").notNull(), // 1.5 × IBC, efectivo anual
  monthlyCapPct: integer("monthly_cap_pct").notNull(), // efectivo mensual
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Disciplinary/attention notices ("llamados de atención") raised by staff
// against a unit. Detail is encrypted like other free-text PII fields.
export const notices = pgTable(
  "notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    category: text("category", {
      enum: ["ruido", "mascotas", "zonas_comunes", "convivencia", "otro"],
    })
      .notNull()
      .default("otro"),
    detailEnc: text("detail_enc").notNull(),
    status: text("status", { enum: ["abierto", "cerrado"] })
      .notNull()
      .default("abierto"),
    registeredBy: text("registered_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("notices_conjunto_apt_idx").on(t.conjuntoId, t.aptoKey)],
);

// Service requests ("solicitudes") a unit files with administración —
// distinct from the pending-registration "solicitudes" queue in `residents`.
export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    aptoKey: text("apto_key").notNull(),
    tower: text("tower").notNull(),
    apt: text("apt").notNull(),
    subjectEnc: text("subject_enc").notNull(),
    detailEnc: text("detail_enc").notNull(),
    status: text("status", {
      enum: ["abierto", "en_proceso", "resuelto"],
    })
      .notNull()
      .default("abierto"),
    registeredBy: text("registered_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("service_requests_conjunto_apt_idx").on(t.conjuntoId, t.aptoKey),
  ],
);

export type City = typeof cities.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Conjunto = typeof conjuntos.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Resident = typeof residents.$inferSelect;
export type ParkingSpot = typeof parkingSpots.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AuthGrant = typeof authGrants.$inferSelect;
export type ParkingSession = typeof parkingSessions.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Charge = typeof charges.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentAgreement = typeof paymentAgreements.$inferSelect;
export type ReserveFundMovement = typeof reserveFundMovements.$inferSelect;
export type Expense = typeof expenses.$inferSelect;

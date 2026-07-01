import { db } from "./index";
import {
  accessLog,
  authGrants,
  cities,
  conjuntos,
  events,
  parkingSessions,
  parkingSpots,
  residents,
  staffUsers,
} from "./schema";
import { hashSecret } from "../lib/password";
import { makeConjuntoCode } from "../lib/code";
import { encryptPII, piiHash } from "../lib/crypto";

async function main() {
  console.log("Seeding database…");

  // Wipe (idempotent reseed). Order respects FKs.
  await db.delete(accessLog);
  await db.delete(parkingSessions);
  await db.delete(authGrants);
  await db.delete(events);
  await db.delete(parkingSpots);
  await db.delete(staffUsers);
  await db.delete(residents);
  await db.delete(conjuntos);
  await db.delete(cities);

  // Curated city catalog (IATA/DANE-based tags). Extend as we onboard cities.
  await db.insert(cities).values([
    { code: "BOG", name: "Bogotá", department: "Cundinamarca" },
    { code: "MDE", name: "Medellín", department: "Antioquia" },
    { code: "CLO", name: "Cali", department: "Valle del Cauca" },
    { code: "BAQ", name: "Barranquilla", department: "Atlántico" },
    { code: "CTG", name: "Cartagena", department: "Bolívar" },
    { code: "BGA", name: "Bucaramanga", department: "Santander" },
    { code: "PEI", name: "Pereira", department: "Risaralda" },
  ]);

  const cfg = {
    slug: "laspalmas",
    cityCode: "BOG",
    code: makeConjuntoCode("BOG"),
    name: "Conjunto Las Acacias",
    towers: 3,
    aptsPerTower: 8,
    carSpots: 12,
    motoSpots: 8,
    visitorRate: 3000,
  };
  const [conjunto] = await db
    .insert(conjuntos)
    .values(cfg)
    .returning({ id: conjuntos.id });
  const cid = conjunto.id;

  // Registry + PINs (phones stored encrypted + hashed for lookup).
  const registry: Record<string, string> = {
    "T1-101": "3014567890",
    "T1-103": "3126549870",
    "T1-105": "3158889900",
    "T2-102": "3201112233",
    "T2-108": "3024455667",
    "T3-105": "3009998877",
  };
  const pinHash = hashSecret("1234");
  await db.insert(residents).values(
    Object.entries(registry).map(([key, phone]) => {
      const [tower, apt] = key.split("-");
      return {
        conjuntoId: cid,
        aptoKey: key,
        tower,
        apt,
        phoneEnc: encryptPII(phone),
        phoneHash: piiHash(phone),
        pinHash,
      };
    }),
  );

  // Staff (username stored normalized, accent-free)
  await db.insert(staffUsers).values([
    {
      conjuntoId: cid,
      username: "porteria",
      passwordHash: hashSecret("1234"),
      role: "guard",
    },
    {
      conjuntoId: cid,
      username: "admin",
      passwordHash: hashSecret("admin"),
      role: "admin",
    },
  ]);

  // Parking
  const carSeed: Record<
    string,
    { status: string; plate: string; apto: string }
  > = {
    "P-01": { status: "resident", plate: "ABC-123", apto: "T1-101" },
    "P-03": { status: "resident", plate: "DEF-456", apto: "T2-102" },
    "P-04": { status: "visitor", plate: "XYZ-123", apto: "T1-103" },
    "P-07": { status: "resident", plate: "GHI-789", apto: "T3-105" },
  };
  const motoSeed: Record<
    string,
    { status: string; plate: string; apto: string }
  > = {
    "M-01": { status: "resident", plate: "MOT-11A", apto: "T1-105" },
    "M-03": { status: "visitor", plate: "MOT-44B", apto: "T2-108" },
  };
  const spots: (typeof parkingSpots.$inferInsert)[] = [];
  for (let i = 1; i <= cfg.carSpots; i++) {
    const id = "P-" + String(i).padStart(2, "0");
    const s = carSeed[id];
    spots.push({
      conjuntoId: cid,
      id,
      kind: "car",
      status: s ? s.status : "free",
      plate: s ? s.plate : "",
      aptoKey: s ? s.apto : "",
    });
  }
  for (let i = 1; i <= cfg.motoSpots; i++) {
    const id = "M-" + String(i).padStart(2, "0");
    const s = motoSeed[id];
    spots.push({
      conjuntoId: cid,
      id,
      kind: "moto",
      status: s ? s.status : "free",
      plate: s ? s.plate : "",
      aptoKey: s ? s.apto : "",
    });
  }
  await db.insert(parkingSpots).values(spots);

  // Events
  const now = Date.now();
  const ev = (
    min: number,
    type: string,
    tower: string,
    apto: string,
    detail: string,
  ) => ({
    conjuntoId: cid,
    ts: new Date(now - min * 60000),
    type,
    tower,
    apto,
    detail,
  });
  await db.insert(events).values([
    ev(4, "visita", "T1", "101", "Visita autorizada — Carlos Méndez"),
    ev(22, "encomienda", "T2", "102", "Paquete de Servientrega"),
    ev(38, "parqueadero", "T1", "103", "Placa XYZ-123 en P-04 (Visitante)"),
    ev(61, "visita", "T2", "108", "Domicilio Rappi"),
    ev(95, "mensaje", "T3", "105", "Recordatorio cuota de administración"),
    ev(120, "encomienda", "T1", "105", "Sobre certificado 472"),
    ev(150, "visita", "T3", "105", "Visita familiar — 2 personas"),
    ev(180, "parqueadero", "T2", "102", "Placa DEF-456 en P-03 (Residente)"),
    ev(220, "visita", "T1", "101", "Técnico de internet"),
    ev(260, "encomienda", "T2", "108", "Paquete Mercado Libre"),
    ev(300, "mensaje", "T1", "103", "Aviso de corte de agua programado"),
    ev(360, "visita", "T2", "102", "Visita — Ana Gómez"),
    ev(420, "parqueadero", "T1", "105", "Placa MOT-11A en M-01 (Residente)"),
    ev(480, "visita", "T3", "105", "Domicilio farmacia"),
  ]);

  // Parking sessions (deterministic LCG, mirrors the prototype audit data)
  const aptoPool = [
    "T1-101",
    "T1-103",
    "T2-102",
    "T2-108",
    "T3-105",
    "T1-105",
  ];
  let sd = 987654321;
  const rr = () => {
    sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0;
    return sd / 4294967296;
  };
  const sessions: (typeof parkingSessions.$inferInsert)[] = [];
  for (let i = 0; i < 64; i++) {
    const daysAgo = Math.floor(rr() * 30);
    const start = now - daysAgo * 86400000 - Math.floor(rr() * 9) * 3600000;
    const type = rr() > 0.45 ? "resident" : "visitor";
    const apto = aptoPool[Math.floor(rr() * aptoPool.length)];
    const kind = rr() > 0.72 ? "moto" : "car";
    const hours =
      type === "visitor" ? 1 + Math.floor(rr() * 6) : 2 + Math.floor(rr() * 10);
    sessions.push({
      conjuntoId: cid,
      type,
      aptoKey: apto,
      kind,
      hours,
      start: new Date(start),
    });
  }
  await db.insert(parkingSessions).values(sessions);

  // Authorizations
  await db.insert(authGrants).values([
    {
      conjuntoId: cid,
      code: "8KQ2",
      aptoKey: "T1-101",
      tower: "T1",
      apt: "101",
      visitor: "Laura Restrepo",
      doc: "CC 1.032.456",
      plate: "",
      whenTs: new Date(now + 2 * 3600000),
      createdAt: new Date(now - 3600000),
      status: "vigente",
    },
    {
      conjuntoId: cid,
      code: "3MZ9",
      aptoKey: "T1-101",
      tower: "T1",
      apt: "101",
      visitor: "Domicilio Rappi",
      doc: "—",
      plate: "MOT-22C",
      whenTs: new Date(now - 26 * 3600000),
      createdAt: new Date(now - 30 * 3600000),
      status: "vencido",
    },
    {
      conjuntoId: cid,
      code: "7TX5",
      aptoKey: "T2-102",
      tower: "T2",
      apt: "102",
      visitor: "Andrés Gómez",
      doc: "CC 79.555.221",
      plate: "KLM-908",
      whenTs: new Date(now + 5 * 3600000),
      createdAt: new Date(now - 1800000),
      status: "vigente",
    },
  ]);

  console.log(
    `Seed complete. Conjunto "/${cfg.slug}" (código ${cfg.code}) listo.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

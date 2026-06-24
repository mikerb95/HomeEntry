import { requireGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";
import {
  getConjuntoById,
  listAuths,
  listEvents,
  listParking,
  listResidents,
} from "@/db/queries";
import { qrDataUrl } from "@/lib/qr";
import { whatsappMode } from "@/lib/whatsapp";
import { isToday, todayStr } from "@/lib/format";
import { Shell } from "@/components/Shell";
import { GuardPanel } from "./GuardPanel";

export default async function GuardPanelPage({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const session = await requireGuard(slug);
  const cid = session.conjuntoId;
  const [config, parking, events, auths, residents] = await Promise.all([
    getConjuntoById(cid),
    listParking(cid),
    listEvents(cid),
    listAuths(cid),
    listResidents(cid),
  ]);

  // Only expose whether an apartment has a WhatsApp on file — never the numbers
  // themselves. The actual phone is resolved on demand by prepareAlert, which
  // records the access in access_log (auditoria1.MD S-3).
  const hasWhatsApp: Record<string, boolean> = {};
  residents.forEach((r) => (hasWhatsApp[r.aptoKey] = !!r.phone));

  const incoming = await Promise.all(
    auths
      .filter((a) => a.status === "vigente")
      .map(async (a) => ({
        id: a.id,
        code: a.code,
        visitor: a.visitor,
        doc: a.doc,
        plate: a.plate,
        tower: a.tower,
        apt: a.apt,
        whenIso: a.whenTs.toISOString(),
        qr: await qrDataUrl(a.code),
      })),
  );

  const mVisits = events.filter(
    (e) => e.type === "visita" && isToday(e.ts),
  ).length;
  const mPackages = events.filter(
    (e) => e.type === "encomienda" && isToday(e.ts),
  ).length;

  return (
    <Shell
      chrome={{
        title: config?.name ?? "Conjunto",
        sub: "Portería · Turno activo",
        role: "Vigilante",
        badgeBg: "#E9F8EE",
        badgeFg: "#16A34A",
      }}
    >
      <GuardPanel
        slug={slug}
        complexName={config?.name ?? "Conjunto"}
        towers={config?.towers ?? 0}
        aptsPerTower={config?.aptsPerTower ?? 0}
        hasWhatsApp={hasWhatsApp}
        parking={parking.map((p) => ({
          id: p.id,
          kind: p.kind as "car" | "moto",
          status: p.status as "free" | "resident" | "visitor",
          plate: p.plate,
          aptoKey: p.aptoKey,
        }))}
        recent={events.slice(0, 4).map((e) => ({
          id: e.id,
          type: e.type,
          tower: e.tower,
          apto: e.apto,
          tsIso: e.ts.toISOString(),
        }))}
        incoming={incoming}
        mVisits={mVisits}
        mPackages={mPackages}
        todayStr={todayStr()}
        whatsappMode={whatsappMode()}
      />
    </Shell>
  );
}

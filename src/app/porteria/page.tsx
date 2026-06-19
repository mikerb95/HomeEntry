import { requireGuard } from "@/lib/auth";
import {
  getConfig,
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

export default async function GuardPanelPage() {
  await requireGuard();
  const [config, parking, events, auths, residents] = await Promise.all([
    getConfig(),
    listParking(),
    listEvents(),
    listAuths(),
    listResidents(),
  ]);

  const registry: Record<string, string> = {};
  residents.forEach((r) => (registry[r.aptoKey] = r.phone));

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
        title: config.name,
        sub: "Portería · Turno activo",
        role: "Vigilante",
        badgeBg: "#E9F8EE",
        badgeFg: "#16A34A",
      }}
    >
      <GuardPanel
        complexName={config.name}
        towers={config.towers}
        aptsPerTower={config.aptsPerTower}
        registry={registry}
        parking={parking}
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

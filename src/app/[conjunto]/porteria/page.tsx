import { requireGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";
import {
  getConjuntoById,
  listAuths,
  listEvents,
  listParking,
  listPendingResidents,
  listResidents,
  listSessions,
} from "@/db/queries";
import { qrDataUrl } from "@/lib/qr";
import { isGrantExpired } from "@/lib/code";
import { whatsappMode } from "@/lib/whatsapp";
import { isToday, maskPhone, todayStr } from "@/lib/format";
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
  const [config, parking, events, auths, residents, pending, sessions] =
    await Promise.all([
      getConjuntoById(cid),
      listParking(cid),
      listEvents(cid),
      listAuths(cid),
      listResidents(cid),
      listPendingResidents(cid),
      listSessions(cid),
    ]);

  // Caja del día: what the vigilante has collected at the gate this jornada
  // (visitor-parking exits recorded today).
  const cajaHoy = sessions
    .filter((s) => isToday(s.start))
    .reduce((a, s) => a + s.amount, 0);

  // Only expose whether an apartment has a WhatsApp on file — never the numbers
  // themselves. The actual phone is resolved on demand by prepareAlert, which
  // records the access in access_log (auditoria1.MD S-3).
  const hasWhatsApp: Record<string, boolean> = {};
  residents.forEach((r) => (hasWhatsApp[r.aptoKey] = !!r.phone));

  const incoming = await Promise.all(
    auths
      .filter((a) => a.status === "vigente" && !isGrantExpired(a.whenTs))
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
          kind: p.kind,
          status: p.status,
          plate: p.plate,
          aptoKey: p.aptoKey,
          enteredAtIso: p.enteredAt?.toISOString() ?? null,
        }))}
        rates={{
          car: config?.visitorRate ?? 0,
          moto: config?.visitorRateMoto ?? 0,
        }}
        cajaHoy={cajaHoy}
        recent={events.slice(0, 4).map((e) => ({
          id: e.id,
          type: e.type,
          tower: e.tower,
          apto: e.apto,
          tsIso: e.ts.toISOString(),
        }))}
        incoming={incoming}
        pending={pending.map((r) => ({
          aptoKey: r.aptoKey,
          tower: r.tower,
          apt: r.apt,
          phoneMasked: maskPhone(r.phone),
        }))}
        mVisits={mVisits}
        mPackages={mPackages}
        todayStr={todayStr()}
        whatsappMode={whatsappMode()}
        serverNowIso={new Date().toISOString()}
      />
    </Shell>
  );
}

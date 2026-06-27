import Link from "next/link";
import { requireResident } from "@/lib/auth";

export const dynamic = "force-dynamic";
import {
  getConjuntoById,
  getResident,
  listAuthsForApt,
  listEventsForApt,
  listParking,
} from "@/db/queries";
import { Shell } from "@/components/Shell";
import { PushOptIn } from "@/components/PushOptIn";
import { IconAuthorize } from "@/components/icons";
import {
  authStMeta,
  GrantStatus,
  notifMeta,
  ParkingStatus,
  statusMeta,
  EventType,
} from "@/lib/meta";
import { fmtDateTime, fmtPhone, fmtTime, isThisMonth } from "@/lib/format";

export default async function ResidentDashboard({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const session = await requireResident(slug);
  const cid = session.conjuntoId;
  const [config, me, myEvents, myParkingAll, myAuths] = await Promise.all([
    getConjuntoById(cid),
    getResident(cid, session.aptoKey),
    listEventsForApt(cid, session.tower, session.apt),
    listParking(cid),
    listAuthsForApt(cid, session.aptoKey),
  ]);
  const myParkings = myParkingAll.filter((p) => p.aptoKey === session.aptoKey);

  const resVisits = myEvents.filter(
    (e) => e.type === "visita" && isThisMonth(e.ts),
  ).length;
  const resPackages = myEvents.filter((e) => e.type === "encomienda").length;
  const resActiveAuths = myAuths.filter((a) => a.status === "vigente").length;

  const notifs = myEvents.slice(0, 8);
  const auths = myAuths.slice(0, 5);

  const metrics = [
    { label: "Visitas este mes", value: resVisits },
    { label: "Paquetes recibidos", value: resPackages },
    { label: "Autorizaciones activas", value: resActiveAuths },
    { label: "Parqueaderos asignados", value: myParkings.length },
  ];

  return (
    <Shell
      chrome={{
        title: config?.name ?? "Conjunto",
        sub: `Apto ${session.apt} · Torre ${session.tower.slice(1)}`,
        role: "Residente",
        badgeBg: "#EAF1FF",
        badgeFg: "#2F6BFF",
      }}
    >
      <div className="animate-pa-in">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-[-.6px]">
              Hola, Apto {session.apt}
            </h1>
            <div className="mt-[3px] text-[14px] font-semibold text-[#6B7585]">
              WhatsApp +57 {fmtPhone(me?.phone ?? "")}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/${slug}/residente/autorizar`}
              className="flex items-center gap-2 rounded-[13px] bg-blue px-[18px] py-[13px] text-[14.5px] font-bold text-white shadow-[0_10px_22px_-12px_rgba(47,107,255,.7)] hover:bg-blue-dark"
            >
              <IconAuthorize size={18} />
              Autorizar ingreso
            </Link>
            <Link
              href={`/${slug}/residente/registro`}
              className="flex items-center gap-2 rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-white px-[18px] py-[13px] text-[14.5px] font-bold text-ink hover:bg-[#F6F8FB]"
            >
              Actualizar WhatsApp
            </Link>
          </div>
        </div>

        <PushOptIn slug={slug} />

        <div className="mb-[22px] grid grid-cols-1 gap-3.5 min-[680px]:grid-cols-2 min-[1040px]:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-[18px] border border-[#E8ECF2] bg-white p-[18px]"
            >
              <div className="mb-2.5 text-[12.5px] font-bold text-[#6B7585]">
                {m.label}
              </div>
              <div className="font-display text-[30px] font-bold tracking-[-1px]">
                {m.value}
              </div>
            </div>
          ))}
        </div>

        <div className="block items-start gap-[22px] min-[780px]:grid min-[780px]:grid-cols-[1.4fr_.85fr]">
          <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
            <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
              <h2 className="font-display text-[18px] font-bold">
                Mis notificaciones
              </h2>
            </div>
            <div>
              {notifs.map((n) => {
                const m = notifMeta[n.type as EventType] ?? notifMeta.mensaje;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-[13px] border-b border-[#F2F5F9] px-5 py-[15px]"
                  >
                    <span
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] text-[13px] font-extrabold"
                      style={{ background: m.soft, color: m.color }}
                    >
                      {m.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-bold text-ink">
                        {m.title}
                      </div>
                      <div className="mt-0.5 text-[13px] text-[#6B7585]">
                        {n.detail}
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-[12px] font-semibold text-[#A2ABB8]">
                      {fmtTime(n.ts)}
                    </div>
                  </div>
                );
              })}
              {notifs.length === 0 && (
                <div className="px-5 py-9 text-center text-[14px] text-[#6B7585]">
                  Aún no tienes notificaciones.
                </div>
              )}
            </div>
          </div>

          <aside className="mt-[18px] flex flex-col gap-[18px] min-[780px]:mt-0">
            <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-5">
              <h3 className="mb-3.5 font-display text-[16px] font-bold">
                Mis parqueaderos
              </h3>
              <div className="flex flex-col gap-2.5">
                {myParkings.map((p) => {
                  const m = statusMeta[p.status as ParkingStatus];
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-[13px] px-3.5 py-3"
                      style={{ background: m.bg }}
                    >
                      <span
                        className="font-display text-[17px] font-bold"
                        style={{ color: m.fg }}
                      >
                        {p.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-bold text-ink">
                          {p.plate || "—"}
                        </div>
                        <div className="text-[12px] font-semibold text-[#6B7585]">
                          {p.kind === "car" ? "Carro" : "Moto"} · {m.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {myParkings.length === 0 && (
                  <div className="p-3.5 text-center text-[13.5px] text-[#6B7585]">
                    Sin parqueaderos asignados.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-5">
              <h3 className="mb-3.5 font-display text-[16px] font-bold">
                Mis autorizaciones
              </h3>
              <div className="flex flex-col gap-2.5">
                {auths.map((a) => {
                  const m = authStMeta[a.status as GrantStatus];
                  return (
                    <div
                      key={a.id}
                      className="rounded-[13px] border border-[#EEF1F6] px-3.5 py-[13px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-bold text-ink">
                          {a.visitor}
                        </span>
                        <span
                          className="rounded-full px-[9px] py-[3px] text-[11.5px] font-bold"
                          style={{ background: m.bg, color: m.fg }}
                        >
                          {m.label}
                        </span>
                      </div>
                      <div className="mt-1 text-[12.5px] text-[#6B7585]">
                        {fmtDateTime(a.whenTs)}
                      </div>
                    </div>
                  );
                })}
                {auths.length === 0 && (
                  <div className="p-3.5 text-center text-[13.5px] text-[#6B7585]">
                    No has autorizado ingresos.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}

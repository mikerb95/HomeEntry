"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateConfig, updateRate } from "@/app/actions/admin";
import { freeParking } from "@/app/actions/parking";
import { ParkingModal, ModalSpot } from "@/components/ParkingModal";
import {
  IconUserSmall,
  IconPackage,
  IconCar,
  IconRegistered,
  IconSearch,
  IconGear,
} from "@/components/icons";
import {
  allAptsArr,
  statusMeta,
  towersArr,
  typeMeta,
  EventType,
  ParkingStatus,
} from "@/lib/meta";
import { fmtCOP, fmtTime } from "@/lib/format";
import { useToast } from "@/lib/toast";

type Ev = {
  id: string;
  type: string;
  tower: string;
  apto: string;
  detail: string;
  tsIso: string;
};
type Spot = {
  id: string;
  kind: "car" | "moto";
  status: ParkingStatus;
  plate: string;
  aptoKey: string;
};
type Sess = {
  type: "resident" | "visitor";
  aptoKey: string;
  kind: string;
  hours: number;
  startIso: string;
};

type Props = {
  slug: string;
  name: string;
  towers: number;
  aptsPerTower: number;
  carSpots: number;
  motoSpots: number;
  visitorRate: number;
  todayStr: string;
  mVisits: number;
  mPackages: number;
  occPct: number;
  regPct: number;
  events: Ev[];
  parking: Spot[];
  sessions: Sess[];
};

const ROWS = 8;

function resolvePeriod(
  preset: string,
  from: string,
  to: string,
): [number, number, string] {
  const now = Date.now();
  const day = 86400000;
  if (preset === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return [d.getTime(), now, "Hoy"];
  }
  if (preset === "week") return [now - 7 * day, now, "Últimos 7 días"];
  if (preset === "month") return [now - 30 * day, now, "Últimos 30 días"];
  const f = from ? new Date(from + "T00:00").getTime() : now - 30 * day;
  const t = to ? new Date(to + "T23:59").getTime() : now;
  return [f, t, "Rango personalizado"];
}

export function AdminPanel(props: Props) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [, start] = useTransition();

  const [tab, setTab] = useState<"dashboard" | "parqueadero" | "auditoria">(
    "dashboard",
  );
  const [fType, setFType] = useState("all");
  const [fTower, setFTower] = useState("all");
  const [fQuery, setFQuery] = useState("");
  const [page, setPage] = useState(1);
  const [apFilter, setApFilter] = useState<"all" | "car" | "moto">("all");
  const [auPreset, setAuPreset] = useState("week");
  const [auFrom, setAuFrom] = useState("");
  const [auTo, setAuTo] = useState("");
  const [rate, setRate] = useState(props.visitorRate);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [pkSpot, setPkSpot] = useState<ModalSpot | null>(null);

  const towerList = towersArr(props.towers);
  const allApts = allAptsArr(props.towers, props.aptsPerTower);
  const aptLabel = (key: string) =>
    allApts.find((a) => a.id === key)?.label || key || "—";

  const adminTabs: { key: typeof tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "parqueadero", label: "Parqueadero" },
    { key: "auditoria", label: "Auditoría" },
  ];

  // --- history table ---
  const filtered = useMemo(
    () =>
      props.events.filter((e) => {
        if (fType !== "all" && e.type !== fType) return false;
        if (fTower !== "all" && e.tower !== fTower) return false;
        if (fQuery) {
          const q = fQuery.toLowerCase();
          if (!`${e.tower} ${e.apto} ${e.detail}`.toLowerCase().includes(q))
            return false;
        }
        return true;
      }),
    [props.events, fType, fTower, fQuery],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS));
  const curPage = Math.min(page, totalPages);
  const pageEvents = filtered.slice((curPage - 1) * ROWS, curPage * ROWS);

  // --- parking table ---
  const apSpots = props.parking.filter((p) =>
    apFilter === "all" ? true : p.kind === apFilter,
  );
  const carFree = props.parking.filter((p) => p.kind === "car" && p.status === "free").length;
  const carTotal = props.parking.filter((p) => p.kind === "car").length;
  const motoFree = props.parking.filter((p) => p.kind === "moto" && p.status === "free").length;
  const motoTotal = props.parking.filter((p) => p.kind === "moto").length;

  // --- audit ---
  const [pFrom, pTo, pLabel] = resolvePeriod(auPreset, auFrom, auTo);
  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= pFrom && t <= pTo;
  };
  const visitSess = props.sessions.filter((s) => s.type === "visitor" && inRange(s.startIso));
  const resSess = props.sessions.filter((s) => s.type === "resident" && inRange(s.startIso));
  const visitHours = visitSess.reduce((a, b) => a + b.hours, 0);
  const auValue = fmtCOP(visitHours * rate);
  const usageMap: Record<string, { uses: number; hours: number }> = {};
  resSess.forEach((s) => {
    if (!usageMap[s.aptoKey]) usageMap[s.aptoKey] = { uses: 0, hours: 0 };
    usageMap[s.aptoKey].uses++;
    usageMap[s.aptoKey].hours += s.hours;
  });
  const usageArr = Object.keys(usageMap)
    .map((k) => ({ key: k, apto: k.replace("-", " · Apto "), ...usageMap[k] }))
    .sort((a, b) => b.hours - a.hours);
  const maxHours = usageArr.length ? usageArr[0].hours : 1;
  const rankRows = usageArr.slice(0, 6);

  function onRate(v: string) {
    const value = Math.max(0, parseInt(v.replace(/\D/g, "") || "0", 10));
    setRate(value);
    start(async () => {
      await updateRate(props.slug, String(value));
    });
  }

  function doFree(id: string) {
    start(async () => {
      await freeParking(id);
      show("Parqueadero liberado", "ok");
      router.refresh();
    });
  }

  const periodTabs = [
    { key: "today", label: "Hoy" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
    { key: "custom", label: "Personalizado" },
  ];
  const typeFilterOptions = [
    { id: "all", label: "Todos los tipos" },
    { id: "visita", label: "Visitas" },
    { id: "encomienda", label: "Paquetes" },
    { id: "parqueadero", label: "Parqueadero" },
    { id: "mensaje", label: "Mensajes" },
  ];

  const th =
    "px-3.5 py-[13px] text-left text-[11.5px] font-bold uppercase tracking-[.5px] text-[#8A94A3]";

  return (
    <div className="animate-pa-in">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-max max-w-full gap-1.5 overflow-x-auto rounded-[14px] border border-[#E3E8EF] bg-white p-[5px]">
          {adminTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="whitespace-nowrap rounded-[10px] px-[18px] py-2.5 text-[14px] font-bold"
              style={{
                background: tab === t.key ? "#0F141A" : "transparent",
                color: tab === t.key ? "#fff" : "#5B6675",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCfgOpen(true)}
          className="flex items-center gap-2 rounded-[12px] border-[1.5px] border-[#E3E8EF] bg-white px-4 py-[11px] text-[14px] font-bold text-ink hover:bg-[#F6F8FB]"
        >
          <IconGear size={17} />
          Configurar
        </button>
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <>
          <div className="mb-[22px] grid grid-cols-1 gap-3.5 min-[680px]:grid-cols-2 min-[1040px]:grid-cols-4">
            <MetricCard soft="#EAF1FF" color="#2F6BFF" label="Visitas hoy" value={String(props.mVisits)} icon={<IconUserSmall size={18} />} />
            <MetricCard soft="#FEF3DC" color="#D97706" label="Paquetes en portería" value={String(props.mPackages)} icon={<IconPackage size={18} />} />
            <MetricCard soft="#E9F8EE" color="#16A34A" label="Ocupación parqueadero" value={`${props.occPct}%`} icon={<IconCar size={18} />} bar={props.occPct} barColor="#16A34A" />
            <MetricCard soft="#EEE9FF" color="#6D28D9" label="Apartamentos registrados" value={`${props.regPct}%`} icon={<IconRegistered size={18} />} bar={props.regPct} barColor="#6D28D9" />
          </div>

          <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
            <div className="border-b border-[#EEF1F6] px-[22px] py-5">
              <h2 className="font-display text-[19px] font-bold">Historial general</h2>
              <div className="mt-0.5 text-[13px] text-[#8A94A3]">{props.todayStr}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF1F6] bg-[#FAFBFD] px-[22px] py-4">
              <div className="relative min-w-[200px] flex-1">
                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#8A94A3]">
                  <IconSearch size={17} />
                </span>
                <input
                  value={fQuery}
                  onChange={(e) => {
                    setFQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por apto, placa o detalle…"
                  className="w-full rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white py-[11px] pl-[38px] pr-3.5 text-[14px] outline-none focus:border-blue"
                />
              </div>
              <FilterSelect value={fType} onChange={(v) => { setFType(v); setPage(1); }} options={typeFilterOptions} />
              <FilterSelect
                value={fTower}
                onChange={(v) => { setFTower(v); setPage(1); }}
                options={[{ id: "all", label: "Todas las torres" }, ...towerList.map((t) => ({ id: t.id, label: t.label }))]}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD]">
                    <th className={`${th} pl-[22px]`}>Hora / Fecha</th>
                    <th className={th}>Tipo</th>
                    <th className={th}>Torre · Apto</th>
                    <th className={`${th} pr-[22px]`}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEvents.map((e) => {
                    const m = typeMeta[e.type as EventType] ?? typeMeta.mensaje;
                    return (
                      <tr key={e.id} className="border-t border-[#F0F3F7]">
                        <td className="whitespace-nowrap px-[22px] py-3.5 text-[13.5px] font-semibold text-[#5B6675]">
                          {fmtTime(e.tsIso)}
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className="inline-block rounded-full px-[11px] py-1 text-[12.5px] font-bold" style={{ background: m.bg, color: m.fg }}>
                            {m.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3.5 text-[14px] font-bold text-ink">
                          {e.tower} · Apto {e.apto}
                        </td>
                        <td className="px-[22px] py-3.5 text-[14px] text-[#3C4654]">
                          {e.detail}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="px-[22px] py-12 text-center text-[14px] text-[#8A94A3]">
                  No hay eventos que coincidan con los filtros.
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[#EEF1F6] px-[22px] py-3.5">
              <span className="text-[13px] font-semibold text-[#8A94A3]">
                Página {curPage} de {totalPages} · {filtered.length} eventos
              </span>
              <div className="flex gap-2">
                <PagerBtn disabled={curPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Anterior</PagerBtn>
                <PagerBtn disabled={curPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente →</PagerBtn>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PARQUEADERO */}
      {tab === "parqueadero" && (
        <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EEF1F6] px-[22px] py-5">
            <div>
              <h2 className="font-display text-[19px] font-bold">Gestión de parqueaderos</h2>
              <div className="mt-0.5 text-[13px] text-[#8A94A3]">
                Carros {carFree}/{carTotal} libres · Motos {motoFree}/{motoTotal} libres
              </div>
            </div>
            <div className="flex gap-1.5 rounded-[11px] bg-[#F0F3F8] p-1">
              {(["all", "car", "moto"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setApFilter(k)}
                  className="rounded-[8px] px-3.5 py-2 text-[13px] font-bold"
                  style={{
                    background: apFilter === k ? "#0F141A" : "#fff",
                    color: apFilter === k ? "#fff" : "#5B6675",
                  }}
                >
                  {k === "all" ? "Todos" : k === "car" ? "Carros" : "Motos"}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="bg-[#FAFBFD]">
                  <th className={`${th} pl-[22px]`}>Cupo</th>
                  <th className={th}>Tipo</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Placa</th>
                  <th className={th}>Apartamento</th>
                  <th className={`${th} pr-[22px] text-right`}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {apSpots.map((p) => {
                  const m = statusMeta[p.status];
                  const free = p.status === "free";
                  return (
                    <tr key={p.id} className="border-t border-[#F0F3F7]">
                      <td className="px-[22px] py-[13px] font-display text-[15px] font-bold text-ink">{p.id}</td>
                      <td className="px-3.5 py-[13px] text-[14px] font-semibold text-[#5B6675]">{p.kind === "car" ? "Carro" : "Moto"}</td>
                      <td className="px-3.5 py-[13px]">
                        <span className="inline-block rounded-full px-[11px] py-1 text-[12.5px] font-bold" style={{ background: m.bg, color: m.fg }}>
                          {m.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-[13px] text-[14px] font-bold tracking-[.5px] text-ink">{p.plate || "—"}</td>
                      <td className="px-3.5 py-[13px] text-[14px] text-[#3C4654]">{aptLabel(p.aptoKey)}</td>
                      <td className="px-[22px] py-[13px] text-right">
                        <button
                          onClick={() => (free ? setPkSpot(p) : doFree(p.id))}
                          className="rounded-[9px] px-4 py-[7px] text-[13px] font-bold text-white"
                          style={{ background: free ? "#2F6BFF" : "#E11D48" }}
                        >
                          {free ? "Asignar" : "Liberar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDITORÍA */}
      {tab === "auditoria" && (
        <>
          <div className="mb-5 rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="mb-3 font-display text-[19px] font-bold">Auditoría de parqueadero</h2>
                <div className="flex w-max flex-wrap gap-1.5 rounded-[11px] bg-[#F0F3F8] p-1">
                  {periodTabs.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setAuPreset(p.key)}
                      className="rounded-[8px] px-3.5 py-2 text-[13px] font-bold"
                      style={{
                        background: auPreset === p.key ? "#6D28D9" : "transparent",
                        color: auPreset === p.key ? "#fff" : "#5B6675",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-bold text-[#5B6675]">Tarifa visitante / hora</span>
                <div className="flex items-center rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3">
                  <span className="font-bold text-[#5B6675]">$</span>
                  <input
                    value={String(rate)}
                    onChange={(e) => onRate(e.target.value)}
                    inputMode="numeric"
                    className="w-[90px] bg-transparent px-1.5 py-2.5 text-[15px] font-bold outline-none"
                  />
                </div>
              </div>
            </div>
            {auPreset === "custom" && (
              <div className="mt-3.5 flex flex-wrap gap-3">
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#8A94A3]">Desde</label>
                  <input type="date" value={auFrom} onChange={(e) => setAuFrom(e.target.value)} className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#8A94A3]">Hasta</label>
                  <input type="date" value={auTo} onChange={(e) => setAuTo(e.target.value)} className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none" />
                </div>
              </div>
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3.5 min-[680px]:grid-cols-2 min-[1040px]:grid-cols-4">
            <div className="rounded-[18px] bg-gradient-to-br from-violet to-violet-dark p-[22px] text-white">
              <div className="mb-2.5 text-[13px] font-semibold opacity-85">Valor acumulado · visitantes</div>
              <div className="font-display text-[30px] font-bold tracking-[-1px]">{auValue}</div>
              <div className="mt-1.5 text-[12.5px] opacity-80">{pLabel}</div>
            </div>
            <AuditCard label="Ingresos de visitantes" value={String(visitSess.length)} />
            <AuditCard label="Horas facturadas" value={String(visitHours)} />
            <AuditCard label="Usos de residentes" value={String(resSess.length)} />
          </div>

          <div className="grid grid-cols-1 gap-5 min-[780px]:grid-cols-2">
            <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
              <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
                <h3 className="font-display text-[17px] font-bold">Uso por residentes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBFD]">
                      <th className={`${th} pl-5`}>Apartamento</th>
                      <th className={`${th} text-right`}>Usos</th>
                      <th className={`${th} pr-5 text-right`}>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageArr.map((u) => (
                      <tr key={u.key} className="border-t border-[#F0F3F7]">
                        <td className="px-5 py-3 text-[14px] font-bold text-ink">{u.apto}</td>
                        <td className="px-3.5 py-3 text-right text-[14px] font-semibold text-[#3C4654]">{u.uses}</td>
                        <td className="px-5 py-3 text-right text-[14px] font-semibold text-[#3C4654]">{u.hours} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {usageArr.length === 0 && (
                  <div className="p-[30px] text-center text-[13.5px] text-[#8A94A3]">Sin datos en el período.</div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
              <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
                <h3 className="font-display text-[17px] font-bold">Ranking de uso</h3>
                <div className="mt-0.5 text-[12.5px] text-[#8A94A3]">Apartamentos que más usan el parqueadero</div>
              </div>
              <div className="px-5 pb-4 pt-2">
                {rankRows.map((r, i) => (
                  <div key={r.key} className="flex items-center gap-[13px] border-b border-[#F2F5F9] py-3">
                    <span
                      className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] font-display text-[13px] font-bold"
                      style={{
                        background: i === 0 ? "#EEE9FF" : "#F0F3F8",
                        color: i === 0 ? "#6D28D9" : "#8A94A3",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-bold text-ink">{r.apto}</span>
                    <div className="w-[120px] flex-none">
                      <div className="h-2 overflow-hidden rounded-full bg-[#EDF1F6]">
                        <div className="h-full rounded-full bg-violet" style={{ width: `${Math.round((r.hours / maxHours) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="w-[42px] flex-none text-right text-[13px] font-bold text-[#6B7585]">{r.hours} h</span>
                  </div>
                ))}
                {rankRows.length === 0 && (
                  <div className="p-6 text-center text-[13.5px] text-[#8A94A3]">Sin datos en el período.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {cfgOpen && (
        <ConfigModal
          initial={{
            name: props.name,
            towers: props.towers,
            aptsPerTower: props.aptsPerTower,
            carSpots: props.carSpots,
            motoSpots: props.motoSpots,
          }}
          onClose={() => setCfgOpen(false)}
        />
      )}

      {pkSpot && (
        <ParkingModal spot={pkSpot} allApts={allApts} onClose={() => setPkSpot(null)} />
      )}
    </div>
  );
}

function MetricCard({
  soft,
  color,
  label,
  value,
  icon,
  bar,
  barColor,
}: {
  soft: string;
  color: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  bar?: number;
  barColor?: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-5">
      <div className="mb-3.5 flex items-center gap-[9px]">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]" style={{ background: soft, color }}>
          {icon}
        </span>
        <span className="text-[13px] font-bold text-[#6B7585]">{label}</span>
      </div>
      <div className="font-display text-[32px] font-bold tracking-[-1px]">{value}</div>
      {bar !== undefined && (
        <div className="mt-2.5 h-[7px] overflow-hidden rounded-full bg-[#EDF1F6]">
          <div className="h-full rounded-full" style={{ width: `${bar}%`, background: barColor }} />
        </div>
      )}
    </div>
  );
}

function AuditCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#E8ECF2] bg-white p-[22px]">
      <div className="mb-2.5 text-[13px] font-bold text-[#6B7585]">{label}</div>
      <div className="font-display text-[30px] font-bold tracking-[-1px]">{value}</div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white py-[11px] pl-3.5 pr-[38px] text-[14px] font-semibold outline-none focus:border-blue"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8A94A3]">▾</span>
    </div>
  );
}

function PagerBtn({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-[10px] border-[1.5px] border-[#E3E8EF] bg-white px-3.5 py-2 text-[13px] font-bold"
      style={{ color: disabled ? "#C4CCD6" : "#0F141A", cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {children}
    </button>
  );
}

function ConfigModal({
  initial,
  onClose,
}: {
  initial: {
    name: string;
    towers: number;
    aptsPerTower: number;
    carSpots: number;
    motoSpots: number;
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [pending, start] = useTransition();
  const [name, setName] = useState(initial.name);
  const [towers, setTowers] = useState(String(initial.towers));
  const [apts, setApts] = useState(String(initial.aptsPerTower));
  const [carSpots, setCarSpots] = useState(String(initial.carSpots));
  const [motoSpots, setMotoSpots] = useState(String(initial.motoSpots));

  const numCls =
    "w-full rounded-[12px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[15px] py-[13px] text-[15px] font-bold outline-none focus:border-blue";
  const lab = "mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]";

  function apply() {
    start(async () => {
      await updateConfig({
        name,
        towers,
        aptsPerTower: apts,
        carSpots,
        motoSpots,
      });
      show("Configuración aplicada", "ok");
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex animate-pa-in items-center justify-center bg-[rgba(15,20,26,.5)] p-5 backdrop-blur-[3px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[460px] max-w-full animate-pa-pop overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_-20px_rgba(15,20,26,.5)]"
      >
        <div className="border-b border-[#EEF1F6] px-[22px] py-5">
          <h2 className="font-display text-[18px] font-bold">Configurar conjunto</h2>
          <div className="mt-0.5 text-[13px] text-[#8A94A3]">
            Define la estructura según tu conjunto residencial.
          </div>
        </div>
        <div className="px-[22px] py-5">
          <label className={lab}>Nombre del conjunto</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mb-[18px] w-full rounded-[12px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[15px] py-[13px] text-[15px] font-semibold outline-none focus:border-blue" />
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={lab}>Torres</label>
              <input value={towers} onChange={(e) => setTowers(e.target.value)} inputMode="numeric" className={numCls} />
            </div>
            <div>
              <label className={lab}>Aptos por torre</label>
              <input value={apts} onChange={(e) => setApts(e.target.value)} inputMode="numeric" className={numCls} />
            </div>
            <div>
              <label className={lab}>Cupos carros</label>
              <input value={carSpots} onChange={(e) => setCarSpots(e.target.value)} inputMode="numeric" className={numCls} />
            </div>
            <div>
              <label className={lab}>Cupos motos</label>
              <input value={motoSpots} onChange={(e) => setMotoSpots(e.target.value)} inputMode="numeric" className={numCls} />
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 border-t border-[#EEF1F6] px-[22px] py-4">
          <button onClick={onClose} className="flex-none rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-white px-[18px] py-3.5 text-[14px] font-bold text-[#5B6675]">
            Cancelar
          </button>
          <button onClick={apply} disabled={pending} className="flex-1 rounded-[13px] bg-blue p-3.5 text-[14.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70">
            Aplicar configuración
          </button>
        </div>
      </div>
    </div>
  );
}

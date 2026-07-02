"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateConfig,
  updateRate,
  updateLogo,
  removeLogo,
} from "@/app/actions/admin";
import { freeParking } from "@/app/actions/parking";
import {
  updateMoraConfig,
  generateMonthlyCharges,
  createVendor,
  deleteVendor,
} from "@/app/actions/finance";
import {
  createGuard,
  resetGuardPassword,
  deleteGuard,
} from "@/app/actions/guards";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { TabBar } from "@/components/TabBar";
import { ParkingModal, ModalSpot } from "@/components/ParkingModal";
import { PaymentModal } from "@/components/PaymentModal";
import { ExpenseModal } from "@/components/ExpenseModal";
import {
  PendingResidents,
  type PendingResident,
} from "@/components/PendingResidents";
import {
  OwnersPanel,
  type NoticeRow,
  type OwnerLink,
  type RequestRow,
} from "./OwnersPanel";
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
  enteredAtIso: string | null;
};
type Sess = {
  type: "resident" | "visitor";
  aptoKey: string;
  kind: string;
  hours: number;
  amount: number;
  startIso: string;
};
type AptBalance = {
  aptoKey: string;
  totalCargado: number;
  totalPagado: number;
  saldo: number;
  mora: number;
  total: number;
  enMora: boolean;
};
type Vendor = {
  id: string;
  name: string;
  category: string;
  taxId: string;
  contact: string;
};
type Expense = {
  id: string;
  vendorId: string;
  vendorName: string;
  category: string;
  amount: number;
  description: string;
  invoiceRef: string;
  expenseDateIso: string;
  registeredBy: string;
};
type AccessLogEntry = {
  id: string;
  tsIso: string;
  actor: string;
  action: string;
  target: string;
};
type Guard = {
  username: string;
};

type Props = {
  slug: string;
  name: string;
  logoUrl: string | null;
  towers: number;
  aptsPerTower: number;
  carSpots: number;
  motoSpots: number;
  visitorRate: number;
  visitorRateMoto: number;
  moraRatePct: number;
  moraGraceDays: number;
  todayStr: string;
  mVisits: number;
  mPackages: number;
  occPct: number;
  regPct: number;
  events: Ev[];
  parking: Spot[];
  sessions: Sess[];
  aptBalances: AptBalance[];
  carteraTotal: number;
  recaudoTotal: number;
  moraTotal: number;
  gastoTotal: number;
  parqueaderoTotal: number;
  balanceNeto: number;
  vendors: Vendor[];
  expenses: Expense[];
  financeAccessLog: AccessLogEntry[];
  guards: Guard[];
  pending: PendingResident[];
  ownerLinks: OwnerLink[];
  notices: NoticeRow[];
  serviceRequests: RequestRow[];
};

const EXPENSE_CATEGORIES = [
  { id: "mantenimiento", label: "Mantenimiento" },
  { id: "aseo", label: "Aseo" },
  { id: "jardineria", label: "Jardinería" },
  { id: "seguridad", label: "Seguridad" },
  { id: "otro", label: "Otro" },
];

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
  const [pending, start] = useTransition();

  const [tab, setTab] = useState<
    | "dashboard"
    | "parqueadero"
    | "auditoria"
    | "finanzas"
    | "gastos"
    | "vigilantes"
    | "solicitudes"
    | "propietarios"
  >("dashboard");
  const [fType, setFType] = useState("all");
  const [fTower, setFTower] = useState("all");
  const [fQuery, setFQuery] = useState("");
  const [page, setPage] = useState(1);
  const [apFilter, setApFilter] = useState<"all" | "car" | "moto">("all");
  const [auPreset, setAuPreset] = useState("week");
  const [auFrom, setAuFrom] = useState("");
  const [auTo, setAuTo] = useState("");
  const [rate, setRate] = useState(props.visitorRate);
  const [rateMoto, setRateMoto] = useState(props.visitorRateMoto);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [pkSpot, setPkSpot] = useState<ModalSpot | null>(null);

  // --- finanzas ---
  // Human-readable percentage ("1.5"); converted to basis points on save so
  // the admin can type decimals naturally.
  const [moraRate, setMoraRate] = useState(
    props.moraRatePct ? String(props.moraRatePct / 100) : "0",
  );
  const [moraGrace, setMoraGrace] = useState(String(props.moraGraceDays));
  const [payApt, setPayApt] = useState<{ key: string; label: string } | null>(
    null,
  );
  const [genOpen, setGenOpen] = useState(false);
  const [genPeriod, setGenPeriod] = useState("");
  const [genAmount, setGenAmount] = useState("");
  const [genDue, setGenDue] = useState("");

  // --- gastos ---
  const [expOpen, setExpOpen] = useState(false);
  const [vName, setVName] = useState("");
  const [vCategory, setVCategory] = useState("mantenimiento");
  const [vTaxId, setVTaxId] = useState("");
  const [vContact, setVContact] = useState("");
  const [gPreset, setGPreset] = useState("month");
  const [gFrom, setGFrom] = useState("");
  const [gTo, setGTo] = useState("");
  const [gCategory, setGCategory] = useState("all");
  const [gVendor, setGVendor] = useState("all");

  // --- vigilantes ---
  const [gdUsername, setGdUsername] = useState("");
  const [gdPassword, setGdPassword] = useState("");
  const [resetGuardUser, setResetGuardUser] = useState<string | null>(null);

  const towerList = towersArr(props.towers);
  const allApts = allAptsArr(props.towers, props.aptsPerTower);
  const aptLabel = (key: string) =>
    allApts.find((a) => a.id === key)?.label || key || "—";

  const adminTabs: { key: typeof tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "parqueadero", label: "Parqueadero" },
    { key: "auditoria", label: "Auditoría" },
    { key: "finanzas", label: "Finanzas" },
    { key: "gastos", label: "Gastos" },
    { key: "vigilantes", label: "Vigilantes" },
    {
      key: "solicitudes",
      label: props.pending.length
        ? `Solicitudes (${props.pending.length})`
        : "Solicitudes",
    },
    { key: "propietarios", label: "Propietarios" },
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
  // Sum what each exit actually charged (stored per session), so the audit
  // stays truthful across rate changes and mixed car/moto tariffs.
  const auValue = fmtCOP(visitSess.reduce((a, b) => a + b.amount, 0));
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

  // Rates are edited locally and persisted on blur — saving on every
  // keystroke spammed the server and raced against itself.
  function onRate(v: string, kind: "car" | "moto") {
    const value = Math.max(0, parseInt(v.replace(/\D/g, "") || "0", 10));
    (kind === "moto" ? setRateMoto : setRate)(value);
  }

  function saveRate(kind: "car" | "moto") {
    const value = kind === "moto" ? rateMoto : rate;
    const saved = kind === "moto" ? props.visitorRateMoto : props.visitorRate;
    if (value === saved) return;
    start(async () => {
      await updateRate(props.slug, String(value), kind);
      show("Tarifa guardada", "ok");
      router.refresh();
    });
  }

  function doFree(id: string) {
    start(async () => {
      const res = await freeParking(props.slug, id);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show(
        res.charge && res.charge.amount > 0
          ? `Salida registrada · Cobrar ${fmtCOP(res.charge.amount)} (${res.charge.hours} h)`
          : "Parqueadero liberado",
        "ok",
      );
      router.refresh();
    });
  }

  // --- finanzas ---
  function saveMoraConfig() {
    const pct = parseFloat(moraRate.replace(",", "."));
    if (isNaN(pct) || pct < 0) {
      show("Ingresa una tasa de mora válida", "warn");
      return;
    }
    start(async () => {
      const res = await updateMoraConfig(props.slug, {
        moraRatePct: String(Math.round(pct * 100)),
        moraGraceDays: moraGrace,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Configuración de mora guardada", "ok");
      router.refresh();
    });
  }

  function submitGenCharges() {
    start(async () => {
      const res = await generateMonthlyCharges(props.slug, {
        period: genPeriod,
        amount: genAmount,
        dueDate: genDue,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Cuotas generadas", "ok");
      setGenOpen(false);
      setGenPeriod("");
      setGenAmount("");
      setGenDue("");
      router.refresh();
    });
  }

  const balanceByApt = new Map(props.aptBalances.map((b) => [b.aptoKey, b]));
  const aptRows = allApts.map((a) => ({
    ...a,
    balance: balanceByApt.get(a.id) ?? {
      aptoKey: a.id,
      totalCargado: 0,
      totalPagado: 0,
      saldo: 0,
      mora: 0,
      total: 0,
      enMora: false,
    },
  }));

  // --- gastos ---
  function submitVendor() {
    if (!vName.trim()) {
      show("Ingresa el nombre del proveedor", "warn");
      return;
    }
    start(async () => {
      const res = await createVendor(props.slug, {
        name: vName,
        category: vCategory,
        taxId: vTaxId,
        contact: vContact,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Proveedor creado", "ok");
      setVName("");
      setVTaxId("");
      setVContact("");
      router.refresh();
    });
  }

  function removeVendor(id: string) {
    start(async () => {
      const res = await deleteVendor(props.slug, id);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Proveedor eliminado", "ok");
      router.refresh();
    });
  }

  // --- vigilantes ---
  function submitGuard() {
    start(async () => {
      const res = await createGuard(props.slug, {
        username: gdUsername,
        password: gdPassword,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Vigilante creado", "ok");
      setGdUsername("");
      setGdPassword("");
      router.refresh();
    });
  }

  function removeGuard(username: string) {
    if (!confirm(`¿Eliminar al vigilante "${username}"?`)) return;
    start(async () => {
      const res = await deleteGuard(props.slug, username);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Vigilante eliminado", "ok");
      router.refresh();
    });
  }

  const [gFromTs, gToTs, gPeriodLabel] = resolvePeriod(gPreset, gFrom, gTo);
  const filteredExpenses = props.expenses.filter((e) => {
    const t = new Date(e.expenseDateIso).getTime();
    if (t < gFromTs || t > gToTs) return false;
    if (gCategory !== "all" && e.category !== gCategory) return false;
    if (gVendor !== "all" && e.vendorId !== gVendor) return false;
    return true;
  });
  const gTotal = filteredExpenses.reduce((a, b) => a + b.amount, 0);
  const gByCategory: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    gByCategory[e.category] = (gByCategory[e.category] || 0) + e.amount;
  });

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
    "px-3.5 py-[13px] text-left text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]";

  return (
    <div className="animate-pa-in">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
        <TabBar
          label="Secciones de administración"
          tabs={adminTabs}
          active={tab}
          onChange={setTab}
        />
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
              <div className="mt-0.5 text-[13px] text-[#6B7585]">{props.todayStr}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF1F6] bg-[#FAFBFD] px-[22px] py-4">
              <div className="relative min-w-[200px] flex-1">
                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#6B7585]">
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
                <div className="px-[22px] py-12 text-center text-[14px] text-[#6B7585]">
                  No hay eventos que coincidan con los filtros.
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[#EEF1F6] px-[22px] py-3.5">
              <span className="text-[13px] font-semibold text-[#6B7585]">
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
              <div className="mt-0.5 text-[13px] text-[#6B7585]">
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
                          disabled={pending}
                          className="rounded-[9px] px-4 py-[7px] text-[13px] font-bold text-white disabled:opacity-60"
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
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[13px] font-bold text-[#5B6675]">Tarifa carro / hora</span>
                <div className="flex items-center rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3">
                  <span className="font-bold text-[#5B6675]">$</span>
                  <input
                    value={String(rate)}
                    onChange={(e) => onRate(e.target.value, "car")}
                    onBlur={() => saveRate("car")}
                    inputMode="numeric"
                    className="w-[90px] bg-transparent px-1.5 py-2.5 text-[15px] font-bold outline-none"
                  />
                </div>
                <span className="text-[13px] font-bold text-[#5B6675]">Tarifa moto / hora</span>
                <div className="flex items-center rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3">
                  <span className="font-bold text-[#5B6675]">$</span>
                  <input
                    value={String(rateMoto)}
                    onChange={(e) => onRate(e.target.value, "moto")}
                    onBlur={() => saveRate("moto")}
                    inputMode="numeric"
                    className="w-[90px] bg-transparent px-1.5 py-2.5 text-[15px] font-bold outline-none"
                  />
                </div>
              </div>
            </div>
            {auPreset === "custom" && (
              <div className="mt-3.5 flex flex-wrap gap-3">
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">Desde</label>
                  <input type="date" value={auFrom} onChange={(e) => setAuFrom(e.target.value)} className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">Hasta</label>
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
                  <div className="p-[30px] text-center text-[13.5px] text-[#6B7585]">Sin datos en el período.</div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
              <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
                <h3 className="font-display text-[17px] font-bold">Ranking de uso</h3>
                <div className="mt-0.5 text-[12.5px] text-[#6B7585]">Apartamentos que más usan el parqueadero</div>
              </div>
              <div className="px-5 pb-4 pt-2">
                {rankRows.map((r, i) => (
                  <div key={r.key} className="flex items-center gap-[13px] border-b border-[#F2F5F9] py-3">
                    <span
                      className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] font-display text-[13px] font-bold"
                      style={{
                        background: i === 0 ? "#EEE9FF" : "#F0F3F8",
                        color: i === 0 ? "#6D28D9" : "#6B7585",
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
                  <div className="p-6 text-center text-[13.5px] text-[#6B7585]">Sin datos en el período.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* FINANZAS */}
      {tab === "finanzas" && (
        <>
          <div className="mb-5 rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="mb-1.5 font-display text-[19px] font-bold">
                  Configuración de mora
                </h2>
                <div className="text-[13px] text-[#6B7585]">
                  Se aplica a cuotas vencidas más allá del período de gracia.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                    Tasa mensual (%)
                  </label>
                  <div className="flex items-center rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3">
                    <input
                      value={moraRate}
                      onChange={(e) =>
                        setMoraRate(e.target.value.replace(/[^\d.,]/g, ""))
                      }
                      inputMode="decimal"
                      className="w-[80px] bg-transparent px-1.5 py-2.5 text-[15px] font-bold outline-none"
                    />
                    <span className="font-bold text-[#5B6675]">%</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                    Días de gracia
                  </label>
                  <input
                    value={moraGrace}
                    onChange={(e) =>
                      setMoraGrace(e.target.value.replace(/\D/g, ""))
                    }
                    inputMode="numeric"
                    className="w-[90px] rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3 py-2.5 text-[15px] font-bold outline-none"
                  />
                </div>
                <button
                  onClick={saveMoraConfig}
                  disabled={pending}
                  className="rounded-[11px] bg-blue px-4 py-[13px] text-[13.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
                >
                  {pending ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3.5 min-[680px]:grid-cols-2 min-[1040px]:grid-cols-5">
            <AuditCard label="Cartera total" value={fmtCOP(props.carteraTotal)} />
            <AuditCard label="Recaudado" value={fmtCOP(props.recaudoTotal)} />
            <AuditCard label="En mora" value={fmtCOP(props.moraTotal)} />
            <AuditCard
              label="Caja parqueadero"
              value={fmtCOP(props.parqueaderoTotal)}
            />
            <div className="rounded-[18px] bg-gradient-to-br from-violet to-violet-dark p-[22px] text-white">
              <div className="mb-2.5 text-[13px] font-semibold opacity-85">
                Balance neto del conjunto
              </div>
              <div className="font-display text-[30px] font-bold tracking-[-1px]">
                {fmtCOP(props.balanceNeto)}
              </div>
              <div className="mt-1.5 text-[12.5px] opacity-80">
                Recaudado + parqueadero − gastos
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1F6] px-[22px] py-5">
              <div>
                <h2 className="font-display text-[19px] font-bold">
                  Estado financiero por apartamento
                </h2>
                <div className="mt-0.5 text-[13px] text-[#6B7585]">
                  Balance calculado en tiempo real
                </div>
              </div>
              <button
                onClick={() => setGenOpen((v) => !v)}
                className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-4 py-[11px] text-[13.5px] font-bold text-ink hover:bg-[#F6F8FB]"
              >
                Generar cuotas del mes
              </button>
            </div>
            {genOpen && (
              <div className="flex flex-wrap items-end gap-3 border-b border-[#EEF1F6] bg-[#FAFBFD] px-[22px] py-4">
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                    Período
                  </label>
                  <input
                    type="month"
                    value={genPeriod}
                    onChange={(e) => setGenPeriod(e.target.value)}
                    className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-[13px] py-[11px] text-[14px] font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                    Monto por apto (COP)
                  </label>
                  <input
                    value={genAmount}
                    onChange={(e) => setGenAmount(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-[13px] py-[11px] text-[14px] font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                    Fecha límite
                  </label>
                  <input
                    type="date"
                    value={genDue}
                    onChange={(e) => setGenDue(e.target.value)}
                    className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-[13px] py-[11px] text-[14px] font-semibold outline-none"
                  />
                </div>
                <button
                  onClick={submitGenCharges}
                  disabled={pending}
                  className="rounded-[11px] bg-blue px-4 py-[11px] text-[13.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
                >
                  {pending ? "Generando…" : "Generar"}
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD]">
                    <th className={`${th} pl-[22px]`}>Apartamento</th>
                    <th className={`${th} text-right`}>Cargado</th>
                    <th className={`${th} text-right`}>Pagado</th>
                    <th className={`${th} text-right`}>Saldo</th>
                    <th className={`${th} text-right`}>Mora</th>
                    <th className={th}>Estado</th>
                    <th className={`${th} pr-[22px] text-right`}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {aptRows.map((a) => (
                    <tr key={a.id} className="border-t border-[#F0F3F7]">
                      <td className="px-[22px] py-3.5 text-[14px] font-bold text-ink">
                        {a.label}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-[14px] font-semibold text-[#3C4654]">
                        {fmtCOP(a.balance.totalCargado)}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-[14px] font-semibold text-[#3C4654]">
                        {fmtCOP(a.balance.totalPagado)}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-[14px] font-bold text-ink">
                        {fmtCOP(a.balance.saldo)}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-[14px] font-semibold text-[#E11D48]">
                        {a.balance.mora > 0 ? fmtCOP(a.balance.mora) : "—"}
                      </td>
                      <td className="px-3.5 py-3.5">
                        <span
                          className="inline-block rounded-full px-[11px] py-1 text-[12.5px] font-bold"
                          style={
                            a.balance.enMora
                              ? { background: "#FDECEF", color: "#E11D48" }
                              : { background: "#E9F8EE", color: "#16A34A" }
                          }
                        >
                          {a.balance.enMora ? "En mora" : "Al día"}
                        </span>
                      </td>
                      <td className="px-[22px] py-3.5 text-right">
                        <button
                          onClick={() => setPayApt({ key: a.id, label: a.label })}
                          className="rounded-[9px] bg-blue px-4 py-[7px] text-[13px] font-bold text-white hover:bg-blue-dark"
                        >
                          Registrar pago
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {props.financeAccessLog.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
              <div className="border-b border-[#EEF1F6] px-5 py-[18px]">
                <h3 className="font-display text-[17px] font-bold">
                  Bitácora de accesos financieros
                </h3>
                <div className="mt-0.5 text-[12.5px] text-[#6B7585]">
                  Quién consultó o modificó información financiera, y cuándo.
                </div>
              </div>
              <div className="max-h-[260px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBFD]">
                      <th className={`${th} pl-5`}>Fecha</th>
                      <th className={th}>Actor</th>
                      <th className={th}>Acción</th>
                      <th className={`${th} pr-5`}>Sobre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.financeAccessLog.map((l) => (
                      <tr key={l.id} className="border-t border-[#F0F3F7]">
                        <td className="whitespace-nowrap px-5 py-2.5 text-[13px] font-semibold text-[#5B6675]">
                          {fmtTime(l.tsIso)}
                        </td>
                        <td className="px-3.5 py-2.5 text-[13px] font-bold text-ink">
                          {l.actor}
                        </td>
                        <td className="px-3.5 py-2.5 text-[13px] text-[#3C4654]">
                          {l.action}
                        </td>
                        <td className="px-5 py-2.5 text-[13px] text-[#3C4654]">
                          {l.target}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* GASTOS */}
      {tab === "gastos" && (
        <>
          <div className="mb-5 rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
            <h2 className="mb-3.5 font-display text-[19px] font-bold">
              Nuevo proveedor
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                  Nombre
                </label>
                <input
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  className="w-full rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none focus:border-blue"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                  Categoría
                </label>
                <div className="relative">
                  <select
                    value={vCategory}
                    onChange={(e) => setVCategory(e.target.value)}
                    className="cursor-pointer appearance-none rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] py-[11px] pl-3.5 pr-9 text-[14px] font-semibold outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#6B7585]">
                    ▾
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                  NIT (opcional)
                </label>
                <input
                  value={vTaxId}
                  onChange={(e) => setVTaxId(e.target.value)}
                  className="w-[140px] rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                  Contacto (opcional)
                </label>
                <input
                  value={vContact}
                  onChange={(e) => setVContact(e.target.value)}
                  className="w-[160px] rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none"
                />
              </div>
              <button
                onClick={submitVendor}
                disabled={pending}
                className="rounded-[11px] bg-blue px-4 py-[11px] text-[13.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
              >
                {pending ? "Creando…" : "Crear proveedor"}
              </button>
            </div>

            {props.vendors.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {props.vendors.map((v) => (
                  <span
                    key={v.id}
                    className="flex items-center gap-2 rounded-full bg-[#F0F3F8] py-1.5 pl-3.5 pr-2 text-[12.5px] font-bold text-[#3C4654]"
                  >
                    {v.name}
                    <button
                      onClick={() => removeVendor(v.id)}
                      disabled={pending}
                      aria-label={`Eliminar proveedor ${v.name}`}
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[11px] text-[#6B7585] hover:text-rose disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3.5 min-[680px]:grid-cols-2 min-[1040px]:grid-cols-4">
            <div className="rounded-[18px] bg-gradient-to-br from-violet to-violet-dark p-[22px] text-white">
              <div className="mb-2.5 text-[13px] font-semibold opacity-85">
                Gasto total
              </div>
              <div className="font-display text-[30px] font-bold tracking-[-1px]">
                {fmtCOP(gTotal)}
              </div>
              <div className="mt-1.5 text-[12.5px] opacity-80">{gPeriodLabel}</div>
            </div>
            {EXPENSE_CATEGORIES.slice(0, 3).map((c) => (
              <AuditCard
                key={c.id}
                label={c.label}
                value={fmtCOP(gByCategory[c.id] || 0)}
              />
            ))}
          </div>

          <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EEF1F6] px-[22px] py-5">
              <div>
                <h2 className="font-display text-[19px] font-bold">
                  Gastos por proveedor
                </h2>
              </div>
              <button
                onClick={() => setExpOpen(true)}
                disabled={props.vendors.length === 0}
                className="rounded-[11px] bg-blue px-4 py-[11px] text-[13.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-50"
              >
                Registrar gasto
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF1F6] bg-[#FAFBFD] px-[22px] py-4">
              <div className="flex w-max flex-wrap gap-1.5 rounded-[11px] bg-[#F0F3F8] p-1">
                {periodTabs.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setGPreset(p.key)}
                    className="rounded-[8px] px-3.5 py-2 text-[13px] font-bold"
                    style={{
                      background: gPreset === p.key ? "#6D28D9" : "transparent",
                      color: gPreset === p.key ? "#fff" : "#5B6675",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {gPreset === "custom" && (
                <>
                  <input
                    type="date"
                    value={gFrom}
                    onChange={(e) => setGFrom(e.target.value)}
                    className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-[13px] py-[11px] text-[14px] font-semibold outline-none"
                  />
                  <input
                    type="date"
                    value={gTo}
                    onChange={(e) => setGTo(e.target.value)}
                    className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-[13px] py-[11px] text-[14px] font-semibold outline-none"
                  />
                </>
              )}
              <FilterSelect
                value={gCategory}
                onChange={setGCategory}
                options={[
                  { id: "all", label: "Todas las categorías" },
                  ...EXPENSE_CATEGORIES,
                ]}
              />
              <FilterSelect
                value={gVendor}
                onChange={setGVendor}
                options={[
                  { id: "all", label: "Todos los proveedores" },
                  ...props.vendors.map((v) => ({ id: v.id, label: v.name })),
                ]}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD]">
                    <th className={`${th} pl-[22px]`}>Fecha</th>
                    <th className={th}>Proveedor</th>
                    <th className={th}>Categoría</th>
                    <th className={`${th} text-right`}>Monto</th>
                    <th className={th}>Descripción</th>
                    <th className={`${th} pr-[22px]`}>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="border-t border-[#F0F3F7]">
                      <td className="whitespace-nowrap px-[22px] py-3.5 text-[13.5px] font-semibold text-[#5B6675]">
                        {fmtTime(e.expenseDateIso)}
                      </td>
                      <td className="px-3.5 py-3.5 text-[14px] font-bold text-ink">
                        {e.vendorName}
                      </td>
                      <td className="px-3.5 py-3.5 text-[13.5px] text-[#3C4654]">
                        {EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.label ||
                          e.category}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-[14px] font-bold text-ink">
                        {fmtCOP(e.amount)}
                      </td>
                      <td className="px-3.5 py-3.5 text-[14px] text-[#3C4654]">
                        {e.description}
                      </td>
                      <td className="px-[22px] py-3.5 text-[13.5px] text-[#6B7585]">
                        {e.registeredBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredExpenses.length === 0 && (
                <div className="px-[22px] py-12 text-center text-[14px] text-[#6B7585]">
                  No hay gastos que coincidan con los filtros.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* VIGILANTES */}
      {tab === "vigilantes" && (
        <>
          <div className="mb-5 rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
            <h2 className="mb-3.5 font-display text-[19px] font-bold">
              Nuevo vigilante
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                  Usuario
                </label>
                <input
                  value={gdUsername}
                  onChange={(e) => setGdUsername(e.target.value)}
                  placeholder="vigilante1"
                  className="w-full rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none focus:border-blue"
                />
              </div>
              <div className="min-w-[180px] flex-1">
                <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={gdPassword}
                  onChange={(e) => setGdPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none focus:border-blue"
                />
              </div>
              <button
                onClick={submitGuard}
                disabled={pending}
                className="rounded-[11px] bg-blue px-4 py-[11px] text-[13.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
              >
                {pending ? "Creando…" : "Crear vigilante"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-[#E8ECF2] bg-white">
            <div className="border-b border-[#EEF1F6] px-[22px] py-5">
              <h2 className="font-display text-[19px] font-bold">
                Vigilantes registrados
              </h2>
              <div className="mt-0.5 text-[13px] text-[#6B7585]">
                Usuarios con acceso a portería
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD]">
                    <th className={`${th} pl-[22px]`}>Usuario</th>
                    <th className={`${th} pr-[22px] text-right`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {props.guards.map((g) => (
                    <tr key={g.username} className="border-t border-[#F0F3F7]">
                      <td className="px-[22px] py-3.5 text-[14px] font-bold text-ink">
                        {g.username}
                      </td>
                      <td className="px-[22px] py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setResetGuardUser(g.username)}
                            className="rounded-[9px] border-[1.5px] border-[#E3E8EF] bg-white px-3.5 py-[7px] text-[13px] font-bold text-ink hover:bg-[#F6F8FB]"
                          >
                            Restablecer contraseña
                          </button>
                          <button
                            onClick={() => removeGuard(g.username)}
                            disabled={props.guards.length <= 1 || pending}
                            className="rounded-[9px] px-3.5 py-[7px] text-[13px] font-bold text-white disabled:opacity-40"
                            style={{ background: "#E11D48" }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {props.guards.length === 0 && (
                <div className="px-[22px] py-12 text-center text-[14px] text-[#6B7585]">
                  Aún no hay vigilantes registrados.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "solicitudes" && (
        <div className="animate-pa-in">
          <div className="mb-1 text-[18px] font-extrabold text-ink">
            Solicitudes de registro
          </div>
          <p className="mb-4 max-w-[560px] text-[13.5px] leading-[1.5] text-[#6B7585]">
            Aprueba a un residente solo si confirmas que vive en ese
            apartamento. Al aprobar podrá iniciar sesión; al rechazar se libera
            el apartamento para un nuevo registro.
          </p>
          <PendingResidents
            slug={props.slug}
            pending={props.pending}
            accent="#6D28D9"
          />
        </div>
      )}

      {tab === "propietarios" && (
        <OwnersPanel
          slug={props.slug}
          allApts={allApts}
          ownerLinks={props.ownerLinks}
          notices={props.notices}
          serviceRequests={props.serviceRequests}
        />
      )}

      {cfgOpen && (
        <ConfigModal
          slug={props.slug}
          initial={{
            name: props.name,
            logoUrl: props.logoUrl,
            towers: props.towers,
            aptsPerTower: props.aptsPerTower,
            carSpots: props.carSpots,
            motoSpots: props.motoSpots,
          }}
          onClose={() => setCfgOpen(false)}
        />
      )}

      {pkSpot && (
        <ParkingModal
          slug={props.slug}
          spot={pkSpot}
          allApts={allApts}
          rates={{ car: rate, moto: rateMoto }}
          onClose={() => setPkSpot(null)}
        />
      )}

      {payApt && (
        <PaymentModal
          slug={props.slug}
          aptoKey={payApt.key}
          aptoLabel={payApt.label}
          onClose={() => setPayApt(null)}
        />
      )}

      {expOpen && (
        <ExpenseModal
          slug={props.slug}
          vendors={props.vendors}
          onClose={() => setExpOpen(false)}
        />
      )}

      {resetGuardUser && (
        <ResetGuardPasswordModal
          slug={props.slug}
          username={resetGuardUser}
          onClose={() => setResetGuardUser(null)}
        />
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
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-[#6B7585]">▾</span>
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
  slug,
  initial,
  onClose,
}: {
  slug: string;
  initial: {
    name: string;
    logoUrl: string | null;
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
  const [logoPending, startLogo] = useTransition();
  const [name, setName] = useState(initial.name);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [towers, setTowers] = useState(String(initial.towers));
  const [apts, setApts] = useState(String(initial.aptsPerTower));
  const [carSpots, setCarSpots] = useState(String(initial.carSpots));
  const [motoSpots, setMotoSpots] = useState(String(initial.motoSpots));
  const fileRef = useRef<HTMLInputElement>(null);

  const numCls =
    "w-full rounded-[12px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[15px] py-[13px] text-[15px] font-bold outline-none focus:border-blue";
  const lab = "mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]";

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (file.size > 1024 * 1024) {
      show("La imagen no puede superar 1 MB", "warn");
      return;
    }
    const form = new FormData();
    form.append("logo", file);
    startLogo(async () => {
      const res = await updateLogo(slug, form);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      setLogoUrl(res.url ?? null);
      show("Logo actualizado", "ok");
      router.refresh();
    });
  }

  function clearLogo() {
    startLogo(async () => {
      const res = await removeLogo(slug);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      setLogoUrl(null);
      show("Logo eliminado", "ok");
      router.refresh();
    });
  }

  function apply() {
    start(async () => {
      await updateConfig(slug, {
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
    <Modal onClose={onClose} label="Configurar conjunto" className="w-[460px]">
        <div className="border-b border-[#EEF1F6] px-[22px] py-5">
          <h2 className="font-display text-[18px] font-bold">Configurar conjunto</h2>
          <div className="mt-0.5 text-[13px] text-[#6B7585]">
            Define la estructura según tu conjunto residencial.
          </div>
        </div>
        <div className="px-[22px] py-5">
          <label className={lab}>Nombre del conjunto</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mb-[18px] w-full rounded-[12px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[15px] py-[13px] text-[15px] font-semibold outline-none focus:border-blue" />

          <label className={lab}>Logo del conjunto</label>
          <div className="mb-[18px] flex items-center gap-3.5">
            <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-[14px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo del conjunto" className="h-full w-full object-contain" />
              ) : (
                <span className="font-display text-[22px] font-bold text-[#B4BECC]">
                  {(name.trim()[0] ?? "C").toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onPickLogo} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={logoPending}
                className="rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-white px-4 py-2.5 text-[13.5px] font-bold text-ink hover:bg-[#F6F8FB] disabled:opacity-60"
              >
                {logoPending ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
              </button>
              {logoUrl && (
                <button
                  onClick={clearLogo}
                  disabled={logoPending}
                  className="text-left text-[12.5px] font-bold text-[#C0392B] hover:underline disabled:opacity-60"
                >
                  Quitar logo
                </button>
              )}
              <span className="text-[11.5px] text-[#8A94A3]">PNG, JPG, WEBP o SVG · máx 1 MB</span>
            </div>
          </div>

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
    </Modal>
  );
}

function ResetGuardPasswordModal({
  slug,
  username,
  onClose,
}: {
  slug: string;
  username: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [pending, start] = useTransition();
  const [password, setPassword] = useState("");

  function apply() {
    start(async () => {
      const res = await resetGuardPassword(slug, { username, password });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Contraseña restablecida", "ok");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      onClose={onClose}
      label={`Restablecer contraseña de ${username}`}
      className="w-[420px]"
    >
        <div className="border-b border-[#EEF1F6] px-[22px] py-5">
          <h2 className="font-display text-[18px] font-bold">
            Restablecer contraseña
          </h2>
          <div className="mt-0.5 text-[13px] text-[#6B7585]">
            Vigilante: <strong>{username}</strong>. Se cerrará su sesión activa.
          </div>
        </div>
        <div className="px-[22px] py-5">
          <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-[12px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[15px] py-[13px] text-[15px] font-semibold outline-none focus:border-blue"
          />
        </div>
        <div className="flex gap-2.5 border-t border-[#EEF1F6] px-[22px] py-4">
          <button onClick={onClose} className="flex-none rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-white px-[18px] py-3.5 text-[14px] font-bold text-[#5B6675]">
            Cancelar
          </button>
          <button onClick={apply} disabled={pending} className="flex-1 rounded-[13px] bg-blue p-3.5 text-[14.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70">
            Restablecer
          </button>
        </div>
    </Modal>
  );
}

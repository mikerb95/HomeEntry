"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  prepareAlert,
  confirmAlert,
  confirmScan,
} from "@/app/actions/guard";
import { ParkingModal, ModalSpot } from "@/components/ParkingModal";
import { GuardNotifications } from "@/components/GuardNotifications";
import {
  IconUser,
  IconPackage,
  IconMessage,
  IconSend,
  IconQr,
} from "@/components/icons";
import {
  towersArr,
  aptsArr,
  allAptsArr,
  statusMeta,
  typeMeta,
  ParkingStatus,
  EventType,
} from "@/lib/meta";
import { fmtDateTime, fmtPhone, fmtTime } from "@/lib/format";
import { useToast } from "@/lib/toast";

type Spot = {
  id: string;
  kind: "car" | "moto";
  status: ParkingStatus;
  plate: string;
  aptoKey: string;
};
type Incoming = {
  id: string;
  code: string;
  visitor: string;
  doc: string;
  plate: string;
  tower: string;
  apt: string;
  whenIso: string;
  qr: string;
};
type AlertType = "visita" | "encomienda" | "mensaje";

type Props = {
  slug: string;
  complexName: string;
  towers: number;
  aptsPerTower: number;
  hasWhatsApp: Record<string, boolean>;
  parking: Spot[];
  recent: { id: string; type: string; tower: string; apto: string; tsIso: string }[];
  incoming: Incoming[];
  mVisits: number;
  mPackages: number;
  todayStr: string;
  whatsappMode: "preview-then-open" | "open-directly";
  serverNowIso: string;
};

const chev = (
  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#6B7585]">
    ▾
  </span>
);
const selectCls =
  "w-full cursor-pointer appearance-none rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] py-3.5 pl-4 pr-11 text-[16px] font-semibold outline-none focus:border-green disabled:opacity-60";

export function GuardPanel(props: Props) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [, start] = useTransition();

  const [gTab, setGTab] = useState<"porteria" | "parqueadero" | "escanear">(
    "porteria",
  );
  const [gType, setGType] = useState<AlertType>("visita");
  const [gTower, setGTower] = useState("");
  const [gApto, setGApto] = useState("");
  const [gNote, setGNote] = useState("");
  const [pkTab, setPkTab] = useState<"car" | "moto">("car");
  const [pkOnlyFree, setPkOnlyFree] = useState(true);
  const [pkQuery, setPkQuery] = useState("");
  const [wa, setWa] = useState<{ phone: string; text: string; apto: string } | null>(
    null,
  );
  const [pkSpot, setPkSpot] = useState<ModalSpot | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);

  const towerList = towersArr(props.towers);
  const guardApts = aptsArr(props.aptsPerTower, gTower);
  const allApts = allAptsArr(props.towers, props.aptsPerTower);

  const gKey = gTower && gApto ? `${gTower}-${gApto}` : "";
  const guardSelected = !!gKey;
  const guardHasNumber = gKey ? !!props.hasWhatsApp[gKey] : false;
  const sendDisabled = !guardHasNumber;

  const tabSpots = props.parking.filter((p) => p.kind === pkTab);
  const freeCount = tabSpots.filter((p) => p.status === "free").length;
  const resCount = tabSpots.filter((p) => p.status === "resident").length;
  const visCount = tabSpots.filter((p) => p.status === "visitor").length;

  // A searching guard usually wants to locate a specific occupied spot to free
  // it, so any query overrides the "solo libres" filter and looks across all.
  const pkQ = pkQuery.trim().toUpperCase();
  const pkOnlyFreeActive = pkOnlyFree && !pkQ;
  const visibleSpots = tabSpots.filter((p) => {
    if (pkOnlyFreeActive && p.status !== "free") return false;
    if (pkQ && !`${p.id} ${p.plate}`.toUpperCase().includes(pkQ)) return false;
    return true;
  });
  const hiddenCount = tabSpots.length - visibleSpots.length;

  const scan = props.incoming.find((i) => i.id === scanId) || null;

  const gTabs: { key: typeof gTab; label: string }[] = [
    { key: "porteria", label: "Portería" },
    { key: "parqueadero", label: "Parqueadero" },
    { key: "escanear", label: "Escanear QR" },
  ];

  const typeBtn = (
    type: AlertType,
    color: string,
    soft: string,
    label: string,
    icon: React.ReactNode,
  ) => {
    const active = gType === type;
    return (
      <button
        onClick={() => setGType(type)}
        className="flex w-full min-w-0 flex-col items-center gap-[9px] rounded-[16px] border-2 px-1 py-4 font-bold sm:px-2"
        style={{
          borderColor: active ? color : "#E3E8EF",
          background: active ? soft : "#fff",
          color: active ? color : "#6B7585",
        }}
      >
        {icon}
        <span className="w-full text-center text-[11.5px] leading-tight break-words hyphens-auto sm:text-[13px]">
          {label}
        </span>
      </button>
    );
  };

  function onSend() {
    if (!gTower || !gApto) {
      show("Selecciona torre y apartamento", "warn");
      return;
    }
    if (!guardHasNumber) {
      show("Ese apartamento no tiene WhatsApp registrado", "warn");
      return;
    }
    start(async () => {
      const prep = await prepareAlert(props.slug, {
        type: gType,
        tower: gTower,
        apto: gApto,
        note: gNote,
      });
      if (!prep.ok) {
        show(prep.error, "warn");
        return;
      }
      if (props.whatsappMode === "open-directly") {
        doConfirm();
      } else {
        setWa({ phone: prep.phone, text: prep.text, apto: prep.apto });
      }
    });
  }

  function doConfirm() {
    start(async () => {
      const res = await confirmAlert(props.slug, {
        type: gType,
        tower: gTower,
        apto: gApto,
        note: gNote,
      });
      if (res.ok) {
        if (!res.delivered && res.link) window.open(res.link, "_blank");
        show("Alerta enviada por WhatsApp", "ok");
      } else {
        show(res.error, "warn");
      }
      setWa(null);
      router.refresh();
    });
  }

  function doScanConfirm() {
    if (!scan) return;
    start(async () => {
      const res = await confirmScan(props.slug, scan.id);
      if (res.ok) show("Ingreso confirmado", "ok");
      else show(res.error || "Error", "warn");
      setScanId(null);
      router.refresh();
    });
  }

  return (
    <div className="animate-pa-in">
      <GuardNotifications slug={props.slug} serverNowIso={props.serverNowIso} />

      <div className="mb-5 flex w-max max-w-full gap-1.5 overflow-x-auto rounded-[14px] border border-[#E3E8EF] bg-white p-[5px]">
        {gTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setGTab(t.key)}
            className="whitespace-nowrap rounded-[10px] px-[18px] py-2.5 text-[14px] font-bold"
            style={{
              background: gTab === t.key ? "#0F141A" : "transparent",
              color: gTab === t.key ? "#fff" : "#5B6675",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB PORTERÍA */}
      {gTab === "porteria" && (
        <div className="block items-start gap-6 min-[780px]:grid min-[780px]:grid-cols-[1.5fr_.9fr]">
          <div className="rounded-[22px] border border-[#E6EBF2] bg-white p-[26px]">
            <h2 className="mb-3.5 font-display text-[18px] font-bold">
              Registro express
            </h2>
            <div className="mb-[22px] grid grid-cols-3 gap-2.5">
              {typeBtn("visita", "#2F6BFF", "#EAF1FF", "Llegó Visita", <IconUser size={24} />)}
              {typeBtn("encomienda", "#D97706", "#FEF3DC", "Encomienda", <IconPackage size={24} />)}
              {typeBtn("mensaje", "#6D28D9", "#EEE9FF", "Admin.", <IconMessage size={24} />)}
            </div>

            <label className="mb-2 block text-[12.5px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
              Torre
            </label>
            <div className="relative mb-3.5">
              <select
                value={gTower}
                onChange={(e) => {
                  setGTower(e.target.value);
                  setGApto("");
                }}
                className={selectCls}
              >
                <option value="">Selecciona torre…</option>
                {towerList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {chev}
            </div>

            <label className="mb-2 block text-[12.5px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
              Apartamento
            </label>
            <div className="relative mb-4">
              <select
                value={gApto}
                disabled={!gTower}
                onChange={(e) => setGApto(e.target.value)}
                className={selectCls}
              >
                <option value="">Selecciona apartamento…</option>
                {guardApts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              {chev}
            </div>

            {gType === "mensaje" && (
              <textarea
                value={gNote}
                onChange={(e) => setGNote(e.target.value)}
                placeholder="Escribe el mensaje de la administración…"
                className="mb-4 min-h-[80px] w-full resize-y rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[15px] outline-none focus:border-violet"
              />
            )}

            {guardSelected &&
              (guardHasNumber ? (
                <div className="mb-3.5 flex items-center gap-[11px] rounded-[14px] border border-[#B7E6C7] bg-[#E9F8EE] px-4 py-3.5">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green text-white">
                    ✓
                  </span>
                  <div>
                    <div className="text-[14px] font-extrabold text-[#15803D]">
                      WhatsApp configurado
                    </div>
                    <div className="text-[13px] text-[#1F7A43]">
                      Recibirá la alerta en su WhatsApp.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-3.5 flex items-center gap-[11px] rounded-[14px] border border-[#F4CE7A] bg-[#FEF3DC] px-4 py-3.5">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#D97706] text-[15px] font-extrabold text-white">
                    !
                  </span>
                  <div>
                    <div className="text-[14px] font-extrabold text-[#B45309]">
                      Sin número registrado
                    </div>
                    <div className="text-[13px] text-[#92600C]">
                      El residente aún no registró su WhatsApp.
                    </div>
                  </div>
                </div>
              ))}

            <button
              onClick={onSend}
              disabled={sendDisabled}
              className="flex w-full items-center justify-center gap-2.5 rounded-[14px] p-[17px] text-[16px] font-extrabold tracking-[.3px] text-white"
              style={{
                background: sendDisabled ? "#9BD5AE" : "#16A34A",
                cursor: sendDisabled ? "not-allowed" : "pointer",
              }}
            >
              <IconSend size={20} />
              ENVIAR ALERTA POR WHATSAPP
            </button>
          </div>

          <aside className="mt-[18px] flex flex-col gap-[18px] min-[780px]:mt-0">
            <div className="rounded-[22px] bg-ink p-[22px] text-white">
              <div className="text-[12px] font-semibold text-[#9AA6B8]">
                {props.todayStr}
              </div>
              <div className="mb-4 mt-0.5 font-display text-[18px] font-bold">
                Turno activo
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between rounded-[12px] bg-white/10 px-3.5 py-3">
                  <span className="text-[13.5px] text-[#C7D0DD]">Visitas hoy</span>
                  <span className="font-display text-[19px] font-bold">
                    {props.mVisits}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-[12px] bg-white/10 px-3.5 py-3">
                  <span className="text-[13.5px] text-[#C7D0DD]">Paquetes</span>
                  <span className="font-display text-[19px] font-bold">
                    {props.mPackages}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#E6EBF2] bg-white p-[22px]">
              <h3 className="mb-3.5 font-display text-[16px] font-bold">
                Actividad reciente
              </h3>
              {props.recent.map((r) => {
                const m = typeMeta[r.type as EventType] ?? typeMeta.mensaje;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-[11px] border-b border-[#F2F5F9] py-[9px]"
                  >
                    <span
                      className="h-[9px] w-[9px] flex-none rounded-full"
                      style={{ background: m.fg }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold text-ink">
                        {m.label} · {r.tower} · {r.apto}
                      </div>
                      <div className="text-[12px] font-semibold text-[#6B7585]">
                        {fmtTime(r.tsIso)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {/* TAB PARQUEADERO */}
      {gTab === "parqueadero" && (
        <div className="rounded-[22px] border border-[#E6EBF2] bg-white p-[26px]">
          <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-gradient-to-br from-green to-green-dark px-[18px] py-4 text-white">
            <div>
              <div className="text-[12px] font-semibold opacity-85">
                Parqueaderos libres
              </div>
              <div className="font-display text-[30px] font-bold leading-none">
                {freeCount} / {tabSpots.length}
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="rounded-[12px] bg-white/15 px-3.5 py-2 text-center">
                <div className="font-display text-[20px] font-bold leading-none">
                  {resCount}
                </div>
                <div className="mt-[3px] text-[11px] font-semibold opacity-85">
                  Residentes
                </div>
              </div>
              <div className="rounded-[12px] bg-white/15 px-3.5 py-2 text-center">
                <div className="font-display text-[20px] font-bold leading-none">
                  {visCount}
                </div>
                <div className="mt-[3px] text-[11px] font-semibold opacity-85">
                  Visitantes
                </div>
              </div>
            </div>
          </div>

          <div className="mb-[18px] flex max-w-[360px] gap-2 rounded-[14px] bg-[#EDF1F6] p-[5px]">
            {(["car", "moto"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setPkTab(k)}
                className="flex-1 rounded-[10px] p-[11px] text-[14px] font-bold"
                style={{
                  background: pkTab === k ? "#fff" : "transparent",
                  color: pkTab === k ? "#16A34A" : "#6B7585",
                }}
              >
                {k === "car" ? "Carros" : "Motos"}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-3.5 text-[12px] font-semibold text-[#5B6675]">
            <span className="flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-[3px] bg-[#22C55E]" />
              Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-[3px] bg-[#E11D48]" />
              Residente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-[3px] bg-[#F59E0B]" />
              Visitante
            </span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[180px] flex-1">
              <input
                value={pkQuery}
                onChange={(e) => setPkQuery(e.target.value)}
                placeholder="Buscar por cupo o placa…"
                className="w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] py-2.5 pl-4 pr-9 text-[14px] font-semibold uppercase outline-none placeholder:normal-case placeholder:font-medium placeholder:text-[#9AA4B2] focus:border-green"
              />
              {pkQuery && (
                <button
                  onClick={() => setPkQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[15px] text-[#9AA4B2] hover:text-[#5B6675]"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => setPkOnlyFree((v) => !v)}
              className="flex-none rounded-[13px] border-[1.5px] px-4 py-2.5 text-[13.5px] font-bold transition-colors"
              style={{
                borderColor: pkOnlyFree ? "#22C55E" : "#E3E8EF",
                background: pkOnlyFree ? "#E9F8EE" : "#fff",
                color: pkOnlyFree ? "#15803D" : "#6B7585",
              }}
            >
              Solo libres
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 min-[780px]:grid-cols-4 min-[1040px]:grid-cols-6">
            {visibleSpots.map((p) => {
              const m = statusMeta[p.status];
              const isFree = p.status === "free";
              // Only free spots carry (soft) color; occupied ones stay neutral
              // with a small colored dot so the eye finds available cupos fast.
              return (
                <button
                  key={p.id}
                  onClick={() => setPkSpot(p)}
                  className="flex flex-col items-start gap-1 rounded-[14px] border-[1.5px] px-[13px] pb-[11px] pt-[13px] text-left transition-transform hover:-translate-y-[2px]"
                  style={
                    isFree
                      ? { borderColor: m.border, background: m.bg, color: m.fg }
                      : { borderColor: "#E6EBF2", background: "#fff", color: "#5B6675" }
                  }
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-display text-[18px] font-bold">
                      {p.id}
                    </span>
                    {!isFree && (
                      <span
                        className="h-[9px] w-[9px] flex-none rounded-full"
                        style={{ background: m.dot }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[11.5px] font-bold"
                    style={isFree ? undefined : { color: m.fg }}
                  >
                    {m.label}
                  </span>
                  <span className="min-h-[14px] text-[11px] font-semibold opacity-80">
                    {p.plate || ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB ESCANEAR */}
      {gTab === "escanear" && (
        <div className="grid grid-cols-1 gap-5 min-[780px]:grid-cols-2">
          <div className="rounded-[22px] border border-[#E6EBF2] bg-white p-[26px]">
            <h2 className="mb-1 font-display text-[18px] font-bold">
              Verificar autorización
            </h2>
            <p className="mb-[18px] text-[14px] text-[#6B7585]">
              Escanea el QR que muestra el visitante o selecciónalo de la lista.
            </p>
            <button
              onClick={() => {
                if (props.incoming[0]) setScanId(props.incoming[0].id);
                else show("No hay autorizaciones", "warn");
              }}
              className="w-full rounded-[18px] border-2 border-dashed border-[#C9D2DE] bg-[#F8FAFC] px-5 py-[30px] text-center hover:border-green hover:bg-[#F2FBF5]"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#E9F8EE] text-green">
                <IconQr size={28} />
              </div>
              <div className="font-display text-[15.5px] font-bold">
                Simular escaneo
              </div>
              <div className="mt-1 text-[13px] text-[#6B7585]">
                Toca para escanear el QR más reciente
              </div>
            </button>

            <div className="mt-[18px]">
              <div className="mb-2.5 text-[12.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]">
                Autorizaciones entrantes
              </div>
              <div className="flex flex-col gap-2.5">
                {props.incoming.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-[13px] border border-[#EEF1F6] px-3.5 py-[13px]"
                  >
                    <Image
                      src={a.qr}
                      alt="QR"
                      width={40}
                      height={40}
                      unoptimized
                      className="flex-none rounded-[6px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold text-ink">
                        {a.visitor}
                      </div>
                      <div className="text-[12.5px] text-[#6B7585]">
                        {a.tower} · Apto {a.apt} · {fmtDateTime(a.whenIso)}
                      </div>
                    </div>
                    <button
                      onClick={() => setScanId(a.id)}
                      className="flex-none rounded-[10px] bg-green px-3.5 py-2 text-[13px] font-bold text-white"
                    >
                      Verificar
                    </button>
                  </div>
                ))}
                {props.incoming.length === 0 && (
                  <div className="p-5 text-center text-[13.5px] text-[#6B7585]">
                    No hay autorizaciones pendientes.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            {scan ? (
              <div className="animate-pa-pop overflow-hidden rounded-[22px] border border-[#E6EBF2] bg-white">
                <div className="flex items-center gap-3 bg-green px-[22px] py-[18px] text-white">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/20 text-[20px] font-extrabold">
                    ✓
                  </span>
                  <div>
                    <div className="text-[17px] font-extrabold">
                      Autorización vigente
                    </div>
                    <div className="text-[12.5px] opacity-90">
                      Código {scan.code}
                    </div>
                  </div>
                </div>
                <div className="p-[22px]">
                  {[
                    ["Visitante", scan.visitor],
                    ["Documento", scan.doc],
                    ["Apartamento", `${scan.tower} · Apto ${scan.apt}`],
                    ["Vehículo", scan.plate || "—"],
                    ["Programado", fmtDateTime(scan.whenIso)],
                  ].map(([k, v], i, arr) => (
                    <div
                      key={k}
                      className={`flex justify-between py-[11px] ${
                        i < arr.length - 1
                          ? "border-b border-[#F0F3F7]"
                          : "pb-[18px]"
                      }`}
                    >
                      <span className="text-[14px] text-[#6B7585]">{k}</span>
                      <span className="text-[15px] font-bold">{v}</span>
                    </div>
                  ))}
                  <button
                    onClick={doScanConfirm}
                    className="w-full rounded-[14px] bg-green p-[15px] text-[15px] font-extrabold text-white hover:bg-green-dark"
                  >
                    Confirmar ingreso
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border-[1.5px] border-dashed border-[#D2DAE4] bg-[#F6F8FB] px-[26px] py-10 text-center text-[#6B7585]">
                <div className="mb-1.5 font-display text-[16px] font-bold text-[#5B6675]">
                  Resultado de verificación
                </div>
                <div className="text-[13.5px] leading-[1.5]">
                  Escanea o selecciona una autorización para ver los datos del
                  visitante.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp preview modal */}
      {wa && (
        <div
          onClick={() => setWa(null)}
          className="fixed inset-0 z-[60] flex animate-pa-in items-center justify-center bg-[rgba(15,20,26,.5)] p-5 backdrop-blur-[3px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[420px] max-w-full animate-pa-pop overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_-20px_rgba(15,20,26,.5)]"
          >
            <div className="flex items-center gap-3 bg-green px-5 py-[18px] text-white">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/20">
                <IconSend size={22} />
              </span>
              <div>
                <div className="text-[16px] font-extrabold">
                  Vista previa del mensaje
                </div>
                <div className="text-[12.5px] opacity-90">
                  Para {wa.apto} · +57 {fmtPhone(wa.phone)}
                </div>
              </div>
            </div>
            <div className="bg-[#E7EBE5] px-5 py-[22px]">
              <div className="max-w-[320px] rounded-[14px] rounded-bl-[4px] bg-[#DCF8C6] px-[15px] py-[13px] text-[14.5px] leading-[1.5] text-[#15321B] shadow-[0_1px_1px_rgba(0,0,0,.08)]">
                {wa.text}
              </div>
            </div>
            <div className="flex gap-2.5 px-5 py-4">
              <button
                onClick={() => setWa(null)}
                className="flex-none rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-white px-[18px] py-3.5 text-[14px] font-bold text-[#5B6675]"
              >
                Cancelar
              </button>
              <button
                onClick={doConfirm}
                className="flex-1 rounded-[13px] bg-green p-3.5 text-[14.5px] font-extrabold text-white hover:bg-green-dark"
              >
                Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {pkSpot && (
        <ParkingModal
          slug={props.slug}
          spot={pkSpot}
          allApts={allApts}
          onClose={() => setPkSpot(null)}
        />
      )}
    </div>
  );
}

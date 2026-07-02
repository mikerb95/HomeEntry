"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closeNotice,
  linkOwner,
  registerNotice,
  registerServiceRequest,
  resetOwnerPin,
  setServiceRequestStatus,
  unlinkOwner,
} from "@/app/actions/owners";
import { fmtDateTime, fmtPhone, maskPhone, digits } from "@/lib/format";
import { useToast } from "@/lib/toast";

export type OwnerLink = {
  ownerId: string;
  phone: string;
  aptoKey: string;
  tower: string;
  apt: string;
};
export type NoticeRow = {
  id: string;
  aptoKey: string;
  category: string;
  detail: string;
  status: string;
  createdAtIso: string;
};
export type RequestRow = {
  id: string;
  aptoKey: string;
  subject: string;
  detail: string;
  status: string;
  createdAtIso: string;
};

const NOTICE_CATEGORIES = [
  { id: "ruido", label: "Ruido" },
  { id: "mascotas", label: "Mascotas" },
  { id: "zonas_comunes", label: "Zonas comunes" },
  { id: "convivencia", label: "Convivencia" },
  { id: "otro", label: "Otro" },
];

const inputCls =
  "w-full rounded-[11px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-[13px] py-[11px] text-[14px] font-semibold outline-none focus:border-[#6D28D9]";
const lab =
  "mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.5px] text-[#6B7585]";

export function OwnersPanel({
  slug,
  allApts,
  ownerLinks,
  notices,
  serviceRequests,
}: {
  slug: string;
  allApts: { id: string; label: string }[];
  ownerLinks: OwnerLink[];
  notices: NoticeRow[];
  serviceRequests: RequestRow[];
}) {
  const router = useRouter();
  const show = useToast((s) => s.show);
  const [pending, start] = useTransition();

  const [opApto, setOpApto] = useState(allApts[0]?.id ?? "");
  const [opPhone, setOpPhone] = useState("");
  const [opPin, setOpPin] = useState("");
  // Row currently in "reset PIN" mode and the new PIN being typed.
  const [pinOwner, setPinOwner] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  const [ntApto, setNtApto] = useState(allApts[0]?.id ?? "");
  const [ntCategory, setNtCategory] = useState("otro");
  const [ntDetail, setNtDetail] = useState("");

  const [rqApto, setRqApto] = useState(allApts[0]?.id ?? "");
  const [rqSubject, setRqSubject] = useState("");
  const [rqDetail, setRqDetail] = useState("");

  const aptLabel = (key: string) =>
    allApts.find((a) => a.id === key)?.label || key || "—";

  function submitLink() {
    const [tower, apt] = opApto.split("-");
    start(async () => {
      const res = await linkOwner(slug, {
        phone: opPhone,
        pin: opPin,
        aptoKey: opApto,
        tower,
        apt,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show(
        res.created === false
          ? "Unidad vinculada. El propietario ya existía y conserva su PIN actual"
          : "Propietario vinculado",
        "ok",
      );
      setOpPhone("");
      setOpPin("");
      router.refresh();
    });
  }

  function submitPinReset(ownerId: string) {
    start(async () => {
      const res = await resetOwnerPin(slug, ownerId, newPin);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("PIN restablecido. El propietario deberá iniciar sesión de nuevo", "ok");
      setPinOwner(null);
      setNewPin("");
      router.refresh();
    });
  }

  function unlink(ownerId: string, aptoKey: string) {
    if (!confirm(`¿Quitar el acceso del propietario a ${aptLabel(aptoKey)}?`)) return;
    start(async () => {
      const res = await unlinkOwner(slug, ownerId, aptoKey);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Acceso removido", "ok");
      router.refresh();
    });
  }

  function submitNotice() {
    const [tower, apt] = ntApto.split("-");
    start(async () => {
      const res = await registerNotice(slug, {
        aptoKey: ntApto,
        tower,
        apt,
        category: ntCategory,
        detail: ntDetail,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Llamado de atención registrado", "ok");
      setNtDetail("");
      router.refresh();
    });
  }

  function markNoticeClosed(id: string) {
    start(async () => {
      await closeNotice(slug, id);
      show("Llamado de atención cerrado", "ok");
      router.refresh();
    });
  }

  function submitRequest() {
    const [tower, apt] = rqApto.split("-");
    start(async () => {
      const res = await registerServiceRequest(slug, {
        aptoKey: rqApto,
        tower,
        apt,
        subject: rqSubject,
        detail: rqDetail,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Solicitud registrada", "ok");
      setRqSubject("");
      setRqDetail("");
      router.refresh();
    });
  }

  function changeRequestStatus(id: string, status: "abierto" | "en_proceso" | "resuelto") {
    start(async () => {
      await setServiceRequestStatus(slug, id, status);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Vincular propietario */}
      <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
        <h2 className="mb-1 font-display text-[19px] font-bold">
          Vincular propietario
        </h2>
        <p className="mb-3.5 text-[13px] text-[#6B7585]">
          Da acceso de solo lectura a quien arrienda la unidad. El mismo
          teléfono puede vincularse a varias unidades.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <label className={lab}>Unidad</label>
            <select
              value={opApto}
              onChange={(e) => setOpApto(e.target.value)}
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              {allApts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className={lab}>WhatsApp del propietario</label>
            <input
              value={fmtPhone(opPhone)}
              onChange={(e) => setOpPhone(digits(e.target.value).slice(0, 10))}
              inputMode="numeric"
              placeholder="300 123 4567"
              className={inputCls}
            />
          </div>
          <div className="w-[110px]">
            <label className={lab}>PIN</label>
            <input
              value={opPin}
              onChange={(e) => setOpPin(digits(e.target.value).slice(0, 4))}
              inputMode="numeric"
              placeholder="••••"
              className={`${inputCls} tracking-[3px]`}
            />
          </div>
          <button
            onClick={submitLink}
            disabled={pending}
            className="rounded-[11px] bg-[#6D28D9] px-4 py-[11px] text-[13.5px] font-extrabold text-white hover:bg-[#5B21B6] disabled:opacity-70"
          >
            Vincular
          </button>
        </div>

        {ownerLinks.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {ownerLinks.map((o) => (
              <div
                key={`${o.ownerId}-${o.aptoKey}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[13px] border border-[#EEF1F6] px-3.5 py-3"
              >
                <div className="text-[13.5px] font-semibold text-[#3C4654]">
                  <strong className="text-ink">{aptLabel(o.aptoKey)}</strong> ·
                  {" "}WhatsApp {maskPhone(o.phone)}
                </div>
                <div className="flex items-center gap-2">
                  {pinOwner === o.ownerId ? (
                    <>
                      <input
                        value={newPin}
                        onChange={(e) => setNewPin(digits(e.target.value).slice(0, 4))}
                        inputMode="numeric"
                        placeholder="Nuevo PIN"
                        autoFocus
                        className="w-[104px] rounded-[9px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3 py-[7px] text-[13px] font-semibold tracking-[3px] outline-none focus:border-[#6D28D9]"
                      />
                      <button
                        onClick={() => submitPinReset(o.ownerId)}
                        disabled={pending || newPin.length < 4}
                        className="rounded-[9px] bg-[#6D28D9] px-3.5 py-[7px] text-[13px] font-bold text-white hover:bg-[#5B21B6] disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setPinOwner(null);
                          setNewPin("");
                        }}
                        className="rounded-[9px] border-[1.5px] border-[#E3E8EF] bg-white px-3.5 py-[7px] text-[13px] font-bold text-[#5B6675]"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setPinOwner(o.ownerId);
                          setNewPin("");
                        }}
                        className="rounded-[9px] border-[1.5px] border-[#E3E8EF] bg-white px-3.5 py-[7px] text-[13px] font-bold text-ink hover:bg-[#F6F8FB]"
                      >
                        Restablecer PIN
                      </button>
                      <button
                        onClick={() => unlink(o.ownerId, o.aptoKey)}
                        className="rounded-[9px] px-3.5 py-[7px] text-[13px] font-bold text-white"
                        style={{ background: "#E11D48" }}
                      >
                        Quitar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Llamados de atención */}
      <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
        <h2 className="mb-3.5 font-display text-[19px] font-bold">
          Llamados de atención
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <label className={lab}>Unidad</label>
            <select
              value={ntApto}
              onChange={(e) => setNtApto(e.target.value)}
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              {allApts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className={lab}>Categoría</label>
            <select
              value={ntCategory}
              onChange={(e) => setNtCategory(e.target.value)}
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              {NOTICE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[240px] flex-1">
            <label className={lab}>Detalle</label>
            <input
              value={ntDetail}
              onChange={(e) => setNtDetail(e.target.value)}
              placeholder="Describe el llamado de atención"
              className={inputCls}
            />
          </div>
          <button
            onClick={submitNotice}
            disabled={pending}
            className="rounded-[11px] bg-[#6D28D9] px-4 py-[11px] text-[13.5px] font-extrabold text-white hover:bg-[#5B21B6] disabled:opacity-70"
          >
            Registrar
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between gap-3 rounded-[13px] border border-[#EEF1F6] px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold text-ink">
                  {aptLabel(n.aptoKey)} · {n.category}
                </div>
                <div className="text-[13px] text-[#6B7585]">{n.detail}</div>
                <div className="text-[12px] font-semibold text-[#6B7585]">
                  {fmtDateTime(n.createdAtIso)}
                </div>
              </div>
              {n.status === "abierto" ? (
                <button
                  onClick={() => markNoticeClosed(n.id)}
                  className="whitespace-nowrap rounded-[9px] border-[1.5px] border-[#E3E8EF] bg-white px-3.5 py-[7px] text-[13px] font-bold text-ink hover:bg-[#F6F8FB]"
                >
                  Cerrar
                </button>
              ) : (
                <span className="whitespace-nowrap rounded-full bg-[#E9F8EE] px-[11px] py-1 text-[12.5px] font-bold text-[#16A34A]">
                  Cerrado
                </span>
              )}
            </div>
          ))}
          {notices.length === 0 && (
            <div className="p-4 text-center text-[13.5px] text-[#6B7585]">
              Sin llamados de atención registrados.
            </div>
          )}
        </div>
      </div>

      {/* Solicitudes de la unidad */}
      <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-[22px]">
        <h2 className="mb-3.5 font-display text-[19px] font-bold">
          Solicitudes de la unidad
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <label className={lab}>Unidad</label>
            <select
              value={rqApto}
              onChange={(e) => setRqApto(e.target.value)}
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              {allApts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className={lab}>Asunto</label>
            <input
              value={rqSubject}
              onChange={(e) => setRqSubject(e.target.value)}
              placeholder="Ej. Reparación de grifería"
              className={inputCls}
            />
          </div>
          <div className="min-w-[240px] flex-1">
            <label className={lab}>Detalle</label>
            <input
              value={rqDetail}
              onChange={(e) => setRqDetail(e.target.value)}
              placeholder="Describe la solicitud"
              className={inputCls}
            />
          </div>
          <button
            onClick={submitRequest}
            disabled={pending}
            className="rounded-[11px] bg-[#6D28D9] px-4 py-[11px] text-[13.5px] font-extrabold text-white hover:bg-[#5B21B6] disabled:opacity-70"
          >
            Registrar
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {serviceRequests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-[13px] border border-[#EEF1F6] px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold text-ink">
                  {aptLabel(r.aptoKey)} · {r.subject}
                </div>
                <div className="text-[13px] text-[#6B7585]">{r.detail}</div>
                <div className="text-[12px] font-semibold text-[#6B7585]">
                  {fmtDateTime(r.createdAtIso)}
                </div>
              </div>
              <select
                value={r.status}
                onChange={(e) =>
                  changeRequestStatus(
                    r.id,
                    e.target.value as "abierto" | "en_proceso" | "resuelto",
                  )
                }
                className="cursor-pointer appearance-none rounded-[9px] border-[1.5px] border-[#E3E8EF] bg-white px-3 py-[7px] text-[13px] font-bold outline-none"
              >
                <option value="abierto">Abierto</option>
                <option value="en_proceso">En proceso</option>
                <option value="resuelto">Resuelto</option>
              </select>
            </div>
          ))}
          {serviceRequests.length === 0 && (
            <div className="p-4 text-center text-[13.5px] text-[#6B7585]">
              Sin solicitudes registradas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

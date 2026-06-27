"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignParking, freeParking } from "@/app/actions/parking";
import { statusMeta, ParkingStatus } from "@/lib/meta";
import { isValidPlate, normalizePlate } from "@/lib/format";
import { useToast } from "@/lib/toast";

export type ModalSpot = {
  id: string;
  kind: "car" | "moto";
  status: ParkingStatus;
  plate: string;
  aptoKey: string;
};

export function ParkingModal({
  slug,
  spot,
  allApts,
  onClose,
}: {
  slug: string;
  spot: ModalSpot;
  allApts: { id: string; label: string }[];
  onClose: () => void;
}) {
  const isNew = spot.status === "free";
  const [plate, setPlate] = useState("");
  const [apto, setApto] = useState("");
  const [kind, setKind] = useState<"resident" | "visitor">("resident");
  const [foreign, setForeign] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const show = useToast((s) => s.show);

  const m = statusMeta[spot.status];
  const aptoLabel =
    allApts.find((a) => a.id === spot.aptoKey)?.label || spot.aptoKey || "—";

  // Colombian format depends on the spot type: cars ABC123, motos ABC12D.
  const platePlaceholder = foreign
    ? "Placa extranjera"
    : spot.kind === "moto"
      ? "ABC12D"
      : "ABC123";
  const plateOk = isValidPlate(plate, spot.kind, foreign);
  const showPlateError = plate.length > 0 && !plateOk;

  function save() {
    if (!plateOk) {
      show(
        foreign
          ? "Placa extranjera no válida"
          : spot.kind === "moto"
            ? "Placa de moto inválida (formato ABC12D)"
            : "Placa de carro inválida (formato ABC123)",
        "warn",
      );
      return;
    }
    start(async () => {
      const res = await assignParking(slug, {
        spotId: spot.id,
        plate,
        aptoKey: apto,
        kind,
        foreign,
      });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      show("Parqueadero asignado", "ok");
      onClose();
      router.refresh();
    });
  }

  function free() {
    start(async () => {
      await freeParking(slug, spot.id);
      show("Parqueadero liberado", "ok");
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
        className="w-[400px] max-w-full animate-pa-pop overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_-20px_rgba(15,20,26,.5)]"
      >
        <div className="flex items-center justify-between border-b border-[#EEF1F6] px-[22px] py-[18px]">
          <div className="flex items-center gap-[11px]">
            <span className="font-display text-[22px] font-bold">{spot.id}</span>
            <span className="text-[13px] font-semibold text-[#6B7585]">
              {spot.kind === "moto" ? "Moto" : "Carro"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-[30px] w-[30px] rounded-[9px] bg-[#F0F3F8] text-[17px] text-[#5B6675]"
          >
            ✕
          </button>
        </div>

        {isNew ? (
          <div className="px-[22px] py-5">
            <div className="mb-[7px] flex items-center justify-between">
              <label className="block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
                Placa del vehículo
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-[#6B7585]">
                <input
                  type="checkbox"
                  checked={foreign}
                  onChange={(e) => setForeign(e.target.checked)}
                  className="h-[15px] w-[15px] accent-blue"
                />
                Vehículo de otro país
              </label>
            </div>
            <input
              value={plate}
              onChange={(e) =>
                setPlate(
                  foreign
                    ? e.target.value.toUpperCase()
                    : normalizePlate(e.target.value).slice(
                        0,
                        spot.kind === "moto" ? 6 : 6,
                      ),
                )
              }
              placeholder={platePlaceholder}
              className="w-full rounded-[13px] border-[1.5px] bg-[#F6F8FB] px-4 py-3.5 text-[16px] font-bold uppercase tracking-[1px] outline-none focus:border-blue"
              style={{ borderColor: showPlateError ? "#F43F5E" : "#E3E8EF" }}
            />
            <div className="mb-4 mt-[6px] min-h-[15px] text-[12px] font-semibold">
              {showPlateError ? (
                <span className="text-[#E11D48]">
                  {foreign
                    ? "Placa extranjera no válida"
                    : spot.kind === "moto"
                      ? "Formato de moto: ABC12D"
                      : "Formato de carro: ABC123"}
                </span>
              ) : (
                !foreign && (
                  <span className="text-[#9AA4B2]">
                    {spot.kind === "moto"
                      ? "3 letras, 2 números y 1 letra"
                      : "3 letras y 3 números"}
                  </span>
                )
              )}
            </div>
            <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
              Apartamento que lo usará
            </label>
            <div className="relative mb-4">
              <select
                value={apto}
                onChange={(e) => setApto(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] py-3.5 pl-4 pr-10 text-[15px] font-semibold outline-none focus:border-blue"
              >
                <option value="">Selecciona apartamento…</option>
                {allApts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-[15px] top-1/2 -translate-y-1/2 text-[12px] text-[#6B7585]">
                ▾
              </span>
            </div>
            <label className="mb-[7px] block text-[12px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
              Tipo de uso
            </label>
            <div className="mb-5 flex gap-2.5">
              <button
                onClick={() => setKind("resident")}
                className="flex-1 rounded-[12px] border-2 p-[13px] text-[14px] font-bold"
                style={{
                  borderColor: kind === "resident" ? "#2F6BFF" : "#E3E8EF",
                  background: kind === "resident" ? "#EAF1FF" : "#fff",
                  color: kind === "resident" ? "#2F6BFF" : "#6B7585",
                }}
              >
                Residente
              </button>
              <button
                onClick={() => setKind("visitor")}
                className="flex-1 rounded-[12px] border-2 p-[13px] text-[14px] font-bold"
                style={{
                  borderColor: kind === "visitor" ? "#F59E0B" : "#E3E8EF",
                  background: kind === "visitor" ? "#FEF3DC" : "#fff",
                  color: kind === "visitor" ? "#B45309" : "#6B7585",
                }}
              >
                Visitante
              </button>
            </div>
            <button
              onClick={save}
              disabled={pending}
              className="w-full rounded-[14px] bg-blue p-4 text-[15px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
            >
              Registrar vehículo
            </button>
          </div>
        ) : (
          <div className="px-[22px] py-5">
            <div
              className="mb-[18px] flex items-center gap-2.5 rounded-[14px] px-4 py-3.5"
              style={{ background: m.bg }}
            >
              <span
                className="h-[11px] w-[11px] rounded-[3px]"
                style={{ background: m.dot }}
              />
              <span className="text-[15px] font-extrabold" style={{ color: m.fg }}>
                {m.label}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#F0F3F7] py-[11px]">
              <span className="text-[14px] text-[#6B7585]">Placa</span>
              <span className="text-[15px] font-bold tracking-[1px]">
                {spot.plate || "—"}
              </span>
            </div>
            <div className="mb-[18px] flex justify-between py-[11px]">
              <span className="text-[14px] text-[#6B7585]">Apartamento</span>
              <span className="text-[15px] font-bold">{aptoLabel}</span>
            </div>
            <button
              onClick={free}
              disabled={pending}
              className="w-full rounded-[14px] bg-rose p-[15px] text-[15px] font-extrabold text-white hover:bg-rose-dark disabled:opacity-70"
            >
              Liberar parqueadero
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

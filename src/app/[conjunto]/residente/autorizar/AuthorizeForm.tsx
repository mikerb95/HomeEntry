"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { generateAuth } from "@/app/actions/resident";
import { Label } from "@/components/ui";
import { useToast } from "@/lib/toast";

const inputCls =
  "w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-4 py-3.5 text-[15px] font-semibold outline-none focus:border-blue";

type Result = { code: string; qr: string; visitor: string; whenStr: string };

export function AuthorizeForm({ slug }: { slug: string }) {
  const [visitor, setVisitor] = useState("");
  const [doc, setDoc] = useState("");
  const [plate, setPlate] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const show = useToast((s) => s.show);

  function generate() {
    start(async () => {
      const res = await generateAuth(slug, { visitor, doc, plate, date, time });
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      setResult({
        code: res.code,
        qr: res.qr,
        visitor: res.visitor,
        whenStr: res.whenStr,
      });
      setVisitor("");
      setDoc("");
      setPlate("");
      setDate("");
      setTime("");
      show("Autorización generada", "ok");
    });
  }

  return (
    <div className="animate-pa-in">
      <Link
        href={`/${slug}/residente`}
        className="mb-4 inline-flex items-center gap-[7px] rounded-[10px] px-3 py-[7px] text-[13.5px] font-bold text-[#6B7585]"
      >
        ← Volver al panel
      </Link>

      <div className="grid grid-cols-1 gap-5 min-[780px]:grid-cols-2">
        <div className="rounded-[22px] border border-[#E6EBF2] bg-white p-7">
          <h2 className="mb-1 font-display text-[22px] font-bold tracking-[-.4px]">
            Autorizar un ingreso
          </h2>
          <p className="mb-5 text-[14.5px] text-[#6B7585]">
            Genera un QR para que la portería lo escanee al llegar tu visita.
          </p>

          <Label>Nombre del visitante</Label>
          <input
            value={visitor}
            onChange={(e) => setVisitor(e.target.value)}
            placeholder="Ej. Laura Restrepo"
            className={`mb-3.5 ${inputCls}`}
          />

          <Label>Documento</Label>
          <input
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            placeholder="CC / CE"
            className={`mb-3.5 ${inputCls}`}
          />

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label>Hora</Label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <Label>Placa del vehículo (opcional)</Label>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="ABC-123"
            className={`mb-5 uppercase tracking-[1px] ${inputCls} font-bold`}
          />

          <button
            onClick={generate}
            disabled={pending}
            className="w-full rounded-[14px] bg-blue p-4 text-[15.5px] font-extrabold text-white hover:bg-blue-dark disabled:opacity-70"
          >
            Generar autorización con QR
          </button>
        </div>

        <div className="flex flex-col gap-[18px]">
          {result ? (
            <div className="animate-pa-pop rounded-[22px] border border-[#E6EBF2] bg-white p-[26px] text-center">
              <div className="inline-block rounded-[18px] border border-[#EEF1F6] bg-white p-3.5 shadow-[0_10px_30px_-16px_rgba(15,20,26,.4)]">
                <Image
                  src={result.qr}
                  alt="QR"
                  width={188}
                  height={188}
                  unoptimized
                  className="block"
                />
              </div>
              <div className="mt-4 font-display text-[17px] font-bold">
                {result.visitor}
              </div>
              <div className="mt-[3px] text-[13.5px] text-[#6B7585]">
                {result.whenStr}
              </div>
              <div className="mt-3 inline-block rounded-full bg-[#E9F8EE] px-[13px] py-[5px] text-[12.5px] font-bold text-[#15803D]">
                ✓ Vigente · código {result.code}
              </div>
              <div className="mt-4 text-[12.5px] text-[#8A94A3]">
                Muestra este QR en portería. El vigilante verá tus datos y la
                vigencia.
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border-[1.5px] border-dashed border-[#D2DAE4] bg-[#F6F8FB] px-[26px] py-10 text-center text-[#8A94A3]">
              <div className="mb-1.5 font-display text-[16px] font-bold text-[#5B6675]">
                Tu QR aparecerá aquí
              </div>
              <div className="text-[13.5px] leading-[1.5]">
                Completa los datos del visitante y genera la autorización.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

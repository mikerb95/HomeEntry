"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { residentRegister } from "@/app/actions/auth";
import { Label } from "@/components/ui";
import { IconCheck } from "@/components/icons";
import { towersArr, aptsArr } from "@/lib/meta";
import { digits, fmtPhone } from "@/lib/format";
import { useToast } from "@/lib/toast";

const selectCls =
  "w-full appearance-none cursor-pointer rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] py-[15px] pl-4 pr-11 text-[16px] font-semibold outline-none focus:border-blue";
const inputCls =
  "w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-blue";

export function RegisterForm({
  slug,
  towers,
  aptsPerTower,
  prefill,
  loggedIn,
}: {
  slug: string;
  towers: number;
  aptsPerTower: number;
  prefill: { tower: string; apt: string; phone: string } | null;
  loggedIn: boolean;
}) {
  const [tower, setTower] = useState(prefill?.tower ?? "");
  const [apt, setApt] = useState(prefill?.apt ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const show = useToast((s) => s.show);

  const towerList = towersArr(towers);
  const aptList = aptsArr(aptsPerTower, tower);

  function save() {
    start(async () => {
      const res = await residentRegister(slug, tower, apt, phone, pin);
      if (!res.ok) {
        show(res.error || "Error", "warn");
        return;
      }
      setDone(true);
      show("Contacto guardado correctamente", "ok");
    });
  }

  const Chevron = () => (
    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#8A94A3]">
      ▾
    </span>
  );

  return (
    <div className="animate-pa-in">
      <Link
        href={loggedIn ? `/${slug}/residente` : `/${slug}/residente/login`}
        className="mb-[18px] inline-flex items-center gap-[7px] rounded-[10px] px-3 py-[7px] text-[13.5px] font-bold text-[#6B7585]"
      >
        ← {loggedIn ? "Volver al panel" : "Ya tengo cuenta"}
      </Link>

      <div className="block items-center gap-12 min-[780px]:grid min-[780px]:grid-cols-[1.05fr_.95fr]">
        <aside className="flex flex-col justify-center">
          <h2 className="mb-3.5 font-display text-[34px] font-bold leading-[1.1] tracking-[-1px]">
            Registra el WhatsApp de tu apartamento
          </h2>
          <p className="mb-6 max-w-[440px] text-[16px] leading-[1.6] text-[#6B7585]">
            Hazlo una sola vez. Cuando llegue una visita, un paquete o un aviso
            de la administración, lo recibirás al instante en tu celular.
          </p>
          <div className="flex flex-col gap-3.5">
            {[
              { c: "#2F6BFF", t: "Avisos de visitas en la entrada" },
              { c: "#F59E0B", t: "Notificación de paquetes" },
              { c: "#6D28D9", t: "Mensajes de la administración" },
            ].map((r) => (
              <div
                key={r.t}
                className="flex items-center gap-[13px] text-[15px] font-semibold text-[#3C4654]"
              >
                <span
                  className="h-[11px] w-[11px] rounded-[4px]"
                  style={{ background: r.c }}
                />
                {r.t}
              </div>
            ))}
          </div>
        </aside>

        <div className="mt-6 rounded-[24px] border border-[#E6EBF2] bg-white p-8 shadow-[0_18px_44px_-26px_rgba(15,20,26,.34)] min-[780px]:mt-0">
          <Label>Selecciona tu torre</Label>
          <div className="relative mb-4">
            <select
              value={tower}
              onChange={(e) => {
                setTower(e.target.value);
                setApt("");
                setDone(false);
              }}
              className={selectCls}
            >
              <option value="">Selecciona tu torre…</option>
              {towerList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <Chevron />
          </div>

          <Label>Selecciona tu apartamento</Label>
          <div className="relative mb-4">
            <select
              value={apt}
              disabled={!tower}
              onChange={(e) => {
                setApt(e.target.value);
                setDone(false);
              }}
              className={`${selectCls} disabled:opacity-60`}
            >
              <option value="">Selecciona tu apartamento…</option>
              {aptList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <Chevron />
          </div>

          <Label>Número de celular (WhatsApp)</Label>
          <div className="mb-4 flex gap-2.5">
            <div className="flex items-center rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3.5 text-[16px] font-bold text-[#5B6675]">
              +57
            </div>
            <input
              value={fmtPhone(phone)}
              onChange={(e) => {
                setPhone(digits(e.target.value).slice(0, 10));
                setDone(false);
              }}
              inputMode="numeric"
              placeholder="300 123 4567"
              className={`flex-1 ${inputCls}`}
            />
          </div>

          <Label>Crea tu PIN (4 dígitos)</Label>
          <input
            value={pin}
            onChange={(e) => {
              setPin(digits(e.target.value).slice(0, 4));
              setDone(false);
            }}
            type="password"
            inputMode="numeric"
            placeholder="••••"
            className={`mb-[22px] tracking-[4px] text-[18px] ${inputCls}`}
          />

          <button
            onClick={save}
            disabled={pending}
            className="w-full rounded-[14px] bg-blue p-[17px] text-[16px] font-extrabold tracking-[.3px] text-white shadow-[0_10px_22px_-10px_rgba(47,107,255,.7)] hover:bg-blue-dark disabled:opacity-70"
          >
            GUARDAR / ACTUALIZAR CONTACTO
          </button>

          {done && (
            <div className="mt-[18px] flex animate-pa-in items-start gap-3 rounded-[15px] border border-[#B7E6C7] bg-[#E9F8EE] p-4">
              <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-green text-white">
                <IconCheck size={15} />
              </span>
              <div className="flex-1">
                <div className="text-[15px] font-extrabold text-[#15803D]">
                  ¡Listo!
                </div>
                <div className="mb-2.5 text-[13.5px] leading-[1.45] text-[#1F7A43]">
                  La portería ahora podrá notificarte a este número.
                </div>
                <Link
                  href="/residente/login"
                  className="inline-block rounded-[11px] bg-green px-4 py-[9px] text-[13.5px] font-bold text-white"
                >
                  Iniciar sesión →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

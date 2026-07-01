"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ownerLogin } from "@/app/actions/auth";
import { Shell } from "@/components/Shell";
import { BackLink, Label, LoginCard } from "@/components/ui";
import { IconUser } from "@/components/icons";
import { digits, fmtPhone } from "@/lib/format";

export default function OwnerLoginPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const errRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (err) errRef.current?.focus();
  }, [err]);

  function submit() {
    setErr("");
    start(async () => {
      const res = await ownerLogin(phone, pin);
      if (res && !res.ok) setErr(res.error || "Error");
    });
  }

  return (
    <Shell>
      <div className="mx-auto mt-3.5 max-w-[430px] animate-pa-in">
        <BackLink href="/">← Volver al inicio</BackLink>
        <LoginCard>
          <div className="mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-[#EEE9FF] text-[#6D28D9]">
            <IconUser size={24} />
          </div>
          <h2 className="mb-1.5 font-display text-[23px] font-bold tracking-[-.4px]">
            Portal del propietario
          </h2>
          <p className="mb-[22px] text-[14.5px] text-[#6B7585]">
            Ingresa con el WhatsApp y el PIN que te dio la administración.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Label htmlFor="owner-phone">Número de WhatsApp</Label>
            <div className="mb-4 flex gap-2.5">
              <div className="flex items-center rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3.5 text-[16px] font-bold text-[#5B6675]">
                +57
              </div>
              <input
                id="owner-phone"
                value={fmtPhone(phone)}
                onChange={(e) => {
                  setPhone(digits(e.target.value).slice(0, 10));
                  setErr("");
                }}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="300 123 4567"
                className="w-full flex-1 rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-[#6D28D9]"
              />
            </div>

            <Label htmlFor="owner-pin">PIN</Label>
            <input
              id="owner-pin"
              value={pin}
              onChange={(e) => {
                setPin(digits(e.target.value).slice(0, 4));
                setErr("");
              }}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              className="mb-1.5 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[18px] font-semibold tracking-[4px] outline-none focus:border-[#6D28D9]"
            />

            {err && (
              <div
                ref={errRef}
                tabIndex={-1}
                role="alert"
                className="mt-2 text-[13px] font-semibold text-[#DC2626] outline-none"
              >
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-[18px] w-full rounded-[14px] bg-[#6D28D9] p-[17px] text-[16px] font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(109,40,217,.7)] hover:bg-[#5B21B6] disabled:opacity-70"
            >
              {pending ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="mt-4 text-center text-[13.5px] font-semibold text-[#6B7585]">
            ¿No tienes acceso? Pídelo a la administración de tu conjunto.
          </p>
        </LoginCard>
      </div>
    </Shell>
  );
}

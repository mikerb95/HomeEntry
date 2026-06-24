"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { residentLogin } from "@/app/actions/auth";
import { Shell } from "@/components/Shell";
import { BackLink, Label, LoginCard } from "@/components/ui";
import { IconUser } from "@/components/icons";
import { digits, fmtPhone } from "@/lib/format";
import { useToast } from "@/lib/toast";

// Demo-only affordances (auto-fill, "tu PIN es 1234") never render in production.
const DEMO = process.env.NODE_ENV !== "production";

export default function ResidentLoginPage() {
  const slug = String(useParams().conjunto);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const show = useToast((s) => s.show);

  function submit() {
    setErr("");
    start(async () => {
      const res = await residentLogin(slug, phone, pin);
      if (res && !res.ok) setErr(res.error || "Error");
    });
  }

  return (
    <Shell>
      <div className="mx-auto mt-3.5 max-w-[430px] animate-pa-in">
        <BackLink href={`/${slug}`}>← Volver al inicio</BackLink>
        <LoginCard>
          <div className="mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-[#EAF1FF] text-blue">
            <IconUser size={24} />
          </div>
          <h2 className="mb-1.5 font-display text-[23px] font-bold tracking-[-.4px]">
            Portal del residente
          </h2>
          <p className="mb-[22px] text-[14.5px] text-[#6B7585]">
            Ingresa con tu WhatsApp y tu PIN.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Label htmlFor="login-phone">Número de WhatsApp</Label>
            <div className="mb-4 flex gap-2.5">
              <div className="flex items-center rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3.5 text-[16px] font-bold text-[#5B6675]">
                +57
              </div>
              <input
                id="login-phone"
                value={fmtPhone(phone)}
                onChange={(e) => {
                  setPhone(digits(e.target.value).slice(0, 10));
                  setErr("");
                }}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="300 123 4567"
                className="w-full flex-1 rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-blue"
              />
            </div>

            <Label htmlFor="login-pin">PIN</Label>
            <input
              id="login-pin"
              value={pin}
              onChange={(e) => {
                setPin(digits(e.target.value).slice(0, 4));
                setErr("");
              }}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              className="mb-1.5 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[18px] font-semibold tracking-[4px] outline-none focus:border-blue"
            />

            {err && (
              <div
                role="alert"
                className="mt-2 text-[13px] font-semibold text-[#DC2626]"
              >
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-[18px] w-full rounded-[14px] bg-blue p-[17px] text-[16px] font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(47,107,255,.7)] hover:bg-blue-dark disabled:opacity-70"
            >
              {pending ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/${slug}/residente/registro`}
              className="text-[13.5px] font-bold text-blue"
            >
              ¿Primera vez? Regístrate
            </Link>
            <button
              onClick={() =>
                show(
                  DEMO
                    ? "Demo: tu PIN es 1234"
                    : "Pídele a la administración que restablezca tu PIN.",
                  "ok",
                )
              }
              className="text-[13.5px] font-bold text-[#8A94A3]"
            >
              Olvidé mi PIN
            </button>
          </div>

          {DEMO && (
            <button
              onClick={() => {
                setPhone("3014567890");
                setPin("1234");
                setErr("");
              }}
              className="mt-[18px] w-full rounded-[12px] border border-dashed border-[#C9D2DE] bg-[#F0F3F8] p-[11px] text-[13px] font-bold text-[#5B6675]"
            >
              Usar datos de prueba (3014567890 · PIN 1234)
            </button>
          )}
        </LoginCard>
      </div>
    </Shell>
  );
}

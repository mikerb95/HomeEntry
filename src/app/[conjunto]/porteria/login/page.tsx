"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { guardLogin } from "@/app/actions/auth";
import { Shell } from "@/components/Shell";
import { BackLink, Label, LoginCard } from "@/components/ui";
import { IconShield } from "@/components/icons";

// Demo-only auto-fill never renders in production.
const DEMO = process.env.NODE_ENV !== "production";

export default function GuardLoginPage() {
  const slug = String(useParams().conjunto);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    setErr("");
    start(async () => {
      const res = await guardLogin(slug, user, pass);
      if (res && !res.ok) setErr(res.error || "Error");
    });
  }

  return (
    <Shell>
      <div className="mx-auto mt-3.5 max-w-[430px] animate-pa-in">
        <BackLink href={`/${slug}`}>← Volver al inicio</BackLink>
        <LoginCard>
          <div className="mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-[#E9F8EE] text-green">
            <IconShield size={24} />
          </div>
          <h2 className="mb-1.5 font-display text-[23px] font-bold tracking-[-.4px]">
            Portería · Vigilante
          </h2>
          <p className="mb-[22px] text-[14.5px] text-[#6B7585]">
            Ingresa con tu usuario y clave del turno.
          </p>

          <Label>Usuario</Label>
          <input
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setErr("");
            }}
            placeholder="portería"
            className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-green"
          />
          <Label>Clave</Label>
          <input
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setErr("");
            }}
            type="password"
            placeholder="••••"
            className="w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-green"
          />
          {err && (
            <div className="mt-2.5 text-[13px] font-semibold text-[#DC2626]">
              {err}
            </div>
          )}
          <button
            onClick={submit}
            disabled={pending}
            className="mt-[18px] w-full rounded-[14px] bg-green p-[17px] text-[16px] font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(22,163,74,.7)] hover:bg-green-dark disabled:opacity-70"
          >
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
          {DEMO && (
            <button
              onClick={() => {
                setUser("portería");
                setPass("1234");
                setErr("");
              }}
              className="mt-3.5 w-full rounded-[12px] border border-dashed border-[#C9D2DE] bg-[#F0F3F8] p-[11px] text-[13px] font-bold text-[#5B6675]"
            >
              Usar datos de prueba (portería · 1234)
            </button>
          )}
        </LoginCard>
      </div>
    </Shell>
  );
}

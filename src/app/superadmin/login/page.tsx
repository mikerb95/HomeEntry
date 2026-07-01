"use client";

import { useState, useTransition } from "react";
import { superadminLogin } from "@/app/actions/auth";
import { Shell } from "@/components/Shell";
import { Label, LoginCard } from "@/components/ui";

// Demo-only auto-fill never renders in production.
const DEMO = process.env.NODE_ENV !== "production";

export default function SuperadminLoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    setErr("");
    start(async () => {
      const res = await superadminLogin(user, pass);
      if (res && !res.ok) setErr(res.error || "Error");
    });
  }

  return (
    <Shell>
      <div className="mx-auto mt-3.5 max-w-[430px] animate-pa-in">
        <LoginCard>
          <div className="mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-ink text-[22px] font-bold text-white">
            S
          </div>
          <h2 className="mb-1.5 font-display text-[23px] font-bold tracking-[-.4px]">
            Superadministración
          </h2>
          <p className="mb-[22px] text-[14.5px] text-[#6B7585]">
            Acceso del dueño de la plataforma para gestionar conjuntos.
          </p>

          <Label>Usuario</Label>
          <input
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setErr("");
            }}
            placeholder="superadmin"
            className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-ink"
          />
          <Label>Contraseña</Label>
          <input
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setErr("");
            }}
            type="password"
            placeholder="••••••"
            className="w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-ink"
          />
          {err && (
            <div className="mt-2.5 text-[13px] font-semibold text-[#DC2626]">
              {err}
            </div>
          )}
          <button
            onClick={submit}
            disabled={pending}
            className="mt-[18px] w-full rounded-[14px] bg-ink p-[17px] text-[16px] font-extrabold text-white hover:opacity-90 disabled:opacity-70"
          >
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </LoginCard>
      </div>
    </Shell>
  );
}

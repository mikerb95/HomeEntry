"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { adminLogin } from "@/app/actions/auth";
import { Shell } from "@/components/Shell";
import { BackLink, Label, LoginCard } from "@/components/ui";
import { IconAdminGrid } from "@/components/icons";

// Demo-only auto-fill never renders in production.
const DEMO = process.env.NODE_ENV !== "production";

export default function AdminLoginPage() {
  const slug = String(useParams().conjunto);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const errRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (err) errRef.current?.focus();
  }, [err]);

  function submit() {
    setErr("");
    start(async () => {
      const res = await adminLogin(slug, user, pass);
      if (res && !res.ok) setErr(res.error || "Error");
    });
  }

  return (
    <Shell>
      <div className="mx-auto mt-3.5 max-w-[430px] animate-pa-in">
        <BackLink href={`/${slug}`}>← Volver al inicio</BackLink>
        <LoginCard>
          <div className="mb-[18px] flex h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-[#EEE9FF] text-violet">
            <IconAdminGrid size={24} />
          </div>
          <h2 className="mb-1.5 font-display text-[23px] font-bold tracking-[-.4px]">
            Administración
          </h2>
          <p className="mb-[22px] text-[14.5px] text-[#6B7585]">
            Acceso del administrador del conjunto.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Label htmlFor="admin-user">Usuario</Label>
            <input
              id="admin-user"
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setErr("");
              }}
              autoComplete="username"
              placeholder="admin"
              className="mb-4 w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-violet"
            />
            <Label htmlFor="admin-pass">Contraseña</Label>
            <input
              id="admin-pass"
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setErr("");
              }}
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              className="w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none focus:border-violet"
            />
            <label className="mt-3.5 flex cursor-pointer items-center gap-[9px] text-[14px] font-semibold text-[#5B6675]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-[17px] w-[17px] cursor-pointer accent-violet"
              />
              Recordarme en este dispositivo
            </label>
            {err && (
              <div
                ref={errRef}
                tabIndex={-1}
                role="alert"
                className="mt-2.5 text-[13px] font-semibold text-[#DC2626] outline-none"
              >
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={pending}
              className="mt-[18px] w-full rounded-[14px] bg-violet p-[17px] text-[16px] font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(109,40,217,.7)] hover:bg-violet-dark disabled:opacity-70"
            >
              {pending ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
          {DEMO && (
            <button
              onClick={() => {
                setUser("admin");
                setPass("admin");
                setErr("");
              }}
              className="mt-3.5 w-full rounded-[12px] border border-dashed border-[#C9D2DE] bg-[#F0F3F8] p-[11px] text-[13px] font-bold text-[#5B6675]"
            >
              Usar datos de prueba (admin · admin)
            </button>
          )}
        </LoginCard>
      </div>
    </Shell>
  );
}

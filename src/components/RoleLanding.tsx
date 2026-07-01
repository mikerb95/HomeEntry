"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconAdminGrid, IconSearch, IconShield, IconUser } from "@/components/icons";

type Role = {
  key: "residente" | "porteria" | "admin";
  letter: string;
  color: string;
  soft: string;
  title: string;
  desc: string;
};

const ROLES: Role[] = [
  {
    key: "residente",
    letter: "R",
    color: "#2F6BFF",
    soft: "#EAF1FF",
    title: "Soy residente",
    desc: "Ingresa con tu WhatsApp y PIN para ver notificaciones y autorizar ingresos.",
  },
  {
    key: "porteria",
    letter: "V",
    color: "#16A34A",
    soft: "#E9F8EE",
    title: "Portería / Vigilante",
    desc: "Registro de visitas, paquetes, parqueadero y verificación de QR.",
  },
  {
    key: "admin",
    letter: "A",
    color: "#6D28D9",
    soft: "#EEE9FF",
    title: "Administración",
    desc: "Dashboard, historial y auditoría de parqueadero del conjunto.",
  },
];

const ROLE_ICON = {
  residente: IconUser,
  porteria: IconShield,
  admin: IconAdminGrid,
};

export function RoleLanding({
  conjuntos,
}: {
  conjuntos: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role["key"] | null>(null);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conjuntos.slice(0, 8);
    return conjuntos
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [conjuntos, query]);

  const activeRole = ROLES.find((r) => r.key === role) ?? null;

  return (
    <div className="mx-auto max-w-[900px] pt-3.5 animate-pa-in">
      <div className="mb-[26px] flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ink font-display text-[24px] font-bold text-white">
          P
        </div>
        <div className="font-display text-[24px] font-bold tracking-[-.5px]">
          PortAl
        </div>
      </div>

      {!activeRole ? (
        <>
          <h1 className="mb-2.5 max-w-[560px] font-display text-[34px] font-bold leading-[1.1] tracking-[-1px]">
            Gestión residencial
          </h1>
          <p className="mb-7 max-w-[560px] text-[16px] leading-[1.55] text-[#6B7585]">
            Elige cómo quieres ingresar.
          </p>

          <div className="grid grid-cols-1 gap-4 min-[680px]:grid-cols-2 min-[680px]:gap-[18px]">
            {ROLES.map((r) => {
              const Icon = ROLE_ICON[r.key];
              return (
                <button
                  key={r.key}
                  onClick={() => setRole(r.key)}
                  className="flex items-start gap-[15px] rounded-[20px] border border-[#E3E8EF] bg-white p-[22px] text-left shadow-[0_1px_3px_rgba(16,24,40,.05)] transition-transform hover:-translate-y-[3px] hover:shadow-[0_16px_36px_-20px_rgba(15,20,26,.4)]"
                >
                  <span
                    className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px] font-display text-[20px] font-bold"
                    style={{ background: r.soft, color: r.color }}
                  >
                    <Icon size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-[3px] block font-display text-[17px] font-bold text-ink">
                      {r.title}
                    </span>
                    <span className="block text-[13.5px] leading-[1.45] text-[#6B7585]">
                      {r.desc}
                    </span>
                    <span
                      className="mt-[9px] inline-block text-[12.5px] font-bold"
                      style={{ color: r.color }}
                    >
                      Continuar →
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-7 max-w-[900px] rounded-[16px] border border-[#E3E8EF] bg-white p-5 text-left text-[13.5px] text-[#5B6675]">
            <div className="mb-1 font-bold text-ink">¿Eres administrador general?</div>
            El panel de gestión de conjuntos está en{" "}
            <Link href="/superadmin" className="font-mono font-semibold text-ink">
              /superadmin
            </Link>
            .
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              setRole(null);
              setQuery("");
            }}
            className="mb-5 text-[13.5px] font-bold text-[#6B7585]"
          >
            ← Elegir otro rol
          </button>

          <h1 className="mb-2.5 max-w-[560px] font-display text-[28px] font-bold leading-[1.15] tracking-[-.6px]">
            {activeRole.title}
          </h1>
          <p className="mb-6 max-w-[560px] text-[15px] leading-[1.55] text-[#6B7585]">
            Busca tu conjunto para continuar al inicio de sesión.
          </p>

          <div className="max-w-[430px]">
            <div className="mb-4 flex items-center gap-2.5 rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3.5">
              <IconSearch size={16} className="flex-none text-[#9AA4B2]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre del conjunto"
                className="w-full flex-1 bg-transparent p-[14px] text-[15px] font-semibold outline-none"
              />
            </div>

            {matches.length === 0 ? (
              <p className="text-[13.5px] text-[#6B7585]">
                No encontramos un conjunto con ese nombre. Verifica el
                enlace o código QR que te compartió la administración.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {matches.map((c) => (
                  <li key={c.slug}>
                    <button
                      onClick={() =>
                        router.push(`/${c.slug}/${activeRole.key}/login`)
                      }
                      className="w-full rounded-[13px] border border-[#E3E8EF] bg-white p-[14px] text-left text-[14.5px] font-bold text-ink hover:border-[#C9D2DE]"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

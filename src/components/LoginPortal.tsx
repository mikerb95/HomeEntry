"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminLogin,
  guardLogin,
  ownerLogin,
  unifiedResidentLogin,
  type ResidentAccountChoice,
} from "@/app/actions/auth";
import {
  IconAdminGrid,
  IconRegistered,
  IconSearch,
  IconShield,
  IconUser,
} from "@/components/icons";
import { Label } from "@/components/ui";
import { digits, fmtPhone } from "@/lib/format";

// Demo-only affordances (auto-fill buttons, "tu PIN es 1234") never render in
// production.
const DEMO = process.env.NODE_ENV !== "production";

type RoleKey = "residente" | "propietario" | "porteria" | "admin";

type Role = {
  key: RoleKey;
  title: string;
  tagline: string;
  color: string;
  dark: string;
  soft: string;
  shadow: string;
  icon: typeof IconUser;
};

const ROLES: Role[] = [
  {
    key: "residente",
    title: "Residente",
    tagline: "Autoriza visitas, recibe avisos y consulta tu cuenta.",
    color: "#2F6BFF",
    dark: "#1E54E0",
    soft: "#EAF1FF",
    shadow: "rgba(47,107,255,.7)",
    icon: IconUser,
  },
  {
    key: "propietario",
    title: "Propietario",
    tagline: "Consulta el estado de las unidades que arriendas.",
    color: "#0EA5A0",
    dark: "#0B8A86",
    soft: "#E0F5F4",
    shadow: "rgba(14,165,160,.7)",
    icon: IconRegistered,
  },
  {
    key: "porteria",
    title: "Portería",
    tagline: "Visitas, paquetes, parqueadero y verificación de QR.",
    color: "#16A34A",
    dark: "#15803D",
    soft: "#E9F8EE",
    shadow: "rgba(22,163,74,.7)",
    icon: IconShield,
  },
  {
    key: "admin",
    title: "Administración",
    tagline: "Cartera, comunicados y operación del conjunto.",
    color: "#6D28D9",
    dark: "#5B21B6",
    soft: "#EEE9FF",
    shadow: "rgba(109,40,217,.7)",
    icon: IconAdminGrid,
  },
];

type ConjuntoOption = { slug: string; name: string };

const inputCls =
  "w-full rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] p-[15px] text-[16px] font-semibold outline-none transition-colors";

export function LoginPortal({ conjuntos }: { conjuntos: ConjuntoOption[] }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey>("residente");

  // Shared credential state. Phone/PIN serve residente y propietario; user y
  // pass, portería y administración — switching roles keeps what ya escribiste.
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [conjunto, setConjunto] = useState<ConjuntoOption | null>(null);

  const [err, setErr] = useState("");
  const [pinHelp, setPinHelp] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  // Set when el mismo celular+PIN existe en varios conjuntos/apartamentos:
  // reemplaza el formulario por el selector de cuál gestionar.
  const [choices, setChoices] = useState<ResidentAccountChoice[] | null>(null);
  const [pending, start] = useTransition();
  const errRef = useRef<HTMLDivElement>(null);

  // Move focus to the error so it is announced and keyboard users land on it.
  useEffect(() => {
    if (err) errRef.current?.focus();
  }, [err]);

  const active = ROLES.find((r) => r.key === role)!;
  const staff = role === "porteria" || role === "admin";

  function switchRole(next: RoleKey) {
    setRole(next);
    setErr("");
    setChoices(null);
    setPinHelp(false);
    setRegisterOpen(false);
  }

  function submit() {
    setErr("");
    start(async () => {
      const res =
        role === "residente"
          ? await unifiedResidentLogin(phone, pin)
          : role === "propietario"
            ? await ownerLogin(phone, pin)
            : !conjunto
              ? { ok: false as const, error: "Selecciona tu conjunto" }
              : role === "porteria"
                ? await guardLogin(conjunto.slug, user, pass)
                : await adminLogin(conjunto.slug, user, pass);
      if (!res) return;
      if (!res.ok) setErr(res.error || "Error");
      else if ("choices" in res && res.choices) setChoices(res.choices);
    });
  }

  function pickAccount(c: ResidentAccountChoice) {
    setErr("");
    start(async () => {
      const res = await unifiedResidentLogin(phone, pin, {
        slug: c.slug,
        aptoKey: c.aptoKey,
      });
      if (res && !res.ok) setErr(res.error || "Error");
    });
  }

  return (
    <div className="mx-auto max-w-[880px] pt-3.5 animate-pa-in">
      <div className="mb-[26px] flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ink font-display text-[24px] font-bold text-white">
          O
        </div>
        <div>
          <div className="font-display text-[24px] font-bold tracking-[-.5px]">
            La Oportunidad
          </div>
          <div className="text-[13.5px] font-semibold text-[#6B7585]">
            Gestión residencial
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-[#E6EBF2] bg-white shadow-[0_18px_44px_-26px_rgba(15,20,26,.34)] min-[840px]:grid min-[840px]:grid-cols-[300px_1fr]">
        {/* Role rail: vertical on desktop, horizontal chips on mobile. */}
        <div
          role="tablist"
          aria-label="Tipo de usuario"
          aria-orientation="vertical"
          className="flex gap-2 overflow-x-auto border-b border-[#EDF1F6] bg-[#F8FAFC] p-3 min-[840px]:flex-col min-[840px]:border-b-0 min-[840px]:border-r min-[840px]:p-5"
        >
          <p className="hidden px-2 pb-1 text-[12.5px] font-bold uppercase tracking-[.5px] text-[#8A93A3] min-[840px]:block">
            ¿Quién ingresa?
          </p>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const selected = r.key === role;
            return (
              <button
                key={r.key}
                role="tab"
                aria-selected={selected}
                onClick={() => switchRole(r.key)}
                className={`flex flex-none items-center gap-3 rounded-[15px] border-[1.5px] p-3 text-left transition-colors min-[840px]:w-full ${
                  selected
                    ? "bg-white shadow-[0_4px_14px_-8px_rgba(15,20,26,.3)]"
                    : "border-transparent hover:bg-white"
                }`}
                style={selected ? { borderColor: r.color } : undefined}
              >
                <span
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px]"
                  style={{ background: r.soft, color: r.color }}
                >
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-bold text-ink">
                    {r.title}
                  </span>
                  <span className="hidden text-[12.5px] leading-[1.4] text-[#6B7585] min-[840px]:block">
                    {r.tagline}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Form pane. */}
        <div className="p-6 min-[840px]:p-9">
          {choices ? (
            <ChooseAccount
              accent={active}
              choices={choices}
              pending={pending}
              onPick={pickAccount}
              onBack={() => setChoices(null)}
            />
          ) : (
            <>
              <h1 className="mb-1.5 font-display text-[23px] font-bold tracking-[-.4px]">
                {staff
                  ? `Ingreso de ${active.title.toLowerCase()}`
                  : `Portal del ${active.title.toLowerCase()}`}
              </h1>
              <p className="mb-[22px] text-[14.5px] text-[#6B7585]">
                {staff
                  ? "Selecciona tu conjunto e ingresa con tu usuario."
                  : "Ingresa con tu celular y tu PIN; tu número ya sabe a qué conjunto perteneces."}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                {staff && (
                  <ConjuntoPicker
                    accent={active}
                    conjuntos={conjuntos}
                    value={conjunto}
                    onChange={(c) => {
                      setConjunto(c);
                      setErr("");
                    }}
                  />
                )}

                {staff ? (
                  <>
                    <Label htmlFor="portal-user">Usuario</Label>
                    <input
                      id="portal-user"
                      value={user}
                      onChange={(e) => {
                        setUser(e.target.value);
                        setErr("");
                      }}
                      autoComplete="username"
                      placeholder={role === "porteria" ? "portería" : "admin"}
                      className={`${inputCls} mb-4`}
                      style={{ borderColor: undefined }}
                    />
                    <Label htmlFor="portal-pass">
                      {role === "porteria" ? "Clave" : "Contraseña"}
                    </Label>
                    <input
                      id="portal-pass"
                      value={pass}
                      onChange={(e) => {
                        setPass(e.target.value);
                        setErr("");
                      }}
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••"
                      className={inputCls}
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="portal-phone">Número de celular</Label>
                    <div className="mb-4 flex gap-2.5">
                      <div className="flex items-center rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3.5 text-[16px] font-bold text-[#5B6675]">
                        +57
                      </div>
                      <input
                        id="portal-phone"
                        value={fmtPhone(phone)}
                        onChange={(e) => {
                          setPhone(digits(e.target.value).slice(0, 10));
                          setErr("");
                        }}
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="300 123 4567"
                        className={`${inputCls} flex-1`}
                      />
                    </div>
                    <Label htmlFor="portal-pin">PIN</Label>
                    <input
                      id="portal-pin"
                      value={pin}
                      onChange={(e) => {
                        setPin(digits(e.target.value).slice(0, 4));
                        setErr("");
                      }}
                      type="password"
                      inputMode="numeric"
                      autoComplete="current-password"
                      placeholder="••••"
                      className={`${inputCls} text-[18px] tracking-[4px]`}
                    />
                  </>
                )}

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
                  className="mt-[18px] w-full rounded-[14px] p-[17px] text-[16px] font-extrabold text-white transition-colors disabled:opacity-70"
                  style={{
                    background: active.color,
                    boxShadow: `0 10px 22px -10px ${active.shadow}`,
                  }}
                >
                  {pending ? "Ingresando…" : "Ingresar"}
                </button>
              </form>

              {role === "residente" && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setRegisterOpen((v) => !v)}
                    className="text-[13.5px] font-bold"
                    style={{ color: active.color }}
                  >
                    ¿Primera vez? Regístrate
                  </button>
                  <button
                    onClick={() => setPinHelp(true)}
                    className="text-[13.5px] font-bold text-[#6B7585]"
                  >
                    Olvidé mi PIN
                  </button>
                </div>
              )}
              {role === "propietario" && (
                <p className="mt-4 text-[13.5px] font-semibold text-[#6B7585]">
                  ¿No tienes acceso? Pídelo a la administración de tu conjunto.
                </p>
              )}

              {pinHelp && (
                <div
                  role="status"
                  className="mt-3 animate-pa-in rounded-[12px] bg-[#F0F3F8] px-3.5 py-3 text-[13px] font-semibold leading-[1.45] text-[#5B6675]"
                >
                  {DEMO
                    ? "Demo: tu PIN es 1234"
                    : "Pídele a la administración que restablezca tu PIN."}
                </div>
              )}

              {registerOpen && (
                <div className="mt-3 animate-pa-in rounded-[14px] border border-[#E3E8EF] bg-[#F8FAFC] p-4">
                  <p className="mb-2.5 text-[13px] font-semibold leading-[1.45] text-[#5B6675]">
                    El registro sí se hace en tu conjunto (una sola vez), para
                    que la portería apruebe que vives ahí. Búscalo:
                  </p>
                  <ConjuntoSearch
                    conjuntos={conjuntos}
                    onPick={(c) => router.push(`/${c.slug}/residente/registro`)}
                  />
                </div>
              )}

              {DEMO && !staff && role === "residente" && (
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
              {DEMO && staff && (
                <button
                  onClick={() => {
                    setUser(role === "porteria" ? "portería" : "admin");
                    setPass(role === "porteria" ? "1234" : "admin");
                    setErr("");
                  }}
                  className="mt-[18px] w-full rounded-[12px] border border-dashed border-[#C9D2DE] bg-[#F0F3F8] p-[11px] text-[13px] font-bold text-[#5B6675]"
                >
                  {role === "porteria"
                    ? "Usar datos de prueba (portería · 1234)"
                    : "Usar datos de prueba (admin · admin)"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center">
        <Link
          href="/ayuda"
          className="text-[13.5px] font-bold text-[#6B7585] hover:text-ink"
        >
          ¿Cómo funciona? Ver guía de uso →
        </Link>
        <Link
          href="/funciones"
          className="text-[13.5px] font-bold text-[#6B7585] hover:text-ink"
        >
          Ver todas las funciones →
        </Link>
      </div>
    </div>
  );
}

// Post-PIN step: the same phone lives in more than one conjunto/apartamento,
// so the resident picks which one to manage. Only reachable authenticated.
function ChooseAccount({
  accent,
  choices,
  pending,
  onPick,
  onBack,
}: {
  accent: Role;
  choices: ResidentAccountChoice[];
  pending: boolean;
  onPick: (c: ResidentAccountChoice) => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-pa-in">
      <button
        onClick={onBack}
        className="mb-4 text-[13.5px] font-bold text-[#6B7585]"
      >
        ← Volver
      </button>
      <h1 className="mb-1.5 font-display text-[23px] font-bold tracking-[-.4px]">
        ¿Cuál quieres gestionar?
      </h1>
      <p className="mb-5 text-[14.5px] text-[#6B7585]">
        Tu número está registrado en más de un lugar. Elige dónde entrar.
      </p>
      <ul className="flex flex-col gap-2.5">
        {choices.map((c) => (
          <li key={`${c.slug}/${c.aptoKey}`}>
            <button
              disabled={pending}
              onClick={() => onPick(c)}
              className="flex w-full items-center gap-3.5 rounded-[15px] border-[1.5px] border-[#E3E8EF] bg-white p-4 text-left transition-colors hover:border-[#C9D2DE] disabled:opacity-70"
            >
              <span
                className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] font-display text-[17px] font-bold"
                style={{ background: accent.soft, color: accent.color }}
              >
                {c.conjuntoName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-ink">
                  {c.conjuntoName}
                </span>
                <span className="block text-[13px] font-semibold text-[#6B7585]">
                  Torre {c.tower} · Apto {c.apt}
                </span>
              </span>
              <span
                className="flex-none text-[13px] font-bold"
                style={{ color: accent.color }}
              >
                Entrar →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Searchable conjunto selector for staff (usernames viven por conjunto, así
// que portería/administración sí deben decir cuál).
function ConjuntoPicker({
  accent,
  conjuntos,
  value,
  onChange,
}: {
  accent: Role;
  conjuntos: ConjuntoOption[];
  value: ConjuntoOption | null;
  onChange: (c: ConjuntoOption | null) => void;
}) {
  if (value) {
    return (
      <div className="mb-4">
        <Label>Conjunto</Label>
        <div
          className="flex items-center justify-between gap-3 rounded-[13px] border-[1.5px] bg-white p-[13px]"
          style={{ borderColor: accent.color }}
        >
          <span className="truncate text-[15px] font-bold text-ink">
            {value.name}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex-none text-[13px] font-bold text-[#6B7585] hover:text-ink"
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <Label htmlFor="portal-conjunto">Conjunto</Label>
      <ConjuntoSearch conjuntos={conjuntos} onPick={onChange} inputId="portal-conjunto" />
    </div>
  );
}

function ConjuntoSearch({
  conjuntos,
  onPick,
  inputId,
}: {
  conjuntos: ConjuntoOption[];
  onPick: (c: ConjuntoOption) => void;
  inputId?: string;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = q
      ? conjuntos.filter((c) => c.name.toLowerCase().includes(q))
      : conjuntos;
    return all.slice(0, 5);
  }, [conjuntos, query]);

  return (
    <div>
      <div className="flex items-center gap-2.5 rounded-[13px] border-[1.5px] border-[#E3E8EF] bg-[#F6F8FB] px-3.5">
        <IconSearch size={16} className="flex-none text-[#6B7585]" />
        <input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca tu conjunto por nombre"
          className="w-full flex-1 bg-transparent py-[13px] text-[15px] font-semibold outline-none"
        />
      </div>
      {matches.length === 0 ? (
        <p className="mt-2 text-[13px] font-semibold text-[#6B7585]">
          No encontramos un conjunto con ese nombre. Verifica el enlace o
          código QR que te compartió la administración.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {matches.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="w-full rounded-[12px] border border-[#E3E8EF] bg-white px-3.5 py-[11px] text-left text-[14px] font-bold text-ink hover:border-[#C9D2DE]"
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

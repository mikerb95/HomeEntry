import Link from "next/link";
import { getConfig } from "@/db/queries";
import { Shell } from "@/components/Shell";

const cards = [
  {
    href: "/residente/login",
    letter: "R",
    color: "#2F6BFF",
    soft: "#EAF1FF",
    title: "Soy residente",
    desc: "Ingresa con tu WhatsApp y PIN para ver notificaciones y autorizar ingresos.",
    cta: "Iniciar sesión",
  },
  {
    href: "/residente/registro",
    letter: "+",
    color: "#0EA5A0",
    soft: "#E0F5F4",
    title: "Primera vez (registro)",
    desc: "Registra el WhatsApp de tu apartamento escaneando el QR del conjunto.",
    cta: "Registrarme",
  },
  {
    href: "/porteria/login",
    letter: "V",
    color: "#16A34A",
    soft: "#E9F8EE",
    title: "Portería / Vigilante",
    desc: "Registro de visitas, paquetes, parqueadero y verificación de QR.",
    cta: "Iniciar sesión",
  },
  {
    href: "/admin/login",
    letter: "A",
    color: "#6D28D9",
    soft: "#EEE9FF",
    title: "Administración",
    desc: "Dashboard, historial y auditoría de parqueadero del conjunto.",
    cta: "Iniciar sesión",
  },
];

export default async function LauncherPage() {
  const config = await getConfig();

  return (
    <Shell>
      <div className="mx-auto max-w-[900px] pt-3.5 animate-pa-in">
        <div className="mb-[26px] flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ink font-display text-[24px] font-bold text-white">
            P
          </div>
          <div>
            <div className="font-display text-[24px] font-bold tracking-[-.5px]">
              PortAl
            </div>
            <div className="text-[13.5px] font-semibold text-[#8A94A3]">
              {config?.name ?? "Conjunto"}
            </div>
          </div>
        </div>

        <h1 className="mb-2.5 max-w-[560px] font-display text-[34px] font-bold leading-[1.1] tracking-[-1px]">
          Gestión de portería conectada por WhatsApp
        </h1>
        <p className="mb-7 max-w-[560px] text-[16px] leading-[1.55] text-[#6B7585]">
          Selecciona un flujo para probar el prototipo. En producción,
          residentes y vigilantes acceden escaneando un código QR; aquí lo
          simulamos con este lanzador.
        </p>

        <div className="grid grid-cols-1 gap-4 min-[680px]:grid-cols-2 min-[680px]:gap-[18px]">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="flex items-start gap-[15px] rounded-[20px] border border-[#E3E8EF] bg-white p-[22px] text-left shadow-[0_1px_3px_rgba(16,24,40,.05)] transition-transform hover:-translate-y-[3px] hover:shadow-[0_16px_36px_-20px_rgba(15,20,26,.4)]"
            >
              <span
                className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px] font-display text-[20px] font-bold"
                style={{ background: c.soft, color: c.color }}
              >
                {c.letter}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-[3px] block font-display text-[17px] font-bold text-ink">
                  {c.title}
                </span>
                <span className="block text-[13.5px] leading-[1.45] text-[#6B7585]">
                  {c.desc}
                </span>
                <span
                  className="mt-[9px] inline-block text-[12.5px] font-bold"
                  style={{ color: c.color }}
                >
                  {c.cta} →
                </span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2.5 rounded-[14px] bg-[#EEF1F6] px-[18px] py-3.5 text-[13px] text-[#5B6675]">
          <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] bg-white text-[#8A94A3]">
            i
          </span>
          Credenciales demo precargadas en cada login. Toca &quot;Usar datos de
          prueba&quot; para autocompletar.
        </div>
      </div>
    </Shell>
  );
}

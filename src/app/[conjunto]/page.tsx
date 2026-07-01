import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getConjuntoBySlug,
  getResidentVersion,
  getStaffVersion,
} from "@/db/queries";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

// If the visitor already has a valid session for this conjunto, skip the
// role picker and send them straight to their panel.
async function redirectIfLoggedIn(slug: string, conjuntoId: string) {
  const s = await getSession();
  if (!s || s.role === "superadmin" || s.conjuntoSlug !== slug) return;

  const v =
    s.role === "resident"
      ? await getResidentVersion(conjuntoId, s.aptoKey)
      : await getStaffVersion(conjuntoId, s.username);
  if (v === null || v !== s.v) return;

  if (s.role === "resident") redirect(`/${slug}/residente`);
  if (s.role === "guard") redirect(`/${slug}/porteria`);
  if (s.role === "admin") redirect(`/${slug}/admin`);
}

export default async function ConjuntoEntryPage({
  params,
}: {
  params: Promise<{ conjunto: string }>;
}) {
  const { conjunto: slug } = await params;
  const conjunto = await getConjuntoBySlug(slug);
  if (!conjunto) notFound();

  await redirectIfLoggedIn(slug, conjunto.id);

  const cards = [
    {
      href: `/${slug}/residente/login`,
      letter: "R",
      color: "#2F6BFF",
      soft: "#EAF1FF",
      title: "Soy residente",
      desc: "Ingresa con tu WhatsApp y PIN para ver notificaciones y autorizar ingresos.",
      cta: "Iniciar sesión",
    },
    {
      href: `/${slug}/residente/registro`,
      letter: "+",
      color: "#0EA5A0",
      soft: "#E0F5F4",
      title: "Primera vez (registro)",
      desc: "Registra el WhatsApp de tu apartamento escaneando el QR del conjunto.",
      cta: "Registrarme",
    },
    {
      href: `/${slug}/porteria/login`,
      letter: "V",
      color: "#16A34A",
      soft: "#E9F8EE",
      title: "Portería / Vigilante",
      desc: "Registro de visitas, paquetes, parqueadero y verificación de QR.",
      cta: "Iniciar sesión",
    },
    {
      href: `/${slug}/admin/login`,
      letter: "A",
      color: "#6D28D9",
      soft: "#EEE9FF",
      title: "Administración",
      desc: "Dashboard, historial y auditoría de parqueadero del conjunto.",
      cta: "Iniciar sesión",
    },
  ];

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
            <div className="text-[13.5px] font-semibold text-[#6B7585]">
              {conjunto.name}
            </div>
          </div>
        </div>

        <h1 className="mb-2.5 max-w-[560px] font-display text-[34px] font-bold leading-[1.1] tracking-[-1px]">
          Bienvenido a {conjunto.name}
        </h1>
        <p className="mb-7 max-w-[560px] text-[16px] leading-[1.55] text-[#6B7585]">
          Elige cómo quieres ingresar. Residentes y vigilantes acceden
          escaneando el código QR del conjunto; aquí están todos los accesos.
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
      </div>
    </Shell>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { LEGAL } from "./config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Centro legal · La Oportunidad",
  description:
    "Términos y condiciones, política de tratamiento de datos personales y política de cookies de La Oportunidad.",
};

const docs = [
  {
    href: "/legal/terminos",
    letter: "T",
    color: "#2F6BFF",
    soft: "#EAF1FF",
    title: "Términos y condiciones de uso",
    desc: "Reglas del servicio, responsabilidades de cada rol, propiedad intelectual y limitación de responsabilidad.",
  },
  {
    href: "/legal/privacidad",
    letter: "P",
    color: "#16A34A",
    soft: "#E9F8EE",
    title: "Política de tratamiento de datos personales",
    desc: "Qué datos tratamos, con qué finalidad y cómo ejercer tus derechos conforme a la Ley 1581 de 2012.",
  },
  {
    href: "/legal/cookies",
    letter: "C",
    color: "#6D28D9",
    soft: "#EEE9FF",
    title: "Política de cookies y almacenamiento",
    desc: "Cookies técnicas de sesión, almacenamiento local y notificaciones push que usa la plataforma.",
  },
];

export default function LegalHubPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-[820px] pt-3.5 animate-pa-in">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ink font-display text-[24px] font-bold text-white"
            aria-label="Inicio"
          >
            O
          </Link>
          <div>
            <div className="font-display text-[24px] font-bold tracking-[-.5px]">
              {LEGAL.brand}
            </div>
            <div className="text-[13.5px] font-semibold text-[#6B7585]">
              Centro legal
            </div>
          </div>
        </div>

        <h1 className="mb-2.5 max-w-[620px] font-display text-[34px] font-bold leading-[1.1] tracking-[-1px]">
          Información legal y de privacidad
        </h1>
        <p className="mb-8 max-w-[640px] text-[16px] leading-[1.55] text-[#6B7585]">
          Estos documentos regulan el uso de {LEGAL.brand} y el tratamiento de
          los datos personales de residentes, personal de portería,
          administración y visitantes, conforme a la legislación colombiana.
        </p>

        <div className="flex flex-col gap-4">
          {docs.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="flex items-start gap-[15px] rounded-[20px] border border-[#E3E8EF] bg-white p-[22px] shadow-[0_1px_3px_rgba(16,24,40,.05)] transition-transform hover:-translate-y-[3px] hover:shadow-[0_16px_36px_-20px_rgba(15,20,26,.4)]"
            >
              <span
                className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px] font-display text-[20px] font-bold"
                style={{ background: d.soft, color: d.color }}
              >
                {d.letter}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-[3px] block font-display text-[17px] font-bold text-ink">
                  {d.title}
                </span>
                <span className="block text-[13.5px] leading-[1.45] text-[#6B7585]">
                  {d.desc}
                </span>
                <span
                  className="mt-[9px] inline-block text-[12.5px] font-bold"
                  style={{ color: d.color }}
                >
                  Leer documento →
                </span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-[16px] border border-[#E3E8EF] bg-white p-5 text-[13.5px] leading-[1.6] text-[#5B6675]">
          <span className="font-bold text-ink">
            Responsable / Encargado del tratamiento:{" "}
          </span>
          {LEGAL.operator.name} — {LEGAL.operator.address}. Para consultas,
          reclamos o el ejercicio de tus derechos escribe a{" "}
          <a
            href={`mailto:${LEGAL.operator.privacyEmail}`}
            className="font-semibold text-ink"
          >
            {LEGAL.operator.privacyEmail}
          </a>
          .
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-[13.5px] font-bold text-[#6B7585] hover:text-ink"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </Shell>
  );
}

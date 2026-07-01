import { Fragment } from "react";
import { Shell } from "@/components/Shell";
import { IconCheck } from "@/components/icons";

export const metadata = {
  title: "La Oportunidad · Propuesta económica",
  description: "Planes y precios de La Oportunidad para conjuntos residenciales y administradoras.",
};

type Tier = {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  highlight?: boolean;
  cta: string;
  features: string[];
};

const tiers: Tier[] = [
  {
    name: "Básico",
    tagline: "Portería digital para un conjunto",
    price: "$120.000",
    priceNote: "COP / mes · por conjunto, hasta 80 apartamentos",
    cta: "Empezar con Básico",
    features: [
      "Registro y autorización de visitantes con código QR de un solo uso",
      "Control de parqueaderos: asignación, liberación e historial de uso (carro y moto)",
      "Caja de portería: registro de encomiendas, mensajes y novedades del turno",
      "Gestión de residentes por torre y apartamento (alta, PIN de acceso, bloqueo por intentos fallidos)",
      "Asignación de cupos y tarifas de visitante configurables por la administración",
      "Notificaciones al residente por WhatsApp (enlace directo, sin costo de mensajería)",
      "Panel de administración del conjunto",
      "1 conjunto residencial incluido",
      "Soporte por correo electrónico",
    ],
  },
  {
    name: "Profesional",
    tagline: "Comunicación automática y trazabilidad",
    price: "$200.000",
    priceNote: "COP / mes · por conjunto, apartamentos ilimitados",
    highlight: true,
    cta: "Elegir Profesional",
    features: [
      "Todo lo incluido en Básico",
      "WhatsApp Business API oficial: mensajes automáticos sin depender de que el guardia abra el chat*",
      "Notificaciones push a los celulares de los residentes (respaldo si WhatsApp no está disponible)",
      "Auditoría de accesos a datos sensibles: quién consultó qué dato y cuándo",
      "Reportes de actividad exportables: visitas, encomiendas, uso de parqueaderos",
      "Múltiples torres y perfiles de guardia por turno",
      "Soporte prioritario por WhatsApp/chat",
    ],
  },
  {
    name: "Empresarial",
    tagline: "Para administradoras con varios conjuntos",
    price: "Cotización",
    priceNote: "a la medida · desde 3 conjuntos en un mismo panel",
    cta: "Hablar con ventas",
    features: [
      "Todo lo incluido en Profesional",
      "Panel superadministrador: crea y gestiona varios conjuntos desde una sola cuenta",
      "Aislamiento de datos por conjunto con roles y accesos diferenciados por sede",
      "Marca personalizada (logo y colores de la administradora o de cada conjunto)",
      "Onboarding y capacitación del equipo de portería para cada conjunto nuevo",
      "Soporte dedicado con tiempos de respuesta acordados",
      "Integraciones a medida (contabilidad, control de acceso físico, etc.)",
    ],
  },
];

type Cell = boolean | string;
const comparisonGroups: { group: string; rows: [string, Cell, Cell, Cell][] }[] = [
  {
    group: "Visitantes y portería",
    rows: [
      ["Autorización de visitantes por QR", true, true, true],
      ["Caja de portería (encomiendas, mensajes)", true, true, true],
      ["Control de parqueaderos (carro/moto)", true, true, true],
      ["Asignación y tarifas de visitante", true, true, true],
    ],
  },
  {
    group: "Residentes",
    rows: [
      ["Gestión de residentes por apartamento", true, true, true],
      ["PIN de acceso con bloqueo por intentos fallidos", true, true, true],
      ["Notificación por WhatsApp (enlace manual)", true, true, true],
      ["WhatsApp Business API automático", false, true, true],
      ["Notificaciones push en el celular", false, true, true],
    ],
  },
  {
    group: "Administración y seguridad",
    rows: [
      ["Panel de administración del conjunto", true, true, true],
      ["Auditoría de accesos a datos sensibles", false, true, true],
      ["Reportes exportables de actividad", false, true, true],
      ["Múltiples conjuntos en un solo panel", false, false, true],
      ["Marca personalizada", false, false, true],
      ["Soporte", "Correo", "Prioritario", "Dedicado"],
    ],
  },
];

function Dot({ v }: { v: Cell }) {
  if (typeof v === "string") {
    return <span className="text-[12.5px] font-semibold text-ink">{v}</span>;
  }
  return v ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-soft text-green">
      <IconCheck size={12} />
    </span>
  ) : (
    <span className="text-[13px] text-[#C7CEDA]">—</span>
  );
}

export default function PricingPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-[1040px] pb-20">
        {/* Hero */}
        <div className="pt-6 text-center">
          <div className="mb-3 text-[12.5px] font-bold uppercase tracking-[0.08em] text-blue">
            Propuesta económica
          </div>
          <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-1px] text-ink">
            Un plan por cada etapa del conjunto
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.65] text-muted-2">
            Desde el primer día, incluso el plan más básico trae operación
            completa de portería: visitantes, parqueaderos, caja y
            residentes. Los planes superiores suman automatización,
            trazabilidad y soporte para varias sedes.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-[20px] border bg-white p-6 ${
                tier.highlight
                  ? "border-blue shadow-[0_8px_30px_rgba(47,107,255,0.14)]"
                  : "border-[#E3E8EF]"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-6 rounded-full bg-blue px-3 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-white">
                  Recomendado
                </div>
              )}
              <div className="mb-1 text-[13px] font-bold uppercase tracking-[0.04em] text-muted-2">
                {tier.name}
              </div>
              <div className="mb-4 text-[14.5px] font-semibold text-ink">
                {tier.tagline}
              </div>
              <div className="mb-1 font-display text-[32px] font-bold tracking-[-0.5px] text-ink">
                {tier.price}
              </div>
              <div className="mb-6 text-[12.5px] leading-[1.5] text-muted-2">
                {tier.priceNote}
              </div>
              <button
                className={`mb-6 w-full rounded-[12px] py-2.5 text-[14px] font-bold ${
                  tier.highlight
                    ? "bg-blue text-white"
                    : "bg-[#F1F4F8] text-ink"
                }`}
              >
                {tier.cta}
              </button>
              <ul className="space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13.5px] leading-[1.5] text-ink">
                    <span className="mt-0.5 shrink-0 text-green">
                      <IconCheck size={14} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-4 max-w-[640px] text-center text-[12.5px] leading-[1.6] text-muted-2">
          * WhatsApp Business API oficial requiere una cuenta de Meta a
          nombre del conjunto o la administradora; los costos de mensajería
          que cobra Meta se facturan aparte, según el número de
          conversaciones.
        </p>

        {/* Comparison table */}
        <div className="mt-16">
          <h2 className="mb-6 text-center font-display text-[22px] font-bold tracking-[-0.5px] text-ink">
            Comparación detallada de funciones
          </h2>
          <div className="overflow-x-auto rounded-[16px] border border-[#E3E8EF] bg-white">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E3E8EF]">
                  <th className="px-5 py-3 text-[13px] font-semibold text-muted-2">
                    Función
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-bold text-ink">
                    Básico
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-bold text-blue">
                    Profesional
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-bold text-violet">
                    Empresarial
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonGroups.map((g) => (
                  <Fragment key={g.group}>
                    <tr className="bg-[#F7F9FC]">
                      <td
                        colSpan={4}
                        className="px-5 py-2 text-[12px] font-bold uppercase tracking-[0.04em] text-muted-2"
                      >
                        {g.group}
                      </td>
                    </tr>
                    {g.rows.map(([label, b, p, e]) => (
                      <tr key={label} className="border-b border-[#EEF1F5] last:border-0">
                        <td className="px-5 py-3 text-[13.5px] text-ink">{label}</td>
                        <td className="px-4 py-3 text-center">
                          <Dot v={b} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Dot v={p} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Dot v={e} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cierre */}
        <div className="mt-16 rounded-[16px] bg-ink p-8 text-center">
          <h3 className="font-display text-[22px] font-bold leading-[1.2] text-white">
            ¿No estás seguro qué plan necesita tu conjunto?
          </h3>
          <p className="mx-auto mt-2 max-w-[480px] text-[14px] leading-[1.6] text-[#B8C0CC]">
            Cuéntanos cuántas torres, apartamentos y parqueaderos tiene tu
            conjunto y te recomendamos el plan adecuado — sin permanencia
            mínima, con posibilidad de cambiar de plan cuando lo necesites.
          </p>
        </div>
      </div>
    </Shell>
  );
}

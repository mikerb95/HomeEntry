import Link from "next/link";
import { Shell } from "@/components/Shell";

export const dynamic = "force-static";

// Public help page. Explains how to use PortAl for each role. There is no
// global conjunto here (see RootPage), so links point at slug placeholders and
// the QR flow rather than concrete panels.
type Section = {
  letter: string;
  color: string;
  soft: string;
  title: string;
  intro: string;
  access: string;
  steps: string[];
  features: { title: string; desc: string }[];
};

const sections: Section[] = [
  {
    letter: "R",
    color: "#2F6BFF",
    soft: "#EAF1FF",
    title: "Residente",
    intro:
      "Recibe alertas de visitas y encomiendas en tu WhatsApp y autoriza el ingreso de tus invitados con un código QR.",
    access:
      "Escanea el QR del conjunto o abre el enlace que compartió la administración. La primera vez pulsa «Primera vez (registro)»; luego ingresa con tu WhatsApp y PIN.",
    steps: [
      "Regístrate escaneando el QR e ingresa el WhatsApp de tu apartamento; recibirás un PIN para futuros ingresos.",
      "Inicia sesión desde «Soy residente» con tu WhatsApp y PIN.",
      "Para invitar a alguien, pulsa «Autorizar ingreso» y completa nombre, documento, fecha y placa (opcional).",
      "Comparte con tu visitante el código QR generado; la portería lo verifica al llegar.",
      "Activa las notificaciones push para enterarte al instante, además del WhatsApp.",
    ],
    features: [
      {
        title: "Mis notificaciones",
        desc: "Historial de visitas, paquetes y mensajes de la administración.",
      },
      {
        title: "Mis autorizaciones",
        desc: "Estado de cada invitado autorizado (vigente, usada o vencida).",
      },
      {
        title: "Mis parqueaderos",
        desc: "Consulta los cupos asignados a tu apartamento y su placa.",
      },
      {
        title: "Actualizar WhatsApp",
        desc: "Cambia el número de tu apartamento cuando lo necesites.",
      },
    ],
  },
  {
    letter: "V",
    color: "#16A34A",
    soft: "#E9F8EE",
    title: "Portería / Vigilante",
    intro:
      "Registra el ingreso de visitas, encomiendas y mensajes; gestiona el parqueadero y verifica los QR de los visitantes.",
    access:
      "Ingresa desde «Portería / Vigilante» con el usuario y contraseña que asigna la administración del conjunto.",
    steps: [
      "En «Portería» elige el tipo de aviso (visita, encomienda o mensaje).",
      "Selecciona la torre y el apartamento; confirma que tenga WhatsApp registrado.",
      "Pulsa «Enviar alerta por WhatsApp»; revisa la vista previa y confirma el envío.",
      "En «Escanear QR» verifica la autorización del visitante y confirma su ingreso.",
      "En «Parqueadero» gestiona los cupos de carros y motos y asigna placas.",
    ],
    features: [
      {
        title: "Registro express",
        desc: "Avisa al residente en segundos por WhatsApp.",
      },
      {
        title: "Escanear QR",
        desc: "Valida los datos del visitante autorizado antes de dejarlo entrar.",
      },
      {
        title: "Parqueadero",
        desc: "Mapa de cupos libres, de residentes y de visitantes en tiempo real.",
      },
      {
        title: "Turno activo",
        desc: "Contadores de visitas y paquetes del día y actividad reciente.",
      },
    ],
  },
  {
    letter: "A",
    color: "#6D28D9",
    soft: "#EEE9FF",
    title: "Administración",
    intro:
      "Supervisa la operación del conjunto: métricas, auditoría de parqueadero, finanzas, gastos y gestión de vigilantes.",
    access:
      "Ingresa desde «Administración» con el usuario y contraseña de administrador del conjunto.",
    steps: [
      "En «Dashboard» revisa la ocupación del parqueadero y las métricas del conjunto.",
      "Usa «Auditoría» para filtrar la actividad por torre, tipo y periodo.",
      "En «Finanzas» y «Gastos» controla la cartera, el recaudo y los egresos.",
      "En «Vigilantes» crea y administra las cuentas de portería.",
      "En «Parqueadero» libera o reasigna cupos cuando sea necesario.",
    ],
    features: [
      {
        title: "Dashboard",
        desc: "Ocupación, visitas y actividad general del conjunto.",
      },
      {
        title: "Auditoría",
        desc: "Historial filtrable de ingresos, paquetes y uso del parqueadero.",
      },
      {
        title: "Finanzas y gastos",
        desc: "Cartera, recaudo y registro de gastos por categoría.",
      },
      {
        title: "Vigilantes",
        desc: "Alta, baja y credenciales del personal de portería.",
      },
    ],
  },
  {
    letter: "S",
    color: "#0EA5A0",
    soft: "#E0F5F4",
    title: "Superadministrador",
    intro:
      "Gestiona la plataforma completa: crea conjuntos, define torres y apartamentos y entrega los accesos a cada administración.",
    access: "Ingresa en /superadmin con las credenciales de la plataforma.",
    steps: [
      "Crea un nuevo conjunto con su nombre, slug, torres y apartamentos.",
      "Comparte con la administración su enlace y su QR de acceso.",
      "Verifica la configuración de WhatsApp y notificaciones del conjunto.",
    ],
    features: [
      {
        title: "Crear conjunto",
        desc: "Alta de conjuntos con su estructura de torres y apartamentos.",
      },
      {
        title: "Accesos",
        desc: "Genera el enlace y el QR que usan residentes y personal.",
      },
    ],
  },
];

export default function AyudaPage() {
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
              Centro de ayuda
            </div>
          </div>
        </div>

        <h1 className="mb-2.5 max-w-[620px] font-display text-[34px] font-bold leading-[1.1] tracking-[-1px]">
          Cómo usar PortAl según tu rol
        </h1>
        <p className="mb-8 max-w-[620px] text-[16px] leading-[1.55] text-[#6B7585]">
          Encuentra las instrucciones de uso para cada tipo de usuario. Si no
          sabes por dónde empezar, escanea el código QR o abre el enlace que te
          compartió la administración de tu conjunto.
        </p>

        <nav className="mb-9 flex flex-wrap gap-2.5">
          {sections.map((s) => (
            <a
              key={s.title}
              href={`#${s.title.split(" ")[0].toLowerCase()}`}
              className="flex items-center gap-2 rounded-full border border-[#E3E8EF] bg-white px-3.5 py-2 text-[13px] font-bold text-ink transition-transform hover:-translate-y-[2px]"
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-[7px] font-display text-[12px] font-bold"
                style={{ background: s.soft, color: s.color }}
              >
                {s.letter}
              </span>
              {s.title}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-[18px]">
          {sections.map((s) => (
            <section
              key={s.title}
              id={s.title.split(" ")[0].toLowerCase()}
              className="scroll-mt-6 overflow-hidden rounded-[20px] border border-[#E3E8EF] bg-white shadow-[0_1px_3px_rgba(16,24,40,.05)]"
            >
              <div className="flex items-start gap-[15px] border-b border-[#EEF1F6] p-[22px]">
                <span
                  className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px] font-display text-[20px] font-bold"
                  style={{ background: s.soft, color: s.color }}
                >
                  {s.letter}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="mb-[3px] font-display text-[19px] font-bold text-ink">
                    {s.title}
                  </h2>
                  <p className="text-[14px] leading-[1.5] text-[#6B7585]">
                    {s.intro}
                  </p>
                </div>
              </div>

              <div className="p-[22px]">
                <div
                  className="mb-5 rounded-[14px] border px-4 py-3 text-[13.5px] leading-[1.5]"
                  style={{ borderColor: s.soft, background: s.soft, color: s.color }}
                >
                  <span className="font-bold">Cómo ingresar: </span>
                  <span className="text-ink/80">{s.access}</span>
                </div>

                <div className="block gap-6 min-[680px]:grid min-[680px]:grid-cols-[1.15fr_.85fr]">
                  <div>
                    <div className="mb-3 text-[12.5px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
                      Paso a paso
                    </div>
                    <ol className="flex flex-col gap-2.5">
                      {s.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span
                            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[12.5px] font-bold"
                            style={{ background: s.soft, color: s.color }}
                          >
                            {i + 1}
                          </span>
                          <span className="pt-[2px] text-[14px] leading-[1.5] text-ink">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="mt-6 min-[680px]:mt-0">
                    <div className="mb-3 text-[12.5px] font-bold uppercase tracking-[.5px] text-[#5B6675]">
                      Qué puedes hacer
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {s.features.map((f) => (
                        <div
                          key={f.title}
                          className="rounded-[13px] border border-[#EEF1F6] px-3.5 py-[11px]"
                        >
                          <div className="text-[13.5px] font-bold text-ink">
                            {f.title}
                          </div>
                          <div className="mt-0.5 text-[12.5px] leading-[1.45] text-[#6B7585]">
                            {f.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-9 rounded-[16px] border border-[#E3E8EF] bg-white p-5 text-[13.5px] text-[#5B6675]">
          <span className="font-bold text-ink">¿Necesitas más ayuda? </span>
          Contacta a la administración de tu conjunto. Si eres administrador y aún
          no tienes acceso, escribe al equipo de PortAl.
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-[13.5px] font-bold text-[#6B7585] hover:text-ink"
          >
            ← Volver al inicio
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-[#9AA4B2]">
          <Link href="/legal/terminos" className="hover:text-ink">
            Términos y condiciones
          </Link>
          <span className="text-[#D2D9E3]">·</span>
          <Link href="/legal/privacidad" className="hover:text-ink">
            Privacidad
          </Link>
          <span className="text-[#D2D9E3]">·</span>
          <Link href="/legal/cookies" className="hover:text-ink">
            Cookies
          </Link>
        </div>
      </div>
    </Shell>
  );
}

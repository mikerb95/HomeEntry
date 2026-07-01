import Link from "next/link";
import { Shell } from "@/components/Shell";

export const dynamic = "force-static";

// Public feature catalog. Unlike /ayuda (a role-based how-to), this page lists
// everything La Oportunidad can do, grouped by module. Kept in sync with the server
// actions under src/app/actions and the panels each role uses.

type Feature = { title: string; desc: string };

type Module = {
  letter: string;
  color: string;
  soft: string;
  title: string;
  intro: string;
  features: Feature[];
};

const modules: Module[] = [
  {
    letter: "R",
    color: "#2F6BFF",
    soft: "#EAF1FF",
    title: "Residentes",
    intro:
      "Cada apartamento gestiona sus visitas, encomiendas y comunicación con la administración desde el celular.",
    features: [
      {
        title: "Registro por WhatsApp",
        desc: "Alta del residente escaneando el QR del conjunto; recibe un PIN para futuros ingresos.",
      },
      {
        title: "Inicio de sesión con WhatsApp y PIN",
        desc: "Acceso rápido sin contraseñas complejas, ligado al número del apartamento.",
      },
      {
        title: "Autorizar ingreso con QR",
        desc: "Genera un código QR para cada invitado con nombre, documento, fecha y placa opcional.",
      },
      {
        title: "Mis autorizaciones",
        desc: "Seguimiento del estado de cada invitado: vigente, usada o vencida.",
      },
      {
        title: "Cartelera del conjunto",
        desc: "Consulta los avisos y comunicados publicados por la administración.",
      },
      {
        title: "Solicitudes de servicio",
        desc: "Reporta requerimientos o PQR a la administración y sigue su estado.",
      },
      {
        title: "Notificaciones push (PWA)",
        desc: "Alertas instantáneas en el dispositivo, además del aviso por WhatsApp.",
      },
      {
        title: "Mis parqueaderos",
        desc: "Consulta los cupos asignados al apartamento y las placas registradas.",
      },
      {
        title: "Historial de notificaciones",
        desc: "Registro de visitas, encomiendas y mensajes recibidos.",
      },
      {
        title: "Actualizar WhatsApp",
        desc: "Cambia el número asociado al apartamento cuando sea necesario.",
      },
    ],
  },
  {
    letter: "V",
    color: "#16A34A",
    soft: "#E9F8EE",
    title: "Portería / Vigilante",
    intro:
      "El personal de seguridad avisa a los residentes, valida visitantes y controla el parqueadero en tiempo real.",
    features: [
      {
        title: "Ingreso con usuario y contraseña",
        desc: "Cuentas de portería creadas y administradas por la administración del conjunto.",
      },
      {
        title: "Registro express de avisos",
        desc: "Notifica visita, encomienda o mensaje por WhatsApp en segundos.",
      },
      {
        title: "Vista previa y confirmación",
        desc: "Revisa el mensaje antes de enviarlo y confirma el envío al residente.",
      },
      {
        title: "Escanear y validar QR",
        desc: "Verifica los datos del visitante autorizado antes de permitir el ingreso.",
      },
      {
        title: "Confirmar ingreso",
        desc: "Marca la autorización como usada al confirmar la entrada del visitante.",
      },
      {
        title: "Gestión de parqueadero",
        desc: "Asigna y libera cupos de carros y motos, con placa asociada.",
      },
      {
        title: "Turno activo",
        desc: "Contadores de visitas y paquetes del día, más la actividad reciente.",
      },
    ],
  },
  {
    letter: "A",
    color: "#6D28D9",
    soft: "#EEE9FF",
    title: "Administración",
    intro:
      "Supervisa la operación completa del conjunto: métricas, finanzas, personal y configuración.",
    features: [
      {
        title: "Dashboard del conjunto",
        desc: "Ocupación del parqueadero, visitas y actividad general en un vistazo.",
      },
      {
        title: "Auditoría filtrable",
        desc: "Historial de ingresos, encomiendas y uso del parqueadero por torre, tipo y periodo.",
      },
      {
        title: "Configuración del conjunto",
        desc: "Datos generales, logotipo y parámetros operativos del conjunto.",
      },
      {
        title: "Gestión de vigilantes",
        desc: "Alta, baja, credenciales y restablecimiento de contraseña del personal de portería.",
      },
      {
        title: "Aprobación de residentes",
        desc: "Aprueba o rechaza los registros de residentes pendientes.",
      },
      {
        title: "Vinculación de propietarios",
        desc: "Asocia y desvincula propietarios con sus apartamentos.",
      },
      {
        title: "Publicación en cartelera",
        desc: "Crea y cierra avisos y comunicados para los residentes.",
      },
      {
        title: "Solicitudes de servicio",
        desc: "Gestiona y actualiza el estado de las solicitudes y PQR de residentes.",
      },
      {
        title: "Finanzas y cartera",
        desc: "Genera los cargos mensuales, registra pagos y controla el recaudo.",
      },
      {
        title: "Configuración de mora",
        desc: "Define intereses y reglas de mora para la cartera del conjunto.",
      },
      {
        title: "Gastos y proveedores",
        desc: "Registra egresos por categoría y administra el directorio de proveedores.",
      },
      {
        title: "Tarifa de parqueadero",
        desc: "Define y actualiza la tarifa de los cupos de parqueadero.",
      },
    ],
  },
  {
    letter: "P",
    color: "#B45309",
    soft: "#FBF0E1",
    title: "Propietarios",
    intro:
      "Los propietarios consultan la información y el estado de cuenta de su apartamento, aunque no residan en él.",
    features: [
      {
        title: "Portal del propietario",
        desc: "Acceso dedicado con inicio de sesión propio para propietarios.",
      },
      {
        title: "Detalle del apartamento",
        desc: "Consulta la información y el estado de su apartamento por conjunto.",
      },
      {
        title: "Estado de cuenta",
        desc: "Cartera, cargos y pagos asociados a la unidad.",
      },
    ],
  },
  {
    letter: "S",
    color: "#0EA5A0",
    soft: "#E0F5F4",
    title: "Superadministrador",
    intro:
      "Administra la plataforma completa y da de alta a cada conjunto con su estructura y accesos.",
    features: [
      {
        title: "Crear conjuntos",
        desc: "Alta de conjuntos con su nombre, slug, torres y apartamentos.",
      },
      {
        title: "Estructura de torres y apartamentos",
        desc: "Define la configuración física de cada conjunto.",
      },
      {
        title: "Enlaces y accesos",
        desc: "Genera el enlace y el QR que usan residentes y personal del conjunto.",
      },
      {
        title: "Gestión multi-conjunto",
        desc: "Supervisa todos los conjuntos de la plataforma desde un solo panel.",
      },
    ],
  },
  {
    letter: "∞",
    color: "#0F172A",
    soft: "#EEF1F6",
    title: "Plataforma",
    intro:
      "Capacidades transversales que hacen funcionar a La Oportunidad en todos los conjuntos y roles.",
    features: [
      {
        title: "Arquitectura multi-conjunto",
        desc: "Cada conjunto tiene su propio espacio, datos y accesos aislados.",
      },
      {
        title: "Notificaciones por WhatsApp",
        desc: "Canal principal de avisos a residentes para visitas y encomiendas.",
      },
      {
        title: "Notificaciones push PWA",
        desc: "App instalable con alertas en tiempo real vía Web Push.",
      },
      {
        title: "Códigos QR de acceso",
        desc: "QR para el registro de residentes y para autorizar visitantes.",
      },
      {
        title: "Roles y permisos",
        desc: "Residente, portería, administración, propietario y superadministrador, cada uno con su panel.",
      },
      {
        title: "Páginas legales",
        desc: "Términos y condiciones, política de privacidad y de cookies siempre accesibles.",
      },
    ],
  },
];

const totalFeatures = modules.reduce((n, m) => n + m.features.length, 0);

export default function FuncionesPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-[900px] pt-3.5 animate-pa-in">
        <div className="mb-[26px] flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ink font-display text-[24px] font-bold text-white">
            P
          </div>
          <div>
            <div className="font-display text-[24px] font-bold tracking-[-.5px]">
              La Oportunidad
            </div>
            <div className="text-[13.5px] font-semibold text-[#6B7585]">
              Funciones
            </div>
          </div>
        </div>

        <h1 className="mb-2.5 max-w-[620px] font-display text-[34px] font-bold leading-[1.1] tracking-[-1px]">
          Todo lo que puedes hacer con La Oportunidad
        </h1>
        <p className="mb-8 max-w-[620px] text-[16px] leading-[1.55] text-[#6B7585]">
          {totalFeatures} funciones organizadas por módulo para gestionar el
          acceso, la comunicación y la administración de tu conjunto residencial.
        </p>

        <nav className="mb-9 flex flex-wrap gap-2.5">
          {modules.map((m) => (
            <a
              key={m.title}
              href={`#${m.title.split(" ")[0].toLowerCase()}`}
              className="flex items-center gap-2 rounded-full border border-[#E3E8EF] bg-white px-3.5 py-2 text-[13px] font-bold text-ink transition-transform hover:-translate-y-[2px]"
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-[7px] font-display text-[12px] font-bold"
                style={{ background: m.soft, color: m.color }}
              >
                {m.letter}
              </span>
              {m.title}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-[18px]">
          {modules.map((m) => (
            <section
              key={m.title}
              id={m.title.split(" ")[0].toLowerCase()}
              className="scroll-mt-6 overflow-hidden rounded-[20px] border border-[#E3E8EF] bg-white shadow-[0_1px_3px_rgba(16,24,40,.05)]"
            >
              <div className="flex items-start gap-[15px] border-b border-[#EEF1F6] p-[22px]">
                <span
                  className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px] font-display text-[20px] font-bold"
                  style={{ background: m.soft, color: m.color }}
                >
                  {m.letter}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-[19px] font-bold text-ink">
                      {m.title}
                    </h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11.5px] font-bold"
                      style={{ background: m.soft, color: m.color }}
                    >
                      {m.features.length}
                    </span>
                  </div>
                  <p className="mt-[3px] text-[14px] leading-[1.5] text-[#6B7585]">
                    {m.intro}
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5 p-[22px] min-[680px]:grid-cols-2">
                {m.features.map((f) => (
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
            </section>
          ))}
        </div>

        <div className="mt-9 rounded-[16px] border border-[#E3E8EF] bg-white p-5 text-[13.5px] text-[#5B6675]">
          <span className="font-bold text-ink">¿Quieres saber cómo usarlas? </span>
          Revisa el{" "}
          <Link href="/ayuda" className="font-bold text-ink hover:underline">
            centro de ayuda
          </Link>{" "}
          con el paso a paso para cada rol.
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

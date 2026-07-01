import { Shell } from "@/components/Shell";
import {
  IconAuthorize,
  IconCar,
  IconBell,
  IconShield,
  IconAdminGrid,
  IconUser,
  IconQr,
  IconRegistered,
  IconMessage,
} from "@/components/icons";

export const metadata = {
  title: "La Oportunidad · Propuesta para administración y junta",
  description:
    "Cómo funciona La Oportunidad: módulos, roles, seguridad y beneficios para el conjunto residencial.",
};

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16 first:mt-0">
      <div className="mb-7 max-w-[720px]">
        <div className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-blue">
          {eyebrow}
        </div>
        <h2 className="font-display text-[26px] font-bold leading-[1.2] tracking-[-0.5px] text-ink">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[15px] leading-[1.6] text-muted-2">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Card({
  icon,
  color,
  title,
  children,
}: {
  icon: React.ReactNode;
  color: "blue" | "green" | "violet" | "amber" | "rose";
  title: string;
  children: React.ReactNode;
}) {
  const soft: Record<string, string> = {
    blue: "bg-blue-soft text-blue",
    green: "bg-green-soft text-green",
    violet: "bg-violet-soft text-violet",
    amber: "bg-amber-soft text-amber",
    rose: "bg-[#fde3ea] text-rose",
  };
  return (
    <div className="rounded-[16px] border border-[#E3E8EF] bg-white p-5">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] ${soft[color]}`}
      >
        {icon}
      </div>
      <div className="mb-1.5 text-[15px] font-bold text-ink">{title}</div>
      <p className="text-[13.5px] leading-[1.6] text-muted-2">{children}</p>
    </div>
  );
}

function RoleRow({
  role,
  access,
  color,
}: {
  role: string;
  access: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-[#E3E8EF] py-4 last:border-0">
      <div
        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <div>
        <div className="text-[14.5px] font-bold text-ink">{role}</div>
        <div className="mt-0.5 text-[13.5px] leading-[1.6] text-muted-2">
          {access}
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[13px] font-bold text-white">
        {n}
      </div>
      <div className="pb-8">
        <div className="text-[14.5px] font-bold text-ink">{title}</div>
        <p className="mt-1 text-[13.5px] leading-[1.6] text-muted-2">
          {text}
        </p>
      </div>
    </div>
  );
}

export default function ProposalPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-[820px] pb-20">
        {/* Hero */}
        <div className="pt-6 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[16px] bg-ink font-display text-[28px] font-bold text-white">
            P
          </div>
          <div className="mb-3 text-[12.5px] font-bold uppercase tracking-[0.08em] text-blue">
            Propuesta para administración y junta directiva
          </div>
          <h1 className="font-display text-[36px] font-bold leading-[1.08] tracking-[-1px] text-ink">
            La Oportunidad: portería digital conectada por WhatsApp
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.65] text-muted-2">
            Reemplaza el cuaderno de portería, los grupos de WhatsApp
            desordenados y las llamadas para autorizar visitantes por un
            sistema único, con roles claros, historial verificable y
            notificación instantánea al residente.
          </p>
        </div>

        {/* Problema */}
        <Section
          eyebrow="El problema hoy"
          title="La portería tradicional no deja rastro y depende de una persona"
          subtitle="Sin un sistema, cada conjunto termina con procesos distintos, difíciles de auditar y fáciles de romper cuando cambia el personal de vigilancia."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card icon={<IconUser size={20} />} color="amber" title="Sin trazabilidad">
              Cuadernos físicos o mensajes sueltos: no hay forma de saber
              quién autorizó a quién, ni cuándo, si algo sale mal.
            </Card>
            <Card icon={<IconMessage size={20} />} color="amber" title="Comunicación lenta">
              El residente se entera de una visita o encomienda por llamada o
              intercomunicador, si logra contestar a tiempo.
            </Card>
            <Card icon={<IconShield size={20} />} color="amber" title="Datos expuestos">
              Números de teléfono y datos de residentes circulan en texto
              plano, sin control de quién los consultó.
            </Card>
          </div>
        </Section>

        {/* Cómo funciona - flujo */}
        <Section
          eyebrow="Cómo funciona"
          title="Un flujo de datos simple, de extremo a extremo"
          subtitle="Cada conjunto tiene su propio acceso (portal-app.com/tu-conjunto), aislado del resto. Nadie de otro conjunto ve tus datos."
        >
          <div className="rounded-[16px] border border-[#E3E8EF] bg-white p-6">
            <Step
              n={1}
              title="El residente autoriza una visita desde su celular"
              text="Genera un código de acceso (QR) para un visitante, con nombre, documento, placa (si aplica) y hora esperada — sin instalar ninguna app, desde el navegador."
            />
            <Step
              n={2}
              title="La portería escanea el código en la entrada"
              text="El guardia confirma la identidad contra el código vigente. El sistema marca el código como usado; no puede reutilizarse ni compartirse."
            />
            <Step
              n={3}
              title="El residente recibe la notificación al instante"
              text="Por WhatsApp y, si activó las notificaciones del navegador, también como push en su celular — sin depender de que WhatsApp esté disponible."
            />
            <Step
              n={4}
              title="Todo queda registrado para consulta y auditoría"
              text="Visitas, encomiendas, uso de parqueaderos y consultas a datos sensibles quedan en un historial con fecha, hora y responsable, disponible para la administración."
            />
          </div>
        </Section>

        {/* Módulos */}
        <Section
          eyebrow="Módulos"
          title="Qué incluye el sistema"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card icon={<IconQr size={20} />} color="blue" title="Registro y autorización de visitantes">
              El residente pre-autoriza visitantes con código QR de un solo
              uso; la portería solo escanea y confirma. Cada código expira o
              queda marcado como usado.
            </Card>
            <Card icon={<IconCar size={20} />} color="green" title="Gestión de parqueaderos">
              Control de espacios para carro y moto, disponibilidad en tiempo
              real, asignación a residentes o visitantes, e historial de uso
              por franja horaria.
            </Card>
            <Card icon={<IconBell size={20} />} color="violet" title="Alertas al residente (visita, encomienda, mensaje)">
              La portería notifica en un clic: visitante en la entrada, paquete
              recibido o mensaje general, enviado por WhatsApp y notificación
              push simultáneamente.
            </Card>
            <Card icon={<IconShield size={20} />} color="rose" title="Auditoría y control de acceso a datos">
              Todo intento de consultar datos sensibles de un residente (por
              ejemplo, su teléfono) queda registrado: quién, qué, cuándo y
              sobre qué apartamento.
            </Card>
            <Card icon={<IconAdminGrid size={20} />} color="blue" title="Panel de administración">
              La administración configura torres, apartamentos, cupos de
              parqueadero, tarifas de visitante y consulta reportes de
              actividad del conjunto.
            </Card>
            <Card icon={<IconAuthorize size={20} />} color="green" title="Multi-conjunto (para administradoras)">
              Una misma administradora de propiedad horizontal puede operar
              varios conjuntos desde una sola plataforma, cada uno con sus
              propios datos y accesos aislados.
            </Card>
          </div>
        </Section>

        {/* Roles */}
        <Section
          eyebrow="Roles"
          title="Cada persona ve solo lo que le corresponde"
          subtitle="El acceso está separado por rol y por conjunto: nadie ve más de lo que necesita para su función."
        >
          <div className="rounded-[16px] border border-[#E3E8EF] bg-white px-5">
            <RoleRow
              role="Residente"
              access="Autoriza visitantes, recibe alertas de portería (WhatsApp y push), gestiona su acceso desde su celular con teléfono y PIN."
              color="#2F6BFF"
            />
            <RoleRow
              role="Portería / vigilante"
              access="Escanea códigos de visitante, registra encomiendas y mensajes, asigna y libera parqueaderos. No ve más datos del residente que los necesarios para hacer su trabajo."
              color="#16A34A"
            />
            <RoleRow
              role="Administración del conjunto"
              access="Configura el conjunto (torres, apartamentos, parqueaderos, tarifas), consulta el historial de actividad y la auditoría de accesos a datos sensibles."
              color="#6D28D9"
            />
            <RoleRow
              role="Superadministrador (plataforma)"
              access="Crea y da de alta nuevos conjuntos. No participa en la operación diaria de un conjunto específico."
              color="#D97706"
            />
          </div>
        </Section>

        {/* Seguridad */}
        <Section
          eyebrow="Seguridad y privacidad"
          title="Pensado para proteger los datos de los residentes"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card icon={<IconShield size={20} />} color="blue" title="Teléfonos cifrados">
              El número de celular del residente se guarda cifrado en la base
              de datos, no en texto plano. Solo se usa un identificador
              técnico para el inicio de sesión, no el número visible.
            </Card>
            <Card icon={<IconRegistered size={20} />} color="blue" title="Registro de quién consulta qué">
              Cada vez que alguien del staff consulta un dato sensible (por
              ejemplo, el teléfono de un apartamento), queda un registro con
              fecha, responsable y motivo.
            </Card>
            <Card icon={<IconUser size={20} />} color="blue" title="Protección contra intentos de acceso indebido">
              Los PIN de acceso de los residentes se bloquean temporalmente
              tras varios intentos fallidos, evitando adivinar contraseñas
              por fuerza bruta.
            </Card>
            <Card icon={<IconAdminGrid size={20} />} color="blue" title="Aislamiento entre conjuntos">
              Toda la información está separada por conjunto residencial: un
              conjunto nunca puede ver ni acceder a los datos de otro, aunque
              compartan la misma plataforma.
            </Card>
          </div>
        </Section>

        {/* Beneficios / calidad de vida */}
        <Section
          eyebrow="Beneficios"
          title="Qué cambia para el conjunto"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card icon={<IconUser size={20} />} color="green" title="Para los residentes">
              Autorizan visitas desde el celular sin llamar a nadie, reciben
              avisos al instante y no dependen de que alguien conteste el
              citófono.
            </Card>
            <Card icon={<IconShield size={20} />} color="green" title="Para la portería">
              Un flujo claro y guiado: escanear, confirmar, notificar. Menos
              margen de error y menos responsabilidad sobre decisiones que no
              le corresponden al guardia.
            </Card>
            <Card icon={<IconAdminGrid size={20} />} color="green" title="Para la administración y la junta">
              Historial completo y auditable de accesos, visitas y uso de
              parqueaderos: información objetiva para resolver reclamos y
              tomar decisiones, sin depender de la memoria de una persona.
            </Card>
          </div>
        </Section>

        {/* Cierre */}
        <div className="mt-16 rounded-[16px] bg-ink p-8 text-center">
          <h3 className="font-display text-[22px] font-bold leading-[1.2] text-white">
            Cada conjunto entra por su propio enlace
          </h3>
          <p className="mx-auto mt-2 max-w-[480px] text-[14px] leading-[1.6] text-[#B8C0CC]">
            No requiere instalar nada: funciona desde el navegador del
            celular, tanto para residentes como para portería y
            administración.
          </p>
        </div>
      </div>
    </Shell>
  );
}

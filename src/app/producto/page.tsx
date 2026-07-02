import Link from "next/link";

export const dynamic = "force-static";

export const metadata = {
  title: "La Oportunidad · La plataforma de tu conjunto residencial",
  description:
    "Portería conectada por WhatsApp, visitas con QR, encomiendas, cartera y comunicación. La plataforma completa para conjuntos residenciales en Colombia.",
};

// Página comercial pública. A diferencia de /propuesta (dirigida a la
// administración y el consejo) esta página vende el producto al público
// general con un tono de presentación de producto.

/* ---------- piezas de la escena del hero ---------- */

function GuardCard() {
  return (
    <div className="w-[250px] rounded-[18px] border border-white/10 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,.45)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#E9F8EE] font-display text-[14px] font-bold text-green">
          V
        </span>
        <div>
          <div className="text-[12.5px] font-bold text-ink">Portería</div>
          <div className="text-[11px] font-semibold text-muted-2">
            Registro express
          </div>
        </div>
      </div>
      <div className="rounded-[12px] border border-[#EEF1F6] bg-[#F7F9FC] p-3">
        <div className="text-[11px] font-bold uppercase tracking-[.06em] text-muted-2">
          Visita para
        </div>
        <div className="mt-0.5 font-display text-[15px] font-bold text-ink">
          Torre 3 · Apto 502
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green" />
          Avisando al residente…
        </div>
      </div>
    </div>
  );
}

function WhatsAppCard() {
  return (
    <div className="w-[270px] rounded-[18px] border border-white/10 bg-[#0B141A] p-4 shadow-[0_24px_60px_rgba(0,0,0,.5)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green font-display text-[13px] font-bold text-white">
          LO
        </span>
        <div>
          <div className="text-[12.5px] font-bold text-white">
            La Oportunidad
          </div>
          <div className="text-[11px] font-semibold text-[#8696A0]">
            WhatsApp · ahora
          </div>
        </div>
      </div>
      <div className="rounded-[12px] rounded-tl-[4px] bg-[#1F2C34] p-3 text-[12.5px] leading-[1.5] text-[#E9EDEF]">
        Hola 👋 Tienes una <b>visita en portería</b>: María Gómez. ¿Autorizas el
        ingreso?
        <div className="mt-1 text-right text-[10.5px] text-[#8696A0]">
          8:42 a. m.
        </div>
      </div>
      <div className="mt-2 rounded-[12px] rounded-tr-[4px] bg-[#005C4B] p-2.5 text-right text-[12.5px] font-semibold text-white">
        Sí, autorizado ✓
      </div>
    </div>
  );
}

function QrCard() {
  return (
    <div className="w-[230px] rounded-[18px] border border-white/10 bg-white p-4 text-center shadow-[0_24px_60px_rgba(0,0,0,.45)]">
      <div className="text-[11px] font-bold uppercase tracking-[.08em] text-blue">
        Pase de visitante
      </div>
      <div className="mt-0.5 font-display text-[15px] font-bold text-ink">
        María Gómez
      </div>
      <div className="mx-auto mt-3 grid h-[110px] w-[110px] grid-cols-5 gap-[3px] rounded-[10px] border border-[#EEF1F6] bg-white p-2">
        {[
          1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1,
          1, 1,
        ].map((on, i) => (
          <span
            key={i}
            className={`rounded-[2px] ${on ? "bg-ink" : "bg-[#E3E8EF]"}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-green">
        <span className="h-1.5 w-1.5 rounded-full bg-green" />
        Vigente hoy
      </div>
    </div>
  );
}

/* ---------- bloques reutilizables ---------- */

function Eyebrow({ children, light }: { children: string; light?: boolean }) {
  return (
    <div
      className={`mb-3 text-[13px] font-bold uppercase tracking-[.1em] ${
        light ? "text-[#7EA2FF]" : "text-blue"
      }`}
    >
      {children}
    </div>
  );
}

function BigTitle({
  children,
  light,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <h2
      className={`max-w-[760px] font-display text-[34px] font-bold leading-[1.08] tracking-[-1.2px] sm:text-[46px] ${
        light ? "text-white" : "text-ink"
      }`}
    >
      {children}
    </h2>
  );
}

function Lead({
  children,
  light,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={`mt-4 max-w-[640px] text-[16.5px] leading-[1.65] sm:text-[18px] ${
        light ? "text-[#9AA6B8]" : "text-muted-2"
      }`}
    >
      {children}
    </p>
  );
}

/* ---------- página ---------- */

const bento = [
  {
    letter: "E",
    color: "#B45309",
    soft: "#FBF0E1",
    title: "Encomiendas sin extravíos",
    desc: "Cada paquete queda registrado en portería y el residente recibe el aviso al instante. Nada se queda olvidado en la recepción.",
  },
  {
    letter: "P",
    color: "#2F6BFF",
    soft: "#EAF1FF",
    title: "Parqueadero de visitantes",
    desc: "Cupos de carro y moto en tiempo real, con placa, tarifa y sesión. La portería sabe exactamente qué hay disponible.",
  },
  {
    letter: "C",
    color: "#6D28D9",
    soft: "#EEE9FF",
    title: "Cartelera digital",
    desc: "Comunicados y avisos de la administración que sí se leen: llegan al celular, no al ascensor.",
  },
  {
    letter: "S",
    color: "#0EA5A0",
    soft: "#E0F5F4",
    title: "Solicitudes y PQR",
    desc: "Los residentes reportan, la administración responde y todo queda con trazabilidad de principio a fin.",
  },
  {
    letter: "$",
    color: "#16A34A",
    soft: "#E9F8EE",
    title: "Cartera y recaudo",
    desc: "Cuotas de administración generadas por periodo, pagos registrados e intereses de mora configurables por conjunto.",
  },
  {
    letter: "D",
    color: "#E11D48",
    soft: "#FDECF0",
    title: "Portal del propietario",
    desc: "El propietario consulta el estado de cuenta de su apartamento aunque no viva en el conjunto.",
  },
];

const trust = [
  {
    title: "Datos aislados por conjunto",
    desc: "Cada copropiedad opera en su propio espacio: sus residentes, su cartera y sus registros no se mezclan con los de nadie más.",
  },
  {
    title: "Información personal protegida",
    desc: "Los datos sensibles de los residentes se almacenan cifrados, en línea con la Ley 1581 de protección de datos personales.",
  },
  {
    title: "Auditoría de cada movimiento",
    desc: "Ingresos, encomiendas y parqueadero quedan en un historial filtrable por torre, tipo y periodo, listo para el consejo.",
  },
  {
    title: "Doble canal de notificación",
    desc: "WhatsApp y notificaciones push de la app instalable trabajan juntos: si un canal falla, el aviso llega por el otro.",
  },
  {
    title: "Roles con permisos claros",
    desc: "Residente, portería, administración, propietario y superadministrador: cada quien ve exactamente lo que le corresponde.",
  },
  {
    title: "En la nube, sin instalaciones",
    desc: "Funciona en cualquier celular o computador con navegador. Sin servidores en el conjunto ni mantenimientos costosos.",
  },
];

const colombia = [
  {
    title: "Ley 675 de 2001",
    desc: "Pensada para la propiedad horizontal colombiana: asamblea, consejo de administración y administrador.",
  },
  {
    title: "Mora a la medida",
    desc: "Intereses de mora con días de gracia y tasa configurable por conjunto, aplicados a la deuda más antigua.",
  },
  {
    title: "WhatsApp primero",
    desc: "El canal que todos los residentes ya usan a diario, sin apps raras ni contraseñas imposibles.",
  },
  {
    title: "Pesos colombianos",
    desc: "Cuotas, tarifas y cartera en COP, con los formatos y la operación del día a día de una copropiedad.",
  },
];

export default function ProductoPage() {
  return (
    <div className="bg-white text-ink">
      {/* ---------- nav ---------- */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-white font-display text-[18px] font-bold text-ink">
              O
            </span>
            <span className="font-display text-[17px] font-bold tracking-[-.3px] text-white">
              La Oportunidad
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/funciones"
              className="hidden text-[13.5px] font-bold text-[#B9C3D3] transition-colors hover:text-white sm:block"
            >
              Funciones
            </Link>
            <Link
              href="/propuesta"
              className="rounded-full bg-blue px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-blue-dark"
            >
              Solicitar demostración
            </Link>
          </nav>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden bg-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-320px] h-[720px] w-[1100px] -translate-x-1/2 rounded-full opacity-[.55]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(47,107,255,.55), rgba(47,107,255,.12) 55%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-[1120px] px-5 pb-16 pt-[120px] text-center sm:pt-[140px]">
          <div className="animate-pa-in">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[12.5px] font-bold text-[#B9C3D3]">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              Plataforma de gestión residencial
            </div>
            <h1 className="mx-auto max-w-[860px] font-display text-[44px] font-bold leading-[1.04] tracking-[-1.8px] text-white sm:text-[68px] sm:tracking-[-2.5px]">
              Tu conjunto,
              <br />
              en perfecto orden.
            </h1>
            <p className="mx-auto mt-6 max-w-[620px] text-[17px] leading-[1.65] text-[#9AA6B8] sm:text-[19px]">
              La Oportunidad conecta la portería, los residentes, los
              propietarios y la administración en una sola plataforma, con
              avisos por WhatsApp que llegan en segundos.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/propuesta"
                className="rounded-full bg-blue px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(47,107,255,.35)] transition-transform hover:-translate-y-[2px]"
              >
                Solicitar demostración
              </Link>
              <Link
                href="/funciones"
                className="rounded-full border border-white/20 px-7 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
              >
                Ver las 42 funciones
              </Link>
            </div>
          </div>

          {/* escena: el flujo real del producto */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-5 pb-4 sm:gap-2">
            <div
              className="animate-pa-pop sm:rotate-[-4deg] sm:translate-y-3"
              style={{ animationDelay: ".1s", animationFillMode: "backwards" }}
            >
              <GuardCard />
            </div>
            <div
              className="animate-pa-pop z-[1]"
              style={{ animationDelay: ".28s", animationFillMode: "backwards" }}
            >
              <WhatsAppCard />
            </div>
            <div
              className="animate-pa-pop sm:rotate-[4deg] sm:translate-y-3"
              style={{ animationDelay: ".46s", animationFillMode: "backwards" }}
            >
              <QrCard />
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-[520px] text-[13px] font-semibold text-[#6B7585]">
            El flujo real: la portería registra, el residente autoriza por
            WhatsApp y el visitante entra con su QR. Sin llamadas, sin
            citófono, sin esperas.
          </p>
        </div>
      </section>

      {/* ---------- portería ---------- */}
      <section className="mx-auto max-w-[1120px] px-5 py-20 sm:py-28">
        <Eyebrow>Portería conectada</Eyebrow>
        <BigTitle>
          Aviso en portería.
          <br />
          Notificación en el celular.
        </BigTitle>
        <Lead>
          El vigilante registra una visita, una encomienda o un mensaje en
          segundos, y el residente lo recibe de inmediato por WhatsApp y por
          notificación push. El citófono dañado dejó de ser un problema.
        </Lead>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "Registro express",
              d: "Tres toques para avisar una visita o una encomienda, con vista previa del mensaje antes de enviarlo.",
            },
            {
              n: "Validación con QR",
              d: "El vigilante escanea el pase del visitante y confirma nombre, documento y placa antes de abrir la puerta.",
            },
            {
              n: "Turno en control",
              d: "Contadores de visitas y paquetes del día, con la actividad reciente siempre a la vista.",
            },
          ].map((f) => (
            <div
              key={f.n}
              className="rounded-[18px] border border-[#E3E8EF] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,.05)]"
            >
              <div className="font-display text-[17px] font-bold text-ink">
                {f.n}
              </div>
              <p className="mt-2 text-[14px] leading-[1.6] text-muted-2">
                {f.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- bento de módulos ---------- */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1120px] px-5 py-20 sm:py-28">
          <Eyebrow>Todo el conjunto</Eyebrow>
          <BigTitle>Un módulo para cada frente de la copropiedad.</BigTitle>
          <Lead>
            Desde el paquete que llega a portería hasta la cartera que revisa
            el consejo: 42 funciones organizadas para que nada dependa de un
            cuaderno, una planilla o la memoria de alguien.
          </Lead>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bento.map((b) => (
              <div
                key={b.title}
                className="rounded-[20px] border border-[#E3E8EF] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,.05)] transition-transform hover:-translate-y-[3px]"
              >
                <span
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-[13px] font-display text-[18px] font-bold"
                  style={{ background: b.soft, color: b.color }}
                >
                  {b.letter}
                </span>
                <div className="font-display text-[17px] font-bold text-ink">
                  {b.title}
                </div>
                <p className="mt-2 text-[14px] leading-[1.6] text-muted-2">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- finanzas ---------- */}
      <section className="mx-auto max-w-[1120px] px-5 py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Finanzas y cartera</Eyebrow>
            <BigTitle>La cartera clara. La asamblea tranquila.</BigTitle>
            <Lead>
              Genera las cuotas de administración de todo el conjunto en un
              solo paso, registra los pagos y deja que la mora se calcule sola,
              con las reglas que defina la copropiedad.
            </Lead>
            <ul className="mt-7 flex flex-col gap-3.5">
              {[
                "Cargos mensuales masivos con protección contra el doble cobro.",
                "Intereses de mora con días de gracia y tasa propia del conjunto.",
                "Estado de cuenta por apartamento, visible para la administración y el propietario.",
                "Gastos y proveedores registrados por categoría, listos para rendir cuentas.",
                "Fondo de imprevistos con movimientos y saldo calculado automáticamente.",
                "Acuerdos de pago para formalizar y seguir la cartera en mora.",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 text-[15px] leading-[1.55] text-ink"
                >
                  <span className="mt-[3px] flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-soft text-[11px] font-bold text-green">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[#E3E8EF] bg-white p-7 shadow-[0_12px_40px_rgba(16,24,40,.08)]">
            <div className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-2">
              Estado de cuenta · Torre 3, Apto 502
            </div>
            <div className="mt-2 font-display text-[36px] font-bold tracking-[-1px] text-ink">
              $ 0
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 text-[12.5px] font-bold text-green">
              Al día · paz y salvo
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              {[
                ["Cuota de administración · junio", "$ 280.000", "Pagada"],
                ["Cuota de administración · mayo", "$ 280.000", "Pagada"],
                ["Parqueadero visitante · 12 may.", "$ 8.000", "Pagada"],
              ].map(([c, v, s]) => (
                <div
                  key={c}
                  className="flex items-center justify-between rounded-[12px] border border-[#EEF1F6] px-4 py-3"
                >
                  <div className="text-[13px] font-semibold text-ink">{c}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-ink">{v}</span>
                    <span className="rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-bold text-green">
                      {s}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- confianza (oscuro) ---------- */}
      <section className="bg-ink">
        <div className="mx-auto max-w-[1120px] px-5 py-20 sm:py-28">
          <Eyebrow light>Confiable y resiliente</Eyebrow>
          <BigTitle light>Confiable por diseño.</BigTitle>
          <Lead light>
            La información de una copropiedad es seria: datos personales,
            dinero y seguridad física. La plataforma se construyó para
            cuidarlos desde el primer día.
          </Lead>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {trust.map((t) => (
              <div key={t.title} className="border-t border-white/10 pt-5">
                <div className="font-display text-[16px] font-bold text-white">
                  {t.title}
                </div>
                <p className="mt-2 text-[13.5px] leading-[1.6] text-[#9AA6B8]">
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Colombia ---------- */}
      <section className="mx-auto max-w-[1120px] px-5 py-20 sm:py-28">
        <Eyebrow>Hecho para Colombia</Eyebrow>
        <BigTitle>
          Pensado para la propiedad horizontal colombiana, no adaptado a ella.
        </BigTitle>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {colombia.map((c) => (
            <div
              key={c.title}
              className="rounded-[18px] bg-blue-soft p-6"
            >
              <div className="font-display text-[16px] font-bold text-ink">
                {c.title}
              </div>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-[#4B5768]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 grid gap-6 rounded-[24px] border border-[#E3E8EF] bg-white px-8 py-9 text-center shadow-[0_1px_3px_rgba(16,24,40,.05)] sm:grid-cols-4">
          {[
            ["42", "funciones organizadas por módulo"],
            ["5", "roles, cada uno con su panel"],
            ["2", "canales de aviso: WhatsApp y push"],
            ["1", "plataforma para todos tus conjuntos"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-[40px] font-bold tracking-[-1.5px] text-blue">
                {n}
              </div>
              <div className="mx-auto mt-1 max-w-[180px] text-[13px] font-semibold leading-[1.45] text-muted-2">
                {l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA final ---------- */}
      <section className="relative overflow-hidden bg-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 bottom-[-340px] h-[600px] w-[1000px] -translate-x-1/2 rounded-full opacity-[.5]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(47,107,255,.5), transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-[1120px] px-5 py-24 text-center sm:py-32">
          <h2 className="mx-auto max-w-[720px] font-display text-[36px] font-bold leading-[1.06] tracking-[-1.4px] text-white sm:text-[54px] sm:tracking-[-2px]">
            Tu conjunto merece administrarse así.
          </h2>
          <p className="mx-auto mt-5 max-w-[540px] text-[16.5px] leading-[1.65] text-[#9AA6B8]">
            Conoce la propuesta completa para la administración y el consejo, y
            da el primer paso hacia una copropiedad más ordenada.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/propuesta"
              className="rounded-full bg-blue px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(47,107,255,.35)] transition-transform hover:-translate-y-[2px]"
            >
              Ver la propuesta completa
            </Link>
            <Link
              href="/funciones"
              className="rounded-full border border-white/20 px-7 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
            >
              Explorar funciones
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-[#E2E8F1] bg-white px-5 py-6">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-2.5 text-[12.5px] font-semibold text-muted-2 sm:flex-row">
          <span>© {new Date().getFullYear()} La Oportunidad</span>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
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
          </nav>
        </div>
      </footer>
    </div>
  );
}

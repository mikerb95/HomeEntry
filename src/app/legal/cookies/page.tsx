import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, Section, P, B, Ul, Li, Note } from "@/components/LegalDoc";
import { LEGAL } from "../config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Política de cookies y almacenamiento · La Oportunidad",
  description:
    "Cómo La Oportunidad usa cookies técnicas, almacenamiento local y notificaciones push.",
};

export default function CookiesPage() {
  return (
    <LegalDoc
      title="Política de cookies y almacenamiento"
      intro={`Describe las cookies, el almacenamiento local y las notificaciones que ${LEGAL.brand} utiliza para funcionar. No usamos cookies de publicidad ni de seguimiento de terceros.`}
    >
      <Section n={1} title="¿Qué son las cookies?">
        <P>
          Las cookies son pequeños archivos que un sitio guarda en tu
          dispositivo para recordar información entre solicitudes. Junto con
          tecnologías similares (almacenamiento local del navegador), permiten
          que la aplicación funcione, mantenga tu sesión y recuerde ciertas
          preferencias.
        </P>
      </Section>

      <Section n={2} title="Cookies que utilizamos">
        <P>
          {LEGAL.brand} utiliza exclusivamente cookies <B>técnicas y
          estrictamente necesarias</B>, que no requieren consentimiento previo
          por ser indispensables para prestar el servicio:
        </P>
        <Ul>
          <Li>
            <B>Cookie de sesión / autenticación:</B> mantiene tu sesión iniciada
            de forma segura tras validar tus credenciales y evita que tengas que
            autenticarte en cada acción. Es de carácter temporal y se invalida al
            cerrar sesión o al expirar.
          </Li>
          <Li>
            <B>Preferencias de la interfaz:</B> pequeños datos que recuerdan el
            estado de la aplicación para mejorar tu experiencia de uso.
          </Li>
        </Ul>
        <P>
          No utilizamos cookies de publicidad, de perfilamiento comercial ni de
          seguimiento por parte de terceros con fines de marketing.
        </P>
      </Section>

      <Section n={3} title="Almacenamiento local">
        <P>
          La aplicación puede usar el almacenamiento local del navegador para
          conservar temporalmente datos de funcionamiento de la interfaz. Esta
          información permanece en tu dispositivo y puedes eliminarla desde la
          configuración de tu navegador.
        </P>
      </Section>

      <Section n={4} title="Notificaciones push">
        <P>
          Si activas las notificaciones push (por ejemplo, como residente para
          enterarte de visitas o encomiendas), tu navegador genera una
          suscripción con un identificador único del dispositivo. La guardamos
          para poder enviarte los avisos y puedes desactivarla en cualquier
          momento desde los permisos de tu navegador o del sistema operativo.
        </P>
      </Section>

      <Section n={5} title="Cómo gestionar o eliminar las cookies">
        <P>
          Puedes bloquear o eliminar las cookies y el almacenamiento local desde
          la configuración de tu navegador. Ten en cuenta que, al tratarse de
          cookies técnicas necesarias, deshabilitarlas puede impedir que inicies
          sesión o que la plataforma funcione correctamente.
        </P>
        <Note title="Más información">
          Cualquier duda sobre esta política puedes dirigirla a{" "}
          <a
            href={`mailto:${LEGAL.operator.privacyEmail}`}
            className="font-semibold text-blue-dark"
          >
            {LEGAL.operator.privacyEmail}
          </a>
          . El tratamiento de los datos recolectados mediante estas tecnologías
          se rige por nuestra{" "}
          <Link href="/legal/privacidad" className="font-semibold text-blue-dark">
            Política de tratamiento de datos personales
          </Link>
          .
        </Note>
      </Section>
    </LegalDoc>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, Section, P, B, Ul, Li, Note } from "@/components/LegalDoc";
import { LEGAL } from "../config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos personales · PortAl",
  description:
    "Política de tratamiento y protección de datos personales de PortAl conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015.",
};

export default function PrivacidadPage() {
  return (
    <LegalDoc
      title="Política de tratamiento de datos personales"
      intro="Explica qué datos personales recolectamos, con qué finalidad, cómo los protegemos y cómo puedes ejercer tus derechos, conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015."
    >
      <Section n={1} title="Responsable y Encargado del tratamiento">
        <P>
          En la operación de {LEGAL.brand}, cada conjunto residencial (la
          copropiedad) es el <B>Responsable del Tratamiento</B> de los datos
          personales de sus residentes, personal de portería, administración y
          visitantes, pues es quien decide la finalidad y los medios del
          tratamiento. {LEGAL.operator.name} (NIT {LEGAL.operator.nit}) actúa
          como <B>Encargado del Tratamiento</B>, tratando esos datos por cuenta y
          bajo las instrucciones de la copropiedad.
        </P>
        <P>
          Respecto de los datos de las cuentas de administración de la plataforma
          y de la información generada para operarla, {LEGAL.operator.name} actúa
          como Responsable. Datos de contacto:
        </P>
        <Ul>
          <Li>
            <B>Responsable/Encargado:</B> {LEGAL.operator.name}
          </Li>
          <Li>
            <B>Domicilio:</B> {LEGAL.operator.address}
          </Li>
          <Li>
            <B>Correo de protección de datos:</B>{" "}
            <a
              href={`mailto:${LEGAL.operator.privacyEmail}`}
              className="font-semibold text-blue"
            >
              {LEGAL.operator.privacyEmail}
            </a>
          </Li>
        </Ul>
      </Section>

      <Section n={2} title="Datos personales que tratamos">
        <P>
          Según el rol del usuario, la plataforma puede tratar las siguientes
          categorías de datos:
        </P>
        <Ul>
          <Li>
            <B>Residentes:</B> torre y apartamento, número de WhatsApp/teléfono y
            un PIN de acceso. El número de teléfono se almacena cifrado.
          </Li>
          <Li>
            <B>Portería y administración:</B> nombre de usuario, contraseña
            (almacenada con hash) y rol asignado.
          </Li>
          <Li>
            <B>Visitantes:</B> nombre, número de documento y, opcionalmente,
            placa del vehículo, junto con la fecha y la unidad que autoriza el
            ingreso.
          </Li>
          <Li>
            <B>Parqueadero:</B> placas de vehículos y asignación de cupos por
            unidad.
          </Li>
          <Li>
            <B>Datos financieros de la copropiedad:</B> cuotas, cargos y montos
            asociados a cada unidad (almacenados cifrados), así como datos de
            proveedores (nombre, identificación tributaria y contacto, cifrados).
          </Li>
          <Li>
            <B>Datos de uso:</B> registros de eventos (visitas, encomiendas,
            mensajes), historial de accesos a información sensible y suscripciones
            de notificaciones push del dispositivo.
          </Li>
        </Ul>
        <P>
          No solicitamos deliberadamente datos sensibles (art. 5, Ley 1581) ni
          datos de niños, niñas y adolescentes. Si un titular considera que se
          han registrado datos de un menor, puede solicitar su supresión.
        </P>
      </Section>

      <Section n={3} title="Finalidades del tratamiento">
        <Ul>
          <Li>
            Gestionar el control de accesos y la seguridad de la copropiedad.
          </Li>
          <Li>
            Notificar a los residentes la llegada de visitas, encomiendas y
            mensajes, incluso por WhatsApp y notificaciones push.
          </Li>
          <Li>
            Generar y verificar autorizaciones de ingreso de visitantes mediante
            códigos QR.
          </Li>
          <Li>Administrar cupos de parqueadero de residentes y visitantes.</Li>
          <Li>
            Llevar la operación financiera, la auditoría y las métricas de la
            copropiedad.
          </Li>
          <Li>
            Autenticar a los usuarios, prevenir fraudes y usos no autorizados, y
            mantener registros de acceso a información sensible.
          </Li>
          <Li>Atender consultas, reclamos y requerimientos legales.</Li>
        </Ul>
      </Section>

      <Section n={4} title="Autorización del titular">
        <P>
          El tratamiento se sustenta en la autorización previa, expresa e
          informada del titular, otorgada al registrarse o al usar la plataforma,
          y/o en las causales que exoneran de autorización previstas en la ley
          (por ejemplo, datos requeridos para el ejercicio de funciones de la
          copropiedad o el cumplimiento de obligaciones legales). El titular
          puede revocar su autorización cuando el tratamiento no sea obligatorio.
        </P>
      </Section>

      <Section n={5} title="Derechos del titular">
        <P>Como titular de tus datos personales tienes derecho a:</P>
        <Ul>
          <Li>
            <B>Conocer, actualizar y rectificar</B> tus datos frente al
            Responsable o Encargado.
          </Li>
          <Li>
            <B>Solicitar prueba</B> de la autorización otorgada, salvo cuando la
            ley no la exija.
          </Li>
          <Li>
            <B>Ser informado</B> sobre el uso que se ha dado a tus datos.
          </Li>
          <Li>
            Presentar <B>quejas ante la Superintendencia de Industria y
            Comercio</B> por infracciones a la ley.
          </Li>
          <Li>
            <B>Revocar la autorización</B> y/o solicitar la <B>supresión</B> del
            dato cuando no exista un deber legal o contractual de conservarlo.
          </Li>
          <Li>
            <B>Acceder de forma gratuita</B> a tus datos personales objeto de
            tratamiento.
          </Li>
        </Ul>
      </Section>

      <Section n={6} title="Procedimiento para consultas y reclamos">
        <P>
          Puedes ejercer tus derechos escribiendo a{" "}
          <a
            href={`mailto:${LEGAL.operator.privacyEmail}`}
            className="font-semibold text-blue"
          >
            {LEGAL.operator.privacyEmail}
          </a>
          , indicando tu identificación, el conjunto y la unidad, y una
          descripción clara de tu solicitud.
        </P>
        <Ul>
          <Li>
            <B>Consultas:</B> se atienden en un término máximo de <B>diez (10)
            días hábiles</B>. Si no es posible, se informará al interesado y se
            resolverá dentro de los cinco (5) días hábiles siguientes.
          </Li>
          <Li>
            <B>Reclamos:</B> se atienden en un término máximo de <B>quince (15)
            días hábiles</B> contados desde el día siguiente a su recepción. Si
            no es posible, se informarán los motivos y la fecha de resolución,
            que no superará los ocho (8) días hábiles siguientes.
          </Li>
        </Ul>
        <P>
          Cuando actuamos como Encargado, podremos trasladar tu solicitud al
          conjunto correspondiente (Responsable) para su atención.
        </P>
      </Section>

      <Section n={7} title="Medidas de seguridad">
        <P>
          Aplicamos medidas técnicas, humanas y administrativas razonables para
          proteger los datos y evitar su adulteración, pérdida, consulta, uso o
          acceso no autorizado. Entre ellas:
        </P>
        <Ul>
          <Li>
            Cifrado en reposo de datos sensibles como el número de teléfono de
            residentes, montos financieros y datos de proveedores.
          </Li>
          <Li>
            Almacenamiento de PIN y contraseñas mediante funciones de hash, sin
            guardar el valor en texto plano.
          </Li>
          <Li>
            Segregación de la información por conjunto (multi‑tenant) y control
            de acceso según el rol.
          </Li>
          <Li>
            Registro de auditoría de los accesos a información sensible (por
            ejemplo, la consulta del teléfono de un residente).
          </Li>
        </Ul>
      </Section>

      <Section n={8} title="Transferencia y transmisión internacional de datos">
        <Note title="Alojamiento fuera de Colombia">
          La plataforma se apoya en proveedores de infraestructura y base de
          datos en la nube que pueden almacenar y procesar la información en
          servidores ubicados fuera de Colombia. Al aceptar esta política y usar
          el servicio, autorizas dicha transmisión internacional, la cual se
          realiza bajo cláusulas contractuales que exigen niveles de protección
          adecuados conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015.
        </Note>
      </Section>

      <Section n={9} title="Encargados y terceros">
        <P>
          Para operar el servicio compartimos datos, en lo estrictamente
          necesario, con proveedores que actúan como encargados: mensajería por
          WhatsApp para el envío de avisos, proveedores de servicios push y
          proveedores de alojamiento e infraestructura. Estos terceros solo
          pueden tratar los datos según nuestras instrucciones y las de la
          copropiedad.
        </P>
      </Section>

      <Section n={10} title="Conservación de los datos">
        <P>
          Conservamos los datos mientras exista la relación con la copropiedad y
          la finalidad que justifica su tratamiento, y durante los términos
          legales aplicables (por ejemplo, obligaciones contables, de seguridad o
          de defensa de derechos). Vencidos dichos plazos, los datos se suprimen
          o se anonimizan de forma segura.
        </P>
      </Section>

      <Section n={11} title="Cookies y tecnologías similares">
        <P>
          La plataforma utiliza cookies técnicas de sesión y almacenamiento local
          necesarios para su funcionamiento. Consulta el detalle en la{" "}
          <a href="/legal/cookies" className="font-semibold text-blue">
            Política de cookies
          </a>
          .
        </P>
      </Section>

      <Section n={12} title="Vigencia y modificaciones">
        <P>
          Esta política rige desde el {LEGAL.updated}. Las bases de datos
          asociadas se mantendrán vigentes mientras sean necesarias para las
          finalidades descritas. Podremos actualizar esta política; los cambios
          se publicarán en esta página con su nueva fecha.
        </P>
      </Section>

      <Section n={13} title="Autoridad de control">
        <Note title="Superintendencia de Industria y Comercio">
          Si consideras que tus derechos han sido vulnerados, puedes acudir a la{" "}
          {LEGAL.authority.name} —{" "}
          <a
            href={LEGAL.authority.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-dark"
          >
            {LEGAL.authority.url}
          </a>
          —, autoridad de protección de datos personales en Colombia.
        </Note>
      </Section>
    </LegalDoc>
  );
}

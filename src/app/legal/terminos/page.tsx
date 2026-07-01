import type { Metadata } from "next";
import { LegalDoc, Section, P, B, Ul, Li, Note } from "@/components/LegalDoc";
import { LEGAL } from "../config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Términos y condiciones de uso · PortAl",
  description:
    "Términos y condiciones que regulan el uso de la plataforma PortAl de gestión residencial.",
};

export default function TerminosPage() {
  return (
    <LegalDoc
      title="Términos y condiciones de uso"
      intro={`Estos términos regulan el acceso y uso de ${LEGAL.brand}, la plataforma de gestión de portería y accesos para conjuntos residenciales. Al usar la plataforma aceptas estas condiciones.`}
    >
      <Section n={1} title="Aceptación de los términos">
        <P>
          Estos Términos y Condiciones (en adelante, los «Términos») constituyen
          un contrato entre tú, como usuario, y {LEGAL.operator.name}, con NIT{" "}
          {LEGAL.operator.nit} y domicilio en {LEGAL.operator.address} (en
          adelante, «{LEGAL.brand}», «la plataforma», «nosotros»), operador de la
          aplicación disponible en {LEGAL.operator.site}.
        </P>
        <P>
          El uso de la plataforma implica la aceptación plena y sin reservas de
          estos Términos. Si no estás de acuerdo con ellos, abstente de usar el
          servicio. Estos Términos se rigen, entre otras, por la Ley 527 de 1999
          (comercio electrónico y mensajes de datos), la Ley 1480 de 2011
          (Estatuto del Consumidor) y demás normas concordantes de la República
          de Colombia.
        </P>
      </Section>

      <Section n={2} title="Descripción del servicio">
        <P>
          {LEGAL.brand} es una plataforma de software como servicio (SaaS) que
          permite a los conjuntos residenciales sometidos al régimen de propiedad
          horizontal (Ley 675 de 2001) gestionar el control de accesos,
          notificar visitas y encomiendas, autorizar el ingreso de visitantes
          mediante códigos QR, administrar parqueaderos y llevar registros
          operativos y financieros de la copropiedad.
        </P>
        <P>
          La plataforma es una herramienta tecnológica de apoyo. No sustituye las
          decisiones, obligaciones ni la responsabilidad de la asamblea, el
          consejo de administración, el administrador o el personal de vigilancia
          de cada copropiedad.
        </P>
      </Section>

      <Section n={3} title="Definiciones y roles de usuario">
        <Ul>
          <Li>
            <B>Conjunto / Copropiedad:</B> persona jurídica de propiedad
            horizontal que contrata o utiliza la plataforma para su operación.
          </Li>
          <Li>
            <B>Administración:</B> administrador y consejo de la copropiedad, con
            acceso a métricas, auditoría, finanzas y gestión del personal.
          </Li>
          <Li>
            <B>Portería / Vigilante:</B> personal autorizado por la copropiedad
            para registrar ingresos, encomiendas, mensajes y gestionar el
            parqueadero.
          </Li>
          <Li>
            <B>Residente:</B> propietario, tenedor o habitante de una unidad
            privada que usa la plataforma para recibir avisos y autorizar
            visitantes.
          </Li>
          <Li>
            <B>Visitante:</B> tercero cuyo ingreso es autorizado por un
            residente.
          </Li>
          <Li>
            <B>Superadministrador:</B> personal de {LEGAL.brand} que provisiona y
            configura los conjuntos en la plataforma.
          </Li>
        </Ul>
      </Section>

      <Section n={4} title="Registro, cuentas y credenciales">
        <P>
          El acceso a la plataforma requiere credenciales (WhatsApp y PIN para
          residentes; usuario y contraseña para portería y administración).
          Eres responsable de la confidencialidad de tus credenciales y de toda
          actividad realizada con ellas. Debes notificar de inmediato cualquier
          uso no autorizado.
        </P>
        <P>
          El registro de residentes se somete a un proceso de verificación:
          quien se registra queda en estado «pendiente» hasta que la portería o
          la administración de la copropiedad confirme su vínculo con la unidad
          privada. La plataforma aplica bloqueos temporales ante intentos
          fallidos de PIN como medida de seguridad.
        </P>
      </Section>

      <Section n={5} title="Uso permitido y conductas prohibidas">
        <P>Al usar {LEGAL.brand} te obligas a:</P>
        <Ul>
          <Li>
            Usar la plataforma únicamente para fines lícitos y relacionados con
            la gestión legítima de la copropiedad.
          </Li>
          <Li>
            Suministrar información veraz, exacta y actualizada, especialmente
            los datos de contacto y de los visitantes que autorices.
          </Li>
          <Li>
            No suplantar la identidad de otras personas ni registrar unidades o
            visitantes sin autorización.
          </Li>
          <Li>
            No intentar acceder a datos de otros conjuntos, unidades o usuarios,
            ni vulnerar los controles de seguridad, ingeniería inversa o
            saturación del servicio.
          </Li>
          <Li>
            No usar los datos de contacto de residentes o visitantes con fines
            comerciales, publicitarios o distintos a los del control de acceso.
          </Li>
        </Ul>
        <P>
          El incumplimiento faculta a {LEGAL.brand} o a la administración del
          conjunto para suspender o cancelar el acceso, sin perjuicio de las
          acciones legales que correspondan.
        </P>
      </Section>

      <Section n={6} title="Responsabilidad de la copropiedad y del usuario">
        <P>
          Cada copropiedad, a través de su administración, es responsable de
          gestionar los accesos de su personal, verificar la identidad de sus
          residentes, definir sus reglas internas de convivencia y dar un
          tratamiento adecuado a los datos personales de los que dispone. En
          materia de datos personales de residentes, personal y visitantes, la
          copropiedad actúa como <B>Responsable del Tratamiento</B> y {LEGAL.brand}{" "}
          como <B>Encargado</B>, según se detalla en la{" "}
          <a href="/legal/privacidad" className="font-semibold text-blue">
            Política de Tratamiento de Datos Personales
          </a>
          .
        </P>
      </Section>

      <Section n={7} title="Servicios y proveedores de terceros">
        <P>
          La plataforma se integra con servicios de terceros, entre ellos la
          mensajería por WhatsApp para el envío de avisos, y proveedores de
          alojamiento e infraestructura en la nube. El uso de dichos servicios
          se rige también por sus propios términos y políticas. {LEGAL.brand} no
          responde por interrupciones, cambios o fallas atribuibles a esos
          terceros.
        </P>
      </Section>

      <Section n={8} title="Disponibilidad del servicio">
        <P>
          Procuramos mantener la plataforma disponible de forma continua; sin
          embargo, el servicio se presta «tal cual» y «según disponibilidad». No
          garantizamos que sea ininterrumpido o libre de errores, y podremos
          realizar mantenimientos, actualizaciones o suspensiones temporales,
          procurando avisar cuando sea razonablemente posible.
        </P>
      </Section>

      <Section n={9} title="Propiedad intelectual">
        <P>
          El software, la marca «{LEGAL.brand}», el diseño, los logotipos, la
          interfaz y el código son propiedad de {LEGAL.operator.name} o de sus
          licenciantes, y están protegidos por las normas de derecho de autor y
          propiedad industrial (Decisión Andina 486 y Ley 23 de 1982). Estos
          Términos no transfieren ningún derecho de propiedad intelectual: solo
          otorgan una licencia limitada, revocable e intransferible de uso.
        </P>
      </Section>

      <Section n={10} title="Limitación de responsabilidad">
        <P>
          En la medida permitida por la ley, {LEGAL.brand} no será responsable
          por daños indirectos, lucro cesante o perjuicios derivados del uso
          indebido de la plataforma, de la información inexacta suministrada por
          los usuarios, de decisiones de la copropiedad o de fallas de terceros.
          Nada en estos Términos excluye la responsabilidad que no pueda
          limitarse conforme a la ley colombiana, incluida la derivada del
          Estatuto del Consumidor cuando resulte aplicable.
        </P>
      </Section>

      <Section n={11} title="Modificaciones">
        <P>
          Podemos actualizar estos Términos para reflejar cambios legales,
          técnicos o del servicio. La versión vigente será siempre la publicada
          en esta página, con su fecha de actualización. El uso continuado de la
          plataforma tras una modificación implica la aceptación de la nueva
          versión.
        </P>
      </Section>

      <Section n={12} title="Terminación">
        <P>
          Podemos suspender o terminar el acceso ante el incumplimiento de estos
          Términos o por finalización de la relación con la copropiedad. La
          terminación no afecta las obligaciones ya causadas ni el tratamiento
          de datos que deba conservarse por mandato legal.
        </P>
      </Section>

      <Section n={13} title="Ley aplicable y jurisdicción">
        <P>
          Estos Términos se rigen por las leyes de la República de Colombia.
          Cualquier controversia se someterá a los jueces y tribunales
          competentes de Colombia, sin perjuicio de los mecanismos de protección
          al consumidor ante la Superintendencia de Industria y Comercio cuando
          resulten aplicables.
        </P>
      </Section>

      <Section n={14} title="Contacto">
        <Note title="¿Dudas sobre estos términos?">
          Escríbenos a{" "}
          <a
            href={`mailto:${LEGAL.operator.supportEmail}`}
            className="font-semibold text-blue-dark"
          >
            {LEGAL.operator.supportEmail}
          </a>
          {" "}o a la dirección {LEGAL.operator.address}.
        </Note>
      </Section>
    </LegalDoc>
  );
}

// Single source of truth for the identity data that every legal document
// (Términos, Privacidad, Cookies) needs. The operator ("Responsable"/"Encargado"
// según el caso) must review and replace every ⚠ placeholder with the real
// registered company data before publishing. Legal texts read these constants
// so they never drift apart across documents.
export const LEGAL = {
  // Marca comercial visible al usuario final.
  brand: "La Oportunidad",

  // Persona natural o jurídica que opera la plataforma (Encargado del
  // Tratamiento frente a los conjuntos; Responsable de sus propios datos).
  operator: {
    // ⚠ Reemplazar con la razón social registrada.
    name: "[RAZÓN SOCIAL DEL OPERADOR]",
    // ⚠ Reemplazar con el NIT (con dígito de verificación) o la cédula.
    nit: "[NIT / C.C.]",
    // ⚠ Reemplazar con el domicilio de notificaciones.
    address: "[Dirección], [Ciudad], Colombia",
    city: "Bogotá D.C., Colombia",
    // ⚠ Correo del área de protección de datos / habeas data.
    privacyEmail: "privacidad@[dominio].com",
    // ⚠ Correo de soporte / contacto general.
    supportEmail: "soporte@[dominio].com",
    // Sitio/aplicación bajo el que se presta el servicio.
    site: "https://[dominio].com",
  },

  // Fecha de entrada en vigencia / última actualización de los documentos.
  updated: "1 de julio de 2026",

  // Autoridad de control en materia de datos personales en Colombia.
  authority: {
    name: "Superintendencia de Industria y Comercio (SIC)",
    url: "https://www.sic.gov.co",
  },
} as const;

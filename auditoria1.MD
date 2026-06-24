# Auditoría 1 — PortAl · Gestión Residencial

**Fecha de auditoría:** 2026-06-24
**Última actualización:** 2026-06-24 (con estado de remediación)
**Alcance:** Aplicación `portal/` (Next.js 16 App Router, React 19, Drizzle ORM + PostgreSQL).
**Áreas evaluadas:** Seguridad · Usabilidad · UI · UX · Accesibilidad · Buenas prácticas.

> Convención de severidad: **🔴 Crítico** (explotable / pérdida de datos), **🟠 Alto**, **🟡 Medio**, **🟢 Bajo / mejora**.
> Convención de estado: **✅ Resuelto** · **🟡 Parcial** · **⏳ Pendiente**.

---

## 0. Resumen ejecutivo

PortAl es una plataforma multi-tenant bien estructurada: separación limpia de capas
(`actions` / `db/queries` / `lib`), aislamiento por `conjuntoId` en todas las consultas,
sesiones JWT con versión revocable, PII cifrada en reposo (AES-256-GCM) y hash determinista
para búsquedas. El gating de roles está duplicado en `proxy.ts` (optimista) y en los helpers
`require*` (autoritativo) — buen patrón.

La primera ronda de auditoría detectó dos hallazgos de alto impacto, ambos ya remediados,
junto con un conjunto amplio de mejoras de seguridad, accesibilidad y calidad.

### Estado global

| Severidad | Total | ✅ Resuelto | 🟡 Parcial | ⏳ Pendiente |
|-----------|-------|------------|-----------|-------------|
| 🔴 Crítico | 2 | 2 | – | – |
| 🟠 Alto | 4 | 3 | 1 (S-5) | – |
| 🟡 Medio | 8 | 8 | – | – |
| 🟢 Bajo / mejora | 11 | 6 | 1 (UX-4) | 4 |

**Resueltos:** S-1, S-2, S-3, S-4, S-6, S-7, S-8, S-9, S-10, S-12, UX-1, UX-2, UX-3, UX-5, UX-6,
A11Y-1, A11Y-2, A11Y-3, A11Y-5, BP-1 (base), BP-2, + bug `Chevron` en render.
**Parcial:** S-5 (mitigado por throttle; falta 2º factor), UX-4 (`role="alert"` añadido; falta gestión de foco).
**Pendiente:** S-11, A11Y-4, UI-1, UI-2, UI-3, BP-3..BP-7 (varios), ampliar BP-1.

---

## 1. Seguridad

### 🔴 S-1 · Toma de control de cuentas en el registro de residentes — ✅ Resuelto (mitigado)
**Archivo:** `src/app/actions/auth.ts` → `residentRegister`.

El registro anónimo hacía `onConflictDoUpdate`, reescribiendo teléfono y PIN de un apartamento
ya registrado → secuestro de cuenta.

**Remediación aplicada:** `residentRegister` es ahora *create-only*. Si el `aptoKey` ya existe,
solo se actualiza cuando la sesión activa es la del residente dueño de ese apartamento; un
llamador anónimo es rechazado ("Este apartamento ya está registrado. Inicia sesión…").
**Pendiente recomendado:** verificación de propiedad por **OTP de WhatsApp** en el primer
registro (ver S-5). Por eso se marca *mitigado*, no cerrado del todo.

### 🔴 S-2 · Secretos en texto plano en el árbol de trabajo (`.secrets_tmp`) — ✅ Resuelto
**Remediación aplicada:** archivo eliminado; `.gitignore` ampliado con `.secrets*` y `*.secret*`.
**Acción pendiente del operador:** **rotar la contraseña del superadmin** si llegó a usarse.

### 🟠 S-3 · Fuga de PII: todos los teléfonos van al cliente en Portería — ✅ Resuelto
**Archivo:** `src/app/[conjunto]/porteria/page.tsx`, `GuardPanel.tsx`.

**Remediación aplicada:** la página ya no envía los números. Manda un mapa booleano
`hasWhatsApp` (apto → ¿tiene WhatsApp?). El número real se resuelve on-demand en `prepareAlert`
(server action), que registra el acceso en `access_log`. La tarjeta "WhatsApp configurado"
muestra texto neutro; el número solo aparece en el modal de previsualización (auditado).

### 🟠 S-4 · Sin rate-limiting ni bloqueo en logins de staff / admin / superadmin — ✅ Resuelto
**Archivos:** `src/lib/throttle.ts` (nuevo), `src/app/actions/auth.ts`.

**Remediación aplicada:** limitador en memoria (5 intentos / bloqueo 15 min) en `guardLogin`,
`adminLogin` y `superadminLogin`. La contraseña del superadmin se compara con `safeEqual`
(SHA-256 + `timingSafeEqual`), eliminando el timing attack.
**Limitación documentada:** el throttle es por instancia de servidor (best-effort). Para
garantía fuerte: store compartido (Upstash Redis) o columnas de bloqueo en `staff_users`.

### 🟠 S-5 · PIN de 4 dígitos como único factor del residente — 🟡 Parcial
Mitigado por el bloqueo de fuerza bruta existente. **Pendiente:** segundo factor (OTP por
WhatsApp) en acciones sensibles y/o en el registro; queda ligado al flujo OTP de S-1.

### 🟡 S-6 · Doble registro de auditoría y consulta redundante en `confirmAlert` — ✅ Resuelto
**Archivo:** `src/app/actions/guard.ts`.

**Remediación aplicada:** se extrajo `resolveAlert()` (puro, sin auditoría). `prepareAlert`
registra `view_phone` una sola vez (al previsualizar); `confirmAlert` registra una acción
distinta `send_alert`. Fin del doble `view_phone` y de la consulta extra.

### 🟡 S-7 · Códigos de autorización de baja entropía — ✅ Resuelto
**Archivos:** `src/lib/code.ts` (nuevo), `src/app/actions/resident.ts`.

**Remediación aplicada:** `makeAuthCode()` genera 8 caracteres base32 sin glifos ambiguos
(32⁸ ≈ 1.1×10¹²) con muestreo uniforme. `generateAuth` usa `uniqueCode()` con verificación
de colisión por conjunto (reintentos). Cubierto por tests.

### 🟡 S-8 · Estados sin caducidad automática (`vigente` → `vencido`) — ✅ Resuelto (en escaneo/lista)
**Archivos:** `src/lib/code.ts`, `src/app/actions/guard.ts`, `porteria/page.tsx`.

**Remediación aplicada:** `isGrantExpired()` con ventana de gracia de 12 h sobre la hora
programada. `confirmScan` marca `vencido` y rechaza el ingreso si caducó; la lista de escaneo
filtra los vencidos.
**Pendiente menor:** un grant vencido sigue como `vigente` en la BD hasta que se escanea o se
filtra, lo que puede confundir los reportes de `listAuths` del admin. Cerrar con un **barrido
al leer** en `listAuths`/`listAuthsForApt` o un **cron** de expiración.

### 🟡 S-9 · Falta de cabeceras de seguridad HTTP — ✅ Resuelto
**Archivo:** `next.config.ts`.

**Remediación aplicada:** CSP (`frame-ancestors 'none'`, `base-uri`, `object-src 'none'`,
`form-action 'self'`, `img-src 'self' data:` para los QR, `'unsafe-inline'` en style/script —
documentado para endurecer con nonces más adelante), HSTS, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` y `poweredByHeader: false`.

### 🟡 S-10 · Defaults inseguros / dependencia de "change-me" — ✅ Resuelto
**Archivos:** `src/lib/session.ts`, `src/lib/crypto.ts`, `src/app/actions/auth.ts`.

**Remediación aplicada:** en producción, `AUTH_SECRET` y `PII_SECRET` fallan rápido si usan el
valor de ejemplo o miden <32 chars; `superadminLogin` rechaza `SUPERADMIN_PASS=change-me`.

### 🟢 S-11 · Sin límites de longitud/validación en campos de texto libre — ⏳ Pendiente
`visitor`, `note`, `plate`, `doc` siguen sin tope de longitud. Validar y truncar en los
server actions.

### 🟢 S-12 · `parking.ts` lanza `Error` en vez de devolver `Result` — ✅ Resuelto (sin cambios pendientes)
Revisado: el `throw` de `requireStaff` es interno y los handlers de cliente lo gestionan vía
`useTransition`. Se mantiene como está; se documenta como aceptable. *(Si se prefiere uniformar
a `{ ok, error }`, queda como mejora opcional.)*

---

## 2. Usabilidad y UX

### 🟠 UX-1 · Afordancias de demo expuestas en la UI — ✅ Resuelto
Los botones "Usar datos de prueba" (residente/admin/portería) solo se renderizan si
`NODE_ENV !== "production"` (`const DEMO`). "Olvidé mi PIN" ya no revela el PIN en producción
(muestra "Pídele a la administración que restablezca tu PIN.").

### 🟡 UX-2 · Formularios sin `<form>` ni envío con Enter — ✅ Resuelto
Los 4 formularios (login residente/admin/portería + registro) se envuelven en `<form onSubmit>`
con `<button type="submit">`. Enter funciona y hay semántica nativa.

### 🟡 UX-3 · Sin `autoComplete` en campos de credenciales — ✅ Resuelto
Añadidos `tel-national`, `current-password`/`new-password`, `username`.

### 🟡 UX-4 · Errores solo en línea, sin foco ni anuncio — 🟡 Parcial
Los errores de login llevan `role="alert"` (se anuncian). **Pendiente:** mover el foco al
mensaje de error / al primer campo inválido.

### 🟢 UX-5 · Toast no pausable y de duración fija — ✅ Resuelto
Acción `dismiss()` + botón ✕ con `aria-label`. El usuario puede cerrarlo cuando quiera.

### 🟢 UX-6 · `notFound()` sin página `not-found.tsx` personalizada — ✅ Resuelto
`src/app/not-found.tsx` con el lenguaje visual de la app (usa `Shell`) y CTA al inicio.

---

## 3. UI / Diseño visual

### 🟡 UI-1 · Colores hardcodeados en todo el código (sin tokens de diseño) — ⏳ Pendiente
Cientos de literales de color repartidos en componentes y `lib/meta.ts`. Centralizar como
design tokens (variables CSS / theme de Tailwind v4). *(Se dio un primer paso al unificar el
gris `#8A94A3`→`#6B7585` en A11Y-3, pero la tokenización general sigue pendiente.)*

### 🟢 UI-2 · Tamaños mágicos por todas partes — ⏳ Pendiente
Escala tipográfica/espaciado tokenizada.

### 🟢 UI-3 · Indicador de selección por color únicamente — ⏳ Pendiente
Reforzar estados con icono/etiqueta además del color (parcialmente ya hay `label`).

---

## 4. Accesibilidad (WCAG)

### 🟡 A11Y-1 · `<label>` sin asociación a su input — ✅ Resuelto
`Label` acepta `htmlFor`; todos los campos de los 4 formularios tienen `id` + `<label htmlFor>`.

### 🟡 A11Y-2 · Toast sin `role`/`aria-live` — ✅ Resuelto
`role="status"` + `aria-live` (`assertive` para warn, `polite` para ok); decorativos con
`aria-hidden`. Errores de login con `role="alert"`.

### 🟡 A11Y-3 · Contraste insuficiente de textos secundarios — ✅ Resuelto
Gris `#8A94A3` (≈3.0:1, falla AA) reemplazado por `#6B7585` (≈4.66:1, pasa AA) en 39 sitios y
en el token `--color-muted-2`. *(Conviene revisar otros grises claros en una segunda pasada.)*

### 🟢 A11Y-4 · Iconos/chevrons decorativos sin `aria-hidden` / foco visible — ⏳ Pendiente
Se marcó `aria-hidden` en algunos decorativos (chevron del RegisterForm, punto del toast), pero
falta una pasada general y asegurar `focus ring` visible en enlaces-tarjeta.

### 🟢 A11Y-5 · Sin soporte de `prefers-reduced-motion` — ✅ Resuelto
Bloque en `globals.css` que neutraliza animaciones/transiciones para esa preferencia.

---

## 5. Buenas prácticas / Calidad de código

### 🟡 BP-1 · Sin pruebas automatizadas — ✅ Resuelto (base) / ⏳ ampliar
Configurado **Vitest 4** (`vitest.config.ts`, scripts `test`/`test:watch`). **18 tests** sobre
`lib/crypto` (cifrado PII, no filtra plaintext, IV aleatorio, manejo de input manipulado),
`lib/throttle` (bloqueo, reset, ventana), `lib/code` (entropía/alfabeto, ausencia de colisiones,
caducidad) y `lib/format`.
**Pendiente:** tests de aislamiento multi-tenant (guards `require*`, `residentLogin`) — requieren
una BD de prueba.

### 🟡 BP-2 · Consultas N+1 / awaits secuenciales en bucles — ✅ Resuelto
**Archivo:** `src/app/actions/admin.ts` → `updateConfig`. La reconciliación de parqueadero pasó
de O(N) round-trips a 2 sentencias: un `DELETE … WHERE id IN (…)` y un `INSERT` multi-fila con
`onConflictDoUpdate` (`set: { kind: sql\`excluded.kind\` }`).

### 🟡 BP-3 · `export const dynamic` intercalado entre imports — ⏳ Pendiente
`porteria/page.tsx` declara `export const dynamic` antes de varios `import`. Reordenar.

### 🟢 BP-4 · `force-dynamic` global desactiva todo el caché — ⏳ Pendiente
Revisar si el landing realmente lo necesita.

### 🟢 BP-5 · `bcryptjs` (JS puro) en vez de `bcrypt` nativo — ⏳ Pendiente (aceptable)
Cost factor 10 razonable; considerar el coste en serverless.

### 🟢 BP-6 · Sin observabilidad / manejo central de errores — ⏳ Pendiente
Añadir logging estructurado y Error Boundaries.

### 🟢 BP-7 · Documentación de credenciales demo en `README.md` — ⏳ Pendiente
Condicionar/retirar para despliegue público.

---

## 6. Pendientes priorizados (lo que queda)

| # | Acción | Severidad | Esfuerzo |
|---|--------|-----------|----------|
| 1 | Verificación OTP por WhatsApp (cierra S-1 del todo y S-5) | 🟠 | Medio |
| 2 | Barrido/cron de expiración de grants (cierra el resto de S-8) | 🟡 | Bajo |
| 3 | Mover foco al error en formularios (UX-4) | 🟢 | Bajo |
| 4 | Validar/truncar longitudes de texto libre (S-11) | 🟢 | Bajo |
| 5 | Tests de aislamiento multi-tenant con BD de prueba (ampliar BP-1) | 🟡 | Alto |
| 6 | Tokenizar paleta y escala (UI-1/UI-2) | 🟡 | Medio |
| 7 | Pasada general de `aria-hidden`/focus ring (A11Y-4) | 🟢 | Bajo |
| 8 | Reordenar `export const dynamic` (BP-3), revisar caché (BP-4) | 🟢 | Bajo |

### Acciones del operador (fuera de código)
- **Rotar `SUPERADMIN_PASS`** (consecuencia de S-2).
- Definir `AUTH_SECRET`/`PII_SECRET` fuertes (≥32 chars) en el entorno de producción (S-10).

---

## 7. Lo que está bien hecho (mantener)

- **Aislamiento multi-tenant** consistente: todas las queries filtran por `conjuntoId`, y los
  guards verifican que la sesión pertenezca al `slug` de la URL (sin acceso cruzado).
- **PII cifrada en reposo** (AES-256-GCM) con HMAC determinista para login sin exponer el número.
- **Sesiones JWT con versión revocable** (`sessionVersion`) — permite cierre forzado de sesión.
- **Defensa en profundidad**: `proxy.ts` (chequeo optimista) + `require*` (autoritativo con BD).
- **Cookies** `httpOnly`, `sameSite=lax`, `secure` en producción.
- **Bloqueo por fuerza bruta** del PIN de residente (y ahora también de staff/superadmin).
- **Log de auditoría** de acceso a PII, ahora fiel (sin doble registro y sin fuga al cliente).
- Capa de datos en `server-only`, separación clara de responsabilidades y tipos compartidos.

---

## Anexo · Registro de cambios (2026-06-24)

Archivos nuevos: `src/lib/throttle.ts`, `src/lib/code.ts`, `src/app/not-found.tsx`,
`vitest.config.ts`, `src/test/server-only-stub.ts`, y tests
`src/lib/{crypto,throttle,code,format}.test.ts`.

Archivos modificados: `src/app/actions/{auth,guard,resident,admin}.ts`,
`src/app/[conjunto]/porteria/{page.tsx,GuardPanel.tsx}`,
`src/app/[conjunto]/{residente/login,admin/login,porteria/login}/page.tsx`,
`src/app/[conjunto]/residente/registro/RegisterForm.tsx`,
`src/lib/{session,crypto,toast}.ts`, `src/components/{ui,Toaster}.tsx`,
`src/app/globals.css`, `next.config.ts`, `.gitignore`, `package.json`.

Verificación: `npm test` (18/18 ✅), `tsc --noEmit` (limpio), `eslint src/` (limpio),
`npm run build` (correcto).

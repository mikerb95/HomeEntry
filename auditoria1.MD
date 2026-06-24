# Auditoría 1 — PortAl · Gestión Residencial

**Fecha:** 2026-06-24
**Alcance:** Aplicación `portal/` (Next.js 16 App Router, React 19, Drizzle ORM + PostgreSQL).
**Áreas evaluadas:** Seguridad · Usabilidad · UI · UX · Accesibilidad · Buenas prácticas.

> Convención de severidad: **🔴 Crítico** (explotable / pérdida de datos), **🟠 Alto**, **🟡 Medio**, **🟢 Bajo / mejora**.

---

## 0. Resumen ejecutivo

PortAl es una plataforma multi-tenant bien estructurada: separación limpia de capas
(`actions` / `db/queries` / `lib`), aislamiento por `conjuntoId` en todas las consultas,
sesiones JWT con versión revocable, PII cifrada en reposo (AES-256-GCM) y hash determinista
para búsquedas. El gating de roles está duplicado en `proxy.ts` (optimista) y en los helpers
`require*` (autoritativo) — buen patrón.

Sin embargo hay **dos hallazgos de alto impacto** que deben resolverse antes de producción:

1. 🔴 **Toma de control de cuentas vía registro público** (`residentRegister` sobreescribe
   teléfono y PIN de cualquier apartamento sin verificar propiedad).
2. 🟠 **Fuga masiva de PII**: el panel de portería envía al cliente los teléfonos de **todos**
   los residentes, anulando el log de auditoría `view_phone`.

Además quedan afordancias de demo (auto-rellenar credenciales, "tu PIN es 1234"), ausencia de
verificación por OTP, falta de rate-limiting en logins de staff/superadmin, y carencias
sistemáticas de accesibilidad en los formularios.

| Severidad | Cantidad |
|-----------|----------|
| 🔴 Crítico | 2 |
| 🟠 Alto | 4 |
| 🟡 Medio | 8 |
| 🟢 Bajo / mejora | 11 |

---

## 1. Seguridad

### 🔴 S-1 · Toma de control de cuentas en el registro de residentes
**Archivo:** `src/app/actions/auth.ts` → `residentRegister`; ruta `registro` marcada como pública en `src/proxy.ts` (`PUBLIC_SUB`).

El registro es totalmente anónimo y hace `onConflictDoUpdate` sobre `(conjuntoId, aptoKey)`,
reescribiendo `phoneEnc`, `phoneHash` y `pinHash` de un apartamento **ya registrado**:

```ts
.onConflictDoUpdate({
  target: [residents.conjuntoId, residents.aptoKey],
  set: { phoneEnc, phoneHash, pinHash, tower, apt },
});
```

**Impacto:** cualquiera que conozca el slug del conjunto (visible en el QR/enlace público)
puede seleccionar Torre + Apto de otra persona, poner su propio celular y PIN, y **secuestrar
la cuenta del residente**. A partir de ahí recibe sus notificaciones y puede autorizar ingresos
a su apartamento. No se verifica la propiedad del apartamento ni del número de teléfono.

**Recomendación:**
- Introducir **verificación OTP por WhatsApp/SMS** antes de crear o actualizar el residente
  (el proyecto ya tiene la integración de WhatsApp Cloud API para enviar el código).
- Tratar el registro como *create-only*: si el `aptoKey` ya existe, **no** sobreescribir; en su
  lugar exigir flujo de "recuperación" autenticado (OTP al número actual) o intervención del admin.
- Alternativa mínima: requerir un **código de invitación por apartamento** emitido por la
  administración.

### 🔴 S-2 · Secretos en texto plano en el árbol de trabajo (`.secrets_tmp`)
**Archivo:** `portal/.secrets_tmp`

Contiene lo que parecen `AUTH_SECRET`/`PII_SECRET` y la **contraseña del superadmin en claro**:

```
73546a40608025f8cc2042d7aa2f841b0a7420bfd6ed275505ebbb46698f561f
superadmin
NvInoWtjIQUXD7rdbn6Y
```

Aunque hoy no está trackeado por git, **no coincide con ningún patrón de `.gitignore`**
(`.env*` no lo cubre), por lo que un `git add .` lo subiría. Es un riesgo de exposición de
credenciales de producción.

**Recomendación:** eliminar el archivo (`rm .secrets_tmp`), **rotar la contraseña del superadmin**
si llegó a usarse, y guardar secretos solo en gestores (Vercel env vars / vault). Añadir
`.secrets_tmp` y `*.secret*` al `.gitignore`.

### 🟠 S-3 · Fuga de PII: todos los teléfonos van al cliente en Portería
**Archivo:** `src/app/[conjunto]/porteria/page.tsx`

```ts
const registry: Record<string, string> = {};
residents.forEach((r) => (registry[r.aptoKey] = r.phone)); // teléfonos en claro
...
<GuardPanel ... registry={registry} />
```

Se descifran y se envían al navegador del vigilante los teléfonos de **todos** los residentes,
en cada carga de la página. Esto:
- Expone PII más allá del "need-to-know" (toda la base queda en el HTML/JS del cliente).
- **Anula el log de auditoría** `view_phone` de `prepareAlert`: el dato ya está en el cliente
  sin pasar por el server action que registra el acceso.

**Recomendación:** no enviar `registry`. Resolver el teléfono **solo bajo demanda** dentro de
`prepareAlert` (server action), que ya escribe en `access_log`. El cliente solo necesita saber
si un apartamento *tiene* WhatsApp registrado (un booleano), no el número.

### 🟠 S-4 · Sin rate-limiting ni bloqueo en logins de staff / admin / superadmin
**Archivo:** `src/app/actions/auth.ts` (`guardLogin`, `adminLogin`, `superadminLogin`).

Solo el login de residente tiene `MAX_FAILED`/`lockedUntil`. Los logins de portería,
administración y superadmin permiten **fuerza bruta ilimitada**. El superadmin es el más
sensible (controla todos los conjuntos) y además compara la contraseña con `pass !== envPass`
(comparación **no constante en tiempo**, susceptible a timing attacks).

**Recomendación:** aplicar la misma estrategia de bloqueo por intentos a staff/superadmin
(o un rate-limit por IP con Vercel Firewall / Upstash). Comparar la contraseña del superadmin
con `crypto.timingSafeEqual` o, mejor, almacenar un hash bcrypt en vez de texto plano en env.

### 🟠 S-5 · PIN de 4 dígitos como único factor del residente
El residente accede solo con celular + PIN numérico de 4 dígitos (10⁴ combinaciones). El bloqueo
tras 5 intentos mitiga, pero sigue siendo débil para autorizar ingresos físicos. Sin segundo factor.

**Recomendación:** OTP por WhatsApp como segundo factor en acciones sensibles (autorizar ingreso),
o aumentar a 6 dígitos. Combinar con S-1 (verificación de propiedad).

### 🟡 S-6 · Doble registro de auditoría y consulta redundante en `confirmAlert`
**Archivo:** `src/app/actions/guard.ts`

`confirmAlert` llama a `prepareAlert`, que **vuelve** a leer el residente y a escribir un
`view_phone` en `access_log`. Resultado: cada envío genera **dos** entradas de auditoría y una
consulta de BD extra. Distorsiona el log de cumplimiento.

**Recomendación:** factorizar la lógica común en una función interna sin efectos de auditoría,
y registrar `view_phone` una sola vez.

### 🟡 S-7 · Códigos de autorización de baja entropía
**Archivo:** `src/app/actions/resident.ts` → `makeCode()` genera 4 caracteres `[A-Z0-9]`
(con `padEnd(4,'X')`, reduciendo aún más el espacio). El QR solo codifica `PORTAL:<code>`.

El espacio efectivo es pequeño (~36⁴ en el mejor caso, menos por el relleno con `X`) y no hay
verificación de unicidad ni expiración real en `confirmScan`. Aunque `confirmScan` opera por
`authId` (UUID), `getAuthByCode` permite resolver por código y podría habilitar adivinación.

**Recomendación:** usar un código de mayor entropía (p. ej. 8+ caracteres base32 sin relleno),
garantizar unicidad por conjunto y validar expiración (`whenTs`/estado `vencido`) al escanear.

### 🟡 S-8 · Estados sin caducidad automática (`vigente` → `vencido`)
No hay proceso que marque autorizaciones como `vencido` cuando pasa `whenTs`. Una autorización
"vigente" permanece válida indefinidamente para `confirmScan`.

**Recomendación:** validar `whenTs` (ventana de tolerancia) en `confirmScan`, o un cron que
expire las vencidas.

### 🟡 S-9 · Falta de cabeceras de seguridad HTTP
**Archivo:** `next.config.ts` está vacío. No hay CSP, `Strict-Transport-Security`,
`X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, ni `Referrer-Policy`.

**Recomendación:** añadir `headers()` en `next.config.ts` con una CSP estricta (los colores
inline y `next/font` requieren ajustar `style-src`), HSTS, `X-Frame-Options: DENY` y
`Referrer-Policy: strict-origin-when-cross-origin`.

### 🟡 S-10 · Defaults inseguros en `.env.example` / dependencia de "change-me"
`AUTH_SECRET`, `PII_SECRET`, `SUPERADMIN_PASS` traen valores `change-me-...`. No hay validación
en arranque que impida correr en producción con los valores por defecto.

**Recomendación:** validar en el arranque (o en un módulo de config) que los secretos no sean los
de ejemplo y tengan longitud mínima; fallar rápido en `production`.

### 🟢 S-11 · Sin límites de longitud/validación en campos de texto libre
`visitor`, `note`, `plate`, `doc` no tienen tope de longitud. React escapa el render, pero los
mensajes de WhatsApp y los eventos pueden recibir cargas muy largas o saltos de línea.

**Recomendación:** validar y truncar longitudes en los server actions.

### 🟢 S-12 · `parking.ts` lanza `Error` en vez de devolver `Result`
`requireStaff` hace `throw new Error("No autorizado")` mientras el resto del código usa
`{ ok, error }`. Inconsistencia que puede producir errores 500 no controlados en el cliente.

---

## 2. Usabilidad y UX

### 🟠 UX-1 · Afordancias de demo expuestas en la UI
**Archivos:** `residente/login/page.tsx` (botón "Usar datos de prueba (3014567890 · PIN 1234)",
y "Olvidé mi PIN" → toast *"Demo: tu PIN es 1234"*), `README.md` (credenciales demo).

En producción esto **revela credenciales** y degrada la percepción de seguridad. "Olvidé mi PIN"
no recupera nada realmente.

**Recomendación:** ocultar tras `NODE_ENV !== 'production'`, e implementar un flujo real de
recuperación de PIN (OTP por WhatsApp).

### 🟡 UX-2 · Formularios sin `<form>` ni envío con Enter
Los logins/registro usan `<div>` + `<button onClick>`. No se puede enviar con **Enter**, no hay
validación nativa del navegador, ni `type="submit"`. Es un patrón frustrante en móvil/teclado.

**Recomendación:** envolver en `<form onSubmit>` y usar `<button type="submit">`. Funciona bien
con `useTransition` y server actions.

### 🟡 UX-3 · Sin `autoComplete` en campos de credenciales
Falta `autoComplete="tel"`, `"current-password"`, `"one-time-code"`, `"username"`. Los gestores
de contraseñas y el autocompletado de OTP no funcionan.

### 🟡 UX-4 · Errores solo en línea, sin foco ni anuncio
Los errores se muestran como texto pero no se mueve el foco al mensaje ni se anuncian a lectores
de pantalla (ver A11Y-2). El usuario con error puede no percibir el cambio.

### 🟢 UX-5 · Toast no pausable y de duración fija (2600 ms)
**Archivo:** `src/lib/toast.ts`. Mensajes importantes ("Contacto guardado") desaparecen solos sin
posibilidad de releer ni cerrar manualmente.

### 🟢 UX-6 · `notFound()` sin página `not-found.tsx` personalizada
Un slug inexistente cae en el 404 por defecto, fuera del lenguaje visual de la app.

---

## 3. UI / Diseño visual

### 🟡 UI-1 · Colores hardcodeados en todo el código (sin tokens de diseño)
Cientos de literales `#2F6BFF`, `#6B7585`, `#E3E8EF`, etc., repartidos en componentes y en
`lib/meta.ts`. Dificulta mantener consistencia, soportar **tema oscuro** y aplicar una CSP estricta.

**Recomendación:** centralizar la paleta como design tokens (variables CSS / theme de Tailwind v4
`@theme`) y referenciarlos por nombre.

### 🟢 UI-2 · Tamaños mágicos por todas partes
Valores como `text-[13.5px]`, `rounded-[20px]`, `p-[22px]` son fieles al prototipo pero frágiles.
Conviene una escala tipográfica/espaciado tokenizada.

### 🟢 UI-3 · Indicador de selección por color únicamente
Estados de parqueadero / tipos de evento se distinguen casi solo por color (verde/rojo/ámbar).
Añadir icono o etiqueta de texto ayuda a daltónicos (parcialmente ya hay `label`).

---

## 4. Accesibilidad (WCAG)

### 🟡 A11Y-1 · `<label>` sin asociación a su input
**Archivo:** `src/components/ui.tsx` → `Label` renderiza `<label>` sin `htmlFor`, y los inputs no
tienen `id`. No hay vínculo programático etiqueta↔campo; tampoco `aria-label` en los inputs sueltos
de los formularios (login residente, register, paneles).

**Recomendación:** `htmlFor`/`id` o anidar el input dentro del `<label>`.

### 🟡 A11Y-2 · Toast sin `role`/`aria-live`
**Archivo:** `src/components/Toaster.tsx`. Los lectores de pantalla no anuncian los toasts.

**Recomendación:** `role="status"` + `aria-live="polite"` (o `assertive` para `warn`).

### 🟡 A11Y-3 · Contraste insuficiente de textos secundarios
Grises como `#8A94A3` y `#9...` sobre blanco/`#F6F8FB` rondan o caen por debajo del mínimo AA
(4.5:1) para texto pequeño (≤14px). Afecta placeholders, subtítulos y enlaces "Olvidé mi PIN".

**Recomendación:** verificar con un comprobador de contraste y oscurecer los grises de texto.

### 🟢 A11Y-4 · Iconos/chevrons decorativos sin `aria-hidden`
El `▾` de los selects y los iconos SVG deberían marcarse `aria-hidden="true"` para no ensuciar la
lectura. Verificar también foco visible en enlaces-tarjeta (`hover:-translate-y` no implica focus ring).

### 🟢 A11Y-5 · Sin soporte de `prefers-reduced-motion`
Animaciones `animate-pa-in`/`animate-pa-up` no se desactivan para usuarios sensibles al movimiento.

---

## 5. Buenas prácticas / Calidad de código

### 🟡 BP-1 · Sin pruebas automatizadas
No hay tests (unitarios ni de integración) para la lógica crítica: auth, cifrado PII, gating de
roles, reconciliación de parqueadero. Es el riesgo de regresión más alto dada la sensibilidad.

**Recomendación:** priorizar tests de `lib/crypto`, helpers `require*`, `residentLogin`
(bloqueo), y el aislamiento por `conjuntoId`.

### 🟡 BP-2 · Consultas N+1 / awaits secuenciales en bucles
**Archivo:** `src/app/actions/admin.ts` → `updateConfig` borra e inserta spots **uno por uno**
dentro de `for` con `await`. Igual patrón al generar QRs (`Promise.all` sí, ok) pero la
reconciliación de parqueadero escala mal con muchos cupos.

**Recomendación:** operaciones en lote (un `delete ... where id in (...)` y un `insert` múltiple)
o transacción.

### 🟡 BP-3 · `export const dynamic` intercalado entre imports
**Archivo:** `src/app/[conjunto]/porteria/page.tsx` declara `export const dynamic` **antes** de
varios `import`. Funciona por hoisting pero es confuso y algunos linters lo marcan.

### 🟢 BP-4 · `force-dynamic` global desactiva todo el caché
Casi todas las páginas son `force-dynamic`. Correcto para datos en vivo, pero conviene revisar si
el landing (`/`, `/[conjunto]`) realmente lo necesita; podrían cachearse para mejor rendimiento.

### 🟢 BP-5 · `bcryptjs` (JS puro) en vez de `bcrypt` nativo
Más lento; aceptable en serverless pero considerar el coste. Cost factor 10 es razonable.

### 🟢 BP-6 · Sin observabilidad / manejo central de errores
Los `catch {}` silenciosos (`verifySession`, `decryptPII`, `verifySecret`) son correctos para no
filtrar, pero no hay logging estructurado de fallos ni Error Boundaries de React.

### 🟢 BP-7 · Documentación de credenciales demo en `README.md`
Útil en desarrollo; recordar retirarlo o condicionarlo para el despliegue público.

---

## 6. Plan de remediación priorizado

| # | Acción | Severidad | Esfuerzo |
|---|--------|-----------|----------|
| 1 | Cerrar registro como toma de control: OTP + create-only (**S-1**) | 🔴 | Medio |
| 2 | Eliminar `.secrets_tmp`, rotar superadmin, ignorar patrón (**S-2**) | 🔴 | Bajo |
| 3 | Dejar de enviar `registry` al cliente; teléfono on-demand (**S-3**) | 🟠 | Bajo |
| 4 | Rate-limit + comparación constante en logins staff/superadmin (**S-4**) | 🟠 | Medio |
| 5 | Quitar afordancias de demo en producción (**UX-1**) | 🟠 | Bajo |
| 6 | Arreglar doble auditoría en `confirmAlert` (**S-6**) | 🟡 | Bajo |
| 7 | Cabeceras de seguridad + validación de secretos en arranque (**S-9, S-10**) | 🟡 | Bajo |
| 8 | `<form>` + `autoComplete` + labels asociados + aria-live (**UX-2/3, A11Y-1/2**) | 🟡 | Medio |
| 9 | Códigos de autorización con más entropía y caducidad (**S-7, S-8**) | 🟡 | Medio |
| 10 | Suite de tests de seguridad/aislamiento (**BP-1**) | 🟡 | Alto |

---

## 7. Lo que está bien hecho (mantener)

- **Aislamiento multi-tenant** consistente: todas las queries filtran por `conjuntoId`, y los
  guards verifican que la sesión pertenezca al `slug` de la URL (sin acceso cruzado).
- **PII cifrada en reposo** (AES-256-GCM) con HMAC determinista para login sin exponer el número.
- **Sesiones JWT con versión revocable** (`sessionVersion`) — permite cierre forzado de sesión.
- **Defensa en profundidad**: `proxy.ts` (chequeo optimista) + `require*` (autoritativo con BD).
- **Cookies** `httpOnly`, `sameSite=lax`, `secure` en producción.
- **Bloqueo por fuerza bruta** del PIN de residente.
- **Log de auditoría** de acceso a PII (la intención es correcta; falta cerrar S-3/S-6).
- Capa de datos en `server-only`, separación clara de responsabilidades y tipos compartidos.
```

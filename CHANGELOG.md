# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Aún no se publican versiones etiquetadas, por lo que los cambios se agrupan por fecha.

## [Sin publicar]

### 2026-07-01

#### Añadido
- Módulo de **propietarios (owners)**: tablas `owners`, `ownerUnits`, `notices` y `serviceRequests`; login por teléfono y PIN con bloqueo de cuenta; `OwnerDashboard` y `OwnerUnitPage` con unidades, cargos, avisos y solicitudes.
- Función `requireOwner` y control de acceso a la consola de propietarios en el proxy.
- Componentes de documentos legales y constantes de configuración legal para datos de identidad.
- **Registro con aprobación**: estado de aprobación en `residents`, componente `PendingResidents` y pestaña "solicitudes" en los paneles de vigilante y administrador; funciones `approve`/`reject` y `listPendingResidents`; enmascaramiento de teléfono (`maskPhone`) para el flujo de aprobación.
- Tabla `cities` y referencia `city_code` en `conjuntos`; selección de ciudad en `CreateConjuntoForm`.
- Generación de código único de conjunto (`makeConjuntoCode`, `getConjuntoByCode`, `reserveConjuntoCode`) con pruebas.
- Scripts `db:drop` y `db:reset` para gestión de la base de datos local.
- Botón demo para autocompletar credenciales de superadmin.

#### Cambiado
- Refactor del registro: se elimina el paso de OTP e integra el registro de residente directamente.
- Mejoras de layout y accesibilidad en el componente `Chrome`.
- Actualización de precios de los planes Básico y Profesional en la propuesta económica.

### 2026-06-30

#### Añadido
- **Módulo financiero**: tablas `vendors`, `charges`, `payments` y `expenses`; funciones de balance y mora (`computeAptBalance`, `computeConjuntoSummary`) con pruebas; modales `PaymentModal` y `ExpenseModal`; configuración de tasa de mora y días de gracia por conjunto.
- **Gestión de vigilantes** en `AdminPanel`: crear, eliminar y resetear contraseña; nueva pestaña "vigilantes".
- Visor de parqueo para vigilantes con búsqueda, filtro "solo libres" y estado vacío.
- Página de precios / `ProposalPage` con planes por niveles y tabla comparativa.
- Componente `RoleLanding` para selección de rol y página pública de ayuda.

### 2026-06-27

#### Añadido
- **Web Push (PWA)**: configuración VAPID, service worker, manifest, tabla `pushSubscriptions` y componente `PushOptIn`; envío de push en paralelo a las alertas de WhatsApp y botón de prueba.
- Componente `GuardNotifications` con alertas en tiempo real (badge, sonido y vibración); función `listAuthsSince`.
- Validación y normalización de placas (`isValidPlate`, `normalizePlate`) con soporte para vehículos extranjeros en `AuthorizeForm` y `ParkingModal`, con pruebas.

### 2026-06-24

#### Añadido
- Verificación de registro de residente vía OTP por WhatsApp.
- Mecanismo de *throttle* de login para prevenir ataques de fuerza bruta.
- Pruebas unitarias con **vitest** (cifrado, throttling, `makeAuthCode`, `isGrantExpired`).
- Reporte de auditoría de seguridad y usabilidad.
- Página 404 y funcionalidad para descartar notificaciones toast.

#### Cambiado
- Los teléfonos de residentes solo exponen la disponibilidad de WhatsApp (`hasWhatsApp`); refactor de formularios de login a componentes controlados.

#### Seguridad
- `.gitignore` actualizado para excluir secretos; eliminación de archivo temporal de secretos.

### 2026-06-20

#### Añadido
- Arquitectura **multi-conjunto** basada en `slug`: proxy con `ROLE_BY_AREA`/`PUBLIC_SUB`, verificación de conjunto y comprobación de versión en los guards de acceso.
- `SuperadminPage`, `SuperadminLoginPage` y `CreateConjuntoForm` para gestión de conjuntos; función `createConjunto` con validación y creación de parqueaderos.
- Cifrado simétrico y hashing para PII sensible; *seeding* con integración de conjunto y cifrado de PII.

### 2026-06-19

#### Añadido
- Base del proyecto sobre Next.js: esquema de base de datos, conexión con Drizzle ORM + PostgreSQL, `docker-compose` y scripts de DB (push, generate, seed, reset).
- Gestión de sesiones con cookies y verificación de rol; hashing de contraseñas con bcrypt.
- Autenticación de residente, vigilante y administrador; proxy de control de acceso basado en roles.
- Paneles `GuardPanel`, `AdminPanel` y dashboard de residente; `AuthorizeForm` con generación de QR; `ParkingModal` para asignación de parqueo.
- Mensajería por WhatsApp; sistema de notificaciones toast con Zustand; componentes `Shell`, `Chrome` y `Toaster`.
- Utilidades de formato (fechas, horas, teléfonos) y metadatos visuales para parqueo y eventos.

### 2026-06-18

#### Añadido
- Commit inicial (Create Next App).

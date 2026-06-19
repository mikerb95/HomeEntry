# PortAl · Gestión Residencial

Implementación del handoff de Claude Design (*Diseño de cuatro portales navegables*):
gestión de portería residencial conectada por WhatsApp, con cuatro portales —
**Residente**, **Portería/Vigilante** y **Administración**, más un **lanzador** de demo.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (port pixel-perfecto del diseño)
- **PostgreSQL** + **Drizzle ORM** (`postgres-js`)
- Auth por **sesión JWT** en cookie httpOnly (`jose`), PIN/claves con **bcrypt**
- **WhatsApp**: Meta Cloud API cuando hay credenciales; si no, link `wa.me` (como el prototipo)
- QR reales generados en el servidor (`qrcode`)

## Puesta en marcha

```bash
cp .env.example .env        # ajusta DATABASE_URL y AUTH_SECRET
docker compose up -d        # Postgres local en :55432 (opcional)
npm install
npm run db:push             # crea el esquema
npm run db:seed             # carga los datos demo del prototipo
npm run dev                 # http://localhost:3000
```

## Credenciales demo

| Portal         | Usuario / WhatsApp | Clave / PIN |
| -------------- | ------------------ | ----------- |
| Residente      | `3014567890`       | `1234`      |
| Portería       | `portería`         | `1234`      |
| Administración | `admin`            | `admin`     |

## Rutas

- `/` — lanzador
- `/residente/login`, `/residente/registro`, `/residente`, `/residente/autorizar`
- `/porteria/login`, `/porteria` (tabs: Portería · Parqueadero · Escanear QR)
- `/admin/login`, `/admin` (tabs: Dashboard · Parqueadero · Auditoría)

El gating de auth por rol vive en `src/proxy.ts` (convención `proxy` de Next 16,
antes `middleware`).

## Scripts de base de datos

- `npm run db:push` — aplica el esquema (`drizzle-kit push`)
- `npm run db:seed` — reseed idempotente con los datos del prototipo
- `npm run db:generate` — genera migraciones SQL

## WhatsApp real

Define `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` (Meta Cloud API) para enviar los
avisos de portería directamente. Sin ellos, la portería abre un enlace `wa.me`
con el mensaje prellenado, igual que el prototipo.

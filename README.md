# Gestión Residencial

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (port pixel-perfecto del diseño)
- **PostgreSQL** + **Drizzle ORM** (`postgres-js`)
- Auth por **sesión JWT** en cookie httpOnly (`jose`), PIN/claves con **bcrypt**
- **WhatsApp**: Meta Cloud API cuando hay credenciales; si no, link `wa.me` (como el prototipo)
- QR reales generados en el servidor (`qrcode`)


El gating de auth por rol vive en `src/proxy.ts` (convención `proxy` de Next 16,
antes `middleware`).

## Licencia

Software propietario — **todos los derechos reservados**. Este repositorio es
público solo para visualización; no se concede ningún derecho de uso, copia,
modificación ni distribución. Ver [`LICENSE`](./LICENSE).


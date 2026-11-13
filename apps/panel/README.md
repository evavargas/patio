# apps/panel

Panel de moderators y administrators. React 19, Vite, Tailwind v4 con los tokens de `@patio/theme`, React Router, TanStack Query, Zustand (solo sesión), i18next. Contexto: `docs/context/06-panel-frontend.md`.

## Comandos

- `pnpm dev:panel`: Vite en http://localhost:5173. Proxy de `/v1` a `http://127.0.0.1:8080` (levantar `pnpm db:up` y `pnpm dev:api`). El primer administrator se crea con `pnpm --filter @patio/api create-admin`.
- `pnpm --filter @patio/panel typecheck | build | test`.
- En producción, `VITE_API_URL` (origen de la API, sin barra final) y `public/_headers` con la CSP.

## Dónde agregar cosas

- Una vista nueva: carpeta en `src/features/<vista>/`, y reemplazar su `ViewPlaceholderPage` en `src/app/router.tsx`. Rol y menú en `src/app/nav.ts`.
- Un endpoint: una función en `src/api/panel-api.ts` con tipos de `@patio/contracts` (solo `import type`).
- Textos: claves en `src/i18n/locales/es-UY.json` y `en.json` (una prueba exige las mismas claves). Nada de cadenas dentro de componentes.
- Colores, tamaños, radios y sombras: solo clases de tokens (`bg-primary`, `rounded-md`, `text-text-muted`). El lint rechaza colores y `px` literales.

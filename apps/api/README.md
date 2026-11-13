# apps/api

API de Patio (NestJS 12, un solo servicio modular). Hoy existen `platform` (`GET /v1/healthz`, sin base), `database` (conexión a MongoDB), `word-filter` (`GET /v1/banned-words` y validación de apodos), `auth` (funciones puras: alfabeto, ID, token, código, hashes), `players`, `groups` (solo leer un código), `rate-limit`, `membership` (`POST /v1/players`), `accounts` (autenticación y cuentas del panel), `challenges`, `stats` y `panel` (superficie HTTP `/v1/panel/*`). Necesita Mongo local: `pnpm db:up` en la raíz.

## Comandos

- `pnpm dev:api`: compila y levanta en `PORT` (8080 por defecto). Sin recarga en caliente.
- `pnpm --filter @patio/api test | typecheck | build`.
- `pnpm --filter @patio/api create-admin`: crea el primer administrator (ver abajo).
- `pnpm db:seed` (raíz) o `pnpm --filter @patio/api seed`: datos dummy de desarrollo (ver abajo).

## Variables de entorno (validadas al arrancar; si alguna es inválida el proceso termina con código 1)

| Variable | Defecto | Notas |
| --- | --- | --- |
| `PORT` | `8080` | 1 a 65535 |
| `DEFAULT_TIME_ZONE` | `America/Montevideo` | zona IANA |
| `NODE_ENV` | ausente | `development` o `test` habilitan los valores por defecto de Mongo. `pnpm dev:api` lo fija en `development` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` solo con `NODE_ENV` development/test | `mongodb://` o `mongodb+srv://`. Obligatoria en producción. Nunca se imprime |
| `MONGODB_DB` | `patio_dev` solo con `NODE_ENV` development/test | letras, números, `_` y `-`, hasta 38. Obligatoria en producción |
| `MONGODB_TEST_URI` | `mongodb://127.0.0.1:27017` | solo pruebas de integración; la base es `patio_test_<aleatorio>` y se borra al terminar |
| `RECOVERY_HMAC_SECRET` | valor falso de desarrollo solo con `NODE_ENV` development/test | Obligatoria en producción, mínimo 32 caracteres. Nunca se imprime |
| `JWT_SECRET` | valor falso de desarrollo solo con `NODE_ENV` development/test | Firma de los access tokens del panel (HS256). Obligatoria en producción, mínimo 32 caracteres y distinta de `RECOVERY_HMAC_SECRET`. Nunca se imprime |
| `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_LOGIN_WINDOW_SECONDS` | `10`, `900` | Login del panel por IP y correo; el cambio de contraseña usa el mismo valor por cuenta (sin medir) |
| `TRUST_PROXY_HOPS` | `0` | Saltos de proxy de confianza para leer la IP en `X-Forwarded-For` (0 a 5). 0 = se ignora la cabecera. En Cloud Run, `1` (por verificar) |
| `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_REGISTER_WINDOW_SECONDS` | `20`, `3600` | Registro por IP (sin medir) |
| `RATE_LIMIT_RECOVER_MAX`, `RATE_LIMIT_RECOVER_WINDOW_SECONDS` | `100`, `3600` | Recuperación con código por IP; cuenta TODO pedido, también los inválidos (sin medir) |
| `RATE_LIMIT_GROUP_CODE_MAX`, `RATE_LIMIT_GROUP_CODE_WINDOW_SECONDS` | `100`, `3600` | Códigos de grupo inexistentes por IP (sin medir) |
| `PANEL_URL` | `http://localhost:5173` solo con `NODE_ENV` development/test | Origen exacto del panel; arma el enlace `${PANEL_URL}/accept-invitation?token=...`. Obligatoria en producción |
| `SMTP_HOST`, `SMTP_PORT` | `smtp.gmail.com`, `465` | Correo de invitación (Gmail SMTP). Puerto 465 = TLS directo |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | vacías | Obligatorias en producción (las tres juntas). En development/test, si faltan las tres, el envío se OMITE. Con Gmail, `SMTP_PASSWORD` es una "contraseña de aplicación". Nunca se imprimen ni se registran |
| `CORS_ORIGINS` | vacío (ningún origen) | lista separada por comas de orígenes exactos (`https://host[:puerto]`). El comodín `*` se rechaza |

## Crear el primer administrator

Se hace una vez al desplegar, con las mismas variables de entorno que la API (`MONGODB_URI`, `MONGODB_DB`, ...; en desarrollo basta `NODE_ENV=development`). Compila y crea la cuenta con `role: administrator` y `mustChangePassword: true`: en el primer ingreso la única operación permitida es cambiar la contraseña.

```
# Recomendado: en una terminal, pregunta el correo y la contraseña (sin eco, la pide dos veces)
NODE_ENV=development pnpm --filter @patio/api create-admin

# Sin terminal (por ejemplo desde un secreto del entorno de despliegue)
PATIO_ADMIN_EMAIL=... PATIO_ADMIN_PASSWORD=... pnpm --filter @patio/api create-admin
```

Ni el correo ni la contraseña se imprimen ni se registran. La contraseña tiene de 15 a 128 caracteres. Si ya existe una cuenta con ese correo termina con código 1 y el mensaje "Ya existe una cuenta con ese correo." sin tocar nada. Pasarla por variable de entorno la deja en el historial de la terminal si se escribe a mano: preferí el modo interactivo.

## .env.example

La herramienta de esta sesión no dejó crear `.env.example` en la raíz (regla de permisos). Las variables están todas en la tabla de arriba; copiala a un `.env.example` con valores vacíos o falsos. `.env` real nunca va al repo.

## Datos dummy de desarrollo

`pnpm db:seed` carga en `patio_dev` (Mongo local, `pnpm db:up`): 1 administrator, 1 moderator, 3 grupos (códigos `TERCER`, `SEXTAS`, `NUBES3`), 12 players con apodos inocentes, 10 desafíos de las tres mecánicas (variantes de los ejemplos de `packages/contracts`), un set publicado para HOY del grupo Tercero A y otro general, un borrador para mañana, sets y logros de los últimos 7 días, reglas de prueba (3 dificultades, 4 reglas de nivel) y 3 palabras prohibidas de prueba. Se niega a correr si `NODE_ENV` no es `development`, si la base no es `patio_dev` o si la URI no es local. Es idempotente: ids fijos y upserts; los sets, accesos y logros de los últimos 7 días se regeneran en cada corrida (el puntaje, los conteos y el nivel de los players dummy se recalculan desde ellos).

Credenciales de DESARROLLO (fijas, sin `mustChangePassword`; la contraseña se restablece en cada corrida; no sirven fuera de tu máquina):

| Rol | Correo | Contraseña |
| --- | --- | --- |
| administrator | `admin@patio.local` | `patio-desarrollo-admin` |
| moderator | `docente@patio.local` | `patio-desarrollo-docente` |

El moderator es dueño de `Tercero A` y `Sexto B`; `Taller libre` solo lo maneja el administrator. Código de recuperación del player `Sol` (para probar `/v1/players/recover`): lo imprime el seed.

## Panel: rutas

Todas bajo `/v1/panel`, con `Authorization: Bearer <access token>`. `A` = solo administrator. Listas largas con `?cursor=&limit=`. Las eliminaciones piden `?confirm=true` (sin eso responden `CONFIRMATION_REQUIRED`) y cada una tiene un `GET .../deletion-impact` que dice cuántos datos afecta.

| Recurso | Rutas |
| --- | --- |
| Grupos | `GET/POST /groups`, `PATCH /groups/:id`, `POST /groups/:id/regenerate-code`, A: `GET .../deletion-impact`, `DELETE /groups/:id` |
| Players | `GET /players` (`groupId` o `none`, `level`, `inactiveDays`), `GET /players/:id`, `PATCH /players/:id` (mover), `POST /players/move` (lote, hasta 50), `POST /players/:id/reissue-recovery`, A: `PATCH .../nickname`, `GET .../deletion-impact`, `DELETE` |
| Desafíos | `GET/POST /challenges`, `GET/PUT /challenges/:id` (editar: autor y A), `POST .../duplicate`, `POST .../archive` |
| Sets del día | `GET /day-sets?from&to&groupId`, `GET /day-sets/:id`, `PUT /day-sets`, `POST .../publish`, `POST .../unpublish`, A: `GET .../deletion-impact`, `DELETE` |
| Reglas y límites | `GET /rules` (ambos roles), A: `PUT /rules`, `GET/PUT /limits`, `GET/PUT /banned-words` |
| Cuentas (A) | `GET/POST /accounts`, `PATCH /accounts/:id`, `POST .../reset-password`, `POST /accounts/invitations`, `GET .../deletion-impact`, `DELETE` |
| Estadísticas | `GET /stats/overview|challenges|registrations|groups|rankings` (`from`, `to`, `groupId`; llegan hasta AYER) |
| Auth (público) | `POST /auth/accept-invitation` |

Invitación: el administrator invita un correo; la API guarda solo el hash del token (vence a los 7 días) y manda el enlace por Gmail SMTP. Con `NODE_ENV=development` el enlace también vuelve en la respuesta (`link`) para probar sin correo; nunca en otro entorno ni en logs. El envío real por SMTP no está probado con credenciales reales (solo con un transporte en memoria).

## Panel: autenticación

`POST /v1/panel/auth/login | refresh | logout | change-password` y `GET /v1/panel/auth/me`. Detalle, garantías y operaciones por pedido en `docs/context/03-backend.md`. Las rutas del panel que vengan después se protegen con `@UseGuards(PanelGuard)` y, si hace falta, `@PanelRoles("administrator")` (`accounts/panel.guard.ts`).

## platform

- `Clock` (`clock.ts`): único lugar con `new Date()`. Una prueba falla si aparece otro. Las pruebas inyectan una subclase.
- Filtro global: toda respuesta de error es `{ code, message }` de `@patio/contracts`, con mensajes fijos. Nunca copia el mensaje ni el stack de la excepción.
- Logs: una línea JSON por pedido (`time`, `requestId`, `method`, `route`, `status`, `durationMs`). `route` es el patrón de la ruta, no la URL. Las excepciones no controladas registran solo el nombre del error.
- Cuerpo JSON máximo 16 kb. Cabeceras: `nosniff`, `no-referrer`, CSP `default-src 'none'`, HSTS, sin `X-Powered-By`.
- `healthz` es controlador sin servicio ni repositorio: no hay reglas ni base que lo justifiquen.

## Cómo consume `@patio/contracts`

El paquete exporta `src/index.ts` sin build. Elección (el cambio más chico): no compilarlo.

- Tipos y build: `tsc` lo trata como biblioteca externa, lo comprueba pero no lo emite.
- Ejecución: Node 24 quita los tipos al cargarlo, porque el symlink de pnpm resuelve a `packages/contracts/src`, fuera de `node_modules`.
- vitest lo transforma solo.

Límite conocido: si el despliegue copia el paquete dentro de `node_modules` (por ejemplo `pnpm deploy`), Node no quita tipos allí. Ese día hay que compilar contracts a `dist`. Queda registrado en `docs/memory/decisions.md`.

## Decoradores

TypeScript 7.0.2 emite metadatos con `experimentalDecorators` + `emitDecoratorMetadata` (verificado). Los proveedores usan `@Inject(...)` explícito.

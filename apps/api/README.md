# apps/api

API de Patio (NestJS 12, un solo servicio modular). Hoy existen `platform` (`GET /v1/healthz`, sin base), `database` (conexión a MongoDB), `word-filter` (`GET /v1/banned-words` y validación de apodos), `auth` (funciones puras: alfabeto, ID, token, código, hashes), `players`, `groups` (solo leer un código), `rate-limit` y `membership` (`POST /v1/players`). Necesita Mongo local: `pnpm db:up` en la raíz.

## Comandos

- `pnpm dev:api`: compila y levanta en `PORT` (8080 por defecto). Sin recarga en caliente.
- `pnpm --filter @patio/api test | typecheck | build`.

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
| `TRUST_PROXY_HOPS` | `0` | Saltos de proxy de confianza para leer la IP en `X-Forwarded-For` (0 a 5). 0 = se ignora la cabecera. En Cloud Run, `1` (por verificar) |
| `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_REGISTER_WINDOW_SECONDS` | `20`, `3600` | Registro por IP (sin medir) |
| `RATE_LIMIT_GROUP_CODE_MAX`, `RATE_LIMIT_GROUP_CODE_WINDOW_SECONDS` | `100`, `3600` | Códigos de grupo inexistentes por IP (sin medir) |
| `CORS_ORIGINS` | vacío (ningún origen) | lista separada por comas de orígenes exactos (`https://host[:puerto]`). El comodín `*` se rechaza |

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

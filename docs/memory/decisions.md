# Registro de decisiones

Formato: fecha, decisión, motivo breve, dónde aplica. Lo más reciente va arriba. Estado "doc pendiente" = decidido pero el documento original de arquitectura o diseño todavía no lo refleja.

## 2026-11-11

- `GET /v1/day` y `POST /v1/results` implementados. Módulos nuevos `rules` (lectura de `settings/rules` y `computeLevel`, función pura), `day-sets` (resolución, bloqueo y acceso) y `results` (los dos controladores y el logro). Ya estaban en `API_MODULE_DEPS`, no cambió el mapa. `GET /v1/day` vive en `results` porque `day-sets` no puede importar `players` (guard y grupo). Sin dependencias nuevas. Detalle en `03-backend.md`, `04-base-de-datos.md` y `07-contratos-y-tipado.md`.
- Bloqueo del set: un solo `findOneAndUpdate` con pipeline `$ifNull` busca, bloquea si estaba vacío y devuelve el set ya bloqueado; se bloquea ANTES de insertar el acceso (invierte el orden de doc 03 para que nunca exista un acceso a un set editable).
- Logro sin transacciones: reserva `claimedAt` (propuesta, 60 s) para que un solo pedido aplique; el reintento con reserva vencida toma la reserva comparando y cambiando. `results` guarda `points`, `difficulty`, `family` (propuesta) para poder recalcular. Riesgo residual documentado en `03`.
- Contradicción entre doc 04 y doc 09 resuelta con una propuesta: doc 09 pide requisitos de nivel por dificultad Y familia ("3 de Resolver dificultad 3") pero doc 04 solo guarda conteos por dificultad y por familia separados. Se agrega `countsByDifficultyFamily` en `players`.
- Respuestas (propuesta): `GET /day` lleva `status` `available`|`noSet` (sin set: `items` vacío, `dayEndsAt` presente), `completedChallengeIds` y `score`. `POST /results` responde siempre 200 con `score` y `pointsEarned`. Estados: `DAY_ACCESS_NOT_FOUND`, `DAY_SET_NOT_FOUND` y `CHALLENGE_NOT_IN_SET` 404, `RESULT_DATE_NOT_ALLOWED` 409. Sin límite por IP en estos dos endpoints.
- `Clock` gana `dayKey`, `nextDay`, `previousDay`, `startOfDay`, `endOfDay` y `addMinutes` (la aritmética de fechas queda en el único archivo que puede leer la hora). Se quita el `as DayKey` de `today()` usando el validador.

- Registro de player `POST /v1/players` implementado (`membership`, `players`, `groups` de lectura, `rate-limit`, funciones puras de `auth`). Sin dependencias nuevas (usa `node:crypto` y el driver ya fijado). Detalle del flujo, orden de escritura y concurrencia en `03-backend.md` y `04-base-de-datos.md`.
- Módulo nuevo `rate-limit` (propuesta mía): doc 02 ubicaba los límites por IP en `platform`, pero necesitan MongoDB y `platform` no puede importar de `database` (que importa de `platform`) sin ciclo. Es transversal como `platform` y `database` (`TRANSVERSAL` en `eslint.config.js`), depende de database y platform. Regla nueva de lint: `auth` no importa `database` ni `rate-limit` (doc 02: `auth` sin base).
- `auth` no tiene módulo de Nest: son funciones puras (`alphabet.ts`, `credentials.ts`). Alfabeto en UN lugar: `ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"`, 23 letras (26 menos I, L, O) + 8 dígitos (2 a 9) = 31, el conteo de doc 01 cierra. Una prueba lo compara con el patrón de `PlayerId` del contrato. Generación con `crypto.randomInt` (sin sesgo), token con `crypto.randomBytes(32)` en base64url, SHA-256 del token y HMAC-SHA256 del código en hexadecimal.
- `RECOVERY_HMAC_SECRET` validada al arrancar igual que `MONGODB_URI`: valor falso fijo solo con `NODE_ENV` development o test, obligatoria en producción, mínimo 32 caracteres, nunca se imprime. Otras variables nuevas: `TRUST_PROXY_HOPS` (0 a 5, defecto 0) y `RATE_LIMIT_REGISTER_*` / `RATE_LIMIT_GROUP_CODE_*` (defectos de doc 03: 20 y 100 por hora, sin medir; cuando exista el panel los reemplaza `settings.limits`).
- IP del cliente: `req.ip` con `trust proxy` = número de saltos de confianza, apagado por defecto. Con 0, `X-Forwarded-For` se ignora. Propuesta para Cloud Run: 1 (supuesto sin verificar; con balanceador adelante serían más).
- Cuerpo del registro (propuesta): `nickname`, `termsVersion` (obligatoria: doc 09 exige casilla antes de jugar y guardar versión y fecha; no se valida que la versión exista porque los textos están por redactar), `groupCode?`. Sin bandera `termsAccepted` aparte: enviar la versión equivale a aceptar. `groupCode` en mayúsculas estrictas del alfabeto (un código mal formado es `VALIDATION_FAILED`, no `GROUP_NOT_FOUND`, y no toca la base ni el contador de códigos). Respuesta `201` con `playerId`, `token`, `recoveryCode`. Contrato en `schemas/player.schema.json`.
- Apodo: el schema acota a 64 solo el cuerpo; el máximo de 20 (por caracteres Unicode, no bytes) lo aplica el servidor con `NICKNAME_NOT_ALLOWED`, para que el cliente reciba un error de dominio. Se guarda recortado y sin otra transformación (texto plano). Se rechazan vacío y caracteres de control (propuesta mía, conservadora). Normalización: NFD, quitar marcas, minúsculas (la ñ pasa a n, más estricto). Comparación por palabra completa (separadores: todo lo que no es letra ni número); una entrada con varias palabras bloquea esa secuencia contigua. Se normalizan ambos lados al comparar, así que no importa si el panel guarda la lista normalizada o no.
- Orden de los límites: el de registro cuenta TODO pedido (incluso inválido) y va antes de validar; el de códigos inexistentes se consulta antes de buscar el grupo y solo suma con `GROUP_NOT_FOUND`. Si falta el JSON (cuerpo roto) el middleware responde 400 antes del controlador y no cuenta contra el límite.
- Estados HTTP (propuesta): `VALIDATION_FAILED` y `NICKNAME_NOT_ALLOWED` 400, `GROUP_NOT_FOUND` 404, `GROUP_INACTIVE` y `GROUP_FULL` 409, `RATE_LIMITED` 429. Mensajes fijos en la tabla del filtro de errores, nunca copiados del pedido.
- Concurrencia del cupo del grupo (mejora sobre doc 03, que lo aceptaba como no estricto): insertar y volver a contar; si hay más que `maxSize` el pedido se retira (borra jugador y fila) y responde `GROUP_FULL`. Garantía y riesgos en `03-backend.md`. El cupo se cuenta sobre `players`, no sobre `groupMemberships`.
- Índices de `players`, `groups`, `groupMemberships` y `rateLimits` creados al arrancar desde el `onModuleInit` de cada repositorio. `players.level` se guarda (doc 04) y no sale en ninguna respuesta.
- Las IP quedan en la clave de `rateLimits` (texto) hasta que vence la ventana (TTL). Riesgo asumido: es un dato personal temporal en la base. No hay IP en logs.

- La validación de la prueba de rendimiento 3D en dispositivo real (Redmi Note 9 Pro) se saltea por ahora y el desarrollo sigue con el stack web. El plan B (Unity) queda sin evaluar con datos. Motivo: la persona responsable prefiere avanzar. Aplica: `05-juego-frontend.md`. Riesgo asumido: si el rendimiento resulta insuficiente, se descubre más tarde y cuesta más cambiar.
- Versiones fijadas para la prueba (exactas): react y react-dom 19.3.1, three 0.187.0, @react-three/fiber 9.8.2, @react-three/rapier 2.2.0, @dnd-kit/core 6.3.1, zustand 5.1.0, vite 8.3.8, @vitejs/plugin-react 6.3.0, typescript 7.0.2. `@react-three/drei` se quitó por no usarse. Capacitor 8.6.0 verificado en npm pero aún no agregado.

- Contratos, primera parte (`packages/contracts`) confirmada: `config` de `wordDrop` = `template` con huecos `{id}`, `blanks[{id, correct}]` y `words[]`; `dragDrop` con `equalShare` y `targetCounts` (clasificación y orden se agregan después, aditivo); límites de texto 300 (enunciado), 200 (expresión y plantilla), 40 (palabra); `difficulty` mínimo 1 sin máximo; `PlayerId` de 12 caracteres del alfabeto de 31 símbolos; demás IDs como strings opacos de 1 a 64; objetos permisivos (sin `additionalProperties: false`) para tolerar cambios aditivos. Aplica: `07-contratos-y-tipado.md`.
- La respuesta correcta viaja en `config` hasta el juego y no se consume ni se muestra. Un solo modelo de datos, sin versión "sin solución" para el cliente. Motivo: el cliente evalúa el logro (ver `02`, principio 3).
- Catálogo de códigos de error ampliado de 6 a 28 (solo agregados): cuentas, desafíos y sets, jugadores, autenticación, límites, validación, logro fuera de fecha, versión de schema no soportada y error interno. Aplica: `packages/contracts/schemas/error.schema.json`.

## Prototipo visual (Stitch)

Detalle en `docs/design/prototipo-pantallas.md`. Sin fecha a pedido de la persona responsable.

- Al terminar el día el player camina libre por el patio: sin límite de tiempo forzado, sin salida forzada, juguetes apagados y sin interacción, mensaje amable de que puede seguir practicando la próxima vez, sin chip de hora. Motivo: no hay interacción nueva y forzar el cierre es contraproducente. Aplica: `09-juego-contenido-y-bienestar.md`, `05-juego-frontend.md`.
- Salir de un desafío sin responder solo lo cierra: no cambia el estado ni los logros y se puede reabrir.
- El perfil incluye tema, sonido, idioma y botón "ver tutorial". El juego tiene tutorial de primera vez, pantalla de carga y patio con juguetes apagados.
- Los moderators son invitados por correo; la pantalla de registro del panel es "aceptar invitación".
- El panel reutiliza paleta y fuente del juego (sistema de diseño "Patio Uruguayo Sunset", Lexend) en un proyecto de Stitch aparte. Los textos del prototipo son provisorios y los revisa la persona responsable.
- La invitación por correo a moderators entra al MVP y usa Gmail SMTP. Sustituye el "después del MVP" anterior. Es la excepción a "sin correo" de `02-arquitectura-general.md`.
- El panel muestra rankings y nivel de los players a moderators y administrators. El juego no los muestra al player. Se mantiene lo de `06-panel-frontend.md`.
- El juego Y el panel usan i18n (librería de internacionalización) para escalar. Idiomas: español `es-UY` (por defecto) e inglés. Selector de idioma en el perfil del juego y en el menú de la cuenta del panel. Sustituye "catálogo propio sin librería de i18n" y "panel todo en español". Falta elegir la librería.
- Gmail SMTP queda confirmado para el correo de invitación. La contraseña de aplicación de 16 caracteres va solo en `.env` (ignorado por git) y en los secretos del despliegue. `.env.example` lleva solo nombres de variables con valores vacíos, nunca el valor real.
- La pantalla "Moderación y Actividad" del panel en Stitch se borra y no se implementa (muestra datos por player y marcas de hora que no se pidieron).
- Los tamaños en dp de la referencia mobile y las medidas del panel son PROPUESTAS, no decisiones.

## 2026-10-06 (últimas respuestas)

- El JUGADOR puede elegir entre temas (además del modo). Motivo: necesidad de personalización que no interfiere con el plan pedagógico. Aplica: `08-tema-y-accesibilidad.md`. Estado: doc pendiente (arquitectura 19.5 y pendientes decían "solo modo").
- La escena 3D NO cambia con el modo oscuro ni con el tema. Estado: doc pendiente de cierre.
- Entrada alternativa a caminar (lista de desafíos como botones): FUERA de alcance, no se persigue. Estado: doc pendiente (arquitectura 19.6 y sección 24).
- Estilos del juego: Tailwind, con el mismo preset de tokens que el panel. Estado: doc pendiente de cierre.
- Fuentes tipográficas: autoalojadas, sin CDN. La familia y su licencia siguen pendientes.
- Se arma el harness de desarrollo (este material). No se desarrolla todavía.

## 2026-10-06 (tema y accesibilidad)

- Tema configurable como archivos de datos con modo claro y oscuro, en `packages/theme`, para juego y panel. Modo `light`/`dark`/`system` con escucha de `prefers-color-scheme`. Accesibilidad WCAG 2.2 AA con ARIA solo si hace falta.
- Persistencia de tema y modo en el dispositivo (no en el servidor en el MVP).

## 2026-10-06 (back y estructura)

- Un solo repositorio privado, monorepo con pnpm workspaces.
- Nomenclatura técnica unificada: `player` / `moderator` / `administrator` (ver `01-nomenclatura.md`). Renombres: `users` -> `accounts`, `admin` -> `panel`, `moderation` -> `word-filter`.
- Módulos sin ciclos: `membership` une `players` y `groups`; `groups` no conoce a `players`; `auth` es independiente y puro (sin base); `accounts` solo para cuentas del panel e independiente de `players`.
- El administrador puede eliminar jugadores, grupos, sets y moderadores, de forma definitiva y con confirmación. No puede eliminarse a sí mismo ni al último administrador activo. Sin papelera.
- El jugador no puede cambiar de grupo: solo unirse si no tiene. Moderadores y administrador lo mueven.
- Un desafío repetido suma puntos como cualquier otro, una vez por set por jugador (índice único {playerId, daySetId, challengeId}). Se eliminó el campo `counted`.
- Tolerancia de medianoche: 30 minutos por defecto, editable por el administrador (en `rules`).
- Límite de registro por IP: 20 por hora, con cantidad y ventana configurables desde el panel (`settings.limits`).
- Lista de palabras prohibidas: la agrega y quita el administrador desde el panel en cualquier momento. Arranca vacía.
- Respaldo: automático con GitHub Actions. Dónde guardarlo sigue abierto.
- CORS y Capacitor: lista exacta `CORS_ORIGINS`, `server.androidScheme: "https"` explícito, sin HTTP nativo de Capacitor. Confirmar en dispositivo real.

## 2026-11-11 (esqueleto de apps/api)

- Dependencias de `apps/api`, versiones exactas, todas sin telemetría: `@nestjs/common|core|platform-express|testing` 12.4.2 (MIT), `reflect-metadata` 0.2.2 y `rxjs` 7.8.2 (Apache-2.0), `@types/express` 5.0.6 (MIT, solo tipos). Sin helmet ni supertest: cabeceras a mano y pruebas con `fetch`.
- TypeScript 7.0.2 emite metadatos de decoradores con `experimentalDecorators` y `emitDecoratorMetadata`, así que NestJS compila con `tsc`. Los proveedores usan `@Inject(...)` explícito para no depender de eso en vitest.
- `@patio/contracts` se consume sin build: `tsc` lo trata como biblioteca externa (no lo emite) y Node 24 lo carga quitando tipos porque el symlink resuelve a `packages/contracts/src`, fuera de `node_modules`. Límite: en la imagen de despliegue el paquete no puede quedar bajo `node_modules` (Node se niega a quitar tipos ahí). Resolver en el paso de despliegue (propuesta: build de contracts a `dist`).
- Código de error nuevo `ROUTE_NOT_FOUND` (404 de ruta inexistente), aditivo. Otros 4xx sin código propio responden `VALIDATION_FAILED`.
- Contrato nuevo `HealthResponse` (`{ status: "ok" }`) para `GET /v1/healthz`. Tolera campos nuevos.

## 2026-11-11 (MongoDB local con Docker)

- Decisión: Mongo local con Docker para desarrollo y pruebas, Atlas M0 para despliegue. Reemplaza `mongodb-memory-server` de la propuesta de doc 12.
- Versiones exactas: imagen oficial `mongo:8.0.34` (SSPL, es el servidor y corre en Docker, no se enlaza al código; sin free monitoring: 8.0 ya no lo trae). Driver `mongodb` 7.8.0 (Apache-2.0, sin telemetría; transitivas: `bson` y `mongodb-connection-string-url` Apache-2.0, `@mongodb-js/saslprep`, `whatwg-url`, `tr46`, `punycode` MIT, `webidl-conversions` BSD-2-Clause). Compose v5.3.1, Docker 29.6.2.
- La línea 8.0 es la que SUPONGO que ofrece Atlas M0 (sin verificar contra la consola de Atlas). El driver 7.x admite servidores 4.2+ (según su documentación). Confirmar antes de desplegar.
- Compose: proyecto `patio`, contenedor `patio-mongo`, volumen con nombre `patio-mongo-data`, puerto `127.0.0.1:27017` (estaba libre). Sin autenticación porque solo escucha en loopback y no hay datos reales; con credenciales fijas no ganaríamos nada y habría que guardarlas en el repo. `pnpm db:down` no borra el volumen.
- Módulo `database` (conexión, cierre ordenado, ping al arrancar) es transversal como `platform` y se agrega al mapa. Supuesto mío: doc 02 no lo listaba. En `eslint.config.js` entra en `API_MODULE_DEPS` y en la lista de transversales.
- `MONGODB_URI` y `MONGODB_DB` se validan al arrancar. El valor por defecto local rige solo con `NODE_ENV=development|test`; en producción o con `NODE_ENV` ausente se exigen (falla cerrado). Mensajes de error nombran la variable, no el valor.
- `GET /v1/banned-words` guarda la lista en `settings` (`_id: "bannedWords"`, doc 04), no en una colección `bannedWords` aparte. Contrato `BannedWordsResponse { version >= 0, words[] }`; ETag `"banned-words-v<version>"` y `Cache-Control: public, max-age=60`. Sin documento = versión 0.
- Pruebas de integración: base `patio_test_<aleatorio>` por archivo, borrada al terminar; si Mongo no responde fallan con instrucción de correr `pnpm db:up`.

## 2026-11-11 (ESLint)

- ESLint 9.39.5 con flat config (`eslint.config.js` en la raíz). Se eligió la línea 9 y no la 10.14.0 porque `eslint-plugin-jsx-a11y` 6.10.2 declara peer solo hasta ESLint 9. Versiones exactas, todas MIT, sin telemetría declarada (revisado en metadatos de npm, no el código): `eslint` y `@eslint/js` 9.39.5, `typescript-eslint` 8.72.2, `globals` 17.14.0, `eslint-plugin-react-hooks` 7.1.1, `eslint-plugin-jsx-a11y` 6.10.2, `eslint-plugin-import-x` 4.18.1.
- `typescript-eslint` 8.72.2 declara peer `typescript >=4.8.4 <6.1.0`: NO soporta TypeScript 7. `typescript` 6.0.3 exacto es devDependency SOLO de la raíz y solo para lint. Las apps y paquetes siguen con 7.0.2 para tsc, build y typecheck. Es TEMPORAL hasta que typescript-eslint soporte TS 7 (pendiente en `open-questions.md`). Las reglas son sin información de tipos (`strict`, no `strictTypeChecked`).
- Reglas: sin `any`, `enum`, `!` ni `as` (solo `as const`), `dangerouslySetInnerHTML` prohibido, `Date.now()`, `new Date()` sin argumentos y `performance.now()` prohibidos fuera de `apps/game/src/clock.ts` y `apps/api/src/platform/clock.ts`. jsx-a11y y reglas de hooks solo en `apps/game`.
- Límites: `import-x/no-cycle` y `import-x/no-restricted-paths` (paquetes no importan de apps, entre apps no hay imports, mapa de módulos del back del doc 02 con `platform` como transversal, supuesto mío). Al agregar un módulo del back se edita `API_MODULE_DEPS` en `eslint.config.js`. La prueba de límites vive en `tools/` (paquete `@patio/tools`, solo pruebas).
- `Clock` del back gana `monotonicMs()` para medir duraciones (antes `app.ts` llamaba a `performance.now()`). Dos desactivaciones justificadas en una línea: el `as DayKey` de `Clock.today()` y el `tabIndex` de la región con scroll de `PerfPanel`.

## 2026-11-11 (recuperar y GET /v1/me)

- Recuperar, guard del player y `GET /v1/me` viven en `players` (doc 02: "recuperación ... y guard por token del jugador"). No toca grupo, así que no va en `membership`. `players` pasa a usar `rate-limit` (transversal); `API_MODULE_DEPS` no cambia.
- Contrato: `RecoverPlayerResponse` { playerId, token, nickname } (lo mínimo para volver a armar la sesión de doc 05: ID, token, apodo; el código ya lo tiene el cliente). `MeResponse` { nickname, score }: doc 05 pone en el perfil apodo y puntaje; los juguetes logrados llegan con `GET /day`. Sin grupo ni nivel. Propuesta mía, aditivo después.
- Códigos de error y estados (propuesta): `RECOVERY_CODE_INVALID` 404; `INVALID_TOKEN` 401 (doc 05: un 401 lleva a Recuperar).
- Límite de recuperación: 100 por hora por IP (valor de doc 03, sin medir), `RATE_LIMIT_RECOVER_MAX|WINDOW_SECONDS`. Cuenta todo pedido. No se agrega límite por código de entrada: doc 03 no lo menciona, y permitiría a un tercero bloquear el código ajeno.
- Un solo update atómico por HMAC cambia el hash del token (no hay estado intermedio con dos tokens válidos). No se actualiza `lastActiveAt` (lo hace `GET /day`).
- Guard: busca por SHA-256 del token y además compara en tiempo constante (`timingSafeEqual`). La comparación extra es defensa en profundidad: el índice ya busca por hash.
- Respuestas de recuperar y de `/me`: `Cache-Control: private, no-store`.

## Decisiones anteriores (resumen)

- Sin modo offline. Sin consentimiento parental: solo casilla de términos. ID aleatorio generado por la app, apodo libre con filtro, guardado en el servidor.
- Código de grupo opcional; el jugador entra directo sin aprobación. Todos empiezan en nivel 0. El jugador no ve el nivel.
- Resultados solo "logrado" o "no logrado". Tres mecánicas cerradas: arrastrar objetos, entrada numérica, arrastrar palabras.
- Movimiento libre con salto en el patio 3D al atardecer. Juguetes aleatorios por desafío. Android primero, iOS al final. V2: compañeros en vivo (Colyseus, Oracle).
- Stack: React + TypeScript + Vite, three.js con React Three Fiber, Rapier, Capacitor, NestJS, MongoDB Atlas M0, shadcn/ui, JSON Schema como contrato.
- Hosting gratuito: Cloudflare Pages + Cloud Run + Atlas M0 (+ Oracle en V2). Plan B de motor: Unity si falla la prueba de rendimiento 3D.
- Métricas por cierre diario perezoso: sin tiempo real, sin servicio externo para métricas, sin tarea programada para métricas.
- Límite por IP. Día de 24 h con cierre 00:00 America/Montevideo. Tokens, no cookies (sin dominio propio). Rankings visibles para moderador y administrador. Porcentaje de aprobación = jugadores del grupo que completaron el desafío sobre los miembros del grupo.

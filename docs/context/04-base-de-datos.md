# Base de datos (MongoDB Atlas M0)

Una base, una colección por entidad. Límites del plan gratuito: 0,5 GB, 500 conexiones, 100 operaciones por segundo, SIN copias automáticas, se pausa tras 30 días sin actividad. Pool de hasta 10 conexiones por instancia. Desarrollo y pruebas usan MongoDB local en Docker (8.0.34), no Atlas. Transacciones: NO verificadas, el diseño no depende de ellas.

## Colecciones e índices

| Colección | Contenido | Índices |
| --- | --- | --- |
| `players` | `_id` = ID público (12 car.), `nickname`, `groupId` actual, `tokenHash`, `recoveryHash`, `score`, conteos por dificultad, por familia y por dificultad y familia (`countsByDifficultyFamily`, claves `"3:crear"`, propuesta), `level`, términos aceptados, `createdAt`, `lastActiveAt` | únicos: `tokenHash`, `recoveryHash`; {groupId, createdAt}; {createdAt} |
| `groups` | `name`, `code`, `ownerIds[]`, `maxSize`, `active`, `createdAt` | único: `code`; {ownerIds} |
| `groupMemberships` | `playerId`, `groupId`, `joinedAt`, `leftAt?` (historial) | {playerId, joinedAt}; {groupId, joinedAt} |
| `challenges` | `authorId`, `status`, `version`, `text`, `mechanic {type, schemaVersion, config}`, `difficulty`, `points?`, `family?`, objetivos, `assets`, `updatedAt` | {authorId}; {status} |
| `daySets` | `date` (AAAA-MM-DD en la zona del día), `groupId` (vacío = general), `status`, `items[]` (copia de cada desafío al publicar), `lockedAt?`, `timezone` | único: {date, groupId} |
| `dayAccess` | `playerId`, `date`, `daySetId`, `groupId?`, `createdAt` | único: {playerId, date}; {date, groupId} |
| `results` | `eventId`, `playerId`, `challengeId`, `daySetId`, `date`, `groupId?`, `applied`, `claimedAt` (propuesta), `durationMs`, `points`, `difficulty`, `family?` (propuesta), `createdAt` | únicos: `eventId`, {playerId, daySetId, challengeId}; {date, groupId} |
| `accounts` | `_id` (UUID), `email` (normalizado: recortado y en minúsculas), `role` (`moderator`\|`administrator`), `passwordHash` (argon2id, formato PHC), `mustChangePassword`, `active`, `createdAt`, `passwordChangedAt` (propuesta), `lastLoginAt?` | único: `email` |
| `accountInvitations` (propuesta) | `_id` (UUID), `email`, `tokenHash` (SHA-256 del token de 32 bytes), `createdBy`, `createdAt`, `expiresAt` (7 días), `acceptedAt?`. Solo se invita como moderator. Reinvitar al mismo correo reemplaza la anterior. | únicos: `tokenHash`, `email`; TTL en `expiresAt` |
| `refreshTokens` | `accountId`, `familyId`, `tokenHash` (SHA-256), `expiresAt`, `rotatedAt?` | único: `tokenHash`; TTL en `expiresAt`; `familyId` y `accountId` (propuesta, para revocar sin recorrer la colección) |
| `settings` | tres documentos: `rules` (puntos, reglas de nivel, zona horaria, tolerancia de medianoche), `limits` (límites por IP), `bannedWords` (versión y palabras) | por `_id` |
| `dailyStats` | cierres diarios (global y por grupo) | único: {date, scope, groupId} |
| `rateLimits` | `key`, `count`, `windowStart`, `expiresAt` | único: `key`; TTL en `expiresAt` |

Reglas de modelado:

- El set se COPIA: al publicar, `items` guarda texto, mecánica, dificultad, puntos, familia y versión de cada desafío. Editar un desafío después no cambia sets ya publicados; cada edición sube su `version`.
- `groupMemberships` es el historial y `players.groupId` es el grupo actual. Un cambio cierra la fila vigente (`leftAt`), abre otra y actualiza el jugador. Orden: historial primero, jugador después. Si falla a la mitad, una verificación al leer repara tomando el historial como verdad.
- No existe campo `counted`. Un desafío repetido en otro día suma puntos como cualquier otro. Dentro de un mismo set cada desafío se logra una vez por jugador: lo garantiza el índice único {playerId, daySetId, challengeId}, que también frena un reenvío con otro `eventId`.
- Puntaje, conteos y nivel son derivados de `results` y se recalculan con un comando de mantenimiento.
- Fechas: `Date` BSON en UTC para instantes; la clave de día es string `YYYY-MM-DD` en la zona configurada.
- Toda consulta de panel pasa por el servicio de alcance. Ningún repositorio devuelve datos de grupos ajenos a un moderador.

Usos reales hasta ahora:

- `POST /v1/players` escribe `players` (con `countsByDifficulty` y `countsByFamily` vacíos, `level: 0`, `termsVersion` y `termsAcceptedAt`; `groupId` es `null` sin grupo), `groupMemberships` (solo con grupo, sin `leftAt`) y `rateLimits`; lee `groups` y `settings`. `groups._id` es un string opaco (la creación de grupos llega con el panel; las pruebas insertan fixtures).
- `POST /v1/players/recover` escribe `players.tokenHash` (un solo `findOneAndUpdate` por `recoveryHash`) y `rateLimits`. `GET /v1/me` y el guard de player solo leen `players` por `tokenHash` (proyección: `nickname`, `score`, `tokenHash`).
- Los índices de `players`, `groups`, `groupMemberships` y `rateLimits` se crean al arrancar (`createIndexes`, idempotente) desde el `onModuleInit` de cada repositorio. Las demás colecciones los crean cuando se usen.
- Cupo del grupo = `countDocuments` sobre `players.groupId` (no sobre `groupMemberships`), para que una fila huérfana no ocupe un lugar.
- Un choque de índice único de `tokenHash` o `recoveryHash` al insertar (probabilidad ínfima) responde 500 y el pedido se deshace; el cliente reintenta con identidad nueva.

- `GET /v1/day` y `POST /v1/results` (módulo `results`) leen y escriben `daySets` (solo `lockedAt`), `dayAccess`, `results` y `players` (`lastActiveAt`, `score`, conteos, `level`), y leen `settings/rules`. `results` guarda `points`, `difficulty` y `family` del logro (propuesta: sin ellos no se pueden recalcular puntaje y conteos si el set se elimina) y `claimedAt` (propuesta: reserva de quien aplica el logro, ver `03`). `daySets.groupId` es `null` para el set general y `status` `published` es lo único que se sirve; Bloqueado = `lockedAt` presente. Los índices de `daySets`, `dayAccess` y `results` se crean al arrancar.
- `settings/rules` (propuesta de forma, la escribirá el panel): `{ pointsByDifficulty: { "1": 10 }, levels: [ { requirements: [ { difficulty, family?, min } ], minScore? } ], midnightToleranceMinutes }`. `levels[L]` es lo que hace falta para pasar del nivel L al L+1; el nivel máximo es `levels.length`. Un requisito con `family` se evalúa con `countsByDifficultyFamily`; sin `family`, con `countsByDifficulty` (dificultad exacta). La zona horaria NO se lee de acá: sigue saliendo de `DEFAULT_TIME_ZONE`.

- Autenticación del panel (módulo `accounts`): `accounts` y `refreshTokens` se crean al arrancar con sus índices (`createIndexes`, idempotente). Revocar = borrar filas (por `familyId` o por `accountId`); el TTL limpia lo vencido con hasta ~60 s de atraso, por eso la lógica compara `expiresAt`. Un token rotado se conserva hasta su vencimiento para detectar la reutilización. `rateLimits` guarda las claves `login:<IP>:<hash del correo>` y `change-password:<accountId>`. Eliminar un moderator debe borrar sus `refreshTokens` (ya lo pide la tabla de eliminaciones; la eliminación de cuentas no está implementada).

Primer uso real: `GET /v1/banned-words` lee el documento `settings` con `_id: "bannedWords"` (`{ version, words[] }`), 1 lectura por pedido, sin índices propios. Sin documento = versión 0 y lista vacía (no se escribe nada al arrancar). Quién crea y edita ese documento (versión que sube con cada cambio) queda para el panel.

Panel completo (2026-11-12, propuestas):

- `challenges` guarda el contenido plano (`text`, `mechanic`, `difficulty`, `points?`, `family?`, `assets`), `authorId`, `status` (`active`|`archived`), `version` (sube en cada edición y al archivar), `createdAt`, `updatedAt`. Al borrar al autor el desafío queda con su `authorId`: nadie lo edita salvo el administrator.
- `daySets` gana `challengeIds` (la lista del borrador; `items` solo se llena al publicar y se vacía al volver a borrador). Editar un set publicado y sin bloquear lo devuelve a borrador.
- `settings` suma `limits` (`{ limits: { register, groupCode, recover, login } }`, cada uno `{ max, windowSeconds }`). Hoy solo el panel lo lee y escribe; los límites efectivos siguen saliendo de la configuración (pendiente).
- `settings/bannedWords`: cada `PUT` hace `$set words` + `$inc version` con upsert (la primera vez queda en versión 1).
- Estadísticas sin `dailyStats` (propuesta): agregaciones directas sobre `players`, `results` y `dayAccess` con el alcance, solo días cerrados (hasta ayer, rango máximo 92 días). `available` del ranking de compromiso = suma de `items` de los sets que el player abrió en el rango.

## Eliminaciones (solo administrator, definitivas, sin papelera)

| Qué | Efecto |
| --- | --- |
| Jugador | Se borran jugador, resultados, accesos y filas de pertenencia. Token y código dejan de funcionar. Los `dailyStats` ya cerrados NO se tocan. |
| Grupo | Sus jugadores quedan sin grupo (se cierra la fila vigente) y siguen con el set general. Se eliminan sus sets. El código deja de existir. |
| Set del día | Sirve para borrador, publicado o bloqueado. Si ya lo abrieron jugadores, el panel avisa cuántos. Resultados se conservan. El jugador recibe en su próximo `GET /day` el set que corresponda (puede quedar "sin set") y no puede enviar logros de un set que ya no existe. |
| Moderador | Se borra la cuenta y se revocan sus refresh tokens. Se lo quita de `ownerIds`; si no queda ninguno, el grupo lo maneja solo el administrador. Sus desafíos y sets se conservan con autor marcado como eliminado; solo el administrador los edita. |

Un administrador no puede eliminar su propia cuenta ni la del último administrador activo. Cada eliminación deja una línea de log con quién, qué y cuándo. El panel pide confirmación y muestra cuántos datos se verán afectados ANTES de ejecutar.

## Respaldo (decidido: automático con GitHub Actions)

Flujo programado diario de madrugada (hora de Montevideo): `mongodump`, cifrado, guardado fuera de Atlas, conservando los últimos 30. Cadena de conexión y clave de cifrado como secretos del repo. Cuenta de Atlas de SOLO LECTURA, distinta de la de la API. Atlas abierto a cualquier IP (las IP de los runners cambian); la protección son las credenciales largas. Antes de abrir la app a niños: probar una restauración con `mongorestore`.

A verificar (abierto): dónde guardar el archivo sin costo (artefactos de GitHub, Cloudflare R2, Google Cloud Storage), sus límites, y que GitHub desactiva flujos programados en repos inactivos.

## Comandos de mantenimiento (a crear)

Carga inicial (reglas de prueba, lista de palabras vacía, primer administrador), recálculo de contadores del jugador desde `results`, verificación y reparación de pertenencia.

## Valores de prueba para desarrollo (no pedagógicos)

3 dificultades (10, 20 y 30 puntos) y 5 niveles (0 a 4). Nivel 0 a 1: 5 desafíos de dificultad 1. Nivel 3 a 4: 5 desafíos de dificultad 3. Niveles 1 y 2 configurables. Todo editable desde el panel.

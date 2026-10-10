# Base de datos (MongoDB Atlas M0)

Una base, una colección por entidad. Límites del plan gratuito: 0,5 GB, 500 conexiones, 100 operaciones por segundo, SIN copias automáticas, se pausa tras 30 días sin actividad. Pool de hasta 10 conexiones por instancia. Transacciones: NO verificadas, el diseño no depende de ellas.

## Colecciones e índices

| Colección | Contenido | Índices |
| --- | --- | --- |
| `players` | `_id` = ID público (12 car.), `nickname`, `groupId` actual, `tokenHash`, `recoveryHash`, `score`, conteos por dificultad y familia, `level`, términos aceptados, `createdAt`, `lastActiveAt` | únicos: `tokenHash`, `recoveryHash`; {groupId, createdAt}; {createdAt} |
| `groups` | `name`, `code`, `ownerIds[]`, `maxSize`, `active`, `createdAt` | único: `code`; {ownerIds} |
| `groupMemberships` | `playerId`, `groupId`, `joinedAt`, `leftAt?` (historial) | {playerId, joinedAt}; {groupId, joinedAt} |
| `challenges` | `authorId`, `status`, `version`, `text`, `mechanic {type, schemaVersion, config}`, `difficulty`, `points?`, `family?`, objetivos, `assets`, `updatedAt` | {authorId}; {status} |
| `daySets` | `date` (AAAA-MM-DD en la zona del día), `groupId` (vacío = general), `status`, `items[]` (copia de cada desafío al publicar), `lockedAt?`, `timezone` | único: {date, groupId} |
| `dayAccess` | `playerId`, `date`, `daySetId`, `groupId?`, `createdAt` | único: {playerId, date}; {date, groupId} |
| `results` | `eventId`, `playerId`, `challengeId`, `daySetId`, `date`, `groupId?`, `applied`, `durationMs`, `createdAt` | únicos: `eventId`, {playerId, daySetId, challengeId}; {date, groupId} |
| `accounts` | `email`, `role` (`moderator`\|`administrator`), `passwordHash`, `mustChangePassword`, `active`, `createdAt`, `lastLoginAt` | único: `email` |
| `refreshTokens` | `accountId`, `familyId`, `tokenHash`, `expiresAt`, `rotatedAt?` | único: `tokenHash`; TTL en `expiresAt` |
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

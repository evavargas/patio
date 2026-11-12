# Backend (apps/api)

Stack: Node.js (LTS vigente), TypeScript, NestJS, MongoDB Atlas M0. Un servicio, Docker de varias etapas, Cloud Run (mín 0, máx ~5 instancias, 512 MiB inicial a medir).

## Autenticación

### Jugador
- ID público de 12 caracteres (lo ven moderadores y administradores, no es credencial).
- Al registrarse el servidor emite un token secreto de 32 bytes aleatorios. Se guarda solo su SHA-256. Se envía en `Authorization: Bearer`.
- Código de recuperación: 8 caracteres, 31 símbolos. Se guarda un HMAC-SHA256 con `RECOVERY_HMAC_SECRET` (fuera de la base). La búsqueda es por ese HMAC.
- Recuperar con el código emite un token nuevo e invalida el anterior. El código no cambia.
- Reemitir (moderador de sus jugadores, administrador de cualquiera): genera código nuevo, invalida el viejo, no toca el token en uso, devuelve el código UNA sola vez a quien reemite.
- El servidor conoce el código en claro solo en el momento del registro y de la reemisión.

### Panel
- argon2id. `mustChangePassword` en cuentas nuevas o reiniciadas: única pantalla permitida es cambiar contraseña.
- Access token JWT HS256 de 15 min. Refresh token opaco, se guarda su hash, rota en cada uso; reutilizar uno rotado revoca toda la familia (`familyId`).
- Sin cookies. Tokens en el navegador. Mitigaciones: acceso corto, refresh rotativo, CSP estricta, ningún HTML escrito por usuarios.
- El guard del panel lee la cuenta en cada pedido (una cuenta eliminada deja de servir de inmediato).
- Límite de login por IP y correo.
- El primer administrador se crea con un comando al desplegar.

### Permisos (matriz de referencia)

| Recurso | administrator | moderator |
| --- | --- | --- |
| Grupos | todos | los suyos (`ownerIds` lo incluye); puede crear y queda dueño |
| Jugadores | todos, incluidos sin grupo | solo los de sus grupos |
| Mover jugadores | a cualquier grupo o "Sin grupo", aunque esté lleno | entre sus grupos, o sacarlos; respeta el máximo |
| Código de recuperación | reemitir el de cualquiera | reemitir el de sus jugadores |
| Apodos | ver y cambiar | solo ver |
| Desafíos | ver y editar todos | ver todos, duplicar cualquiera, editar y archivar los suyos |
| Sets del día | cualquier grupo y el general | los de sus grupos |
| Estadísticas y rankings | globales y por grupo | de sus grupos |
| Reglas | ver y editar | ver |
| Palabras prohibidas | ver, agregar, quitar | sin acceso |
| Cuentas del panel | todo | sin acceso |
| Límites por IP | ver y editar | sin acceso |
| Eliminar | jugadores, grupos, sets, cuentas de moderadores | nada (solo archiva sus desafíos) |

El alcance se aplica en UN solo lugar: el servicio de alcance (módulo `groups`) devuelve el filtro de grupos permitidos de cada cuenta y TODA consulta del panel pasa por él. Es la pieza de seguridad más importante del panel y lleva pruebas propias.

## Operaciones críticas

- Registro `POST /v1/players` (implementado; módulo `membership`): límite por IP (cuenta TODO pedido, también los inválidos) -> validar schema (`RegisterPlayerRequest`: `nickname`, `termsVersion`, `groupCode?`) -> validar apodo (recortar, normalizar mayúsculas y tildes, comparar por palabra completa, máx 20 caracteres, sin caracteres de control; `NICKNAME_NOT_ALLOWED` sin decir qué palabra) -> si hay código de grupo: contador de códigos inexistentes de la IP, el grupo debe existir, estar activo y tener lugar (`GROUP_NOT_FOUND` 404, `GROUP_INACTIVE` 409, `GROUP_FULL` 409) -> generar ID, token y código, guardar solo hashes -> fila de pertenencia (solo con grupo) -> jugador -> cuenta de verificación del grupo -> responder `201` con `playerId`, `token`, `recoveryCode`. Operaciones de base: 3 sin grupo (límite, palabras, jugador); 8 con grupo. Estados: `VALIDATION_FAILED` 400, `NICKNAME_NOT_ALLOWED` 400, `RATE_LIMITED` 429.
  - Orden sin transacciones: historial primero, jugador después. Si el jugador falla (o el grupo quedó por encima del máximo) el mismo pedido deshace en orden inverso (jugador, luego fila). Si el deshacer también falla queda una fila de pertenencia sin jugador: no cuenta para el máximo (se cuenta sobre `players`) y la repara el comando de verificación de pertenencia (pendiente). Un jugador sin fila no puede ocurrir por este camino.
  - Máximo del grupo bajo concurrencia: la cuenta previa NO es atómica; por eso, después de insertar se vuelve a contar y, si hay más jugadores que `maxSize`, el pedido se retira con `GROUP_FULL`. Garantía: cuando todos los pedidos terminan, el grupo no supera `maxSize` (salvo que se caiga el proceso entre insertar y retirarse). Costo: con carrera por el último lugar pueden rechazarse todos los que compiten aunque cupiera uno (medido: tres pedidos simultáneos a un lugar, casi siempre los tres reciben `GROUP_FULL`), y durante milisegundos el conteo puede verse por encima.
  - `termsVersion` es obligatoria: se guarda con la fecha del servidor (`termsAcceptedAt`). El servidor no valida que la versión exista (los textos están por redactar).
  - Pendientes de doc 09 no implementados: bloqueo de números y de "patrones de nombre completo" en el apodo (no están definidos).
- Recuperar `POST /v1/players/recover` (implementado; módulo `players`): límite por IP (cuenta TODO pedido) -> validar schema (`RecoverPlayerRequest`: `recoveryCode`) -> UN `findOneAndUpdate` por HMAC del código que guarda el SHA-256 del token nuevo y descarta el anterior -> `200` con `playerId`, `token` nuevo y `nickname`. El código NO cambia y no se devuelve. Operaciones de base: 2 (límite, update). Código inexistente o de un player borrado: `RECOVERY_CODE_INVALID` 404, misma operación y mismo mensaje (no se distingue la causa). Formato inválido `VALIDATION_FAILED` 400, límite `RATE_LIMITED` 429. Respuesta `Cache-Control: private, no-store`. Dos recuperaciones simultáneas dejan un solo token válido (el del último update).
- Guard del player (`PlayerTokenGuard`, módulo `players`, según doc 02): `Authorization: Bearer <token>`; si el formato no es `PlayerToken` no toca la base; si lo es, 1 lectura por `tokenHash` y comparación en tiempo constante. Cualquier falla (ausente, malformado, desconocido, player borrado) es el mismo `INVALID_TOKEN` 401. Lee al player en cada pedido: un player eliminado deja de servir de inmediato.
- Perfil `GET /v1/me` (implementado): guard + nada más (1 operación de base). Devuelve `MeResponse` { `nickname`, `score` }. Nunca nivel, hashes ni datos de otros. `Cache-Control: private, no-store`.
- Unirse `POST /v1/players/me/group`: solo si no tiene grupo.
- Pedir el día `GET /v1/day` (implementado; módulo `results`, ver `02`): guard del player -> `touch` (actualiza `lastActiveAt` y devuelve grupo y puntaje en 1 update) -> acceso del día `{playerId, date}`; si existe, bloquea y lee SU set (queda fijo aunque lo muevan; si el set fue eliminado se resuelve de nuevo y el acceso se repunta); si no hay acceso, set PUBLICADO del grupo, si no el general, si no "sin set"; insertar el acceso (único) -> desafíos logrados del set. Responde `DayResponse` (`serverTime`, `date`, `dayEndsAt`, `status` `available`|`noSet`, `items`, `completedChallengeIds`, `score`) con `Cache-Control: private, no-store`. No dice de dónde salió el set. Operaciones de base: 1 (guard) + 4 a 6.
  - Bloqueo atómico: UN `findOneAndUpdate` con pipeline `$set lockedAt = $ifNull(lockedAt, ahora)` que busca el set, lo bloquea solo si estaba vacío y devuelve el documento ya bloqueado (doc 03 pedía bloquear y leer DESPUÉS: esto garantiza que lo servido es lo bloqueado). Orden (cambio mío respecto del orden del doc): bloquear ANTES de insertar el acceso, así un corte entre ambos deja un set bloqueado sin acceso (inofensivo) y nunca un acceso a un set todavía editable.
  - Concurrencia: dos pedidos del mismo player chocan en el índice único del acceso; el perdedor lee el acceso ganador y sirve ese set. Nunca 500. Con el set eliminado, varios pedidos a la vez repuntan el acceso al mismo set (idempotente).
- Enviar logro `POST /v1/results` (implementado; módulo `results`): guard -> validar schema (`SubmitResultRequest`: `eventId` UUID, `date`, `challengeId`, `durationMs` 0 a 24 h) -> reglas (1 lectura de `settings/rules`) -> fecha: hoy, o ayer solo si faltan menos minutos que la tolerancia desde la medianoche (`RESULT_DATE_NOT_ALLOWED` 409) -> acceso del `date` (`DAY_ACCESS_NOT_FOUND` 404) -> set (`DAY_SET_NOT_FOUND` 404) -> el desafío debe estar en `items` (`CHALLENGE_NOT_IN_SET` 404) -> insertar resultado `applied=false` con reserva `claimedAt` -> sumar puntaje y conteos en UN update atómico (devuelve el estado ya sumado) -> evaluar nivel con las reglas sobre ese estado y subirlo con `$max` si corresponde -> `applied=true`. Responde `200` `SubmitResultResponse` { `score`, `pointsEarned` } SIEMPRE con 200, también al reenviar. NUNCA nivel. Operaciones: 1 (guard) + 6 a 7. Sin límite por IP (doc 03 no lo lista).
  - Puntos: `items[].points` si existe, si no `settings/rules.pointsByDifficulty[dificultad]`, si no 0. La tolerancia sale de `settings/rules.midnightToleranceMinutes` (30 si no hay documento). La tolerancia acepta cualquier desafío del set de ayer, no solo el "abierto": el servidor no sabe cuál tenía abierto el juego.
  - Idempotencia: índices únicos `eventId` y {playerId, daySetId, challengeId}. Si el insert choca, se lee el resultado existente por {playerId, daySetId, challengeId}: aplicado -> misma respuesta; sin aplicar y reserva vigente (menos de 60 s) -> otro pedido lo está aplicando, misma respuesta; sin aplicar y reserva vencida -> se toma la reserva con un update que compara `claimedAt` (gana uno solo) y se completa. Un `eventId` ya usado para otra cosa (otro desafío u otro player) responde `VALIDATION_FAILED` sin revelar nada. Para un reintento la respuesta trae `score` = el del guard (puede estar unos milisegundos atrasado) y `pointsEarned` = los del logro guardado; el cliente reemplaza el puntaje, no lo suma.
  - Garantía sin transacciones: el insert y la reserva dejan UN solo pedido aplicando. Si el pedido cae después de insertar y antes de sumar, el resultado queda `applied=false` y el próximo reintento (mismo logro, cualquier `eventId`) lo completa una vez vencida la reserva. Riesgo residual: si cae DESPUÉS de sumar al player y ANTES de marcar `applied=true`, el reintento tras la reserva suma de nuevo (ventana de milisegundos); lo corrige el comando de recálculo desde `results` (pendiente). Los resultados son la fuente de verdad, puntaje, conteos y nivel son derivados.
  - Pendiente: "si la fecha ya cerró, marcar su cierre como desactualizado" no se implementa porque `dailyStats` no existe todavía; `stats` deberá comparar los `createdAt` de `results` con el cálculo del cierre.
- Mover/sacar `PATCH /v1/panel/players/:id` y `POST /v1/panel/players/move` (lote): validar alcance, cerrar fila de pertenencia vigente, abrir la nueva, actualizar el jugador. Sin transacciones: primero historial, después jugador; una verificación al leer repara tomando el historial como verdad.
- Publicar set: `PUT` guarda borrador, `POST publish` copia los desafíos a `items`. Editar o despublicar solo con `lockedAt` vacío; si no, `SET_LOCKED`. Fuera de 3 a 5 desafíos es un aviso, no un error.
- Eliminar (solo administrator, definitivo, con confirmación, loguea quién, qué y cuándo): ver `04-base-de-datos.md`.

## Endpoints

JSON siempre. Errores `{ code, message, details }` con códigos de dominio estables (`GROUP_FULL`, `NICKNAME_NOT_ALLOWED`, `SET_LOCKED`, `FORBIDDEN_SCOPE`, ...). Listas con paginación por cursor. Versión en la ruta.

Juego (`/v1`): `GET /banned-words` (pública, con versión, cacheable), `POST /players` (pública), `POST /players/recover` (pública), `POST /players/me/group`, `GET /me`, `GET /day`, `POST /results`, `GET /healthz` (pública, no toca la base).

Panel (`/v1/panel`): `POST /auth/login|refresh|logout|change-password`; `/accounts` (+ `reset-password`, DELETE; propuesta: invitación por correo y aceptación, forma por decidir); `/groups` (+ `regenerate-code`, DELETE); `/players` (GET lista y ficha, PATCH, `POST /players/move`, `PATCH /players/:id/nickname`, `POST /players/:id/reissue-recovery`, DELETE); `/challenges` (+ `duplicate`, `archive`); `/day-sets` (GET, PUT, `publish`, `unpublish`, DELETE); `/rules` (GET, PUT); `/limits` (GET, PUT); `/banned-words` (GET, PUT; cada cambio sube la versión); `/stats/overview|challenges|registrations|groups|rankings`.

## Métricas: cierre diario perezoso

Sin tiempo real, sin tareas programadas, sin servicio externo. El panel solo muestra días cerrados (hoy se ve cómo cerró ayer). Al pedir un día cerrado se busca su documento en `dailyStats`; si falta o está desactualizado se calcula con agregaciones acotadas a esa fecha y se guarda (idempotente). Hay un documento global y uno por grupo. Miembros al cierre = filas de pertenencia con `joinedAt` anterior al fin del día y `leftAt` vacío o posterior. Logro por desafío = logros del grupo ese día sobre los miembros al cierre. Rankings y evolución se calculan al pedirlos, sobre días cerrados y rango acotado (por ejemplo 90 días). Un grupo tiene a lo sumo 50 jugadores.

## Abuso y límites

| Acción | Límite inicial | Clave |
| --- | --- | --- |
| Registro | 20 por hora | IP |
| Código de grupo inexistente | 100 por hora | IP |
| Recuperación con código | 100 por hora (`RATE_LIMIT_RECOVER_*`, implementado; cuenta todo pedido) | IP |
| Login del panel | 10 por 15 min | IP y correo |

Cantidad y ventana serán configurables por el administrador (`settings.limits`), caché de 1 minuto. HOY (sin panel) salen de la configuración: `RATE_LIMIT_REGISTER_MAX|WINDOW_SECONDS` y `RATE_LIMIT_GROUP_CODE_MAX|WINDOW_SECONDS`, con los valores iniciales de esta tabla (sin medir). Contadores en `rateLimits`, ventana fija, un `findOneAndUpdate` con upsert y pipeline por intento (atómico, varias instancias) y TTL en `expiresAt` (el borrado puede tardar ~60 s, por eso la lógica compara `expiresAt`). El límite de códigos inexistentes solo cuenta los `GROUP_NOT_FOUND`; se consulta antes de buscar el grupo.

**IP del cliente.** Se usa `req.ip` de Express. Por defecto `TRUST_PROXY_HOPS=0`: se ignora `X-Forwarded-For` y vale la dirección del socket (un cliente no puede esquivar el límite escribiendo esa cabecera). Detrás de Cloud Run hay que fijar `TRUST_PROXY_HOPS=1`: Express toma la entrada de la derecha que agregó el proxy de confianza y descarta lo que el cliente escribió a la izquierda. Valores 0 a 5; nunca "confiar en todo". El número real de saltos de Cloud Run (con o sin balanceador) está por verificar en el despliegue. Las IP se guardan en la clave de `rateLimits` mientras dura la ventana y nunca en logs. Un colegio sale por una sola IP: para un día de registro masivo el administrador sube el valor y lo baja después. Tope bajo de tamaño de cuerpo y validación estricta.

## Configuración, errores y observabilidad

- Variables de entorno: `MONGODB_URI`, `JWT_SECRET`, `RECOVERY_HMAC_SECRET` (implementada: obligatoria en producción y de al menos 32 caracteres; valor falso de desarrollo solo con `NODE_ENV` development o test; nunca se imprime), `TRUST_PROXY_HOPS`, `RATE_LIMIT_*`, `CORS_ORIGINS`, zona horaria por defecto, y las credenciales de Gmail SMTP para el correo de invitación (nombres por definir). Nunca en el repo.
- CORS: lista exacta, sin comodín. Permitir `Authorization` y `Content-Type`. `OPTIONS` responde sin tocar la base y con `Access-Control-Max-Age`.
- Logs JSON a stdout con ID de pedido, ruta, estado, duración y `playerId` o `accountId`. NUNCA apodos, tokens ni códigos.
- `/healthz` no toca la base.
- Alertas: cuota y presupuesto de Cloud Run y crecimiento anómalo de jugadores.
- Reloj: UNA sola función entrega la fecha del día en la zona configurada. Nadie más lee la hora del sistema. Permite simular el reloj en pruebas.

## Caché y capacidad

Estimación sin medir: pedir el día cuesta ~6 operaciones y cada logro ~6. Un salón de 50 abriendo a la vez son ~300 operaciones. Reducir con cachés en memoria de la instancia (reglas, palabras, sets publicados, búsqueda de token con vida corta). Confirmar con prueba de carga con 50 y 500 jugadores simultáneos.

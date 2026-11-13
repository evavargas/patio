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

Implementado (módulo `accounts`; herramientas puras en `auth`; contratos en `account.schema.json`):

- Contraseñas: argon2id con `node:crypto` (Node 24, sin dependencia), m=19456 KiB, t=2, p=1, sal de 16 bytes, formato PHC con los parámetros dentro del hash. Parámetros mínimos de la OWASP Password Storage Cheat Sheet (consultada el 2026-11-11). Costo en Cloud Run 512 MiB: sin medir (cada verificación usa 19 MiB y un hilo del pool de libuv, 4 por defecto). Se normalizan con NFKC antes de hashear.
- Política (propuesta, ASVS 5.0 v6.2.1 y v6.2.9): la nueva contraseña tiene de 15 a 128 caracteres, sin reglas de composición; no puede ser igual a la actual. El login no impone política.
- JWT: HS256 firmado con `JWT_SECRET` (obligatoria en producción, mínimo 32 caracteres, distinta de `RECOVERY_HMAC_SECRET`, valor falso de desarrollo solo con `NODE_ENV` development o test, nunca se imprime). Solo se acepta el encabezado exacto `{"alg":"HS256","typ":"JWT"}`; la firma se compara en tiempo constante ANTES de leer la carga; se exige `exp` futuro, `iat` no más de 30 s en el futuro (tolerancia entre instancias, propuesta) y vida máxima de 900 s. La hora sale solo del reloj. Carga: `sub` (id de cuenta), `iat`, `exp`. El rol NO viaja en el token: se lee de la base en cada pedido.
- Refresh token: 32 bytes aleatorios, base64url, solo se guarda el SHA-256 en `refreshTokens`. Vence a los 7 días de abrir la sesión y NO se extiende al rotar (tope absoluto de sesión, propuesta). Cada login abre una familia nueva.
- Guard `PanelGuard` (`Authorization: Bearer <JWT>`): token inválido, vencido o de cuenta eliminada = `INVALID_TOKEN` 401; cuenta inactiva = `ACCOUNT_INACTIVE` 403; con `mustChangePassword` toda ruta da `PASSWORD_CHANGE_REQUIRED` 403 salvo la marcada `@AllowPasswordChange()`; luego el rol (`@PanelRoles(...)`) da `FORBIDDEN_ROLE` 403. Un access token emitido antes del último cambio de contraseña (`iat` anterior a `passwordChangedAt`, en segundos) da `INVALID_TOKEN`. Es solo autenticación y rol: el servicio de alcance llega con las rutas de grupos.
- `POST /v1/panel/auth/login`: límite (clave `login:<IP>:<SHA-256 del correo normalizado>`, 10 por 15 min, `RATE_LIMIT_LOGIN_MAX|WINDOW_SECONDS`, sin medir; se cuenta ANTES de leer la cuenta y también los intentos correctos) -> cuenta por correo -> verificar contraseña (con hash ficticio si la cuenta no existe) -> `INVALID_CREDENTIALS` 401 igual para correo inexistente y contraseña mala -> `ACCOUNT_INACTIVE` 403 solo si la contraseña era correcta -> abrir sesión. Cuerpo inválido: `VALIDATION_FAILED` 400 sin contar. Operaciones de base: 2 si falla, 4 si entra (límite, cuenta, insertar refresh, `lastLoginAt`).
- `POST /v1/panel/auth/refresh` (público, sin límite: el token es de 256 bits): reclamar el token con un `findOneAndUpdate` atómico (`rotatedAt` ausente y no vencido; gana UNO) -> leer la cuenta -> insertar el nuevo en la misma familia -> comprobar que el viejo sigue existiendo (si otro pedido revocó la familia en el medio, se deshace el nuevo). Un token ya rotado que vuelve a aparecer borra la familia entera. 4 operaciones. Con `mustChangePassword` renueva y la cuenta lo informa.
  - Garantía sin transacciones: dos refresh simultáneos con el mismo token nunca dan dos éxitos (el reclamo es atómico) y no queda más de un token vivo por familia salvo en una ventana de milisegundos (el perdedor revoca la familia mientras el ganador inserta; el chequeo posterior lo cierra casi siempre). Nunca quedan dos familias vivas: una familia nace solo en login o cambio de contraseña. Verificado con 8 carreras de a dos (no es una prueba exhaustiva).
- `POST /v1/panel/auth/logout` (público, idempotente): 204 sin cuerpo, también con un token desconocido (no revela nada); borra la familia del token. Se permite con `mustChangePassword`. 2 operaciones.
- `POST /v1/panel/auth/change-password` (access token; única ruta con `mustChangePassword`): límite por cuenta (mismo valor que el login, clave `change-password:<accountId>`) -> leer cuenta -> verificar la actual (`INVALID_CREDENTIALS` 401) -> guardar la nueva con `mustChangePassword=false` y `passwordChangedAt` -> borrar TODOS los refresh tokens de la cuenta -> abrir sesión nueva (200 `PanelSession`). 6 operaciones. Orden de falla: si corta después de guardar y antes de borrar, los refresh viejos siguen vivos hasta repetir el cambio. Un access token emitido en el mismo segundo del cambio sigue sirviendo hasta 15 min (granularidad de `iat`).
- `GET /v1/panel/auth/me`: cuenta autenticada (`PanelAccount`); es la ruta mínima para probar el guard. 1 operación.
- Todas las respuestas de auth llevan `Cache-Control: private, no-store`. Mensajes del panel distintos de los del juego (`INVALID_TOKEN` no habla del código de recuperación).
- Comando del primer administrator: ver `apps/api/README.md`. Crea la cuenta con `mustChangePassword`; no imprime ni registra correo ni contraseña.

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

Panel (`/v1/panel`), todo implementado (2026-11-12; lista de rutas y permisos en `apps/api/README.md`): `POST /auth/login|refresh|logout|change-password|accept-invitation` y `GET /auth/me`; `/accounts` (+ `reset-password`, `invitations`, DELETE); `/groups` (+ `regenerate-code`, DELETE); `/players` (GET lista y ficha, PATCH, `POST /players/move`, `PATCH /players/:id/nickname`, `POST /players/:id/reissue-recovery`, DELETE); `/challenges` (+ `duplicate`, `archive`); `/day-sets` (GET, PUT, `publish`, `unpublish`, DELETE); `/rules` (GET, PUT); `/limits` (GET, PUT); `/banned-words` (GET, PUT; cada cambio sube la versión); `/stats/overview|challenges|registrations|groups|rankings`.

Reglas comunes del panel (propuestas donde se indica):
- Todas pasan por `PanelGuard` y por el servicio de alcance (`GroupsService.scopeFor` -> `GroupScope`: administrator todo, moderator sus grupos; 1 lectura por pedido para el moderator). Fuera de alcance: `FORBIDDEN_SCOPE` 403 (sin leer la base cuando se nombra el grupo). Rol insuficiente: `FORBIDDEN_ROLE` 403. Todas las respuestas del panel llevan `Cache-Control: private, no-store`.
- Eliminaciones: solo administrator, `?confirm=true` (si no, `CONFIRMATION_REQUIRED` 400, código nuevo) y `GET .../deletion-impact` -> `{ counts }` antes. Responden 204, son repetibles (repetir completa una limpieza interrumpida) y dejan una línea de log `{event: "deletion", by: <cuenta>, kind, targetId}` con la hora del logger; nunca apodos ni correos. Orden: primero lo que da acceso (player, grupo, cuenta), después la limpieza.
- Listas con cursor (`players`, `challenges`): ordenadas por `_id`, `limit` 1 a 100 (50), `nextCursor` null en la última página. Grupos, cuentas y sets: sin cursor (pocos; tope de 500).
- Mover (`PATCH /players/:id`, `POST /players/move`, hasta 50): cada player y el destino deben estar en el alcance; "Sin grupo" (`groupId` null) solo lo toca el administrator; el moderator respeta `maxSize` (`GROUP_FULL` 409), el administrator no. Operaciones: 1 lectura de players, [destino y cuenta], cerrar filas, [abrir filas], actualizar players. Historial primero, jugador después; cerrar solo toca filas abiertas, así que repetir repara un corte. El chequeo de máximo no es atómico (dos moderators llenando el mismo grupo a la vez pueden pasarse; sin medir).
- Desafíos: se validan con el schema `Challenge` compartido (incluida la mecánica); editar y archivar solo el autor y el administrator (`FORBIDDEN_SCOPE`); duplicar cualquiera (el duplicado es de quien duplica); cada edición sube `version`; publicar copia los desafíos activos a `items` (uno archivado o inexistente da `CHALLENGE_NOT_FOUND`).
- Sets: `PUT /day-sets` guarda el borrador de (fecha, grupo) y no acepta fechas pasadas; el set general (`groupId` null) solo lo toca el administrator; con `lockedAt` presente `SET_LOCKED` 409; fuera de 3 a 5 desafíos devuelve `outsideRecommendedRange: true` (aviso, no error); publicar exige al menos 1 desafío.
- Reemitir código: devuelve el código nuevo una vez; el viejo deja de servir; el token en uso sigue.
- Cuentas: crear moderator con clave temporal (`mustChangePassword`), `reset-password` la pone otra vez y cierra todas sus sesiones, desactivar o eliminar borra sus `refreshTokens`; un administrator no puede desactivarse ni eliminarse a sí mismo ni al último activo (`CANNOT_DELETE_OWN_ACCOUNT`, `CANNOT_DELETE_LAST_ADMINISTRATOR`, 409).
- Invitación: `POST /accounts/invitations` (administrator) guarda solo el hash de un token de 32 bytes (vence a los 7 días, propuesta) y manda por Gmail SMTP el enlace `${PANEL_URL}/accept-invitation?token=...`. `emailSent` dice si salió; el enlace vuelve en la respuesta SOLO con `NODE_ENV=development`. `POST /auth/accept-invitation` (público, límite por IP con el valor del login) crea el moderator activo y sin `mustChangePassword` (misma política de contraseña; responde 204, después se entra por `login`). Token inexistente, vencido o usado: `INVITATION_INVALID` 404, igual para los tres. Operaciones: invitar 3 (cuenta por correo, guardar, [correo]); aceptar 4 (límite, reclamar, crear cuenta, borrar invitación).
- Estadísticas: ver `04`. Siempre con alcance; `to` se recorta a ayer; `groupId` ajeno `FORBIDDEN_SCOPE`.

## Métricas: cierre diario perezoso

Sin tiempo real, sin tareas programadas, sin servicio externo. El panel solo muestra días cerrados (hoy se ve cómo cerró ayer). Al pedir un día cerrado se busca su documento en `dailyStats`; si falta o está desactualizado se calcula con agregaciones acotadas a esa fecha y se guarda (idempotente). Hay un documento global y uno por grupo. Miembros al cierre = filas de pertenencia con `joinedAt` anterior al fin del día y `leftAt` vacío o posterior. Logro por desafío = logros del grupo ese día sobre los miembros al cierre. Rankings y evolución se calculan al pedirlos, sobre días cerrados y rango acotado (por ejemplo 90 días). Un grupo tiene a lo sumo 50 jugadores.

## Abuso y límites

| Acción | Límite inicial | Clave |
| --- | --- | --- |
| Registro | 20 por hora | IP |
| Código de grupo inexistente | 100 por hora | IP |
| Recuperación con código | 100 por hora (`RATE_LIMIT_RECOVER_*`, implementado; cuenta todo pedido) | IP |
| Login del panel | 10 por 15 min (`RATE_LIMIT_LOGIN_*`, implementado, sin medir) | IP y correo |

Cantidad y ventana serán configurables por el administrador (`settings.limits`), caché de 1 minuto. HOY (sin panel) salen de la configuración: `RATE_LIMIT_REGISTER_MAX|WINDOW_SECONDS` y `RATE_LIMIT_GROUP_CODE_MAX|WINDOW_SECONDS`, con los valores iniciales de esta tabla (sin medir). Contadores en `rateLimits`, ventana fija, un `findOneAndUpdate` con upsert y pipeline por intento (atómico, varias instancias) y TTL en `expiresAt` (el borrado puede tardar ~60 s, por eso la lógica compara `expiresAt`). El límite de códigos inexistentes solo cuenta los `GROUP_NOT_FOUND`; se consulta antes de buscar el grupo.

**IP del cliente.** Se usa `req.ip` de Express. Por defecto `TRUST_PROXY_HOPS=0`: se ignora `X-Forwarded-For` y vale la dirección del socket (un cliente no puede esquivar el límite escribiendo esa cabecera). Detrás de Cloud Run hay que fijar `TRUST_PROXY_HOPS=1`: Express toma la entrada de la derecha que agregó el proxy de confianza y descarta lo que el cliente escribió a la izquierda. Valores 0 a 5; nunca "confiar en todo". El número real de saltos de Cloud Run (con o sin balanceador) está por verificar en el despliegue. Las IP se guardan en la clave de `rateLimits` mientras dura la ventana y nunca en logs. Un colegio sale por una sola IP: para un día de registro masivo el administrador sube el valor y lo baja después. Tope bajo de tamaño de cuerpo y validación estricta.

## Configuración, errores y observabilidad

- Variables de entorno: `MONGODB_URI`, `JWT_SECRET` (implementada, mismas reglas que la siguiente y distinta de ella), `RECOVERY_HMAC_SECRET` (implementada: obligatoria en producción y de al menos 32 caracteres; valor falso de desarrollo solo con `NODE_ENV` development o test; nunca se imprime), `TRUST_PROXY_HOPS`, `RATE_LIMIT_*`, `CORS_ORIGINS`, zona horaria por defecto, y el correo de invitación (implementado): `SMTP_HOST` (smtp.gmail.com), `SMTP_PORT` (465), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` y `PANEL_URL`; obligatorias en producción, en development/test sin SMTP el envío se omite. `nodemailer` 10.5.0 (MIT-0, sin dependencias, sin telemetría). Nunca en el repo ni en logs.
- CORS: lista exacta, sin comodín. Permitir `Authorization` y `Content-Type`. `OPTIONS` responde sin tocar la base y con `Access-Control-Max-Age`.
- Logs JSON a stdout con ID de pedido, ruta, estado, duración y `playerId` o `accountId`. NUNCA apodos, tokens ni códigos.
- `/healthz` no toca la base.
- Alertas: cuota y presupuesto de Cloud Run y crecimiento anómalo de jugadores.
- Reloj: UNA sola función entrega la fecha del día en la zona configurada. Nadie más lee la hora del sistema. Permite simular el reloj en pruebas.

## Caché y capacidad

Estimación sin medir: pedir el día cuesta ~6 operaciones y cada logro ~6. Un salón de 50 abriendo a la vez son ~300 operaciones. Reducir con cachés en memoria de la instancia (reglas, palabras, sets publicados, búsqueda de token con vida corta). Confirmar con prueba de carga con 50 y 500 jugadores simultáneos.

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

- Registro `POST /v1/players`: límite por IP -> validar schema y apodo (normalizar mayúsculas y tildes, comparar por palabra completa, máx 20 caracteres) -> si hay código de grupo: debe existir, estar activo y tener lugar (`GROUP_NOT_FOUND`, `GROUP_INACTIVE`, `GROUP_FULL`) -> generar ID, token y código, guardar solo hashes, insertar jugador y fila de pertenencia -> responder ID, token y código. El máximo del grupo no es estricto bajo concurrencia (aceptado en el MVP).
- Unirse `POST /v1/players/me/group`: solo si no tiene grupo.
- Pedir el día `GET /v1/day`: hora del servidor y fecha en la zona configurada; si ya tiene acceso ese día usa su set (queda fijo aunque lo muevan; si el set fue eliminado se resuelve de nuevo); si no, set publicado de su grupo, si no hay el general, si no "sin set" con la hora de fin del día; insertar acceso (único {playerId, date}); bloquear el set atómicamente (`lockedAt` solo si estaba vacío); leer el set DESPUÉS de bloquearlo; responder hora, fin del día, desafíos, ya logrados y puntaje; actualizar `lastActiveAt`.
- Enviar logro `POST /v1/results`: entrada `eventId`, fecha del set, `challengeId`, `durationMs`; debe existir el acceso y el desafío estar en su set; la fecha es hoy, o ayer dentro de la tolerancia para el desafío abierto; insertar resultado con `applied=false` (índices únicos `eventId` y {playerId, daySetId, challengeId}); sumar puntos, incrementar conteos por dificultad y familia, evaluar nivel (sube mientras se cumpla el requisito del nivel actual), marcar `applied=true`; si la fecha ya cerró, marcar su cierre como desactualizado; responder puntaje y puntos ganados (NUNCA el nivel). Los pasos de insertar y aplicar no son transaccionales: el reintento con el mismo `eventId` completa lo pendiente y el comando de recálculo repara el resto.
- Mover/sacar `PATCH /v1/panel/players/:id` y `POST /v1/panel/players/move` (lote): validar alcance, cerrar fila de pertenencia vigente, abrir la nueva, actualizar el jugador. Sin transacciones: primero historial, después jugador; una verificación al leer repara tomando el historial como verdad.
- Publicar set: `PUT` guarda borrador, `POST publish` copia los desafíos a `items`. Editar o despublicar solo con `lockedAt` vacío; si no, `SET_LOCKED`. Fuera de 3 a 5 desafíos es un aviso, no un error.
- Eliminar (solo administrator, definitivo, con confirmación, loguea quién, qué y cuándo): ver `04-base-de-datos.md`.

## Endpoints

JSON siempre. Errores `{ code, message, details }` con códigos de dominio estables (`GROUP_FULL`, `NICKNAME_NOT_ALLOWED`, `SET_LOCKED`, `FORBIDDEN_SCOPE`, ...). Listas con paginación por cursor. Versión en la ruta.

Juego (`/v1`): `GET /banned-words` (pública, con versión, cacheable), `POST /players` (pública), `POST /players/recover` (pública), `POST /players/me/group`, `GET /me`, `GET /day`, `POST /results`, `GET /healthz` (pública, no toca la base).

Panel (`/v1/panel`): `POST /auth/login|refresh|logout|change-password`; `/accounts` (+ `reset-password`, DELETE); `/groups` (+ `regenerate-code`, DELETE); `/players` (GET lista y ficha, PATCH, `POST /players/move`, `PATCH /players/:id/nickname`, `POST /players/:id/reissue-recovery`, DELETE); `/challenges` (+ `duplicate`, `archive`); `/day-sets` (GET, PUT, `publish`, `unpublish`, DELETE); `/rules` (GET, PUT); `/limits` (GET, PUT); `/banned-words` (GET, PUT; cada cambio sube la versión); `/stats/overview|challenges|registrations|groups|rankings`.

## Métricas: cierre diario perezoso

Sin tiempo real, sin tareas programadas, sin servicio externo. El panel solo muestra días cerrados (hoy se ve cómo cerró ayer). Al pedir un día cerrado se busca su documento en `dailyStats`; si falta o está desactualizado se calcula con agregaciones acotadas a esa fecha y se guarda (idempotente). Hay un documento global y uno por grupo. Miembros al cierre = filas de pertenencia con `joinedAt` anterior al fin del día y `leftAt` vacío o posterior. Logro por desafío = logros del grupo ese día sobre los miembros al cierre. Rankings y evolución se calculan al pedirlos, sobre días cerrados y rango acotado (por ejemplo 90 días). Un grupo tiene a lo sumo 50 jugadores.

## Abuso y límites

| Acción | Límite inicial | Clave |
| --- | --- | --- |
| Registro | 20 por hora | IP |
| Código de grupo inexistente | 100 por hora | IP |
| Recuperación con código | 100 por hora | IP |
| Login del panel | 10 por 15 min | IP y correo |

Cantidad y ventana son configurables por el administrador (`settings.limits`), caché de 1 minuto. Contadores en `rateLimits` con incremento atómico y TTL (varias instancias). Un colegio sale por una sola IP: para un día de registro masivo el administrador sube el valor y lo baja después. Tope bajo de tamaño de cuerpo y validación estricta.

## Configuración, errores y observabilidad

- Variables de entorno: `MONGODB_URI`, `JWT_SECRET`, `RECOVERY_HMAC_SECRET`, `CORS_ORIGINS`, zona horaria por defecto. Nunca en el repo.
- CORS: lista exacta, sin comodín. Permitir `Authorization` y `Content-Type`. `OPTIONS` responde sin tocar la base y con `Access-Control-Max-Age`.
- Logs JSON a stdout con ID de pedido, ruta, estado, duración y `playerId` o `accountId`. NUNCA apodos, tokens ni códigos.
- `/healthz` no toca la base.
- Alertas: cuota y presupuesto de Cloud Run y crecimiento anómalo de jugadores.
- Reloj: UNA sola función entrega la fecha del día en la zona configurada. Nadie más lee la hora del sistema. Permite simular el reloj en pruebas.

## Caché y capacidad

Estimación sin medir: pedir el día cuesta ~6 operaciones y cada logro ~6. Un salón de 50 abriendo a la vez son ~300 operaciones. Reducir con cachés en memoria de la instancia (reglas, palabras, sets publicados, búsqueda de token con vida corta). Confirmar con prueba de carga con 50 y 500 jugadores simultáneos.

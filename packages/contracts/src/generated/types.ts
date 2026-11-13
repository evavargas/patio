/* GENERADO por `pnpm contracts:generate` desde schemas/. No editar a mano. */

/**
 * Union discriminada por type. Conjunto cerrado.
 */
export type Mechanic = DragDropMechanic | NumberInputMechanic | WordDropMechanic;
/**
 * Id de un asset del catalogo cerrado. Que exista en el manifiesto se valida fuera del schema.
 */
export type AssetId = string;
/**
 * Entero positivo.
 */
export type Count = number;
export type DragDropRule = EqualShareRule | TargetCountsRule;
export type FieldId = string;
/**
 * Dia calendario YYYY-MM-DD en la zona del dia.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "DayKey".
 */
export type DayKey = string & {readonly __brand: "DayKey"};
/**
 * Instante ISO 8601 con zona.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "IsoDateTime".
 */
export type IsoDateTime = string;
/**
 * ID publico del player: 12 caracteres del alfabeto de 31 simbolos. No es credencial.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PlayerId".
 */
export type PlayerId = string & {readonly __brand: "PlayerId"};
/**
 * Codigo de grupo: 6 caracteres del alfabeto de 31 simbolos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "GroupCode".
 */
export type GroupCode = string;
/**
 * Codigo de recuperacion: 8 caracteres del alfabeto de 31 simbolos. Funciona como contrasena del player.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "RecoveryCode".
 */
export type RecoveryCode = string;
/**
 * Token secreto del player: 32 bytes aleatorios en base64url (43 caracteres). Viaja en Authorization: Bearer.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PlayerToken".
 */
export type PlayerToken = string;
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "GroupId".
 */
export type GroupId = string & {readonly __brand: "GroupId"};
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "ChallengeId".
 */
export type ChallengeId = string & {readonly __brand: "ChallengeId"};
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "DaySetId".
 */
export type DaySetId = string & {readonly __brand: "DaySetId"};
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "AccountId".
 */
export type AccountId = string & {readonly __brand: "AccountId"};
/**
 * Codigos de dominio estables. Solo se agregan, nunca se renombran.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "ErrorCode".
 */
export type ErrorCode =
  | "ACCOUNT_EMAIL_TAKEN"
  | "ACCOUNT_INACTIVE"
  | "ACCOUNT_NOT_FOUND"
  | "CANNOT_DELETE_LAST_ADMINISTRATOR"
  | "CANNOT_DELETE_OWN_ACCOUNT"
  | "CHALLENGE_NOT_FOUND"
  | "CHALLENGE_NOT_IN_SET"
  | "CONFIRMATION_REQUIRED"
  | "DAY_ACCESS_NOT_FOUND"
  | "DAY_SET_NOT_FOUND"
  | "FORBIDDEN_ROLE"
  | "FORBIDDEN_SCOPE"
  | "GROUP_FULL"
  | "GROUP_INACTIVE"
  | "GROUP_NOT_FOUND"
  | "INTERNAL_ERROR"
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH_TOKEN"
  | "INVALID_TOKEN"
  | "INVITATION_INVALID"
  | "NICKNAME_NOT_ALLOWED"
  | "PASSWORD_CHANGE_REQUIRED"
  | "PLAYER_ALREADY_IN_GROUP"
  | "PLAYER_NOT_FOUND"
  | "RATE_LIMITED"
  | "RECOVERY_CODE_INVALID"
  | "RESULT_DATE_NOT_ALLOWED"
  | "ROUTE_NOT_FOUND"
  | "SET_LOCKED"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "VALIDATION_FAILED";
/**
 * UUID que genera el juego al lograr un desafio. Se reenvia igual en cada reintento.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "EventId".
 */
export type EventId = string;
/**
 * Correo normalizado (recortado y en minusculas) tal como se guarda.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "Email".
 */
export type Email = string;
/**
 * Los dos unicos roles del panel. No existe un tercero.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "AccountRole".
 */
export type AccountRole = "moderator" | "administrator";
/**
 * JWT HS256 de 15 minutos. Viaja en Authorization: Bearer.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "AccessToken".
 */
export type AccessToken = string;
/**
 * Token opaco de 32 bytes aleatorios en base64url (43 caracteres). Rota en cada uso.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelRefreshToken".
 */
export type PanelRefreshToken = string;
/**
 * Cursor opaco de paginacion.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PageCursor".
 */
export type PageCursor = string;
/**
 * Misma politica que ChangePasswordRequest.newPassword: 15 a 128 caracteres.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "TemporaryPassword".
 */
export type TemporaryPassword = string;

/**
 * Entrada de la generacion de tipos. No se valida contra este archivo.
 */
export interface IndexSchemaJson {
  [k: string]: unknown | undefined;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "Challenge".
 */
export interface Challenge {
  /**
   * Consigna. Texto plano, nunca HTML.
   */
  text: string;
  mechanic: Mechanic;
  difficulty: number;
  /**
   * Si falta, rige el de la dificultad.
   */
  points?: number;
  family?: "resolver" | "descubrir" | "crear";
  assets: AssetId[];
}
export interface DragDropMechanic {
  type: "dragDrop";
  schemaVersion: 1;
  config: DragDropConfigV1;
}
export interface DragDropConfigV1 {
  items: DragDropGroup;
  containers: DragDropGroup;
  rule: DragDropRule;
}
/**
 * This interface was referenced by `DragDropMechanic`'s JSON-Schema
 * via the `definition` "Group".
 */
export interface DragDropGroup {
  assetId: AssetId;
  count: Count;
}
export interface EqualShareRule {
  type: "equalShare";
}
export interface TargetCountsRule {
  type: "targetCounts";
  /**
   * Cantidad objetivo por contenedor, en orden.
   *
   * @minItems 1
   */
  counts: [number, ...number[]];
}
export interface NumberInputMechanic {
  type: "numberInput";
  schemaVersion: 1;
  config: NumberInputConfigV1;
}
export interface NumberInputConfigV1 {
  /**
   * Texto con huecos {id}.
   */
  expression: string;
  /**
   * @minItems 1
   */
  fields: [NumberInputField, ...NumberInputField[]];
}
export interface NumberInputField {
  id: FieldId;
  expected: number;
}
export interface WordDropMechanic {
  type: "wordDrop";
  schemaVersion: 1;
  config: WordDropConfigV1;
}
export interface WordDropConfigV1 {
  /**
   * Texto con huecos {id}.
   */
  template: string;
  /**
   * @minItems 1
   */
  blanks: [WordDropBlank, ...WordDropBlank[]];
  /**
   * Banco de palabras, incluye las correctas y distractores.
   *
   * @minItems 1
   */
  words: [string, ...string[]];
}
export interface WordDropBlank {
  id: FieldId;
  correct: string;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "ErrorBody".
 */
export interface ErrorBody {
  code: ErrorCode;
  /**
   * Sin datos personales.
   */
  message: string;
  details?: {};
}
/**
 * Respuesta de GET /v1/banned-words. `version` sube con cada cambio de la lista (0 = lista nunca cargada). Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "BannedWordsResponse".
 */
export interface BannedWordsResponse {
  version: number;
  words: string[];
}
/**
 * Cuerpo de POST /v1/players (publico). `nickname`: maximo 20 caracteres, lo valida el servidor contra la lista de palabras (NICKNAME_NOT_ALLOWED); el tope de 64 del schema solo acota el cuerpo. `termsVersion`: version de los terminos que el player acepto; el servidor guarda version y fecha. Los servidores toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "RegisterPlayerRequest".
 */
export interface RegisterPlayerRequest {
  nickname: string;
  groupCode?: GroupCode;
  termsVersion: string;
}
/**
 * Respuesta de POST /v1/players (201). `token` y `recoveryCode` solo existen en claro en esta respuesta. Sin nivel. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "RegisterPlayerResponse".
 */
export interface RegisterPlayerResponse {
  playerId: PlayerId;
  token: PlayerToken;
  recoveryCode: RecoveryCode;
}
/**
 * Cuerpo de POST /v1/players/recover (publico). `recoveryCode` en mayusculas: el cliente normaliza antes de enviar. Los servidores toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "RecoverPlayerRequest".
 */
export interface RecoverPlayerRequest {
  recoveryCode: RecoveryCode;
}
/**
 * Respuesta de POST /v1/players/recover (200). `token` es NUEVO e invalida el anterior. El codigo de recuperacion no cambia y no se devuelve. Sin nivel. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "RecoverPlayerResponse".
 */
export interface RecoverPlayerResponse {
  playerId: PlayerId;
  token: PlayerToken;
  nickname: string;
}
/**
 * Respuesta de GET /v1/me (200, con token del player). Solo datos del propio player. Sin nivel. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "MeResponse".
 */
export interface MeResponse {
  nickname: string;
  score: number;
}
/**
 * Respuesta de GET /v1/healthz. No toca la base. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "HealthResponse".
 */
export interface HealthResponse {
  status: "ok";
}
/**
 * Un desafio del set del dia, tal como se publico (copia). Texto plano, nunca HTML. La regla de logro viaja dentro de `mechanic.config` y el juego no la muestra. Si falta `points`, rige el de la dificultad. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "DayItem".
 */
export interface DayItem {
  challengeId: ChallengeId;
  text: string;
  mechanic: Mechanic;
  difficulty: number;
  points?: number;
  family?: "resolver" | "descubrir" | "crear";
  assets: AssetId[];
}
/**
 * Respuesta de GET /v1/day (200, con token del player, Cache-Control private no-store). `serverTime` y `dayEndsAt` son la hora del servidor: el juego calcula la diferencia con su reloj. `status` `available`: `items` trae el set de este player para `date` (queda fijo todo el dia); `noSet`: no hay set y `items` va vacio (el juego decide el texto; `dayEndsAt` sigue presente). `completedChallengeIds`: desafios del set ya logrados. No dice de donde salio el set, ni el grupo, ni el nivel. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "DayResponse".
 */
export interface DayResponse {
  serverTime: IsoDateTime;
  date: DayKey;
  dayEndsAt: IsoDateTime;
  status: "available" | "noSet";
  items: DayItem[];
  completedChallengeIds: ChallengeId[];
  score: number;
}
/**
 * Cuerpo de POST /v1/results (con token del player). Solo se envia un desafio LOGRADO. `eventId` lo genera el juego y se reenvia igual en los reintentos. `date` es la fecha del set (hoy, o ayer dentro de la tolerancia de medianoche). `durationMs`: milisegundos entre abrir y lograr, hasta 24 h. Los servidores toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "SubmitResultRequest".
 */
export interface SubmitResultRequest {
  eventId: EventId;
  date: DayKey;
  challengeId: ChallengeId;
  durationMs: number;
}
/**
 * Respuesta de POST /v1/results (200, tambien al reenviar el mismo logro). `score` es el puntaje actual del player: el cliente lo REEMPLAZA, no lo suma. `pointsEarned` son los puntos de ese logro. Sin nivel, sin intentos, sin solucion. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "SubmitResultResponse".
 */
export interface SubmitResultResponse {
  score: number;
  pointsEarned: number;
}
/**
 * Respuesta de GET /v1/panel/auth/me y parte de PanelSession. Sin hashes. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelAccount".
 */
export interface PanelAccount {
  id: AccountId;
  email: Email;
  role: AccountRole;
  mustChangePassword: boolean;
}
/**
 * Cuerpo de POST /v1/panel/auth/login (publico, con limite por IP y correo). El schema no impone la politica de contrasenas: un login con contrasena corta responde igual que uno equivocado.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "LoginRequest".
 */
export interface LoginRequest {
  email: string;
  password: string;
}
/**
 * Cuerpo de POST /v1/panel/auth/refresh (publico: el refresh token es la credencial).
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "RefreshRequest".
 */
export interface RefreshRequest {
  refreshToken: PanelRefreshToken;
}
/**
 * Cuerpo de POST /v1/panel/auth/logout (publico, responde 204 sin cuerpo, tambien si el token ya no existe).
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "LogoutRequest".
 */
export interface LogoutRequest {
  refreshToken: PanelRefreshToken;
}
/**
 * Cuerpo de POST /v1/panel/auth/change-password (requiere access token; unica operacion permitida con mustChangePassword). La nueva: 15 a 128 caracteres, sin reglas de composicion (propuesta, ASVS 5.0 v6.2.1).
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "ChangePasswordRequest".
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
/**
 * Respuesta 200 de login, refresh y change-password. `expiresAt` es el vencimiento del access token. Los tokens solo existen en claro en esta respuesta. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelSession".
 */
export interface PanelSession {
  accessToken: AccessToken;
  refreshToken: PanelRefreshToken;
  expiresAt: IsoDateTime;
  account: PanelAccount;
}
/**
 * Documento de la coleccion `accounts`, serializado a JSON (en la base los instantes son Date BSON). NUNCA sale por la API: PanelAccount es lo que se devuelve.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "AccountRecord".
 */
export interface AccountRecord {
  _id: AccountId;
  email: Email;
  role: AccountRole;
  passwordHash: string;
  mustChangePassword: boolean;
  active: boolean;
  createdAt: IsoDateTime;
  passwordChangedAt: IsoDateTime;
  lastLoginAt?: IsoDateTime;
}
/**
 * Respuesta de GET .../deletion-impact: cuantos datos afecta la eliminacion. Las claves dependen del recurso.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "DeletionImpact".
 */
export interface DeletionImpact {
  counts: {
    [k: string]: number | undefined;
  };
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelGroup".
 */
export interface PanelGroup {
  id: GroupId;
  name: string;
  code: GroupCode;
  ownerIds: AccountId[];
  maxSize: number;
  active: boolean;
  createdAt: IsoDateTime;
  playerCount: number;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelGroupList".
 */
export interface PanelGroupList {
  items: PanelGroup[];
}
/**
 * Un moderator queda como unico dueño; `ownerIds` solo lo respeta si quien crea es administrator. `maxSize` por defecto 50.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "CreateGroupRequest".
 */
export interface CreateGroupRequest {
  name: string;
  maxSize?: number;
  ownerIds?: AccountId[];
}
/**
 * `ownerIds` solo lo cambia un administrator.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "UpdateGroupRequest".
 */
export interface UpdateGroupRequest {
  name?: string;
  maxSize?: number;
  active?: boolean;
  ownerIds?: AccountId[];
}
/**
 * Ficha de un player para el panel. Aca SI va el nivel. Nunca token ni codigo.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelPlayer".
 */
export interface PanelPlayer {
  id: PlayerId;
  nickname: string;
  groupId: GroupId | null;
  level: number;
  score: number;
  countsByDifficulty: {
    [k: string]: number | undefined;
  };
  countsByFamily: {
    [k: string]: number | undefined;
  };
  createdAt: IsoDateTime;
  lastActiveAt: IsoDateTime;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelPlayerList".
 */
export interface PanelPlayerList {
  items: PanelPlayer[];
  nextCursor: PageCursor | null;
}
/**
 * Ficha con la actividad de los ultimos 30 dias cerrados (sin hoy): logros por dia.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelPlayerDetail".
 */
export interface PanelPlayerDetail {
  player: PanelPlayer;
  activity: {
    date: DayKey;
    achieved: number;
  }[];
}
/**
 * Cuerpo de PATCH /players/:id. `groupId` null = sacar del grupo.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "MovePlayerRequest".
 */
export interface MovePlayerRequest {
  groupId: GroupId | null;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "MovePlayersRequest".
 */
export interface MovePlayersRequest {
  /**
   * @minItems 1
   */
  playerIds: [PlayerId, ...PlayerId[]];
  groupId: GroupId | null;
}
/**
 * `moved` = cuantos cambiaron de grupo (los que ya estaban en el destino no cuentan).
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "MovePlayersResponse".
 */
export interface MovePlayersResponse {
  moved: number;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "UpdateNicknameRequest".
 */
export interface UpdateNicknameRequest {
  nickname: string;
}
/**
 * El codigo nuevo existe en claro SOLO en esta respuesta.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "ReissueRecoveryResponse".
 */
export interface ReissueRecoveryResponse {
  recoveryCode: RecoveryCode;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelChallenge".
 */
export interface PanelChallenge {
  id: ChallengeId;
  authorId: AccountId;
  status: "active" | "archived";
  version: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  challenge: Challenge;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelChallengeList".
 */
export interface PanelChallengeList {
  items: PanelChallenge[];
  nextCursor: PageCursor | null;
}
/**
 * `outsideRecommendedRange` = no tiene de 3 a 5 desafios (aviso, no error).
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelDaySet".
 */
export interface PanelDaySet {
  id: DaySetId;
  date: DayKey;
  groupId: GroupId | null;
  status: "draft" | "published";
  challengeIds: ChallengeId[];
  lockedAt: IsoDateTime | null;
  outsideRecommendedRange: boolean;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelDaySetList".
 */
export interface PanelDaySetList {
  items: PanelDaySet[];
}
/**
 * Cuerpo de PUT /day-sets: guarda el borrador de (date, groupId). `groupId` null = set general (solo administrator).
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "SaveDaySetRequest".
 */
export interface SaveDaySetRequest {
  date: DayKey;
  groupId: GroupId | null;
  challengeIds: ChallengeId[];
}
/**
 * Reglas de puntos y nivel (GET para ambos roles, PUT solo administrator). `levels[L]` = lo que hace falta para pasar del nivel L al L+1.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelRules".
 */
export interface PanelRules {
  pointsByDifficulty: {
    [k: string]: number | undefined;
  };
  levels: {
    requirements: {
      difficulty: number;
      family?: "resolver" | "descubrir" | "crear";
      min: number;
    }[];
    minScore?: number;
  }[];
  midnightToleranceMinutes: number;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "RateRule".
 */
export interface RateRule {
  max: number;
  windowSeconds: number;
}
/**
 * Limites por IP (solo administrator). Hoy se guardan pero el juego sigue leyendo los de la configuracion (pendiente).
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelLimits".
 */
export interface PanelLimits {
  register: RateRule;
  groupCode: RateRule;
  recover: RateRule;
  login: RateRule;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "PanelBannedWords".
 */
export interface PanelBannedWords {
  version: number;
  words: string[];
}
/**
 * Reemplaza la lista completa. Cada cambio sube la version.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "UpdateBannedWordsRequest".
 */
export interface UpdateBannedWordsRequest {
  words: string[];
}
/**
 * Cuenta tal como la ve el administrator. Sin hashes.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "AccountSummary".
 */
export interface AccountSummary {
  id: AccountId;
  email: Email;
  role: AccountRole;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: IsoDateTime;
  lastLoginAt?: IsoDateTime;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "AccountSummaryList".
 */
export interface AccountSummaryList {
  items: AccountSummary[];
}
/**
 * Crea un moderator con contraseña temporal (queda con mustChangePassword).
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "CreateModeratorRequest".
 */
export interface CreateModeratorRequest {
  email: string;
  temporaryPassword: TemporaryPassword;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "UpdateAccountRequest".
 */
export interface UpdateAccountRequest {
  email?: string;
  active?: boolean;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "ResetPasswordRequest".
 */
export interface ResetPasswordRequest {
  temporaryPassword: TemporaryPassword;
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "InviteModeratorRequest".
 */
export interface InviteModeratorRequest {
  email: string;
}
/**
 * `emailSent` false = el envio se omitio (sin SMTP configurado en desarrollo) o fallo. `link` SOLO existe con NODE_ENV=development.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "InvitationResponse".
 */
export interface InvitationResponse {
  email: Email;
  expiresAt: IsoDateTime;
  emailSent: boolean;
  link?: string;
}
/**
 * Cuerpo de POST /v1/panel/auth/accept-invitation (publico, con limite por IP). Crea el moderator activo.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "AcceptInvitationRequest".
 */
export interface AcceptInvitationRequest {
  token: string;
  password: string;
}
/**
 * Datos hasta AYER (nunca hoy). `to` es el ultimo dia incluido.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "StatsOverview".
 */
export interface StatsOverview {
  from: DayKey;
  to: DayKey;
  totalPlayers: number;
  newPlayers: number;
  groupsCreated: number;
  enteredOnLastDay: number;
  withResultOnLastDay: number;
  resultsOnLastDay: number;
  daily: {
    date: DayKey;
    entered: number;
    withResult: number;
  }[];
  playersByLevel: {
    level: number;
    count: number;
  }[];
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "StatsChallenges".
 */
export interface StatsChallenges {
  from: DayKey;
  to: DayKey;
  items: {
    challengeId: ChallengeId;
    achieved: number;
    avgDurationMs: number;
    byDay: {
      date: DayKey;
      achieved: number;
    }[];
  }[];
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "StatsRegistrations".
 */
export interface StatsRegistrations {
  from: DayKey;
  to: DayKey;
  items: {
    date: DayKey;
    count: number;
  }[];
}
/**
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "StatsGroups".
 */
export interface StatsGroups {
  from: DayKey;
  to: DayKey;
  items: {
    groupId: GroupId;
    name: string;
    playerCount: number;
    maxSize: number;
    activePlayers: number;
    results: number;
  }[];
}
/**
 * Dos listas por grupo, solo para el panel. Compromiso: dias que entro y logros sobre los desafios disponibles en el rango. Avance: nivel y puntaje.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "StatsRankings".
 */
export interface StatsRankings {
  from: DayKey;
  to: DayKey;
  groups: {
    groupId: GroupId;
    name: string;
    commitment: {
      playerId: PlayerId;
      nickname: string;
      daysEntered: number;
      achieved: number;
      available: number;
    }[];
    progress: {
      playerId: PlayerId;
      nickname: string;
      level: number;
      score: number;
    }[];
  }[];
}

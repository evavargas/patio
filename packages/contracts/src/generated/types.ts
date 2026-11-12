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

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
 * Respuesta de GET /v1/healthz. No toca la base. Los clientes toleran campos nuevos.
 *
 * This interface was referenced by `IndexSchemaJson`'s JSON-Schema
 * via the `definition` "HealthResponse".
 */
export interface HealthResponse {
  status: "ok";
}

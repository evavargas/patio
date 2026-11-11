import Ajv2020 from "ajv/dist/2020.js";
import bannedWords from "../schemas/banned-words.schema.json" with { type: "json" };
import challenge from "../schemas/challenge.schema.json" with { type: "json" };
import dragDrop from "../schemas/drag-drop.schema.json" with { type: "json" };
import error from "../schemas/error.schema.json" with { type: "json" };
import health from "../schemas/health.schema.json" with { type: "json" };
import mechanic from "../schemas/mechanic.schema.json" with { type: "json" };
import player from "../schemas/player.schema.json" with { type: "json" };
import numberInput from "../schemas/number-input.schema.json" with { type: "json" };
import primitives from "../schemas/primitives.schema.json" with { type: "json" };
import wordDrop from "../schemas/word-drop.schema.json" with { type: "json" };
import type { BannedWordsResponse, Challenge, DayKey, ErrorBody, HealthResponse, IsoDateTime, MeResponse, PlayerId, PlayerToken, RecoverPlayerRequest, RecoverPlayerResponse, RegisterPlayerRequest, RegisterPlayerResponse } from "./generated/types.ts";

const ajv = new Ajv2020({ strict: true });
ajv.addKeyword("tsType"); // solo lo lee el generador de tipos
for (const s of [primitives, error, health, bannedWords, player, dragDrop, numberInput, wordDrop, mechanic, challenge]) {
  ajv.addSchema(s);
}

const compile = <T>(ref: string): ((v: unknown) => v is T) => {
  const fn = ajv.getSchema<T>(ref);
  if (!fn) throw new Error(`Schema no registrado: ${ref}`);
  return (v: unknown): v is T => fn(v) === true;
};

export const isChallenge = compile<Challenge>("challenge.schema.json");
export const isDayKey = compile<DayKey>("primitives.schema.json#/$defs/DayKey");
export const isIsoDateTime = compile<IsoDateTime>("primitives.schema.json#/$defs/IsoDateTime");
export const isPlayerId = compile<PlayerId>("primitives.schema.json#/$defs/PlayerId");
export const isErrorBody = compile<ErrorBody>("error.schema.json#/$defs/ErrorBody");
export const isBannedWordsResponse = compile<BannedWordsResponse>("banned-words.schema.json#/$defs/BannedWordsResponse");
export const isHealthResponse = compile<HealthResponse>("health.schema.json#/$defs/HealthResponse");

/** Catalogo de codigos de dominio, leido del schema (misma fuente que el tipo ErrorCode). */
export const ERROR_CODES: readonly string[] = error.$defs.ErrorCode.enum;
export const isRegisterPlayerRequest = compile<RegisterPlayerRequest>("player.schema.json#/$defs/RegisterPlayerRequest");
export const isRegisterPlayerResponse = compile<RegisterPlayerResponse>("player.schema.json#/$defs/RegisterPlayerResponse");
export const isRecoverPlayerRequest = compile<RecoverPlayerRequest>("player.schema.json#/$defs/RecoverPlayerRequest");
export const isRecoverPlayerResponse = compile<RecoverPlayerResponse>("player.schema.json#/$defs/RecoverPlayerResponse");
export const isMeResponse = compile<MeResponse>("player.schema.json#/$defs/MeResponse");
export const isPlayerToken = compile<PlayerToken>("primitives.schema.json#/$defs/PlayerToken");

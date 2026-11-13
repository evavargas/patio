import Ajv2020 from "ajv/dist/2020.js";
import account from "../schemas/account.schema.json" with { type: "json" };
import bannedWords from "../schemas/banned-words.schema.json" with { type: "json" };
import day from "../schemas/day.schema.json" with { type: "json" };
import challenge from "../schemas/challenge.schema.json" with { type: "json" };
import dragDrop from "../schemas/drag-drop.schema.json" with { type: "json" };
import error from "../schemas/error.schema.json" with { type: "json" };
import health from "../schemas/health.schema.json" with { type: "json" };
import mechanic from "../schemas/mechanic.schema.json" with { type: "json" };
import player from "../schemas/player.schema.json" with { type: "json" };
import panel from "../schemas/panel.schema.json" with { type: "json" };
import numberInput from "../schemas/number-input.schema.json" with { type: "json" };
import result from "../schemas/result.schema.json" with { type: "json" };
import primitives from "../schemas/primitives.schema.json" with { type: "json" };
import wordDrop from "../schemas/word-drop.schema.json" with { type: "json" };
import type { AcceptInvitationRequest, CreateGroupRequest, CreateModeratorRequest, InviteModeratorRequest, MovePlayerRequest, MovePlayersRequest, PanelLimits, PanelRules, ResetPasswordRequest, SaveDaySetRequest, UpdateAccountRequest, UpdateBannedWordsRequest, UpdateGroupRequest, UpdateNicknameRequest, AccountId, AccountRecord, DaySetId, GroupId, Email, BannedWordsResponse, ChangePasswordRequest, LoginRequest, LogoutRequest, PanelAccount, PanelSession, RefreshRequest, Challenge, ChallengeId, DayKey, DayResponse, SubmitResultRequest, SubmitResultResponse, ErrorBody, HealthResponse, IsoDateTime, MeResponse, PlayerId, PlayerToken, RecoverPlayerRequest, RecoverPlayerResponse, RegisterPlayerRequest, RegisterPlayerResponse } from "./generated/types.ts";

const ajv = new Ajv2020({ strict: true });
ajv.addKeyword("tsType"); // solo lo lee el generador de tipos
for (const s of [primitives, account, panel, error, health, bannedWords, player, dragDrop, numberInput, wordDrop, mechanic, challenge, day, result]) {
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
export const isDayResponse = compile<DayResponse>("day.schema.json#/$defs/DayResponse");
export const isSubmitResultRequest = compile<SubmitResultRequest>("result.schema.json#/$defs/SubmitResultRequest");
export const isSubmitResultResponse = compile<SubmitResultResponse>("result.schema.json#/$defs/SubmitResultResponse");
export const isChallengeId = compile<ChallengeId>("primitives.schema.json#/$defs/ChallengeId");

// Panel (/v1/panel): formas propias, nunca las de /v1.
export const isLoginRequest = compile<LoginRequest>("account.schema.json#/$defs/LoginRequest");
export const isRefreshRequest = compile<RefreshRequest>("account.schema.json#/$defs/RefreshRequest");
export const isLogoutRequest = compile<LogoutRequest>("account.schema.json#/$defs/LogoutRequest");
export const isChangePasswordRequest = compile<ChangePasswordRequest>("account.schema.json#/$defs/ChangePasswordRequest");
export const isPanelSession = compile<PanelSession>("account.schema.json#/$defs/PanelSession");
export const isPanelAccount = compile<PanelAccount>("account.schema.json#/$defs/PanelAccount");
export const isAccountRecord = compile<AccountRecord>("account.schema.json#/$defs/AccountRecord");
export const isEmail = compile<Email>("account.schema.json#/$defs/Email");
export const isAccountId = compile<AccountId>("primitives.schema.json#/$defs/AccountId");

// Panel: pedidos de /v1/panel (formas propias).
export const isCreateGroupRequest = compile<CreateGroupRequest>("panel.schema.json#/$defs/CreateGroupRequest");
export const isUpdateGroupRequest = compile<UpdateGroupRequest>("panel.schema.json#/$defs/UpdateGroupRequest");
export const isMovePlayerRequest = compile<MovePlayerRequest>("panel.schema.json#/$defs/MovePlayerRequest");
export const isMovePlayersRequest = compile<MovePlayersRequest>("panel.schema.json#/$defs/MovePlayersRequest");
export const isUpdateNicknameRequest = compile<UpdateNicknameRequest>("panel.schema.json#/$defs/UpdateNicknameRequest");
export const isSaveDaySetRequest = compile<SaveDaySetRequest>("panel.schema.json#/$defs/SaveDaySetRequest");
export const isPanelRules = compile<PanelRules>("panel.schema.json#/$defs/PanelRules");
export const isPanelLimits = compile<PanelLimits>("panel.schema.json#/$defs/PanelLimits");
export const isUpdateBannedWordsRequest = compile<UpdateBannedWordsRequest>("panel.schema.json#/$defs/UpdateBannedWordsRequest");
export const isCreateModeratorRequest = compile<CreateModeratorRequest>("panel.schema.json#/$defs/CreateModeratorRequest");
export const isUpdateAccountRequest = compile<UpdateAccountRequest>("panel.schema.json#/$defs/UpdateAccountRequest");
export const isResetPasswordRequest = compile<ResetPasswordRequest>("panel.schema.json#/$defs/ResetPasswordRequest");
export const isInviteModeratorRequest = compile<InviteModeratorRequest>("panel.schema.json#/$defs/InviteModeratorRequest");
export const isAcceptInvitationRequest = compile<AcceptInvitationRequest>("panel.schema.json#/$defs/AcceptInvitationRequest");

/** Un validador por forma del panel (nombre del def -> validador). Lo usan las pruebas de ejemplos. */
export const panelValidators: Record<string, (v: unknown) => boolean> = Object.fromEntries(
  Object.keys(panel.$defs).map((name) => [name, compile<unknown>(`panel.schema.json#/$defs/${name}`)]),
);
export const isGroupId = compile<GroupId>("primitives.schema.json#/$defs/GroupId");
export const isDaySetId = compile<DaySetId>("primitives.schema.json#/$defs/DaySetId");

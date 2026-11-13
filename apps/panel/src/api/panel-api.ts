import type {
  AcceptInvitationRequest,
  AccountSummary,
  AccountSummaryList,
  Challenge,
  ChangePasswordRequest,
  CreateGroupRequest,
  DeletionImpact,
  InvitationResponse,
  LoginRequest,
  LogoutRequest,
  MovePlayersRequest,
  MovePlayersResponse,
  PanelAccount,
  PanelBannedWords,
  PanelChallenge,
  PanelDaySet,
  PanelDaySetList,
  PanelLimits,
  PanelRules,
  PanelChallengeList,
  PanelGroup,
  PanelGroupList,
  PanelPlayer,
  PanelPlayerDetail,
  PanelPlayerList,
  PanelSession,
  ReissueRecoveryResponse,
  SaveDaySetRequest,
  StatsChallenges,
  StatsOverview,
  StatsRankings,
  StatsRegistrations,
  UpdateAccountRequest,
  UpdateBannedWordsRequest,
  UpdateGroupRequest,
  UpdateNicknameRequest,
} from "@patio/contracts";
import { requestJson, requestVoid } from "./http";

// Una funcion por endpoint de /v1/panel. Los tipos salen de @patio/contracts.
export const login = (body: LoginRequest) => requestJson<PanelSession>("/auth/login", { body });
export const logout = (body: LogoutRequest) => requestVoid("/auth/logout", { body });
export const changePassword = (body: ChangePasswordRequest) =>
  requestJson<PanelSession>("/auth/change-password", { body, auth: true });
export const getMe = () => requestJson<PanelAccount>("/auth/me", { method: "GET", auth: true });

// Publico, responde 204: despues de aceptar se entra por login.
export const acceptInvitation = (body: AcceptInvitationRequest) => requestVoid("/auth/accept-invitation", { body });

// ---- Vistas de la parte 1 (grupos, players, stats, rankings) ----
const qs = (params: Record<string, string | number | undefined>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s === "" ? "" : `?${s}`;
};
const get = <T>(path: string) => requestJson<T>(path, { method: "GET", auth: true });
const send = <T>(path: string, method: "POST" | "PATCH" | "PUT", body?: unknown) => requestJson<T>(path, { method, body, auth: true });

export const listGroups = () => get<PanelGroupList>("/groups");
export const createGroup = (body: CreateGroupRequest) => send<PanelGroup>("/groups", "POST", body);
export const updateGroup = (id: string, body: UpdateGroupRequest) => send<PanelGroup>(`/groups/${id}`, "PATCH", body);
export const regenerateGroupCode = (id: string) => send<PanelGroup>(`/groups/${id}/regenerate-code`, "POST");
export const groupDeletionImpact = (id: string) => get<DeletionImpact>(`/groups/${id}/deletion-impact`);
export const deleteGroup = (id: string) => requestVoid(`/groups/${id}?confirm=true`, { method: "DELETE", auth: true });

export interface PlayerFilters {
  groupId?: string;
  level?: number;
  inactiveDays?: number;
  cursor?: string;
  limit?: number;
}
export const listPlayers = (f: PlayerFilters) => get<PanelPlayerList>(`/players${qs({ ...f })}`);
export const getPlayer = (id: string) => get<PanelPlayerDetail>(`/players/${id}`);
export const movePlayers = (body: MovePlayersRequest) => send<MovePlayersResponse>("/players/move", "POST", body);
export const reissueRecovery = (id: string) => send<ReissueRecoveryResponse>(`/players/${id}/reissue-recovery`, "POST");
export const updateNickname = (id: string, body: UpdateNicknameRequest) => send<PanelPlayer>(`/players/${id}/nickname`, "PATCH", body);
export const playerDeletionImpact = (id: string) => get<DeletionImpact>(`/players/${id}/deletion-impact`);
export const deletePlayer = (id: string) => requestVoid(`/players/${id}?confirm=true`, { method: "DELETE", auth: true });

export interface StatsFilters {
  from?: string;
  to?: string;
  groupId?: string;
}
export const statsOverview = (f: StatsFilters) => get<StatsOverview>(`/stats/overview${qs({ ...f })}`);
export const statsChallenges = (f: StatsFilters) => get<StatsChallenges>(`/stats/challenges${qs({ ...f })}`);
export const statsRegistrations = (f: StatsFilters) => get<StatsRegistrations>(`/stats/registrations${qs({ ...f })}`);
export const statsRankings = (f: StatsFilters) => get<StatsRankings>(`/stats/rankings${qs({ ...f })}`);
// Solo para mostrar el texto de cada desafio en los graficos (hasta 100).
export const listChallengeTitles = () => get<PanelChallengeList>(`/challenges${qs({ limit: 100 })}`);

// ---- Vistas de la parte 2 (desafios, dias, reglas, palabras, cuentas) ----
export interface ChallengeFilters {
  status?: string;
  mechanic?: string;
  difficulty?: number;
  family?: string;
  mine?: boolean;
  cursor?: string;
  limit?: number;
}
export const listChallenges = (f: ChallengeFilters) => get<PanelChallengeList>(`/challenges${qs({ ...f, mine: f.mine ? "true" : undefined })}`);
export const getChallenge = (id: string) => get<PanelChallenge>(`/challenges/${id}`);
export const createChallenge = (body: Challenge) => send<PanelChallenge>("/challenges", "POST", body);
export const updateChallenge = (id: string, body: Challenge) => send<PanelChallenge>(`/challenges/${id}`, "PUT", body);
export const duplicateChallenge = (id: string) => send<PanelChallenge>(`/challenges/${id}/duplicate`, "POST");
export const archiveChallenge = (id: string) => send<PanelChallenge>(`/challenges/${id}/archive`, "POST");

export const listDaySets = (f: { from: string; to: string; groupId?: string }) => get<PanelDaySetList>(`/day-sets${qs({ ...f })}`);
export const saveDaySet = (body: SaveDaySetRequest) => send<PanelDaySet>("/day-sets", "PUT", body);
export const publishDaySet = (id: string) => send<PanelDaySet>(`/day-sets/${id}/publish`, "POST");
export const unpublishDaySet = (id: string) => send<PanelDaySet>(`/day-sets/${id}/unpublish`, "POST");
export const daySetDeletionImpact = (id: string) => get<DeletionImpact>(`/day-sets/${id}/deletion-impact`);
export const deleteDaySet = (id: string) => requestVoid(`/day-sets/${id}?confirm=true`, { method: "DELETE", auth: true });

export const getRules = () => get<PanelRules>("/rules");
export const putRules = (body: PanelRules) => send<PanelRules>("/rules", "PUT", body);
export const getLimits = () => get<PanelLimits>("/limits");
export const putLimits = (body: PanelLimits) => send<PanelLimits>("/limits", "PUT", body);
export const getBannedWords = () => get<PanelBannedWords>("/banned-words");
export const putBannedWords = (body: UpdateBannedWordsRequest) => send<PanelBannedWords>("/banned-words", "PUT", body);

export const listAccounts = () => get<AccountSummaryList>("/accounts");
export const inviteModerator = (email: string) => send<InvitationResponse>("/accounts/invitations", "POST", { email });
export const updateAccount = (id: string, body: UpdateAccountRequest) => send<AccountSummary>(`/accounts/${id}`, "PATCH", body);
export const resetPassword = (id: string, temporaryPassword: string) => requestVoid(`/accounts/${id}/reset-password`, { body: { temporaryPassword }, auth: true });
export const accountDeletionImpact = (id: string) => get<DeletionImpact>(`/accounts/${id}/deletion-impact`);
export const deleteAccount = (id: string) => requestVoid(`/accounts/${id}?confirm=true`, { method: "DELETE", auth: true });

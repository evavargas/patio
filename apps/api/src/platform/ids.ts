import { type AccountId, type ChallengeId, type DaySetId, type GroupId, type PlayerId, isAccountId, isChallengeId, isDayKey, type DayKey, isDaySetId, isGroupId, isPlayerId } from "@patio/contracts";

// Los ids guardados salen a la API con su tipo de marca. Un id fuera del contrato es un dato corrupto: se falla fuerte.
const brand = <T extends string>(check: (v: unknown) => v is T, kind: string) => (value: string): T => {
  if (!check(value)) throw new Error(`${kind} guardado fuera del contrato`);
  return value;
};

export const groupIdOf = brand<GroupId>(isGroupId, "GroupId");
export const playerIdOf = brand<PlayerId>(isPlayerId, "PlayerId");
export const challengeIdOf = brand<ChallengeId>(isChallengeId, "ChallengeId");
export const daySetIdOf = brand<DaySetId>(isDaySetId, "DaySetId");
export const accountIdOf = brand<AccountId>(isAccountId, "AccountId");
export const dayKeyOf = brand<DayKey>(isDayKey, "DayKey");

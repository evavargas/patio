import type { PanelChallenge, PanelDaySet, PanelGroup, PanelPlayer } from "@patio/contracts";
import type { ChallengeDoc } from "../challenges/challenges.repository.ts";
import type { DaySetDoc } from "../day-sets/day-sets.repository.ts";
import type { GroupDoc } from "../groups/groups.repository.ts";
import type { PlayerPanelDoc } from "../players/players.repository.ts";
import { accountIdOf, challengeIdOf, dayKeyOf, daySetIdOf, groupIdOf, playerIdOf } from "../platform/ids.ts";

export const toPanelGroup = (g: GroupDoc, playerCount: number): PanelGroup => ({
  id: groupIdOf(g._id),
  name: g.name,
  code: g.code,
  ownerIds: g.ownerIds.map(accountIdOf),
  maxSize: g.maxSize,
  active: g.active,
  createdAt: g.createdAt.toISOString(),
  playerCount,
});

/** Aca SI va el nivel (solo panel). Nunca tokenHash ni recoveryHash: la proyeccion de la lectura ya no los trae. */
export const toPanelPlayer = (p: PlayerPanelDoc): PanelPlayer => ({
  id: playerIdOf(p._id),
  nickname: p.nickname,
  groupId: p.groupId === null ? null : groupIdOf(p.groupId),
  level: p.level,
  score: p.score,
  countsByDifficulty: p.countsByDifficulty,
  countsByFamily: p.countsByFamily,
  createdAt: p.createdAt.toISOString(),
  lastActiveAt: p.lastActiveAt.toISOString(),
});

export const toPanelChallenge = (c: ChallengeDoc): PanelChallenge => ({
  id: challengeIdOf(c._id),
  authorId: accountIdOf(c.authorId),
  status: c.status,
  version: c.version,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
  challenge: {
    text: c.text,
    mechanic: c.mechanic,
    difficulty: c.difficulty,
    ...(c.points === undefined ? {} : { points: c.points }),
    ...(c.family === undefined ? {} : { family: c.family }),
    assets: c.assets,
  },
});

export const toPanelDaySet = (s: DaySetDoc): PanelDaySet => {
  const ids = s.challengeIds ?? s.items.map((i) => i.challengeId);
  return {
    id: daySetIdOf(s._id),
    date: dayKeyOf(s.date),
    groupId: s.groupId === null ? null : groupIdOf(s.groupId),
    status: s.status,
    challengeIds: ids.map(challengeIdOf),
    lockedAt: s.lockedAt == null ? null : s.lockedAt.toISOString(),
    outsideRecommendedRange: ids.length < 3 || ids.length > 5,
  };
};

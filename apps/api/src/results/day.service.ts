import { Inject, Injectable } from "@nestjs/common";
import { type DayResponse, isChallengeId } from "@patio/contracts";
import { DaySetsService } from "../day-sets/day-sets.service.ts";
import { PlayersService } from "../players/players.service.ts";
import { Clock } from "../platform/clock.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { ResultsRepository } from "./results.repository.ts";

@Injectable()
export class DayService {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(DaySetsService) private readonly daySets: DaySetsService,
    @Inject(ResultsRepository) private readonly results: ResultsRepository,
  ) {}

  /** GET /v1/day. Operaciones tras el guard (1): actividad+grupo, acceso, bloqueo+lectura del set, [insertar acceso], logrados = 4 a 6. */
  async get(playerId: string): Promise<DayResponse> {
    const now = this.clock.now();
    const me = await this.players.touch(playerId, now);
    if (me === null) throw new DomainException("INVALID_TOKEN", 401);
    const { date, set } = await this.daySets.resolveForPlayer(playerId, me.groupId);
    const completed = set === null ? [] : await this.results.challengeIds(playerId, set._id);
    return {
      serverTime: now.toISOString(),
      date,
      dayEndsAt: this.clock.startOfDay(this.clock.nextDay(date)).toISOString(),
      status: set === null ? "noSet" : "available",
      // Se copia campo por campo: lo demas que guarde el set (autor, version) no sale.
      items: (set?.items ?? []).map((i) => ({
        challengeId: i.challengeId,
        text: i.text,
        mechanic: i.mechanic,
        difficulty: i.difficulty,
        assets: i.assets,
        ...(i.points === undefined ? {} : { points: i.points }),
        ...(i.family === undefined ? {} : { family: i.family }),
      })),
      completedChallengeIds: completed.filter(isChallengeId),
      score: me.score,
    };
  }
}

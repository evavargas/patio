import { Inject, Injectable } from "@nestjs/common";
import { type SubmitResultResponse, isSubmitResultRequest } from "@patio/contracts";
import { randomUUID } from "node:crypto";
import { PlayersService } from "../players/players.service.ts";
import { Clock } from "../platform/clock.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { DaySetsService } from "../day-sets/day-sets.service.ts";
import { computeLevel } from "../rules/level.ts";
import { type Rules, RulesService } from "../rules/rules.service.ts";
import { type ResultDoc, ResultsRepository } from "./results.repository.ts";

/** Cuanto vale la reserva de quien esta aplicando un logro (propuesta, sin medir). Pasado este tiempo otro pedido puede completarlo. */
const CLAIM_LEASE_SECONDS = 60;

@Injectable()
export class ResultsService {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(DaySetsService) private readonly daySets: DaySetsService,
    @Inject(RulesService) private readonly rules: RulesService,
    @Inject(ResultsRepository) private readonly repository: ResultsRepository,
  ) {}

  /**
   * POST /v1/results. Operaciones tras el guard (1): reglas, acceso, set, insertar, sumar al player, [subir nivel], marcar aplicado = 6 a 7.
   *
   * Orden sin transacciones: (1) insertar el resultado con `applied=false` y reserva; (2) sumar puntaje y conteos al player en una
   * sola operacion atomica; (3) subir el nivel (`$max`); (4) marcar `applied=true`. Los resultados son la fuente de verdad.
   * Quien inserta es el unico que aplica. Un reintento ve el resultado existente: aplicado -> responde igual; sin aplicar y
   * con reserva vigente -> otro pedido lo esta aplicando, responde igual; reserva vencida -> toma la reserva (compara y cambia)
   * y lo completa. Si el proceso cae entre (2) y (4) y la reserva vence, el reintento suma de nuevo: el recalculo desde
   * `results` es lo que corrige ese caso (ventana de milisegundos).
   */
  async submit(playerId: string, currentScore: number, body: unknown): Promise<SubmitResultResponse> {
    if (!isSubmitResultRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const rules = await this.rules.get();
    const now = this.clock.now();
    this.checkDate(body.date, rules, now);

    const access = await this.daySets.findAccess(playerId, body.date);
    if (access === null) throw new DomainException("DAY_ACCESS_NOT_FOUND", 404);
    const set = await this.daySets.findSet(access.daySetId);
    if (set === null) throw new DomainException("DAY_SET_NOT_FOUND", 404);
    const item = set.items.find((i) => i.challengeId === body.challengeId);
    if (item === undefined) throw new DomainException("CHALLENGE_NOT_IN_SET", 404);

    const doc: ResultDoc = {
      _id: randomUUID(),
      eventId: body.eventId,
      playerId,
      challengeId: body.challengeId,
      daySetId: set._id,
      date: body.date,
      groupId: access.groupId,
      applied: false,
      claimedAt: now,
      durationMs: body.durationMs,
      points: item.points ?? rules.pointsByDifficulty[String(item.difficulty)] ?? 0,
      difficulty: item.difficulty,
      ...(item.family === undefined ? {} : { family: item.family }),
      createdAt: now,
    };
    if (await this.repository.insert(doc)) return this.apply(doc, rules);

    // Choco con un indice unico: el mismo logro (otro o el mismo eventId) o un eventId ya usado para otra cosa.
    const existing = await this.repository.findByKey(playerId, set._id, body.challengeId);
    if (existing === null) throw new DomainException("VALIDATION_FAILED", 400);
    if (!existing.applied && existing.claimedAt.getTime() <= this.clock.addSeconds(now, -CLAIM_LEASE_SECONDS).getTime()) {
      const taken = await this.repository.takeOver(existing._id, existing.claimedAt, now);
      if (taken !== null) return this.apply(taken, rules);
    }
    return { score: currentScore, pointsEarned: existing.points };
  }

  /** Hoy, o ayer mientras no pasen los minutos de tolerancia desde la medianoche. */
  private checkDate(date: string, rules: Rules, now: Date): void {
    const today = this.clock.today();
    if (date === today) return;
    const toleranceEnds = this.clock.addMinutes(this.clock.startOfDay(today), rules.midnightToleranceMinutes);
    if (date === this.clock.previousDay(today) && now.getTime() < toleranceEnds.getTime()) return;
    throw new DomainException("RESULT_DATE_NOT_ALLOWED", 409);
  }

  private async apply(doc: ResultDoc, rules: Rules): Promise<SubmitResultResponse> {
    const progress = await this.players.addResult(doc.playerId, { points: doc.points, difficulty: doc.difficulty, ...(doc.family === undefined ? {} : { family: doc.family }) });
    if (progress === null) throw new DomainException("INVALID_TOKEN", 401); // el player se elimino a mitad de pedido
    const level = computeLevel(rules.levels, progress.level, progress);
    if (level > progress.level) await this.players.raiseLevel(doc.playerId, level);
    await this.repository.markApplied(doc._id);
    return { score: progress.score, pointsEarned: doc.points };
  }
}

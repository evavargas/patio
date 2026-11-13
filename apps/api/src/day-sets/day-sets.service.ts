import { Inject, Injectable } from "@nestjs/common";
import type { DayKey } from "@patio/contracts";
import { randomUUID } from "node:crypto";
import { ChallengesService } from "../challenges/challenges.service.ts";
import type { GroupScope } from "../groups/group-scope.ts";
import { GroupsService } from "../groups/groups.service.ts";
import { Clock } from "../platform/clock.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { challengeIdOf } from "../platform/ids.ts";
import { type DayAccessDoc, type DaySetDoc, DaySetsRepository, type StoredItem } from "./day-sets.repository.ts";

export interface ResolvedDay {
  date: DayKey;
  /** null = sin set. */
  set: DaySetDoc | null;
}

@Injectable()
export class DaySetsService {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(DaySetsRepository) private readonly repository: DaySetsRepository,
    @Inject(ChallengesService) private readonly challenges: Pick<ChallengesService, "findActive" | "assertExist">,
    @Inject(GroupsService) private readonly groups: Pick<GroupsService, "get">,
  ) {}

  /**
   * El set de hoy para un player, ya bloqueado. Precedencia: el que ya tiene fijado por su acceso (si el set fue eliminado se
   * resuelve de nuevo), el publicado de su grupo, el general, ninguno. Operaciones: 3 con acceso previo (acceso, bloqueo+lectura),
   * 3 a 4 la primera vez (acceso, bloqueo+lectura del grupo y quiza del general, insertar acceso).
   *
   * Orden sin transacciones: bloquear ANTES de insertar el acceso. Un corte entre las dos deja un set bloqueado sin acceso
   * (inofensivo); al reves quedaria un acceso a un set que el moderador aun puede editar. El bloqueo y la lectura son una sola
   * operacion atomica, asi que lo que se devuelve es exactamente lo que quedo bloqueado.
   */
  async resolveForPlayer(playerId: string, groupId: string | null): Promise<ResolvedDay> {
    const date = this.clock.today();
    const now = this.clock.now();
    const access = await this.repository.findAccess(playerId, date);
    if (access !== null) {
      const fixed = await this.repository.lockById(access.daySetId, now);
      if (fixed !== null) return { date, set: fixed };
      const fresh = await this.lockForGroup(date, groupId, now);
      if (fresh !== null) await this.repository.repointAccess(playerId, date, fresh._id, groupId);
      return { date, set: fresh };
    }
    const set = await this.lockForGroup(date, groupId, now);
    if (set === null) return { date, set: null };
    if (await this.repository.insertAccess({ playerId, date, daySetId: set._id, groupId, createdAt: now })) return { date, set };
    // Otro pedido del mismo player creo el acceso primero: vale el suyo.
    const winner = await this.repository.findAccess(playerId, date);
    const fixed = winner === null ? null : await this.repository.lockById(winner.daySetId, now);
    return { date, set: fixed ?? set };
  }

  findAccess(playerId: string, date: string): Promise<DayAccessDoc | null> {
    return this.repository.findAccess(playerId, date);
  }

  findSet(id: string): Promise<DaySetDoc | null> {
    return this.repository.findSet(id);
  }

  private async lockForGroup(date: DayKey, groupId: string | null, now: Date): Promise<DaySetDoc | null> {
    if (groupId !== null) {
      const own = await this.repository.lockPublished(date, groupId, now);
      if (own !== null) return own;
    }
    return this.repository.lockPublished(date, null, now);
  }

  // ---- Panel ----

  /** Sets de un rango de fechas dentro del alcance. `groupId` filtra un grupo ("general" = el set general). 1 lectura. */
  list(scope: GroupScope, from: DayKey, to: DayKey, groupId?: string | "general"): Promise<DaySetDoc[]> {
    const own = groupId === undefined ? {} : { groupId: groupId === "general" ? null : groupId };
    return this.repository.list({ $and: [scope.filter("groupId"), own] }, from, to);
  }

  /** FORBIDDEN_SCOPE si el set no es de un grupo permitido; DAY_SET_NOT_FOUND si no existe. 1 lectura. */
  async get(scope: GroupScope, id: string): Promise<DaySetDoc> {
    const set = await this.repository.findSet(id);
    if (set === null) throw new DomainException("DAY_SET_NOT_FOUND", 404);
    if (!scope.allows(set.groupId)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    return set;
  }

  /**
   * PUT: guarda el borrador de (fecha, grupo). Solo con `lockedAt` vacio (SET_LOCKED). Un set publicado y sin bloquear que se
   * edita vuelve a borrador: hay que publicarlo otra vez (propuesta: asi nunca se sirve algo distinto de lo guardado). No se aceptan
   * fechas pasadas. Operaciones: 4 (grupo, desafios, set, escritura).
   */
  async saveDraft(scope: GroupScope, date: DayKey, groupId: string | null, challengeIds: string[]): Promise<DaySetDoc> {
    if (!scope.allows(groupId)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    if (date < this.clock.today()) throw new DomainException("VALIDATION_FAILED", 400);
    if (groupId !== null) await this.groups.get(scope, groupId);
    await this.challenges.assertExist(challengeIds);
    const existing = await this.repository.findByKey(date, groupId);
    if (existing === null) {
      const doc: DaySetDoc = { _id: randomUUID(), date, groupId, status: "draft", items: [], challengeIds, timezone: this.clock.timeZone };
      if (await this.repository.insertDraft(doc)) return doc;
      // Otro pedido lo creo en el medio: se edita ese.
      const winner = await this.repository.findByKey(date, groupId);
      return this.updateDraft(winner?._id ?? doc._id, challengeIds);
    }
    return this.updateDraft(existing._id, challengeIds);
  }

  /** Copia los desafios a `items` (los cambios posteriores del desafio no afectan al set). Sin desafios no se publica. 3 operaciones. */
  async publish(scope: GroupScope, id: string): Promise<DaySetDoc> {
    const set = await this.get(scope, id);
    if (set.lockedAt != null) throw new DomainException("SET_LOCKED", 409);
    const ids = set.challengeIds ?? [];
    if (ids.length === 0) throw new DomainException("VALIDATION_FAILED", 400);
    const items: StoredItem[] = (await this.challenges.findActive(ids)).map((c) => ({
      challengeId: challengeIdOf(c._id),
      text: c.text,
      mechanic: c.mechanic,
      difficulty: c.difficulty,
      assets: c.assets,
      version: c.version,
      ...(c.points === undefined ? {} : { points: c.points }),
      ...(c.family === undefined ? {} : { family: c.family }),
    }));
    return this.orLocked(await this.repository.publish(id, items));
  }

  /** 2 operaciones. */
  async unpublish(scope: GroupScope, id: string): Promise<DaySetDoc> {
    await this.get(scope, id);
    return this.orLocked(await this.repository.unpublish(id));
  }

  /** Cuantos players ya abrieron el set (solo administrator, lo exige quien llama). */
  countAccess(id: string): Promise<number> {
    return this.repository.countAccess(id);
  }

  deleteSet(id: string): Promise<void> {
    return this.repository.deleteSet(id);
  }

  deleteByGroup(groupId: string): Promise<void> {
    return this.repository.deleteByGroup(groupId);
  }

  countSetsByGroup(groupId: string): Promise<number> {
    return this.repository.countSetsByGroup(groupId);
  }

  deleteAccessByPlayer(playerId: string): Promise<void> {
    return this.repository.deleteAccessByPlayer(playerId);
  }

  countAccessByPlayer(playerId: string): Promise<number> {
    return this.repository.countAccessByPlayer(playerId);
  }

  private async updateDraft(id: string, challengeIds: string[]): Promise<DaySetDoc> {
    return this.orLocked(await this.repository.saveDraft(id, challengeIds));
  }

  /** Las escrituras condicionales devuelven null si `lockedAt` ya no esta vacio. */
  private orLocked(set: DaySetDoc | null): DaySetDoc {
    if (set === null) throw new DomainException("SET_LOCKED", 409);
    return set;
  }
}

import { Inject, Injectable } from "@nestjs/common";
import type { DayKey } from "@patio/contracts";
import { Clock } from "../platform/clock.ts";
import { type DayAccessDoc, type DaySetDoc, DaySetsRepository } from "./day-sets.repository.ts";

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
}

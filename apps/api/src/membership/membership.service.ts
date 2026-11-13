import { Inject, Injectable } from "@nestjs/common";
import { type RegisterPlayerResponse, isRegisterPlayerRequest } from "@patio/contracts";
import type { GroupScope } from "../groups/group-scope.ts";
import { GroupsService, type GroupSummary } from "../groups/groups.service.ts";
import { PlayersService } from "../players/players.service.ts";
import { Clock } from "../platform/clock.ts";
import { type AppConfig, CONFIG } from "../platform/config.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { RateLimitService } from "../rate-limit/rate-limit.service.ts";
import { groupError } from "./group-rules.ts";
import { MembershipRepository } from "./membership.repository.ts";

const STATUS = { GROUP_NOT_FOUND: 404, GROUP_INACTIVE: 409, GROUP_FULL: 409 } as const;

@Injectable()
export class MembershipService {
  constructor(
    @Inject(CONFIG) private readonly config: Pick<AppConfig, "limits">,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(RateLimitService) private readonly rateLimit: Pick<RateLimitService, "hit" | "isExceeded">,
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(GroupsService) private readonly groups: Pick<GroupsService, "findByCode" | "get">,
    @Inject(MembershipRepository) private readonly memberships: Pick<MembershipRepository, "open" | "deleteByPlayer" | "closeOpen" | "openMany" | "closeByGroup" | "countByPlayer">,
  ) {}

  /**
   * POST /v1/players (doc 03). Operaciones de base: sin grupo 3 (limite, palabras, jugador). Con grupo 8 (+ lectura
   * del contador de codigos, grupo, cuenta previa, fila de pertenencia, cuenta de verificacion).
   */
  async register(ip: string, body: unknown): Promise<RegisterPlayerResponse> {
    if (!(await this.rateLimit.hit(`register:${ip}`, this.config.limits.register))) throw new DomainException("RATE_LIMITED", 429);
    if (!isRegisterPlayerRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const nickname = await this.players.validateNickname(body.nickname);
    const group = body.groupCode === undefined ? null : await this.findOpenGroup(ip, body.groupCode);

    const identity = this.players.newIdentity();
    const now = this.clock.now();
    // Sin transacciones: primero el historial, despues el jugador (doc 04).
    if (group !== null) await this.memberships.open({ playerId: identity.playerId, groupId: group._id, joinedAt: now });
    try {
      await this.players.create({ identity, nickname, groupId: group?._id ?? null, termsVersion: body.termsVersion, now });
      // Verificacion posterior: dos registros al ultimo lugar pasan ambos la cuenta previa. Si ya somos mas que el maximo, nos retiramos.
      if (group !== null && (await this.players.countInGroup(group._id)) > group.maxSize) throw new DomainException("GROUP_FULL", 409);
    } catch (error) {
      await this.undo(identity.playerId);
      throw error;
    }
    return { playerId: identity.playerId, token: identity.token, recoveryCode: identity.recoveryCode };
  }

  /** El grupo debe existir, estar activo y tener lugar. Los codigos inexistentes cuentan contra la IP. */
  private async findOpenGroup(ip: string, code: string): Promise<GroupSummary> {
    const key = `groupCode:${ip}`;
    const rule = this.config.limits.groupCode;
    if (await this.rateLimit.isExceeded(key, rule)) throw new DomainException("RATE_LIMITED", 429);
    const group = await this.groups.findByCode(code);
    if (group === null) {
      await this.rateLimit.hit(key, rule);
      throw new DomainException("GROUP_NOT_FOUND", STATUS.GROUP_NOT_FOUND);
    }
    const error = groupError(group, await this.players.countInGroup(group._id));
    if (error === "GROUP_INACTIVE" || error === "GROUP_FULL") throw new DomainException(error, STATUS[error]);
    return group;
  }

  /** Orden inverso al de escritura. Si esto tambien falla queda una fila huerfana: la repara el comando de verificacion de pertenencia (pendiente). */
  private async undo(playerId: string): Promise<void> {
    try {
      await this.players.delete(playerId);
      await this.memberships.deleteByPlayer(playerId);
    } catch {
      // se conserva el error original
    }
  }

  /**
   * Mover o sacar players (panel). `targetGroupId` null = sacar del grupo. Reglas: cada player y el destino deben estar en el
   * alcance (FORBIDDEN_SCOPE); solo el alcance total puede pasar el maximo del destino (GROUP_FULL). Operaciones: 1 lectura de players,
   * [destino + cuenta], cerrar filas, [abrir filas], actualizar players = 3 a 5.
   *
   * Orden sin transacciones: historial primero, jugador despues (doc 04). Cerrar es idempotente (solo toca filas abiertas), asi
   * que repetir el pedido repara un corte. Si el corte deja filas nuevas sin jugador movido, el historial queda por delante del
   * jugador: la verificacion de pertenencia (pendiente) toma el historial como verdad. Dos moderadores llenando el mismo grupo a la vez
   * pueden pasar el maximo (el chequeo no es atomico; sin medir).
   */
  async move(scope: GroupScope, playerIds: string[], targetGroupId: string | null): Promise<number> {
    const current = await this.players.groupsOf(playerIds);
    for (const groupId of current.values()) if (!scope.allows(groupId)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    if (!scope.allows(targetGroupId)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    const moving = playerIds.filter((id) => current.get(id) !== targetGroupId);
    if (moving.length === 0) return 0;
    if (targetGroupId !== null) {
      const target = await this.groups.get(scope, targetGroupId);
      if (!scope.isAll && (await this.players.countInGroup(targetGroupId)) + moving.length > target.maxSize) throw new DomainException("GROUP_FULL", 409);
    }
    const now = this.clock.now();
    await this.memberships.closeOpen(moving, now);
    if (targetGroupId !== null) await this.memberships.openMany(moving.map((playerId) => ({ playerId, groupId: targetGroupId, joinedAt: now })));
    await this.players.setGroup(moving, targetGroupId);
    return moving.length;
  }

  /** Efecto de borrar un grupo (despues de borrar el grupo): sus players quedan sin grupo y se cierran las filas. 2 escrituras. Idempotente. */
  async releaseGroup(groupId: string): Promise<void> {
    await this.memberships.closeByGroup(groupId, this.clock.now());
    await this.players.clearGroup(groupId);
  }

  /** Borra las filas de pertenencia de un player (efecto de borrarlo). 1 escritura. */
  deleteRows(playerId: string): Promise<void> {
    return this.memberships.deleteByPlayer(playerId);
  }

  countRows(playerId: string): Promise<number> {
    return this.memberships.countByPlayer(playerId);
  }
}

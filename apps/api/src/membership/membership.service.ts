import { Inject, Injectable } from "@nestjs/common";
import { type RegisterPlayerResponse, isRegisterPlayerRequest } from "@patio/contracts";
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
    @Inject(GroupsService) private readonly groups: Pick<GroupsService, "findByCode">,
    @Inject(MembershipRepository) private readonly memberships: Pick<MembershipRepository, "open" | "deleteByPlayer">,
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
}

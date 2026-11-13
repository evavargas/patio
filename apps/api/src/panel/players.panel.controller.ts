import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { type DeletionImpact, type MovePlayersResponse, type PanelPlayer, type PanelPlayerDetail, type PanelPlayerList, type ReissueRecoveryResponse, isMovePlayerRequest, isMovePlayersRequest, isUpdateNicknameRequest } from "@patio/contracts";
import type { Filter } from "mongodb";
import { type AuthenticatedAccount } from "../accounts/accounts.service.ts";
import { CurrentAccount, PanelGuard, PanelRoles } from "../accounts/panel.guard.ts";
import type { GroupScope } from "../groups/group-scope.ts";
import { GroupsService } from "../groups/groups.service.ts";
import { MembershipService } from "../membership/membership.service.ts";
import { Clock } from "../platform/clock.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { type PlayerDoc } from "../players/players.repository.ts";
import { PlayersService } from "../players/players.service.ts";
import { ResultsService } from "../results/results.service.ts";
import { DeletionsService } from "./deletions.service.ts";
import { toPanelPlayer } from "./panel-mappers.ts";
import { type Query as Q, int, page, requireConfirm, text } from "./panel-query.ts";

const ACTIVITY_DAYS = 30;

/** `/v1/panel/players`. Cada ruta: alcance primero (FORBIDDEN_SCOPE), despues la operacion. */
@Controller("v1/panel/players")
@UseGuards(PanelGuard)
export class PlayersPanelController {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(MembershipService) private readonly membership: MembershipService,
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(DeletionsService) private readonly deletions: DeletionsService,
  ) {}

  /** Filtros: `groupId` (o `none` = sin grupo), `level`, `inactiveDays`, `cursor`, `limit`. Orden por id. */
  @Get()
  async list(@CurrentAccount() account: AuthenticatedAccount, @Query() query: Q): Promise<PanelPlayerList> {
    const scope = await this.groups.scopeFor(account);
    const { cursor, limit } = page(query);
    const result = await this.players.listForPanel(this.filter(scope, query), cursor, limit);
    return { items: result.items.map(toPanelPlayer), nextCursor: result.nextCursor };
  }

  /** Ficha con los logros por dia de los ultimos 30 dias cerrados (sin hoy). */
  @Get(":id")
  async detail(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string): Promise<PanelPlayerDetail> {
    const scope = await this.groups.scopeFor(account);
    const player = await this.inScope(scope, id);
    const to = this.clock.previousDay(this.clock.today());
    let from = to;
    for (let i = 1; i < ACTIVITY_DAYS; i++) from = this.clock.previousDay(from);
    const rows = await this.results.achievedByDay(id, from, to);
    return { player: toPanelPlayer(player), activity: rows.map((r) => ({ date: this.clock.dayKey(r.date), achieved: r.achieved })) };
  }

  // Declarada antes que las rutas con `:id` para que "move" no se lea como un id.
  @Post("move")
  @HttpCode(200)
  async moveMany(@CurrentAccount() account: AuthenticatedAccount, @Body() body: unknown): Promise<MovePlayersResponse> {
    // Hasta 50 por pedido (el schema no lo expresa sin volver tupla el tipo generado).
    if (!isMovePlayersRequest(body) || body.playerIds.length > 50) throw new DomainException("VALIDATION_FAILED", 400);
    const scope = await this.groups.scopeFor(account);
    return { moved: await this.membership.move(scope, body.playerIds, body.groupId) };
  }

  @Patch(":id")
  async move(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string, @Body() body: unknown): Promise<PanelPlayer> {
    if (!isMovePlayerRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const scope = await this.groups.scopeFor(account);
    await this.membership.move(scope, [id], body.groupId);
    return toPanelPlayer(await this.players.getForPanel(id));
  }

  @Patch(":id/nickname")
  @PanelRoles("administrator")
  async nickname(@Param("id") id: string, @Body() body: unknown): Promise<PanelPlayer> {
    if (!isUpdateNicknameRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    await this.players.changeNickname(id, body.nickname);
    return toPanelPlayer(await this.players.getForPanel(id));
  }

  /** El codigo nuevo viaja UNA vez, en esta respuesta. */
  @Post(":id/reissue-recovery")
  @HttpCode(200)
  async reissue(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string): Promise<ReissueRecoveryResponse> {
    await this.inScope(await this.groups.scopeFor(account), id);
    const recoveryCode = await this.players.reissueRecovery(id);
    if (!isRecoveryCode(recoveryCode)) throw new Error("codigo generado fuera del contrato");
    return { recoveryCode };
  }

  @Get(":id/deletion-impact")
  @PanelRoles("administrator")
  impact(@Param("id") id: string): Promise<DeletionImpact> {
    return this.deletions.playerImpact(id);
  }

  @Delete(":id")
  @HttpCode(204)
  @PanelRoles("administrator")
  async remove(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string, @Query() query: Q): Promise<void> {
    requireConfirm(query);
    await this.deletions.deletePlayer(account.accountId, id);
  }

  private async inScope(scope: GroupScope, id: string): ReturnType<PlayersService["getForPanel"]> {
    const player = await this.players.getForPanel(id);
    if (!scope.allows(player.groupId)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    return player;
  }

  private filter(scope: GroupScope, query: Q): Filter<PlayerDoc> {
    const parts: Filter<PlayerDoc>[] = [scope.filter("groupId")];
    const groupId = text(query, "groupId");
    if (groupId !== undefined) {
      const target = groupId === "none" ? null : groupId;
      if (!scope.allows(target)) throw new DomainException("FORBIDDEN_SCOPE", 403);
      parts.push({ groupId: target });
    }
    const level = int(query, "level", 0, 1000);
    if (level !== undefined) parts.push({ level });
    const inactiveDays = int(query, "inactiveDays", 1, 3650);
    if (inactiveDays !== undefined) parts.push({ lastActiveAt: { $lt: this.clock.addSeconds(this.clock.now(), -inactiveDays * 86_400) } });
    return { $and: parts };
  }
}

const isRecoveryCode = (value: string): value is ReissueRecoveryResponse["recoveryCode"] => /^[A-HJ-KM-NP-Z2-9]{8}$/.test(value);

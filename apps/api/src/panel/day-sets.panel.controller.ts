import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { type DeletionImpact, type PanelDaySet, type PanelDaySetList, isDayKey, isSaveDaySetRequest } from "@patio/contracts";
import { type AuthenticatedAccount } from "../accounts/accounts.service.ts";
import { CurrentAccount, PanelGuard, PanelRoles } from "../accounts/panel.guard.ts";
import { DaySetsService } from "../day-sets/day-sets.service.ts";
import { GroupsService } from "../groups/groups.service.ts";
import { Clock } from "../platform/clock.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { DeletionsService } from "./deletions.service.ts";
import { toPanelDaySet } from "./panel-mappers.ts";
import { type Query as Q, requireConfirm, text } from "./panel-query.ts";

const MAX_RANGE_DAYS = 92;

/** `/v1/panel/day-sets`. Administrator: cualquier grupo y el general. Moderator: los de sus grupos. */
@Controller("v1/panel/day-sets")
@UseGuards(PanelGuard)
export class DaySetsPanelController {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(DaySetsService) private readonly daySets: DaySetsService,
    @Inject(DeletionsService) private readonly deletions: DeletionsService,
  ) {}

  /** `from` y `to` (AAAA-MM-DD, hasta 92 dias); `groupId` opcional (`general` = el set general). */
  @Get()
  async list(@CurrentAccount() account: AuthenticatedAccount, @Query() query: Q): Promise<PanelDaySetList> {
    const from = text(query, "from");
    const to = text(query, "to");
    if (from === undefined || to === undefined || !isDayKey(from) || !isDayKey(to)) throw new DomainException("VALIDATION_FAILED", 400);
    const span = this.clock.daysBetween(from, to) + 1;
    if (span < 1 || span > MAX_RANGE_DAYS) throw new DomainException("VALIDATION_FAILED", 400);
    const scope = await this.groups.scopeFor(account);
    const groupId = text(query, "groupId");
    if (groupId !== undefined && !scope.allows(groupId === "general" ? null : groupId)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    return { items: (await this.daySets.list(scope, from, to, groupId)).map(toPanelDaySet) };
  }

  @Get(":id")
  async get(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string): Promise<PanelDaySet> {
    return toPanelDaySet(await this.daySets.get(await this.groups.scopeFor(account), id));
  }

  /** Guarda el borrador de (fecha, grupo). SET_LOCKED si ya lo abrio algun player. Fuera de 3 a 5 desafios es un aviso. */
  @Put()
  async save(@CurrentAccount() account: AuthenticatedAccount, @Body() body: unknown): Promise<PanelDaySet> {
    if (!isSaveDaySetRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const scope = await this.groups.scopeFor(account);
    return toPanelDaySet(await this.daySets.saveDraft(scope, body.date, body.groupId, body.challengeIds));
  }

  @Post(":id/publish")
  @HttpCode(200)
  async publish(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string): Promise<PanelDaySet> {
    return toPanelDaySet(await this.daySets.publish(await this.groups.scopeFor(account), id));
  }

  @Post(":id/unpublish")
  @HttpCode(200)
  async unpublish(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string): Promise<PanelDaySet> {
    return toPanelDaySet(await this.daySets.unpublish(await this.groups.scopeFor(account), id));
  }

  @Get(":id/deletion-impact")
  @PanelRoles("administrator")
  impact(@Param("id") id: string): Promise<DeletionImpact> {
    return this.deletions.daySetImpact(id);
  }

  @Delete(":id")
  @HttpCode(204)
  @PanelRoles("administrator")
  async remove(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string, @Query() query: Q): Promise<void> {
    requireConfirm(query);
    await this.deletions.deleteDaySet(account.accountId, id);
  }
}

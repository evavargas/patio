import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import type { StatsChallenges, StatsGroups, StatsOverview, StatsRankings, StatsRegistrations } from "@patio/contracts";
import { type AuthenticatedAccount } from "../accounts/accounts.service.ts";
import { CurrentAccount, PanelGuard } from "../accounts/panel.guard.ts";
import { GroupsService } from "../groups/groups.service.ts";
import { StatsService } from "../stats/stats.service.ts";
import { type Query as Q, text } from "./panel-query.ts";

/** `/v1/panel/stats/*`: `from`, `to` (AAAA-MM-DD, nunca pasa de ayer) y `groupId` opcional. Siempre con alcance. */
@Controller("v1/panel/stats")
@UseGuards(PanelGuard)
export class StatsPanelController {
  constructor(
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(StatsService) private readonly stats: StatsService,
  ) {}

  @Get("overview")
  async overview(@CurrentAccount() account: AuthenticatedAccount, @Query() query: Q): Promise<StatsOverview> {
    return this.stats.overview(await this.groups.scopeFor(account), params(query));
  }

  @Get("challenges")
  async challenges(@CurrentAccount() account: AuthenticatedAccount, @Query() query: Q): Promise<StatsChallenges> {
    return this.stats.challenges(await this.groups.scopeFor(account), params(query));
  }

  @Get("registrations")
  async registrations(@CurrentAccount() account: AuthenticatedAccount, @Query() query: Q): Promise<StatsRegistrations> {
    return this.stats.registrations(await this.groups.scopeFor(account), params(query));
  }

  @Get("groups")
  async groupStats(@CurrentAccount() account: AuthenticatedAccount, @Query() query: Q): Promise<StatsGroups> {
    return this.stats.groups(await this.groups.scopeFor(account), params(query));
  }

  /** Compromiso y avance por grupo. Solo para el panel. */
  @Get("rankings")
  async rankings(@CurrentAccount() account: AuthenticatedAccount, @Query() query: Q): Promise<StatsRankings> {
    return this.stats.rankings(await this.groups.scopeFor(account), params(query));
  }
}

const params = (query: Q): { from?: string; to?: string; groupId?: string } => {
  const from = text(query, "from");
  const to = text(query, "to");
  const groupId = text(query, "groupId");
  return { ...(from === undefined ? {} : { from }), ...(to === undefined ? {} : { to }), ...(groupId === undefined ? {} : { groupId }) };
};

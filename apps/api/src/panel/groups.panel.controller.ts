import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { DeletionImpact, PanelGroup, PanelGroupList } from "@patio/contracts";
import { type AuthenticatedAccount } from "../accounts/accounts.service.ts";
import { CurrentAccount, PanelGuard, PanelRoles } from "../accounts/panel.guard.ts";
import { DeletionsService } from "./deletions.service.ts";
import { PanelGroupsService } from "./panel-groups.service.ts";
import { type Query as Q, requireConfirm } from "./panel-query.ts";

/** `/v1/panel/groups`. Todo pasa por el alcance (en `PanelGroupsService` / `GroupsService`). */
@Controller("v1/panel/groups")
@UseGuards(PanelGuard)
export class GroupsPanelController {
  constructor(
    @Inject(PanelGroupsService) private readonly groups: PanelGroupsService,
    @Inject(DeletionsService) private readonly deletions: DeletionsService,
  ) {}

  @Get()
  list(@CurrentAccount() account: AuthenticatedAccount): Promise<PanelGroupList> {
    return this.groups.list(account);
  }

  @Post()
  create(@CurrentAccount() account: AuthenticatedAccount, @Body() body: unknown): Promise<PanelGroup> {
    return this.groups.create(account, body);
  }

  @Patch(":id")
  update(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string, @Body() body: unknown): Promise<PanelGroup> {
    return this.groups.update(account, id, body);
  }

  @Post(":id/regenerate-code")
  @HttpCode(200)
  regenerateCode(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string): Promise<PanelGroup> {
    return this.groups.regenerateCode(account, id);
  }

  @Get(":id/deletion-impact")
  @PanelRoles("administrator")
  impact(@Param("id") id: string): Promise<DeletionImpact> {
    return this.deletions.groupImpact(id);
  }

  @Delete(":id")
  @HttpCode(204)
  @PanelRoles("administrator")
  async remove(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string, @Query() query: Q): Promise<void> {
    requireConfirm(query);
    await this.deletions.deleteGroup(account.accountId, id);
  }
}

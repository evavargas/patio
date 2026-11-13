import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AccountSummary, AccountSummaryList, DeletionImpact, InvitationResponse } from "@patio/contracts";
import { AccountsAdminService } from "../accounts/accounts-admin.service.ts";
import { type AuthenticatedAccount } from "../accounts/accounts.service.ts";
import { CurrentAccount, PanelGuard, PanelRoles } from "../accounts/panel.guard.ts";
import { DeletionsService } from "./deletions.service.ts";
import { type Query as Q, requireConfirm } from "./panel-query.ts";

/** `/v1/panel/accounts`: solo administrator. */
@Controller("v1/panel/accounts")
@UseGuards(PanelGuard)
@PanelRoles("administrator")
export class AccountsPanelController {
  constructor(
    @Inject(AccountsAdminService) private readonly accounts: AccountsAdminService,
    @Inject(DeletionsService) private readonly deletions: DeletionsService,
  ) {}

  @Get()
  async list(): Promise<AccountSummaryList> {
    return { items: await this.accounts.list() };
  }

  @Post()
  create(@Body() body: unknown): Promise<AccountSummary> {
    return this.accounts.createModerator(body);
  }

  // Antes que `:id` para que "invitations" no se lea como un id.
  @Post("invitations")
  invite(@CurrentAccount() account: AuthenticatedAccount, @Body() body: unknown): Promise<InvitationResponse> {
    return this.accounts.invite(account.accountId, body);
  }

  @Patch(":id")
  update(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string, @Body() body: unknown): Promise<AccountSummary> {
    return this.accounts.update(account.accountId, id, body);
  }

  @Post(":id/reset-password")
  @HttpCode(204)
  async resetPassword(@Param("id") id: string, @Body() body: unknown): Promise<void> {
    await this.accounts.resetPassword(id, body);
  }

  @Get(":id/deletion-impact")
  impact(@Param("id") id: string): Promise<DeletionImpact> {
    return this.deletions.accountImpact(id);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string, @Query() query: Q): Promise<void> {
    requireConfirm(query);
    await this.deletions.deleteAccount(account.accountId, id);
  }
}

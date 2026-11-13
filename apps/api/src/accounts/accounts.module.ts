import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { RateLimitModule } from "../rate-limit/rate-limit.module.ts";
import { AccountsController } from "./accounts.controller.ts";
import { AccountsAdminService } from "./accounts-admin.service.ts";
import { InvitationsRepository } from "./invitations.repository.ts";
import { AccountsRepository } from "./accounts.repository.ts";
import { AccountsService } from "./accounts.service.ts";
import { PanelGuard } from "./panel.guard.ts";
import { RefreshTokensRepository } from "./refresh-tokens.repository.ts";

@Module({
  imports: [DatabaseModule, RateLimitModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountsAdminService, AccountsRepository, InvitationsRepository, RefreshTokensRepository, PanelGuard],
  exports: [AccountsService, AccountsAdminService, PanelGuard],
})
export class AccountsModule {}

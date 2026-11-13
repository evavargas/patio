import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { GroupsModule } from "../groups/groups.module.ts";
import { PlayersModule } from "../players/players.module.ts";
import { RateLimitModule } from "../rate-limit/rate-limit.module.ts";
import { MembershipController } from "./membership.controller.ts";
import { MembershipRepository } from "./membership.repository.ts";
import { MembershipService } from "./membership.service.ts";

@Module({
  imports: [DatabaseModule, PlayersModule, GroupsModule, RateLimitModule],
  controllers: [MembershipController],
  providers: [MembershipService, MembershipRepository],
  exports: [MembershipService],
})
export class MembershipModule {}

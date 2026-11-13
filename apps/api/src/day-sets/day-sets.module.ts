import { Module } from "@nestjs/common";
import { ChallengesModule } from "../challenges/challenges.module.ts";
import { DatabaseModule } from "../database/database.module.ts";
import { GroupsModule } from "../groups/groups.module.ts";
import { DaySetsRepository } from "./day-sets.repository.ts";
import { DaySetsService } from "./day-sets.service.ts";

@Module({
  imports: [DatabaseModule, ChallengesModule, GroupsModule],
  providers: [DaySetsService, DaySetsRepository],
  exports: [DaySetsService],
})
export class DaySetsModule {}

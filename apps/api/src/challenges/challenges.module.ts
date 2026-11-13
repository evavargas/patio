import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { ChallengesRepository } from "./challenges.repository.ts";
import { ChallengesService } from "./challenges.service.ts";

@Module({
  imports: [DatabaseModule],
  providers: [ChallengesService, ChallengesRepository],
  exports: [ChallengesService],
})
export class ChallengesModule {}

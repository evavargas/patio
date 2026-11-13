import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { StatsRepository } from "./stats.repository.ts";
import { StatsService } from "./stats.service.ts";

@Module({
  imports: [DatabaseModule],
  providers: [StatsService, StatsRepository],
  exports: [StatsService],
})
export class StatsModule {}

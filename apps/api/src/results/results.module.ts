import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { DaySetsModule } from "../day-sets/day-sets.module.ts";
import { PlayersModule } from "../players/players.module.ts";
import { RulesModule } from "../rules/rules.module.ts";
import { DayController } from "./day.controller.ts";
import { DayService } from "./day.service.ts";
import { ResultsController } from "./results.controller.ts";
import { ResultsRepository } from "./results.repository.ts";
import { ResultsService } from "./results.service.ts";

// Aca vive tambien `GET /v1/day`: necesita el guard y el grupo del player (players) y el set (day-sets), y day-sets no puede importar players (doc 02).
@Module({
  imports: [DatabaseModule, PlayersModule, DaySetsModule, RulesModule],
  controllers: [DayController, ResultsController],
  providers: [DayService, ResultsService, ResultsRepository],
  exports: [ResultsService],
})
export class ResultsModule {}

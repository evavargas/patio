import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { DaySetsRepository } from "./day-sets.repository.ts";
import { DaySetsService } from "./day-sets.service.ts";

@Module({
  imports: [DatabaseModule],
  providers: [DaySetsService, DaySetsRepository],
  exports: [DaySetsService],
})
export class DaySetsModule {}

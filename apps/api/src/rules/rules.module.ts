import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { RulesRepository } from "./rules.repository.ts";
import { RulesService } from "./rules.service.ts";

@Module({
  imports: [DatabaseModule],
  providers: [RulesService, RulesRepository],
  exports: [RulesService],
})
export class RulesModule {}

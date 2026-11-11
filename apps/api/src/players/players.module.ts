import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { WordFilterModule } from "../word-filter/word-filter.module.ts";
import { PlayersRepository } from "./players.repository.ts";
import { PlayersService } from "./players.service.ts";

@Module({
  imports: [DatabaseModule, WordFilterModule],
  providers: [PlayersService, PlayersRepository],
  exports: [PlayersService],
})
export class PlayersModule {}

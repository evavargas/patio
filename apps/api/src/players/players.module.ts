import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { WordFilterModule } from "../word-filter/word-filter.module.ts";
import { RateLimitModule } from "../rate-limit/rate-limit.module.ts";
import { PlayerTokenGuard } from "./player-token.guard.ts";
import { PlayersController } from "./players.controller.ts";
import { PlayersRepository } from "./players.repository.ts";
import { PlayersService } from "./players.service.ts";

@Module({
  imports: [DatabaseModule, WordFilterModule, RateLimitModule],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersRepository, PlayerTokenGuard],
  exports: [PlayersService, PlayerTokenGuard],
})
export class PlayersModule {}

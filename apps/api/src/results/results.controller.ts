import { Body, Controller, Header, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import type { SubmitResultResponse } from "@patio/contracts";
import { CurrentPlayer, PlayerTokenGuard } from "../players/player-token.guard.ts";
import type { AuthenticatedPlayer } from "../players/players.service.ts";
import { ResultsService } from "./results.service.ts";

@Controller("v1")
export class ResultsController {
  constructor(@Inject(ResultsService) private readonly service: ResultsService) {}

  /** 200 tambien al reenviar el mismo logro: el cliente no distingue el primer envio del reintento. */
  @Post("results")
  @HttpCode(200)
  @UseGuards(PlayerTokenGuard)
  @Header("Cache-Control", "private, no-store")
  submit(@CurrentPlayer() player: AuthenticatedPlayer, @Body() body: unknown): Promise<SubmitResultResponse> {
    return this.service.submit(player.playerId, player.score, body);
  }
}

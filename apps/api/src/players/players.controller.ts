import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { MeResponse, RecoverPlayerResponse } from "@patio/contracts";
import type { Request } from "express";
import { CurrentPlayer, PlayerTokenGuard } from "./player-token.guard.ts";
import { type AuthenticatedPlayer, PlayersService } from "./players.service.ts";

// Las dos respuestas son del propio player (una trae un token): ni proxies ni navegador las guardan.
const NO_STORE = "private, no-store";

@Controller("v1")
export class PlayersController {
  constructor(@Inject(PlayersService) private readonly service: PlayersService) {}

  /** Publico. */
  @Post("players/recover")
  @HttpCode(200)
  @Header("Cache-Control", NO_STORE)
  recover(@Body() body: unknown, @Req() req: Request): Promise<RecoverPlayerResponse> {
    return this.service.recover(req.ip ?? "unknown", body);
  }

  @Get("me")
  @UseGuards(PlayerTokenGuard)
  @Header("Cache-Control", NO_STORE)
  me(@CurrentPlayer() player: AuthenticatedPlayer): MeResponse {
    return { nickname: player.nickname, score: player.score };
  }
}

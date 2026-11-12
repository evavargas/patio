import { Controller, Get, Header, Inject, UseGuards } from "@nestjs/common";
import type { DayResponse } from "@patio/contracts";
import { CurrentPlayer, PlayerTokenGuard } from "../players/player-token.guard.ts";
import type { AuthenticatedPlayer } from "../players/players.service.ts";
import { DayService } from "./day.service.ts";

@Controller("v1")
export class DayController {
  constructor(@Inject(DayService) private readonly service: DayService) {}

  /** Cada player recibe SU set: nunca se cachea en proxies ni en el navegador. */
  @Get("day")
  @UseGuards(PlayerTokenGuard)
  @Header("Cache-Control", "private, no-store")
  day(@CurrentPlayer() player: AuthenticatedPlayer): Promise<DayResponse> {
    return this.service.get(player.playerId);
  }
}

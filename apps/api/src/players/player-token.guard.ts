import { type CanActivate, type ExecutionContext, Inject, Injectable, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";
import { DomainException } from "../platform/domain.exception.ts";
import { type AuthenticatedPlayer, PlayersService } from "./players.service.ts";

type PlayerRequest = Request & { player?: AuthenticatedPlayer };

/** Guard de `/v1`: `Authorization: Bearer <token>`. Toda falla es el mismo INVALID_TOKEN 401 (no revela si el player existe). 1 lectura. */
@Injectable()
export class PlayerTokenGuard implements CanActivate {
  constructor(@Inject(PlayersService) private readonly players: PlayersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PlayerRequest>();
    const player = await this.players.authenticate(req.headers.authorization);
    if (player === null) throw new DomainException("INVALID_TOKEN", 401);
    req.player = player;
    return true;
  }
}

/** El player autenticado por `PlayerTokenGuard`. */
export const CurrentPlayer = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedPlayer => {
  const player = context.switchToHttp().getRequest<PlayerRequest>().player;
  if (player === undefined) throw new DomainException("INVALID_TOKEN", 401);
  return player;
});

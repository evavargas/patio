import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import type { RegisterPlayerResponse } from "@patio/contracts";
import type { Request } from "express";
import { MembershipService } from "./membership.service.ts";

@Controller("v1/players")
export class MembershipController {
  constructor(@Inject(MembershipService) private readonly service: MembershipService) {}

  /** Publico. `req.ip` ya respeta `trust proxy` (config TRUST_PROXY_HOPS). */
  @Post()
  register(@Body() body: unknown, @Req() req: Request): Promise<RegisterPlayerResponse> {
    return this.service.register(req.ip ?? "unknown", body);
  }
}

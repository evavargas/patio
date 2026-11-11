import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@patio/contracts";

@Controller("v1")
export class HealthController {
  @Get("healthz")
  healthz(): HealthResponse {
    return { status: "ok" };
  }
}

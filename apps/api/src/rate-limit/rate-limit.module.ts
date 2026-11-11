import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { RateLimitRepository } from "./rate-limit.repository.ts";
import { RateLimitService } from "./rate-limit.service.ts";

@Module({
  imports: [DatabaseModule],
  providers: [RateLimitService, RateLimitRepository],
  exports: [RateLimitService],
})
export class RateLimitModule {}

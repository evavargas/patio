import { Inject, Injectable } from "@nestjs/common";
import { Clock } from "../platform/clock.ts";
import type { RateRule } from "../platform/config.ts";
import { RateLimitRepository } from "./rate-limit.repository.ts";

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(RateLimitRepository) private readonly repository: Pick<RateLimitRepository, "increment" | "current">,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /** Cuenta un intento. true = sigue dentro del limite. Ventana fija, 1 operacion. */
  async hit(key: string, rule: RateRule): Promise<boolean> {
    const now = this.clock.now();
    return (await this.repository.increment(key, now, this.clock.addSeconds(now, rule.windowSeconds))) <= rule.max;
  }

  /** Mira sin contar. true = ya alcanzo el maximo. 1 operacion. */
  async isExceeded(key: string, rule: RateRule): Promise<boolean> {
    return (await this.repository.current(key, this.clock.now())) >= rule.max;
  }
}

import { type DynamicModule, Global, Module } from "@nestjs/common";
import { Clock } from "./clock.ts";
import { type AppConfig, CONFIG } from "./config.ts";
import { HealthController } from "./health.controller.ts";
import { MAILER, type Mailer, createMailer } from "./mailer.ts";
import { JsonLogger, LOG_SINK, type LogSink, stdoutSink } from "./json-logger.ts";

export interface PlatformOptions {
  config: AppConfig;
  clock?: Clock;
  logSink?: LogSink;
  mailer?: Mailer;
}

@Global()
@Module({})
export class PlatformModule {
  static register({ config, clock, logSink, mailer }: PlatformOptions): DynamicModule {
    return {
      module: PlatformModule,
      controllers: [HealthController],
      providers: [
        { provide: CONFIG, useValue: config },
        { provide: Clock, useValue: clock ?? new Clock(config.timeZone) },
        { provide: LOG_SINK, useValue: logSink ?? stdoutSink },
        { provide: MAILER, useValue: mailer ?? createMailer(config.mail) },
        JsonLogger,
      ],
      exports: [CONFIG, Clock, JsonLogger, MAILER],
    };
  }
}

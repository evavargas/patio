import { Inject, Injectable } from "@nestjs/common";
import { Clock } from "./clock.ts";

export const LOG_SINK = Symbol("LOG_SINK");
export type LogSink = (line: string) => void;
export const stdoutSink: LogSink = (line) => {
  process.stdout.write(`${line}\n`);
};

/** Solo recibe campos operativos. Nunca pasar apodos, tokens, codigos ni mensajes de error. */
@Injectable()
export class JsonLogger {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(LOG_SINK) private readonly sink: LogSink,
  ) {}

  log(fields: Record<string, string | number | undefined>): void {
    this.sink(JSON.stringify({ time: this.clock.now().toISOString(), ...fields }));
  }
}

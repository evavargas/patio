import type { DayKey } from "@patio/contracts";

/** Unica fuente de la hora del back. Las pruebas la reemplazan con una subclase. */
export class Clock {
  constructor(private readonly timeZone: string) {}

  now(): Date {
    return new Date();
  }

  /** Milisegundos monotonicos para medir duraciones (no es hora de pared). */
  monotonicMs(): number {
    return performance.now();
  }

  /** Dia calendario en la zona configurada. */
  today(): DayKey {
    // en-CA formatea YYYY-MM-DD
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- unico punto que fabrica un DayKey de marca; en-CA garantiza YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", { timeZone: this.timeZone }).format(this.now()) as DayKey;
  }
}

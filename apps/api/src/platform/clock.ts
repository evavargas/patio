import { type DayKey, isDayKey } from "@patio/contracts";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Unica fuente de la hora del back. Las pruebas la reemplazan con una subclase. Tambien concentra la aritmetica de fechas. */
export class Clock {
  constructor(private readonly timeZone: string) {}

  now(): Date {
    return new Date();
  }

  /** Milisegundos monotonicos para medir duraciones (no es hora de pared). */
  monotonicMs(): number {
    return performance.now();
  }

  /** Instante `seconds` despues de `from`. */
  addSeconds(from: Date, seconds: number): Date {
    return new Date(from.getTime() + seconds * 1000);
  }

  /** Instante `minutes` despues de `from`. */
  addMinutes(from: Date, minutes: number): Date {
    return new Date(from.getTime() + minutes * MS_PER_MINUTE);
  }

  /** Texto `YYYY-MM-DD` -> DayKey. Falla si no es una fecha valida. */
  dayKey(value: string): DayKey {
    if (!isDayKey(value)) throw new Error("clave de dia invalida");
    return value;
  }

  /** Dia calendario en la zona configurada. */
  today(): DayKey {
    // en-CA formatea YYYY-MM-DD
    return this.dayKey(new Intl.DateTimeFormat("en-CA", { timeZone: this.timeZone }).format(this.now()));
  }

  nextDay(day: DayKey): DayKey {
    return this.shiftDay(day, 1);
  }

  previousDay(day: DayKey): DayKey {
    return this.shiftDay(day, -1);
  }

  /** Instante en que empieza `day` (00:00 local) en la zona configurada. */
  startOfDay(day: DayKey): Date {
    const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
    const utcMidnight = Date.UTC(year, month - 1, date);
    // shortcut: dos pasadas del desfase bastan salvo en un cambio de horario justo a medianoche; revisar si se configura una zona con horario de verano.
    const first = utcMidnight - this.offsetMs(utcMidnight);
    return new Date(utcMidnight - this.offsetMs(first));
  }

  /** Fin del dia de hoy = inicio del siguiente. */
  endOfDay(): Date {
    return this.startOfDay(this.nextDay(this.today()));
  }

  private shiftDay(day: DayKey, delta: number): DayKey {
    const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
    const shifted = new Date(Date.UTC(year, month - 1, date) + delta * MS_PER_DAY);
    return this.dayKey(shifted.toISOString().slice(0, 10));
  }

  /** Desfase de la zona respecto de UTC en `instantMs` (positivo al este de Greenwich). */
  private offsetMs(instantMs: number): number {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).formatToParts(new Date(instantMs));
    const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return localAsUtc - Math.floor(instantMs / 1000) * 1000;
  }
}

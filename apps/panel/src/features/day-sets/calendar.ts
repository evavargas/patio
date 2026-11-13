import type { DayKey } from "@patio/contracts";

// Aritmetica de DayKey (AAAA-MM-DD) sin reloj: todo en UTC para que no haya corrimiento de zona.
const parse = (key: string): Date => new Date(`${key}T00:00:00Z`);
const toKey = (d: Date): string => d.toISOString().slice(0, 10);

export const addDays = (key: string, n: number): string => toKey(new Date(parse(key).getTime() + n * 86_400_000));
export const monthOf = (key: string): string => key.slice(0, 7);
export const firstOfMonth = (month: string): string => `${month}-01`;
export const lastOfMonth = (month: string): string => {
  const d = parse(firstOfMonth(month));
  return toKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
};
export const addMonths = (month: string, n: number): string => {
  const d = parse(firstOfMonth(month));
  return toKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))).slice(0, 7);
};
export const isMonth = (v: string | null): v is string => v !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export const isDayKey = (v: string | null): v is DayKey => v !== null && /^\d{4}-\d{2}-\d{2}$/.test(v) && toKey(parse(v)) === v;

/** Semanas (lunes primero) del mes; `null` rellena los dias de otros meses. */
export function monthWeeks(month: string): (string | null)[][] {
  const first = parse(firstOfMonth(month));
  const lead = (first.getUTCDay() + 6) % 7;
  const last = Number(lastOfMonth(month).slice(8));
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

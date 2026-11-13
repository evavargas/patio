import i18n from "../i18n";

// Formateo de fechas: ni Date.now() ni new Date() sin argumentos (la hora "actual" la define el servidor).
const fmt = (opts: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat(i18n.language, opts).format(d);

/** DayKey AAAA-MM-DD, sin corrimiento de zona. */
export const formatDay = (key: string, long = false): string =>
  fmt({ day: "numeric", month: long ? "long" : "short", ...(long ? { year: "numeric" } : {}), timeZone: "UTC" }, new Date(`${key}T00:00:00Z`));

export const formatDateTime = (iso: string): string => fmt({ dateStyle: "medium", timeStyle: "short" }, new Date(iso));
export const formatDate = (iso: string): string => fmt({ dateStyle: "medium" }, new Date(iso));

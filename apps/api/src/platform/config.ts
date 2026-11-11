export interface AppConfig {
  port: number;
  timeZone: string;
  corsOrigins: string[];
  mongoUri: string;
  mongoDb: string;
}

export const CONFIG = Symbol("CONFIG");

const isValidTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const isExactOrigin = (value: string): boolean => {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
};

/** Valida las variables al arrancar. El mensaje nombra las variables, nunca sus valores. */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const invalid: string[] = [];

  const portText = env.PORT ?? "8080";
  const port = /^\d+$/.test(portText) ? Number(portText) : 0;
  if (port < 1 || port > 65535) invalid.push("PORT");

  const timeZone = env.DEFAULT_TIME_ZONE ?? "America/Montevideo";
  if (!isValidTimeZone(timeZone)) invalid.push("DEFAULT_TIME_ZONE");

  const corsOrigins = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o !== "");
  if (!corsOrigins.every(isExactOrigin)) invalid.push("CORS_ORIGINS");

  // El valor por defecto es SOLO para desarrollo local. Fuera de ahi (produccion, o NODE_ENV ausente) se exige.
  const isLocal = env.NODE_ENV === "development" || env.NODE_ENV === "test";
  const mongoUri = env.MONGODB_URI ?? (isLocal ? "mongodb://127.0.0.1:27017" : "");
  if (!/^mongodb(\+srv)?:\/\/.+/.test(mongoUri)) invalid.push("MONGODB_URI");
  const mongoDb = env.MONGODB_DB ?? (isLocal ? "patio_dev" : "");
  if (!/^[A-Za-z0-9_-]{1,38}$/.test(mongoDb)) invalid.push("MONGODB_DB");

  if (invalid.length > 0) throw new Error(`Configuracion invalida: ${invalid.join(", ")}`);
  return { port, timeZone, corsOrigins, mongoUri, mongoDb };
}

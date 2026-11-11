export interface RateRule {
  max: number;
  windowSeconds: number;
}

export interface AppConfig {
  port: number;
  timeZone: string;
  corsOrigins: string[];
  mongoUri: string;
  mongoDb: string;
  /** Secreto del HMAC de los codigos de recuperacion. Nunca se imprime ni se loguea. */
  recoveryHmacSecret: string;
  /** Saltos de proxy en los que se confia para leer la IP en X-Forwarded-For. 0 = ninguno. */
  trustProxyHops: number;
  limits: { register: RateRule; groupCode: RateRule };
}

/** Valor SOLO para desarrollo y pruebas, claramente falso: no protege nada. */
export const DEV_RECOVERY_HMAC_SECRET = "dev-only-INSECURE-recovery-hmac-secret-not-for-production";
const MIN_SECRET_LENGTH = 32;

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

  const recoveryHmacSecret = env.RECOVERY_HMAC_SECRET ?? (isLocal ? DEV_RECOVERY_HMAC_SECRET : "");
  if (recoveryHmacSecret.length < MIN_SECRET_LENGTH) invalid.push("RECOVERY_HMAC_SECRET");

  const trustProxyHops = Number(env.TRUST_PROXY_HOPS ?? "0");
  if (!/^[0-5]$/.test(env.TRUST_PROXY_HOPS ?? "0")) invalid.push("TRUST_PROXY_HOPS");

  // Valores iniciales de doc 03 (sin medir). El administrador los editara en settings.limits cuando exista el panel.
  const positiveInt = (name: string, fallback: number): number => {
    const text = env[name] ?? String(fallback);
    if (!/^\d+$/.test(text) || Number(text) < 1) invalid.push(name);
    return Number(text);
  };
  const limits = {
    register: {
      max: positiveInt("RATE_LIMIT_REGISTER_MAX", 20),
      windowSeconds: positiveInt("RATE_LIMIT_REGISTER_WINDOW_SECONDS", 3600),
    },
    groupCode: {
      max: positiveInt("RATE_LIMIT_GROUP_CODE_MAX", 100),
      windowSeconds: positiveInt("RATE_LIMIT_GROUP_CODE_WINDOW_SECONDS", 3600),
    },
  };

  if (invalid.length > 0) throw new Error(`Configuracion invalida: ${invalid.join(", ")}`);
  return { port, timeZone, corsOrigins, mongoUri, mongoDb, recoveryHmacSecret, trustProxyHops, limits };
}

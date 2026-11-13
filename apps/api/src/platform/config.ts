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
  /** Secreto de firma de los access tokens del panel (HS256). Nunca se imprime ni se loguea. */
  jwtSecret: string;
  /** Saltos de proxy en los que se confia para leer la IP en X-Forwarded-For. 0 = ninguno. */
  trustProxyHops: number;
  /** Correo de invitacion (Gmail SMTP). null = sin SMTP: el envio se omite (solo permitido en development/test). */
  mail: { host: string; port: number; user: string; password: string; from: string } | null;
  /** Origen del panel, para armar el enlace de invitacion. */
  panelUrl: string;
  /** El enlace de invitacion viaja en la respuesta SOLO con NODE_ENV=development. */
  exposeInvitationLink: boolean;
  limits: { register: RateRule; groupCode: RateRule; recover: RateRule; login: RateRule };
}

/** Valor SOLO para desarrollo y pruebas, claramente falso: no protege nada. */
export const DEV_RECOVERY_HMAC_SECRET = "dev-only-INSECURE-recovery-hmac-secret-not-for-production";
/** Valor SOLO para desarrollo y pruebas, claramente falso: no protege nada. */
export const DEV_JWT_SECRET = "dev-only-INSECURE-jwt-secret-not-for-production-use";
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

  const jwtSecret = env.JWT_SECRET ?? (isLocal ? DEV_JWT_SECRET : "");
  // Un solo secreto para dos usos le quita aislamiento a cada uno.
  if (jwtSecret.length < MIN_SECRET_LENGTH || jwtSecret === recoveryHmacSecret) invalid.push("JWT_SECRET");

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
    recover: {
      max: positiveInt("RATE_LIMIT_RECOVER_MAX", 100),
      windowSeconds: positiveInt("RATE_LIMIT_RECOVER_WINDOW_SECONDS", 3600),
    },
    // Doc 03: login del panel 10 por 15 min, por IP y correo (sin medir).
    login: {
      max: positiveInt("RATE_LIMIT_LOGIN_MAX", 10),
      windowSeconds: positiveInt("RATE_LIMIT_LOGIN_WINDOW_SECONDS", 900),
    },
  };

  // Correo de invitacion: en produccion todo es obligatorio; en development/test, sin SMTP el envio se omite.
  const panelUrl = env.PANEL_URL ?? (isLocal ? "http://localhost:5173" : "");
  if (!isExactOrigin(panelUrl)) invalid.push("PANEL_URL");
  const smtp = { user: env.SMTP_USER ?? "", password: env.SMTP_PASSWORD ?? "", from: env.SMTP_FROM ?? "" };
  const smtpSet = [smtp.user, smtp.password, smtp.from].filter((v) => v !== "").length;
  if (smtpSet !== 3 && (smtpSet > 0 || !isLocal)) invalid.push("SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM");
  if (/[\r\n]/.test(smtp.from)) invalid.push("SMTP_FROM");
  const smtpPort = positiveInt("SMTP_PORT", 465);
  if (smtpPort > 65535) invalid.push("SMTP_PORT");
  const mail = smtpSet === 3 ? { host: env.SMTP_HOST ?? "smtp.gmail.com", port: smtpPort, ...smtp } : null;
  if (mail !== null && mail.host.trim() === "") invalid.push("SMTP_HOST");

  if (invalid.length > 0) throw new Error(`Configuracion invalida: ${invalid.join(", ")}`);
  return { port, timeZone, corsOrigins, mongoUri, mongoDb, recoveryHmacSecret, jwtSecret, trustProxyHops, mail, panelUrl, exposeInvitationLink: env.NODE_ENV === "development", limits };
}

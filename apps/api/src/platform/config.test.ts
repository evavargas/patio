import { describe, expect, it } from "vitest";
import { DEV_RECOVERY_HMAC_SECRET, loadConfig } from "./config.ts";

describe("loadConfig", () => {
  it("usa valores por defecto sin variables", () => {
    expect(loadConfig({ NODE_ENV: "development" })).toEqual({
      port: 8080,
      timeZone: "America/Montevideo",
      corsOrigins: [],
      mongoUri: "mongodb://127.0.0.1:27017",
      mongoDb: "patio_dev",
      recoveryHmacSecret: DEV_RECOVERY_HMAC_SECRET,
      trustProxyHops: 0,
      limits: {
        register: { max: 20, windowSeconds: 3600 },
        groupCode: { max: 100, windowSeconds: 3600 },
      },
    });
  });

  it("lee puerto, zona horaria y lista de origenes", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      MONGODB_URI: "mongodb+srv://u:p@cluster.example.net",
      MONGODB_DB: "patio",
      PORT: "3000",
      DEFAULT_TIME_ZONE: "America/Argentina/Buenos_Aires",
      CORS_ORIGINS: "https://panel.example.org, http://localhost:5173",
      RECOVERY_HMAC_SECRET: "x".repeat(32),
      TRUST_PROXY_HOPS: "1",
      RATE_LIMIT_REGISTER_MAX: "5",
      RATE_LIMIT_REGISTER_WINDOW_SECONDS: "60",
      RATE_LIMIT_GROUP_CODE_MAX: "7",
      RATE_LIMIT_GROUP_CODE_WINDOW_SECONDS: "120",
    });
    expect(config).toEqual({
      port: 3000,
      timeZone: "America/Argentina/Buenos_Aires",
      corsOrigins: ["https://panel.example.org", "http://localhost:5173"],
      mongoUri: "mongodb+srv://u:p@cluster.example.net",
      mongoDb: "patio",
      recoveryHmacSecret: "x".repeat(32),
      trustProxyHops: 1,
      limits: { register: { max: 5, windowSeconds: 60 }, groupCode: { max: 7, windowSeconds: 120 } },
    });
  });

  it.each([
    [{ PORT: "abc" }, "PORT"],
    [{ PORT: "0" }, "PORT"],
    [{ PORT: "70000" }, "PORT"],
    [{ DEFAULT_TIME_ZONE: "Marte/Olimpo" }, "DEFAULT_TIME_ZONE"],
    [{ CORS_ORIGINS: "*" }, "CORS_ORIGINS"],
    [{ CORS_ORIGINS: "https://a.example.org/ruta" }, "CORS_ORIGINS"],
    [{ CORS_ORIGINS: "no es una url" }, "CORS_ORIGINS"],
    [{ MONGODB_URI: "http://no-es-mongo" }, "MONGODB_URI"],
    [{ MONGODB_DB: "con espacios" }, "MONGODB_DB"],
    [{ RECOVERY_HMAC_SECRET: "corto" }, "RECOVERY_HMAC_SECRET"],
    [{ TRUST_PROXY_HOPS: "-1" }, "TRUST_PROXY_HOPS"],
    [{ TRUST_PROXY_HOPS: "9" }, "TRUST_PROXY_HOPS"],
    [{ TRUST_PROXY_HOPS: "true" }, "TRUST_PROXY_HOPS"],
    [{ RATE_LIMIT_REGISTER_MAX: "0" }, "RATE_LIMIT_REGISTER_MAX"],
    [{ RATE_LIMIT_REGISTER_WINDOW_SECONDS: "x" }, "RATE_LIMIT_REGISTER_WINDOW_SECONDS"],
    [{ RATE_LIMIT_GROUP_CODE_MAX: "-5" }, "RATE_LIMIT_GROUP_CODE_MAX"],
    [{ RATE_LIMIT_GROUP_CODE_WINDOW_SECONDS: "0" }, "RATE_LIMIT_GROUP_CODE_WINDOW_SECONDS"],
  ])("rechaza %j", (env, name) => {
    expect(() => loadConfig({ NODE_ENV: "test", ...env })).toThrow(name);
  });

  it("no repite el valor invalido en el mensaje (ni la URI de la base)", () => {
    expect(() => loadConfig({ NODE_ENV: "test", PORT: "valor-secreto" })).not.toThrow(/valor-secreto/);
    expect(() => loadConfig({ NODE_ENV: "test", MONGODB_URI: "postgres://u:clave-secreta@h" })).not.toThrow(/clave-secreta/);
  });

  it.each([{}, { NODE_ENV: "production" }, { NODE_ENV: "staging" }])("sin NODE_ENV de desarrollo o prueba exige base explicita (%j)", (env) => {
    expect(() => loadConfig(env)).toThrow(/MONGODB_URI, MONGODB_DB/);
    expect(loadConfig({ ...env, MONGODB_URI: "mongodb+srv://h.example.net", MONGODB_DB: "patio", RECOVERY_HMAC_SECRET: "s".repeat(32) }).mongoDb).toBe("patio");
  });
});

describe("RECOVERY_HMAC_SECRET", () => {
  const base = { MONGODB_URI: "mongodb+srv://h.example.net", MONGODB_DB: "patio" };

  it("el valor de desarrollo es claramente falso y solo rige con NODE_ENV development o test", () => {
    expect(DEV_RECOVERY_HMAC_SECRET).toMatch(/INSECURE/);
    expect(loadConfig({ NODE_ENV: "development" }).recoveryHmacSecret).toBe(DEV_RECOVERY_HMAC_SECRET);
    expect(loadConfig({ NODE_ENV: "test" }).recoveryHmacSecret).toBe(DEV_RECOVERY_HMAC_SECRET);
  });

  it.each([{}, { NODE_ENV: "production" }, { NODE_ENV: "staging" }])("falla cerrado fuera de desarrollo (%j)", (env) => {
    expect(() => loadConfig({ ...env, ...base })).toThrow("RECOVERY_HMAC_SECRET");
    expect(loadConfig({ ...env, ...base, RECOVERY_HMAC_SECRET: "s".repeat(32) }).recoveryHmacSecret).toBe("s".repeat(32));
  });

  it("exige 32 caracteres como minimo en cualquier entorno", () => {
    expect(() => loadConfig({ NODE_ENV: "test", RECOVERY_HMAC_SECRET: "s".repeat(31) })).toThrow("RECOVERY_HMAC_SECRET");
  });

  it("nunca aparece en un mensaje de error", () => {
    const secret = "secreto-largo-que-no-debe-imprimirse-jamas-1234";
    expect(() => loadConfig({ NODE_ENV: "test", RECOVERY_HMAC_SECRET: secret, PORT: "0" })).not.toThrow(secret);
  });
});

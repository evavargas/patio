import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

describe("loadConfig", () => {
  it("usa valores por defecto sin variables", () => {
    expect(loadConfig({ NODE_ENV: "development" })).toEqual({
      port: 8080,
      timeZone: "America/Montevideo",
      corsOrigins: [],
      mongoUri: "mongodb://127.0.0.1:27017",
      mongoDb: "patio_dev",
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
    });
    expect(config).toEqual({
      port: 3000,
      timeZone: "America/Argentina/Buenos_Aires",
      corsOrigins: ["https://panel.example.org", "http://localhost:5173"],
      mongoUri: "mongodb+srv://u:p@cluster.example.net",
      mongoDb: "patio",
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
  ])("rechaza %j", (env, name) => {
    expect(() => loadConfig({ NODE_ENV: "test", ...env })).toThrow(name);
  });

  it("no repite el valor invalido en el mensaje (ni la URI de la base)", () => {
    expect(() => loadConfig({ NODE_ENV: "test", PORT: "valor-secreto" })).not.toThrow(/valor-secreto/);
    expect(() => loadConfig({ NODE_ENV: "test", MONGODB_URI: "postgres://u:clave-secreta@h" })).not.toThrow(/clave-secreta/);
  });

  it.each([{}, { NODE_ENV: "production" }, { NODE_ENV: "staging" }])("sin NODE_ENV de desarrollo o prueba exige base explicita (%j)", (env) => {
    expect(() => loadConfig(env)).toThrow(/MONGODB_URI, MONGODB_DB/);
    expect(loadConfig({ ...env, MONGODB_URI: "mongodb+srv://h.example.net", MONGODB_DB: "patio" }).mongoDb).toBe("patio");
  });
});

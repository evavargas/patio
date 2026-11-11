import { Controller, Get, type INestApplication, Module } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { isErrorBody, isHealthResponse } from "@patio/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { AppModule } from "./app.module.ts";
import { configureApp, createApp } from "./app.ts";
import { Clock } from "./platform/clock.ts";
import { loadConfig } from "./platform/config.ts";

@Controller("v1")
class BoomController {
  @Get("boom")
  boom(): never {
    throw new Error("Juancito token=abc123 en /srv/app/secret.ts");
  }
}

class FixedClock extends Clock {
  override now(): Date {
    return new Date("2026-11-11T12:00:00Z");
  }
}

const apps: INestApplication[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

async function start(env: NodeJS.ProcessEnv = {}) {
  const config = loadConfig({ NODE_ENV: "test", ...env });
  const lines: string[] = [];
  @Module({ controllers: [BoomController] })
  class BoomModule {}
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register({ config, clock: new FixedClock(config.timeZone), logSink: (l) => lines.push(l), withDatabase: false }), BoomModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app, config);
  await app.listen(0, "127.0.0.1");
  apps.push(app);
  const address = app.getHttpServer().address();
  if (address === null || typeof address === "string") throw new Error("el servidor no abrio un puerto");
  const url = `http://127.0.0.1:${address.port}`;
  return { url, lines };
}

describe("GET /v1/healthz", () => {
  it("no toca la base: responde con la API sin modulo de base", async () => {
    const { url } = await start();
    expect((await fetch(`${url}/v1/healthz`)).status).toBe(200);
  });

  it("responde 200 con la forma del contrato y cabeceras de seguridad", async () => {
    const { url } = await start();
    const res = await fetch(`${url}/v1/healthz`);
    expect(res.status).toBe(200);
    expect(isHealthResponse(await res.json())).toBe(true);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-powered-by")).toBeNull();
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});

describe("errores", () => {
  it("ruta inexistente: cuerpo del contrato, sin datos internos", async () => {
    const { url } = await start();
    const res = await fetch(`${url}/v1/no-existe`);
    const body: unknown = await res.json();
    expect(res.status).toBe(404);
    expect(isErrorBody(body)).toBe(true);
    expect(body).toEqual({ code: "ROUTE_NOT_FOUND", message: expect.any(String) });
  });

  it("excepcion no controlada: 500 INTERNAL_ERROR sin mensaje, stack ni rutas; el log tampoco", async () => {
    const { url, lines } = await start();
    const res = await fetch(`${url}/v1/boom`);
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(isErrorBody(JSON.parse(text))).toBe(true);
    expect(JSON.parse(text)).toMatchObject({ code: "INTERNAL_ERROR" });
    for (const leaked of ["Juancito", "abc123", "secret.ts", "stack", "at "]) {
      expect(text).not.toContain(leaked);
      expect(lines.join("\n")).not.toContain(leaked);
    }
  });

  it("JSON malformado: 400 VALIDATION_FAILED", async () => {
    const { url } = await start();
    const res = await fetch(`${url}/v1/nada`, { method: "POST", headers: { "content-type": "application/json" }, body: "{no" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("cuerpo demasiado grande: 413 con cuerpo del contrato", async () => {
    const { url } = await start();
    const res = await fetch(`${url}/v1/nada`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x: "a".repeat(100_000) }),
    });
    expect(res.status).toBe(413);
    expect(isErrorBody(await res.json())).toBe(true);
  });
});

describe("logs", () => {
  it("una linea JSON por pedido con requestId, ruta, estado y duracion; sin query ni path crudo", async () => {
    const { url, lines } = await start();
    const res = await fetch(`${url}/v1/healthz?nickname=Ana`);
    await res.text();
    await fetch(`${url}/v1/jugador-ABCDEFGH2345`).then((r) => r.text());
    await new Promise((r) => setTimeout(r, 20));
    const logs = lines.map((l) => JSON.parse(l));
    expect(logs[0]).toMatchObject({
      time: "2026-11-11T12:00:00.000Z",
      requestId: res.headers.get("x-request-id"),
      method: "GET",
      route: "/v1/healthz",
      status: 200,
    });
    expect(typeof logs[0]?.durationMs).toBe("number");
    expect(logs[1]).toMatchObject({ route: "unmatched", status: 404 });
    expect(lines.join("\n")).not.toMatch(/Ana|ABCDEFGH2345/);
  });
});

describe("CORS", () => {
  const origin = "https://panel.example.org";
  it("sin CORS_ORIGINS no habilita ningun origen", async () => {
    const { url } = await start();
    const res = await fetch(`${url}/v1/healthz`, { headers: { origin } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("habilita solo los origenes de la lista y responde el preflight", async () => {
    const { url } = await start({ CORS_ORIGINS: origin });
    const ok = await fetch(`${url}/v1/healthz`, { headers: { origin } });
    expect(ok.headers.get("access-control-allow-origin")).toBe(origin);
    const other = await fetch(`${url}/v1/healthz`, { headers: { origin: "https://otro.example.org" } });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
    const pre = await fetch(`${url}/v1/healthz`, {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "GET", "access-control-request-headers": "authorization,content-type" },
    });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-max-age")).toBeTruthy();
    expect(pre.headers.get("access-control-allow-headers")).toMatch(/authorization/i);
  });
});

describe("arranque", () => {
  it("configuracion invalida impide arrancar", async () => {
    await expect(createApp({ CORS_ORIGINS: "*" })).rejects.toThrow("CORS_ORIGINS");
    await expect(createApp({ PORT: "x" })).rejects.toThrow("PORT");
  });
});

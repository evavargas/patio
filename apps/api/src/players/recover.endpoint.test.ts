import { createHash, createHmac } from "node:crypto";
import { type RecoverPlayerResponse, type RegisterPlayerResponse, isErrorBody, isRecoverPlayerResponse, isRegisterPlayerResponse } from "@patio/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestApp, startTestApp } from "../test-app.ts";

let t: TestApp;
let n = 0;

beforeAll(async () => {
  t = await startTestApp({ TRUST_PROXY_HOPS: "1", RATE_LIMIT_REGISTER_MAX: "1000", RATE_LIMIT_RECOVER_MAX: "5" });
  t.clock.set(new Date("2026-11-11T15:00:00Z"));
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  for (const c of ["players", "rateLimits"]) await t.testDb.db.collection(c).deleteMany({});
  t.lines.length = 0;
});

const ip = (): string => `10.1.0.${++n}`;
const call = (path: string, init: RequestInit, from = ip()): Promise<Response> =>
  fetch(`${t.url}${path}`, { ...init, headers: { "content-type": "application/json", "x-forwarded-for": from, ...init.headers } });
const recover = (body: unknown, from?: string): Promise<Response> =>
  call("/v1/players/recover", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }, from);
const me = (token?: string): Promise<Response> => call("/v1/me", { headers: token === undefined ? {} : { authorization: `Bearer ${token}` } });

async function register(nickname = "Lucía"): Promise<RegisterPlayerResponse> {
  const res = await call("/v1/players", { method: "POST", body: JSON.stringify({ nickname, termsVersion: "2026-11" }) });
  const body: unknown = await res.json();
  if (!isRegisterPlayerResponse(body)) throw new Error("registro fuera de contrato");
  return body;
}
async function recovered(res: Response): Promise<RecoverPlayerResponse> {
  const body: unknown = await res.json();
  if (!isRecoverPlayerResponse(body)) throw new Error("la respuesta no cumple el contrato");
  return body;
}
const dump = async (): Promise<string> =>
  JSON.stringify(await Promise.all(["players", "rateLimits"].map((c) => t.testDb.db.collection(c).find().toArray())));

describe("POST /v1/players/recover", () => {
  it("200 con token nuevo, mismo playerId y apodo; sin nivel ni codigo; no se cachea", async () => {
    const p = await register();
    const res = await recover({ recoveryCode: p.recoveryCode });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const raw = await res.clone().text();
    expect(raw).not.toMatch(/level|Hash|recoveryCode/i);
    const body = await recovered(res);
    expect(body.playerId).toBe(p.playerId);
    expect(body.nickname).toBe("Lucía");
    expect(body.token).not.toBe(p.token);
  });

  it("el token anterior deja de funcionar y el nuevo funciona", async () => {
    const p = await register();
    const body = await recovered(await recover({ recoveryCode: p.recoveryCode }));
    expect((await me(p.token)).status).toBe(401);
    expect((await me(body.token)).status).toBe(200);
  });

  it("el codigo no cambia: sirve otra vez, y cada recuperacion invalida el token de la anterior", async () => {
    const p = await register();
    const first = await recovered(await recover({ recoveryCode: p.recoveryCode }));
    const second = await recovered(await recover({ recoveryCode: p.recoveryCode }));
    expect((await me(first.token)).status).toBe(401);
    expect((await me(second.token)).status).toBe(200);
    const [doc] = await t.testDb.db.collection("players").find().toArray();
    expect(doc?.recoveryHash).toBe(createHmac("sha256", t.config.recoveryHmacSecret).update(p.recoveryCode).digest("hex"));
  });

  it("guarda solo el SHA-256 del token nuevo; ni token ni codigo en claro en la base", async () => {
    const p = await register();
    const body = await recovered(await recover({ recoveryCode: p.recoveryCode }));
    const [doc] = await t.testDb.db.collection("players").find().toArray();
    expect(doc?.tokenHash).toBe(createHash("sha256").update(body.token).digest("hex"));
    const all = await dump();
    for (const secret of [p.token, body.token, p.recoveryCode]) expect(all).not.toContain(secret);
  });

  it("codigo inexistente: 404 RECOVERY_CODE_INVALID con el mensaje fijo, sin tocar a nadie", async () => {
    const p = await register();
    const res = await recover({ recoveryCode: p.recoveryCode === "ZZZZZZZZ" ? "YYYYYYYY" : "ZZZZZZZZ" });
    expect(res.status).toBe(404);
    const body: unknown = await res.json();
    expect(isErrorBody(body)).toBe(true);
    expect(body).toMatchObject({ code: "RECOVERY_CODE_INVALID" });
    expect((await me(p.token)).status).toBe(200);
  });

  it("no distingue causas: jugador borrado y codigo que nunca existio dan la misma respuesta", async () => {
    const p = await register();
    await t.testDb.db.collection("players").deleteMany({});
    const gone = await recover({ recoveryCode: p.recoveryCode });
    const never = await recover({ recoveryCode: "ZZZZZZZZ" });
    expect(gone.status).toBe(never.status);
    expect(await gone.text()).toBe(await never.text());
  });

  it("formato invalido: 400 VALIDATION_FAILED (minusculas, corto, simbolo ambiguo, sin campo, no string, JSON roto)", async () => {
    for (const body of [{ recoveryCode: "k7qm2xpt" }, { recoveryCode: "K7QM2XP" }, { recoveryCode: "K7QM2XP0" }, {}, { recoveryCode: 12345678 }, "{no es json"]) {
      const res = await recover(body);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "VALIDATION_FAILED" });
    }
  });

  it("limite por IP: pasado el maximo responde 429 RATE_LIMITED aunque el codigo sea bueno; cuenta tambien los invalidos; otra IP no se afecta", async () => {
    const p = await register();
    const mine = "10.9.9.9";
    for (let i = 0; i < 3; i++) expect((await recover({ recoveryCode: "ZZZZZZZZ" }, mine)).status).toBe(404);
    expect((await recover({ bad: true }, mine)).status).toBe(400);
    expect((await recover({ recoveryCode: p.recoveryCode }, mine)).status).toBe(200); // pedido 5 de 5
    const blocked = await recover({ recoveryCode: p.recoveryCode }, mine);
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ code: "RATE_LIMITED" });
    expect((await recover({ recoveryCode: p.recoveryCode }, "10.9.9.10")).status).toBe(200);
  });

  it("logs sin token, codigo ni apodo", async () => {
    const p = await register("Zorzal");
    const body = await recovered(await recover({ recoveryCode: p.recoveryCode }));
    await recover({ recoveryCode: "ZZZZZZZZ" });
    await me(body.token);
    await me(p.token);
    const logs = t.lines.join("\n");
    expect(logs).toContain("/v1/players/recover");
    for (const secret of [p.token, body.token, p.recoveryCode, "ZZZZZZZZ", "Zorzal"]) expect(logs).not.toContain(secret);
  });
});

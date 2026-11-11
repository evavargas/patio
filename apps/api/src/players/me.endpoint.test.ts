import { type RegisterPlayerResponse, isErrorBody, isMeResponse, isRegisterPlayerResponse } from "@patio/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestApp, startTestApp } from "../test-app.ts";

let t: TestApp;
let n = 0;

beforeAll(async () => {
  t = await startTestApp({ TRUST_PROXY_HOPS: "1", RATE_LIMIT_REGISTER_MAX: "1000" });
  t.clock.set(new Date("2026-11-11T15:00:00Z"));
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.testDb.db.collection("players").deleteMany({});
  t.lines.length = 0;
});

const ip = (): string => `10.2.0.${++n}`;
const get = (headers: Record<string, string>): Promise<Response> => fetch(`${t.url}/v1/me`, { headers: { "x-forwarded-for": ip(), ...headers } });
const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });
async function register(nickname = "Lucía"): Promise<RegisterPlayerResponse> {
  const res = await fetch(`${t.url}/v1/players`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip() },
    body: JSON.stringify({ nickname, termsVersion: "2026-11" }),
  });
  const body: unknown = await res.json();
  if (!isRegisterPlayerResponse(body)) throw new Error("registro fuera de contrato");
  return body;
}

/** Todas deben dar exactamente la misma respuesta: no se revela si el jugador existe. */
async function expectInvalidToken(res: Response): Promise<string> {
  expect(res.status).toBe(401);
  const text = await res.text();
  const body: unknown = JSON.parse(text);
  expect(isErrorBody(body)).toBe(true);
  expect(body).toMatchObject({ code: "INVALID_TOKEN" });
  return text;
}

describe("guard de player (via GET /v1/me)", () => {
  it("token valido pasa", async () => {
    const p = await register();
    expect((await get(bearer(p.token))).status).toBe(200);
  });

  it("ausente, malformado, esquema distinto, de otro largo o desconocido: 401 INVALID_TOKEN identico", async () => {
    const p = await register();
    const unknown = "a".repeat(43);
    const bodies = await Promise.all(
      [
        {},
        { authorization: "" },
        { authorization: "Bearer" },
        { authorization: "Bearer " },
        { authorization: `Basic ${p.token}` },
        { authorization: p.token },
        { authorization: `bearer ${p.token}` },
        { authorization: `Bearer ${p.token} extra` },
        { authorization: `Bearer ${p.token.slice(0, 42)}` },
        { authorization: `Bearer ${p.token}x` },
        { authorization: "Bearer " + "!".repeat(43) },
        bearer(unknown),
      ].map(async (h) => expectInvalidToken(await get(h))),
    );
    expect(new Set(bodies).size).toBe(1);
  });

  it("jugador borrado: el mismo token deja de servir de inmediato, con la misma respuesta que uno inexistente", async () => {
    const p = await register();
    expect((await get(bearer(p.token))).status).toBe(200);
    await t.testDb.db.collection("players").deleteMany({});
    const gone = await expectInvalidToken(await get(bearer(p.token)));
    const never = await expectInvalidToken(await get(bearer("b".repeat(43))));
    expect(gone).toBe(never);
  });

  it("token de otro jugador sirve solo para ese jugador", async () => {
    const a = await register("Ana");
    const b = await register("Beto");
    const body: unknown = await (await get(bearer(a.token))).json();
    const other: unknown = await (await get(bearer(b.token))).json();
    expect(body).toMatchObject({ nickname: "Ana" });
    expect(other).toMatchObject({ nickname: "Beto" });
  });
});

describe("GET /v1/me", () => {
  it("200 con la forma del contrato: apodo en texto plano y puntaje, sin nivel ni hashes ni ID de otros", async () => {
    const p = await register("<b>Lu</b>");
    await t.testDb.withStringIds("players").updateOne({ _id: p.playerId }, { $set: { score: 40, level: 3 } });
    const res = await get(bearer(p.token));
    expect(res.status).toBe(200);
    const raw = await res.text();
    const body: unknown = JSON.parse(raw);
    expect(isMeResponse(body)).toBe(true);
    expect(body).toEqual({ nickname: "<b>Lu</b>", score: 40 });
    expect(raw).not.toMatch(/level|hash|token|recovery/i);
    expect(raw).not.toContain(p.token);
    expect(raw).not.toContain(p.recoveryCode);
  });

  it("no se cachea en proxies ni en el navegador", async () => {
    const p = await register();
    expect((await get(bearer(p.token))).headers.get("cache-control")).toBe("private, no-store");
  });

  it("logs sin token ni apodo", async () => {
    const p = await register("Zorzal");
    await get(bearer(p.token));
    await get(bearer("c".repeat(43)));
    const logs = t.lines.join("\n");
    expect(logs).toContain("/v1/me");
    for (const secret of [p.token, "c".repeat(43), "Zorzal"]) expect(logs).not.toContain(secret);
  });
});

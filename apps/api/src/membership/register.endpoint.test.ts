import { createHash, createHmac } from "node:crypto";
import { type RegisterPlayerResponse, isErrorBody, isRegisterPlayerResponse } from "@patio/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestApp, startTestApp } from "../test-app.ts";

let t: TestApp;
let n = 0;

// Limites chicos para probar el tope sin cientos de pedidos; el resto de las pruebas no los alcanza.
beforeAll(async () => {
  t = await startTestApp({
    TRUST_PROXY_HOPS: "1",
    RATE_LIMIT_REGISTER_MAX: "30",
    RATE_LIMIT_GROUP_CODE_MAX: "4",
  });
  t.clock.set(new Date("2026-11-11T15:00:00Z"));
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  for (const c of ["players", "groups", "groupMemberships", "rateLimits", "settings"]) await t.testDb.db.collection(c).deleteMany({});
  t.lines.length = 0;
});

/** Cada prueba usa una IP propia (X-Forwarded-For con 1 salto de confianza) para no compartir contadores. */
const post = (body: unknown, ip = `10.0.0.${++n}`): Promise<Response> =>
  fetch(`${t.url}/v1/players`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const group = (over: Record<string, unknown> = {}) => ({
  _id: `g${++n}`,
  name: "3A",
  code: "K7QM2X",
  ownerIds: [],
  maxSize: 2,
  active: true,
  createdAt: new Date("2026-11-01T00:00:00Z"),
  ...over,
});
/** Lee una respuesta 201 validandola contra el contrato. */
async function registered(res: Response): Promise<RegisterPlayerResponse> {
  const body: unknown = await res.json();
  if (!isRegisterPlayerResponse(body)) throw new Error("la respuesta no cumple el contrato");
  return body;
}
const all = async (c: string) => t.testDb.db.collection(c).find().toArray();
const valid = { nickname: "Lucía", termsVersion: "2026-11" };

describe("POST /v1/players sin grupo", () => {
  it("201 con forma del contrato; guarda solo hashes, apodo en texto plano, sin nivel en la respuesta", async () => {
    const res = await post({ nickname: "  <b>Lucía</b> & co ", termsVersion: "2026-11" });
    expect(res.status).toBe(201);
    const raw = await res.text();
    const body = await registered(new Response(raw));
    expect(raw).not.toMatch(/level|Hash/i);
    const [player, ...rest] = await all("players");
    expect(rest).toHaveLength(0);
    expect(player).toMatchObject({
      _id: body.playerId,
      nickname: "<b>Lucía</b> & co",
      tokenHash: createHash("sha256").update(body.token).digest("hex"),
      recoveryHash: createHmac("sha256", t.config.recoveryHmacSecret).update(body.recoveryCode).digest("hex"),
      termsVersion: "2026-11",
      termsAcceptedAt: new Date("2026-11-11T15:00:00Z"),
      createdAt: new Date("2026-11-11T15:00:00Z"),
      lastActiveAt: new Date("2026-11-11T15:00:00Z"),
      score: 0,
      level: 0,
    });
    expect(player?.groupId ?? null).toBeNull();
    expect(await all("groupMemberships")).toHaveLength(0);
  });

  it("NADA en la base contiene el token ni el codigo de recuperacion en claro", async () => {
    const body = await registered(await post(valid));
    const dump = JSON.stringify(
      await Promise.all(["players", "groups", "groupMemberships", "rateLimits", "settings"].map(all)),
    );
    expect(dump).not.toContain(body.token);
    expect(dump).not.toContain(body.recoveryCode);
  });

  it("dos registros dan IDs, tokens y codigos distintos", async () => {
    const a = await registered(await post(valid));
    const b = await registered(await post(valid));
    expect(a.playerId).not.toBe(b.playerId);
    expect(a.token).not.toBe(b.token);
    expect(a.recoveryCode).not.toBe(b.recoveryCode);
  });
});

describe("POST /v1/players con grupo", () => {
  it("201: abre la fila de pertenencia y deja el grupo actual en el jugador", async () => {
    const g = group();
    await t.testDb.withStringIds("groups").insertOne(g);
    const res = await post({ ...valid, groupCode: g.code });
    expect(res.status).toBe(201);
    const body = await registered(res);
    const [player] = await all("players");
    expect(player).toMatchObject({ _id: body.playerId, groupId: g._id });
    const memberships = await all("groupMemberships");
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({ playerId: body.playerId, groupId: g._id, joinedAt: new Date("2026-11-11T15:00:00Z") });
    expect(memberships[0]?.leftAt ?? null).toBeNull();
  });

  it("GROUP_NOT_FOUND 404 si el codigo no existe, y no escribe nada", async () => {
    const res = await post({ ...valid, groupCode: "ZZZZZ2" });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "GROUP_NOT_FOUND" });
    expect(await all("players")).toHaveLength(0);
    expect(await all("groupMemberships")).toHaveLength(0);
  });

  it("GROUP_INACTIVE 409 si el grupo esta desactivado", async () => {
    const g = group({ active: false });
    await t.testDb.withStringIds("groups").insertOne(g);
    const res = await post({ ...valid, groupCode: g.code });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "GROUP_INACTIVE" });
    expect(await all("players")).toHaveLength(0);
  });

  it("GROUP_FULL 409 si el grupo llego al maximo; con un lugar libre entra", async () => {
    const g = group({ maxSize: 2 });
    await t.testDb.withStringIds("groups").insertOne(g);
    expect((await post({ ...valid, groupCode: g.code })).status).toBe(201);
    expect((await post({ ...valid, groupCode: g.code })).status).toBe(201);
    const res = await post({ ...valid, groupCode: g.code });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "GROUP_FULL" });
    expect(await all("players")).toHaveLength(2);
    expect(await all("groupMemberships")).toHaveLength(2);
  });

  it("el apodo se valida antes de mirar el grupo (NICKNAME_NOT_ALLOWED aunque el grupo no exista)", async () => {
    await t.testDb.settings.insertOne({ _id: "bannedWords", version: 1, words: ["palabrota"] });
    const res = await post({ nickname: "Palabrota", termsVersion: "1", groupCode: "ZZZZZ2" });
    expect(await res.json()).toMatchObject({ code: "NICKNAME_NOT_ALLOWED" });
  });
});

describe("validacion y apodo", () => {
  it.each([
    ["sin apodo", { termsVersion: "1" }],
    ["sin terminos", { nickname: "Sol" }],
    ["apodo que no es texto", { nickname: 5, termsVersion: "1" }],
    ["codigo de grupo mal formado", { nickname: "Sol", termsVersion: "1", groupCode: "abc" }],
    ["apodo de mas de 64", { nickname: "a".repeat(65), termsVersion: "1" }],
    ["JSON roto", "{no es json"],
    ["arreglo", []],
  ])("400 VALIDATION_FAILED: %s", async (_name, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    const err: unknown = await res.json();
    expect(isErrorBody(err)).toBe(true);
    expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    expect(await all("players")).toHaveLength(0);
  });

  it("400 NICKNAME_NOT_ALLOWED: palabra prohibida (sin tildes ni mayusculas), vacio, de mas de 20; el mensaje no dice cual", async () => {
    await t.testDb.settings.insertOne({ _id: "bannedWords", version: 1, words: ["palabrota"] });
    for (const nickname of ["PALÁBROTA", "ana palabrota", "   ", "a".repeat(21)]) {
      const res = await post({ nickname, termsVersion: "1" });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(JSON.parse(text)).toMatchObject({ code: "NICKNAME_NOT_ALLOWED" });
      expect(text.toLowerCase()).not.toContain("palabrota");
    }
    expect(await all("players")).toHaveLength(0);
  });

  it("permite una palabra que solo contiene a la prohibida", async () => {
    await t.testDb.settings.insertOne({ _id: "bannedWords", version: 1, words: ["malo"] });
    expect((await post({ nickname: "Maloliente", termsVersion: "1" })).status).toBe(201);
  });
});

describe("privacidad", () => {
  it("ni errores ni logs contienen apodo, token ni codigos", async () => {
    await t.testDb.settings.insertOne({ _id: "bannedWords", version: 1, words: ["zanahoria"] });
    const g = group();
    await t.testDb.withStringIds("groups").insertOne(g);
    const ok = await registered(await post({ nickname: "Quimera", termsVersion: "1", groupCode: g.code }));
    const bodies = [
      await (await post({ nickname: "Zanahoria", termsVersion: "1" })).text(),
      await (await post({ nickname: "Quimera2", termsVersion: "1", groupCode: "ZZZZZ2" })).text(),
      await (await post({ nickname: "Quimera3", termsVersion: "1", groupCode: g.code, extra: 1 }, "10.9.9.9")).text(),
      await (await post("{Quimera4")).text(),
    ];
    await new Promise((r) => setTimeout(r, 30));
    const logs = t.lines.join("\n");
    expect(logs).toContain("/v1/players");
    for (const secret of ["quimera", "zanahoria", ok.token, ok.recoveryCode, g.code, "ZZZZZ2"]) {
      expect(logs.toLowerCase()).not.toContain(secret.toLowerCase());
      for (const b of bodies) expect(b.toLowerCase()).not.toContain(secret.toLowerCase());
    }
  });
});

describe("limites por IP", () => {
  it("registro: pasado el maximo responde 429 RATE_LIMITED; otra IP no se ve afectada", async () => {
    const ip = "172.16.0.1";
    for (let i = 0; i < 30; i++) expect((await post(valid, ip)).status).toBe(201);
    const res = await post(valid, ip);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "RATE_LIMITED" });
    expect((await post(valid, "172.16.0.2")).status).toBe(201);
    expect(await all("players")).toHaveLength(31);
  });

  it("el limite va ANTES de validar: los pedidos invalidos tambien cuentan", async () => {
    const ip = "172.16.1.1";
    for (let i = 0; i < 30; i++) expect((await post({}, ip)).status).toBe(400);
    expect((await post(valid, ip)).status).toBe(429);
  });

  it("codigo de grupo inexistente: pasado el maximo responde 429, tambien con un codigo valido", async () => {
    const g = group();
    await t.testDb.withStringIds("groups").insertOne(g);
    const ip = "172.16.2.1";
    for (let i = 0; i < 4; i++) expect((await post({ ...valid, groupCode: "ZZZZZ2" }, ip)).status).toBe(404);
    expect((await post({ ...valid, groupCode: "ZZZZZ2" }, ip)).status).toBe(429);
    expect((await post({ ...valid, groupCode: g.code }, ip)).status).toBe(429);
    expect((await post({ ...valid }, ip)).status).toBe(201); // sin codigo no aplica
    expect((await post({ ...valid, groupCode: g.code }, "172.16.2.2")).status).toBe(201);
  });

  it("los registros con grupo valido no consumen el limite de codigos inexistentes", async () => {
    const g = group({ maxSize: 50 });
    await t.testDb.withStringIds("groups").insertOne(g);
    const ip = "172.16.3.1";
    for (let i = 0; i < 6; i++) expect((await post({ ...valid, groupCode: g.code }, ip)).status).toBe(201);
  });
});

describe("IP detras de un proxy", () => {
  it("con 1 salto de confianza vale la ultima entrada de X-Forwarded-For; lo que escribe el cliente a la izquierda se ignora", async () => {
    const real = "172.17.0.1";
    for (let i = 0; i < 30; i++) expect((await post(valid, `1.1.1.${i}, ${real}`)).status).toBe(201);
    expect((await post(valid, `9.9.9.9, ${real}`)).status).toBe(429);
  });
});

describe("indices", () => {
  it("players, groups, groupMemberships y rateLimits tienen los indices de doc 04", async () => {
    const keys = async (c: string) =>
      (await t.testDb.db.collection(c).indexes()).map((i) => ({ key: i.key, unique: i.unique === true, ttl: i.expireAfterSeconds }));
    expect(await keys("players")).toEqual(
      expect.arrayContaining([
        { key: { tokenHash: 1 }, unique: true, ttl: undefined },
        { key: { recoveryHash: 1 }, unique: true, ttl: undefined },
        { key: { groupId: 1, createdAt: 1 }, unique: false, ttl: undefined },
        { key: { createdAt: 1 }, unique: false, ttl: undefined },
      ]),
    );
    expect(await keys("groups")).toEqual(
      expect.arrayContaining([
        { key: { code: 1 }, unique: true, ttl: undefined },
        { key: { ownerIds: 1 }, unique: false, ttl: undefined },
      ]),
    );
    expect(await keys("groupMemberships")).toEqual(
      expect.arrayContaining([
        { key: { playerId: 1, joinedAt: 1 }, unique: false, ttl: undefined },
        { key: { groupId: 1, joinedAt: 1 }, unique: false, ttl: undefined },
      ]),
    );
    expect(await keys("rateLimits")).toEqual(
      expect.arrayContaining([
        { key: { key: 1 }, unique: true, ttl: undefined },
        { key: { expiresAt: 1 }, unique: false, ttl: 0 },
      ]),
    );
  });

  it("arrancar otra instancia sobre la misma base no falla (indices idempotentes)", async () => {
    const second = await startTestApp({}, t.testDb);
    await second.close();
  });
});

describe("IP sin proxy de confianza", () => {
  it("con TRUST_PROXY_HOPS=0 se ignora X-Forwarded-For: no sirve para esquivar el limite", async () => {
    const plain = await startTestApp({ RATE_LIMIT_REGISTER_MAX: "2" }, t.testDb);
    const send = (xff: string) =>
      fetch(`${plain.url}/v1/players`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": xff },
        body: JSON.stringify(valid),
      });
    await t.testDb.db.collection("rateLimits").deleteMany({});
    expect((await send("1.1.1.1")).status).toBe(201);
    expect((await send("2.2.2.2")).status).toBe(201);
    expect((await send("3.3.3.3")).status).toBe(429);
    await plain.close();
  });
});

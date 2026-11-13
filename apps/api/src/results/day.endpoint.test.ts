import { type DayResponse, isDayResponse } from "@patio/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestApp, startTestApp } from "../test-app.ts";
import { FIXTURE_ENV, bearer, getDay, item, putInGroup, registerPlayer, seedRules, seedSet } from "./day.fixtures.ts";

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp(FIXTURE_ENV);
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  for (const c of ["players", "daySets", "dayAccess", "results", "groupMemberships"]) await t.testDb.db.collection(c).deleteMany({});
  t.clock.set(new Date("2026-11-11T15:00:00Z")); // 12:00 en Montevideo
  t.lines.length = 0;
  await seedRules(t);
});

async function day(token: string): Promise<DayResponse> {
  const res = await getDay(t, token);
  expect(res.status).toBe(200);
  const body: unknown = await res.json();
  if (!isDayResponse(body)) throw new Error("respuesta fuera de contrato");
  return body;
}
const ids = (d: DayResponse): string[] => d.items.map((i) => i.challengeId);
const accesses = (playerId: string): Promise<number> => t.testDb.db.collection("dayAccess").countDocuments({ playerId });

describe("GET /v1/day: sin set", () => {
  it("responde 'sin set' con la hora del servidor, la fecha y el fin del dia; no crea acceso", async () => {
    const p = await registerPlayer(t);
    const res = await getDay(t, p.token);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body: unknown = await res.json();
    expect(isDayResponse(body)).toBe(true);
    expect(body).toEqual({
      serverTime: "2026-11-11T15:00:00.000Z",
      date: "2026-11-11",
      dayEndsAt: "2026-11-12T03:00:00.000Z",
      status: "noSet",
      items: [],
      completedChallengeIds: [],
      score: 0,
    });
    expect(await accesses(p.playerId)).toBe(0);
  });

  it("un set borrador no se sirve; un set de otra fecha tampoco", async () => {
    const p = await registerPlayer(t);
    await seedSet(t, { id: "s-draft", date: "2026-11-11", groupId: null, status: "draft", items: [item("c1", 1)] });
    await seedSet(t, { id: "s-ayer", date: "2026-11-10", groupId: "g1", items: [item("c2", 1)] });
    await putInGroup(t, p.playerId, "g1");
    expect((await day(p.token)).status).toBe("noSet");
  });

  it("sin token o con token ajeno: 401", async () => {
    expect((await fetch(`${t.url}/v1/day`)).status).toBe(401);
    expect((await getDay(t, "a".repeat(43))).status).toBe(401);
  });
});

describe("GET /v1/day: resolucion del set", () => {
  it("set del grupo del player: items con la forma del contrato, sin campos internos; acceso creado y set bloqueado", async () => {
    const p = await registerPlayer(t);
    await putInGroup(t, p.playerId, "g1");
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: "g1", items: [item("c1", 1, { family: "resolver", text: "<b>Hola</b> & chau" }), item("c2", 2, { points: 25 })] });
    const d = await day(p.token);
    expect(d.status).toBe("available");
    expect(ids(d)).toEqual(["c1", "c2"]);
    expect(d.items[0]).toMatchObject({ text: "<b>Hola</b> & chau", difficulty: 1, family: "resolver" });
    expect(d.items[1]).toMatchObject({ difficulty: 2, points: 25 });
    expect(JSON.stringify(d)).not.toMatch(/authorId|autor-secreto|"version"|groupId|daySetId|level/i);
    const access = await t.testDb.withStringIds("dayAccess").findOne({ playerId: p.playerId });
    expect(access).toMatchObject({ date: "2026-11-11", daySetId: "s1", groupId: "g1" });
    expect((await t.testDb.withStringIds("daySets").findOne({ _id: "s1" }))?.lockedAt).toEqual(new Date("2026-11-11T15:00:00Z"));
  });

  it("sin set de grupo usa el general; con los dos gana el del grupo; el player sin grupo recibe el general", async () => {
    const withGroup = await registerPlayer(t);
    const lone = await registerPlayer(t);
    await putInGroup(t, withGroup.playerId, "g1");
    await seedSet(t, { id: "gen", date: "2026-11-11", groupId: null, items: [item("general", 1)] });
    expect(ids(await day(withGroup.token))).toEqual(["general"]);
    expect(ids(await day(lone.token))).toEqual(["general"]);
    const third = await registerPlayer(t);
    await putInGroup(t, third.playerId, "g1");
    await seedSet(t, { id: "s-g1", date: "2026-11-11", groupId: "g1", items: [item("del-grupo", 1)] });
    expect(ids(await day(third.token))).toEqual(["del-grupo"]);
    // el que ya tenia acceso al general lo conserva
    expect(ids(await day(withGroup.token))).toEqual(["general"]);
  });

  it("el set queda fijo aunque lo muevan de grupo", async () => {
    const p = await registerPlayer(t);
    await putInGroup(t, p.playerId, "g1");
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: "g1", items: [item("c1", 1)] });
    await seedSet(t, { id: "s2", date: "2026-11-11", groupId: "g2", items: [item("c2", 1)] });
    expect(ids(await day(p.token))).toEqual(["c1"]);
    await putInGroup(t, p.playerId, "g2");
    expect(ids(await day(p.token))).toEqual(["c1"]);
    await putInGroup(t, p.playerId, null);
    expect(ids(await day(p.token))).toEqual(["c1"]);
    expect(await accesses(p.playerId)).toBe(1);
  });

  it("al dia siguiente se resuelve de nuevo con el grupo de ese momento", async () => {
    const p = await registerPlayer(t);
    await putInGroup(t, p.playerId, "g1");
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: "g1", items: [item("c1", 1)] });
    await seedSet(t, { id: "s2", date: "2026-11-12", groupId: "g2", items: [item("c2", 1)] });
    expect(ids(await day(p.token))).toEqual(["c1"]);
    await putInGroup(t, p.playerId, "g2");
    t.clock.set(new Date("2026-11-12T15:00:00Z"));
    const d = await day(p.token);
    expect(d.date).toBe("2026-11-12");
    expect(ids(d)).toEqual(["c2"]);
    expect(await accesses(p.playerId)).toBe(2);
  });

  it("el player no ve el set de otro grupo", async () => {
    const a = await registerPlayer(t, "Ana");
    const b = await registerPlayer(t, "Beto");
    await putInGroup(t, a.playerId, "gA");
    await putInGroup(t, b.playerId, "gB");
    await seedSet(t, { id: "sA", date: "2026-11-11", groupId: "gA", items: [item("de-a", 1)] });
    await seedSet(t, { id: "sB", date: "2026-11-11", groupId: "gB", items: [item("de-b", 1)] });
    expect(ids(await day(a.token))).toEqual(["de-a"]);
    expect(ids(await day(b.token))).toEqual(["de-b"]);
  });

  it("set eliminado con acceso: se resuelve de nuevo (general) y el acceso apunta al nuevo; si no hay otro, 'sin set'", async () => {
    const p = await registerPlayer(t);
    await putInGroup(t, p.playerId, "g1");
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: "g1", items: [item("c1", 1)] });
    expect(ids(await day(p.token))).toEqual(["c1"]);
    await t.testDb.withStringIds("daySets").deleteOne({ _id: "s1" });
    await seedSet(t, { id: "gen", date: "2026-11-11", groupId: null, items: [item("general", 1)] });
    expect(ids(await day(p.token))).toEqual(["general"]);
    expect((await t.testDb.withStringIds("dayAccess").findOne({ playerId: p.playerId }))?.daySetId).toBe("gen");
    expect(await accesses(p.playerId)).toBe(1);
    await t.testDb.withStringIds("daySets").deleteOne({ _id: "gen" });
    const d = await day(p.token);
    expect(d.status).toBe("noSet");
    expect(d.dayEndsAt).toBe("2026-11-12T03:00:00.000Z");
  });
});

describe("GET /v1/day: bloqueo e idempotencia", () => {
  it("lockedAt se escribe solo si estaba vacio: un set ya bloqueado conserva su fecha", async () => {
    const p = await registerPlayer(t);
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: [item("c1", 1)], lockedAt: new Date("2026-11-11T10:00:00Z") });
    await day(p.token);
    await day(p.token);
    expect((await t.testDb.withStringIds("daySets").findOne({ _id: "s1" }))?.lockedAt).toEqual(new Date("2026-11-11T10:00:00Z"));
  });

  it("el bloqueo es del primer jugador: el segundo no lo mueve", async () => {
    const a = await registerPlayer(t);
    const b = await registerPlayer(t);
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: [item("c1", 1)] });
    await day(a.token);
    t.clock.set(new Date("2026-11-11T16:00:00Z"));
    await day(b.token);
    expect((await t.testDb.withStringIds("daySets").findOne({ _id: "s1" }))?.lockedAt).toEqual(new Date("2026-11-11T15:00:00Z"));
  });

  it("pedidos repetidos del mismo player: mismo set y un solo acceso", async () => {
    const p = await registerPlayer(t);
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: [item("c1", 1)] });
    const first = await (await getDay(t, p.token)).text();
    expect(await (await getDay(t, p.token)).text()).toBe(first);
    expect(await accesses(p.playerId)).toBe(1);
  });
});

describe("GET /v1/day: datos del player y privacidad", () => {
  it("actualiza lastActiveAt con la hora del servidor", async () => {
    const p = await registerPlayer(t);
    t.clock.set(new Date("2026-11-11T18:30:00Z"));
    await day(p.token);
    expect((await t.testDb.withStringIds("players").findOne({ _id: p.playerId }))?.lastActiveAt).toEqual(new Date("2026-11-11T18:30:00Z"));
  });

  it("trae el puntaje y los desafios ya logrados del player", async () => {
    const p = await registerPlayer(t);
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: [item("c1", 1), item("c2", 1)] });
    await day(p.token);
    await t.testDb.withStringIds("players").updateOne({ _id: p.playerId }, { $set: { score: 10 } });
    await t.testDb.withStringIds("results").insertOne({ _id: "r1", eventId: "e1", playerId: p.playerId, challengeId: "c2", daySetId: "s1", date: "2026-11-11", applied: true });
    const d = await day(p.token);
    expect(d.completedChallengeIds).toEqual(["c2"]);
    expect(d.score).toBe(10);
  });

  it("logs sin token, apodo ni id de desafio", async () => {
    const p = await registerPlayer(t, "Zorzal");
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: [item("desafio-secreto", 1)] });
    await day(p.token);
    const logs = t.lines.join("\n");
    expect(logs).toContain("/v1/day");
    for (const secret of [p.token, "Zorzal", "desafio-secreto", p.recoveryCode]) expect(logs).not.toContain(secret);
  });

  it("la identidad sale solo del token: otras cabeceras se ignoran", async () => {
    const a = await registerPlayer(t, "Ana");
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: [item("c1", 1)] });
    const res = await fetch(`${t.url}/v1/day`, { headers: { ...bearer(a.token), "x-player-id": "OTRO" } });
    expect(res.status).toBe(200);
    expect(await t.testDb.db.collection("dayAccess").countDocuments({ playerId: a.playerId })).toBe(1);
  });
});

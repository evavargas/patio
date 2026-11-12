import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestApp, startTestApp } from "../test-app.ts";
import { FIXTURE_ENV, eventId, getDay, item, postResult, registerPlayer, seedRules, seedSet } from "./day.fixtures.ts";

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp(FIXTURE_ENV);
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  for (const c of ["players", "daySets", "dayAccess", "results"]) await t.testDb.db.collection(c).deleteMany({});
  t.clock.set(new Date("2026-11-11T15:00:00Z"));
  t.lines.length = 0;
  await seedRules(t);
});

const players = () => t.testDb.withStringIds("players");
const results = () => t.testDb.withStringIds("results");

async function setup(n = 5) {
  const p = await registerPlayer(t);
  await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: Array.from({ length: n }, (_, i) => item(`a${i + 1}`, 1)) });
  await getDay(t, p.token);
  return p;
}

describe("logros simultaneos", () => {
  it("el mismo logro enviado 10 veces a la vez (mismo eventId) suma una sola vez", async () => {
    for (let round = 0; round < 8; round++) {
      await t.testDb.db.collection("players").deleteMany({});
      await t.testDb.db.collection("daySets").deleteMany({});
      await t.testDb.db.collection("dayAccess").deleteMany({});
      await results().deleteMany({});
      const p = await setup();
      const body = { eventId: eventId(), date: "2026-11-11", challengeId: "a1", durationMs: 1 };
      const responses = await Promise.all(Array.from({ length: 10 }, () => postResult(t, p.token, body)));
      expect(responses.map((r) => r.status)).toEqual(Array.from({ length: 10 }, () => 200));
      expect(await results().countDocuments({ playerId: p.playerId })).toBe(1);
      expect(await results().countDocuments({ applied: false })).toBe(0);
      expect(await players().findOne({ _id: p.playerId })).toMatchObject({ score: 10, countsByDifficulty: { "1": 1 } });
    }
  });

  it("el mismo logro con eventId distintos a la vez suma una sola vez", async () => {
    const p = await setup();
    const responses = await Promise.all(Array.from({ length: 10 }, () => postResult(t, p.token, { eventId: eventId(), date: "2026-11-11", challengeId: "a2", durationMs: 1 })));
    expect(responses.map((r) => r.status)).toEqual(Array.from({ length: 10 }, () => 200));
    expect(await results().countDocuments({ playerId: p.playerId })).toBe(1);
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(10);
  });

  it("5 desafios distintos a la vez: puntaje y conteos exactos y el nivel se calcula sobre el total", async () => {
    for (let round = 0; round < 5; round++) {
      await t.testDb.db.collection("players").deleteMany({});
      await t.testDb.db.collection("daySets").deleteMany({});
      await t.testDb.db.collection("dayAccess").deleteMany({});
      await results().deleteMany({});
      const p = await setup(5);
      const responses = await Promise.all([1, 2, 3, 4, 5].map((n) => postResult(t, p.token, { eventId: eventId(), date: "2026-11-11", challengeId: `a${n}`, durationMs: 1 })));
      expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
      const player = await players().findOne({ _id: p.playerId });
      expect(player).toMatchObject({ score: 50, countsByDifficulty: { "1": 5 }, level: 1 });
      expect(await results().countDocuments({ applied: true })).toBe(5);
      expect(await results().countDocuments({ applied: false })).toBe(0);
    }
  });
});

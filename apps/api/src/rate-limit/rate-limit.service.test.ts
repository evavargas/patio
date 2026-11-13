import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestDatabase, openTestDatabase } from "../database/test-database.ts";
import { TestClock } from "../test-app.ts";
import { RateLimitRepository } from "./rate-limit.repository.ts";
import { RateLimitService } from "./rate-limit.service.ts";

let testDb: TestDatabase;
let clock: TestClock;
let service: RateLimitService;
let repository: RateLimitRepository;
const rule = { max: 3, windowSeconds: 60 };

beforeAll(async () => {
  testDb = await openTestDatabase();
  clock = new TestClock("America/Montevideo");
  clock.set(new Date("2026-11-11T15:00:00Z"));
  repository = new RateLimitRepository({ db: testDb.db });
  await repository.onModuleInit();
  service = new RateLimitService(repository, clock);
});
afterAll(async () => {
  await testDb.drop();
});

describe("RateLimitService", () => {
  it("deja pasar hasta el maximo y bloquea el siguiente", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await service.hit("a:1.1.1.1", rule));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("las claves son independientes", async () => {
    expect(await service.hit("a:2.2.2.2", rule)).toBe(true);
    expect(await service.hit("b:1.1.1.1", rule)).toBe(true);
  });

  it("al vencer la ventana el contador vuelve a empezar", async () => {
    for (let i = 0; i < 3; i++) await service.hit("w:3.3.3.3", rule);
    expect(await service.hit("w:3.3.3.3", rule)).toBe(false);
    clock.set(new Date("2026-11-11T15:01:01Z"));
    expect(await service.hit("w:3.3.3.3", rule)).toBe(true);
    clock.set(new Date("2026-11-11T15:00:00Z"));
  });

  it("isExceeded mira sin contar", async () => {
    expect(await service.isExceeded("p:5.5.5.5", rule)).toBe(false);
    for (let i = 0; i < 3; i++) await service.hit("p:5.5.5.5", rule);
    expect(await service.isExceeded("p:5.5.5.5", rule)).toBe(true);
    const doc = await testDb.db.collection("rateLimits").findOne({ key: "p:5.5.5.5" });
    expect(doc?.count).toBe(3);
  });

  it("guarda key, count, windowStart y expiresAt, con indice unico y TTL", async () => {
    const doc = await testDb.db.collection("rateLimits").findOne({ key: "a:2.2.2.2" });
    expect(doc?.windowStart).toEqual(new Date("2026-11-11T15:00:00Z"));
    expect(doc?.expiresAt).toEqual(new Date("2026-11-11T15:01:00Z"));
    const indexes = await testDb.db.collection("rateLimits").indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { key: 1 }, unique: true }),
        expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
      ]),
    );
  });
});

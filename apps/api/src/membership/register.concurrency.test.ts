import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestApp, startTestApp } from "../test-app.ts";

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp({ RATE_LIMIT_REGISTER_MAX: "100000" });
});
afterAll(async () => {
  await t.close();
});

const register = (groupCode: string): Promise<Response> =>
  fetch(`${t.url}/v1/players`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nickname: "Sol", termsVersion: "1", groupCode }),
  });

async function seedGroup(code: string, maxSize: number, existing: number): Promise<void> {
  await t.testDb.withStringIds("groups").insertOne({
    _id: `g-${code}`,
    name: "3A",
    code,
    ownerIds: [],
    maxSize,
    active: true,
    createdAt: new Date("2026-11-01T00:00:00Z"),
  });
  for (let i = 0; i < existing; i++) {
    await t.testDb.withStringIds("players").insertOne({ _id: `seed-${code}-${i}`, groupId: `g-${code}`, tokenHash: `t${i}${code}`, recoveryHash: `r${i}${code}`, createdAt: new Date("2026-11-01T00:00:00Z") });
  }
}

describe("registros simultaneos al ultimo lugar de un grupo", () => {
  it("nunca superan el maximo una vez asentados, y no quedan filas de pertenencia huerfanas", async () => {
    let created = 0;
    let rejected = 0;
    for (let round = 0; round < 15; round++) {
      const code = `K7QM${2 + (round % 8)}${"XYZPQRSTUVWNMKJHGFEDCBA"[round]}`;
      await seedGroup(code, 5, 4); // queda UN lugar
      const results = await Promise.all([register(code), register(code), register(code)]);
      const statuses = results.map((r) => r.status);
      created += statuses.filter((s) => s === 201).length;
      rejected += statuses.filter((s) => s === 409).length;
      expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);
      const players = await t.testDb.db.collection("players").countDocuments({ groupId: `g-${code}` });
      const memberships = await t.testDb.db.collection("groupMemberships").countDocuments({ groupId: `g-${code}` });
      expect(players).toBeLessThanOrEqual(5);
      expect(statuses.filter((s) => s === 201).length).toBeLessThanOrEqual(1);
      expect(memberships).toBe(players - 4); // los 4 sembrados no tienen fila: solo cuentan las de esta corrida
    }
    // 45 pedidos: ninguno se pierde con 500 y todo lo no creado fue GROUP_FULL.
    expect(created + rejected).toBe(45);
  });

  it("con 10 simultaneos y 3 lugares libres no pasa el maximo", async () => {
    await seedGroup("W7QM2X", 5, 2);
    const results = await Promise.all(Array.from({ length: 10 }, () => register("W7QM2X")));
    expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(true);
    expect(await t.testDb.db.collection("players").countDocuments({ groupId: "g-W7QM2X" })).toBeLessThanOrEqual(5);
  });
});

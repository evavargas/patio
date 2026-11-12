import { type DayResponse, isDayResponse, isErrorBody, isSubmitResultResponse } from "@patio/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestApp, startTestApp } from "../test-app.ts";
import { DUMMY_RULES, FIXTURE_ENV, eventId, getDay, item, postResult, putInGroup, registerPlayer, seedRules, seedSet } from "./day.fixtures.ts";

let t: TestApp;
beforeAll(async () => {
  t = await startTestApp(FIXTURE_ENV);
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  for (const c of ["players", "daySets", "dayAccess", "results"]) await t.testDb.db.collection(c).deleteMany({});
  t.clock.set(new Date("2026-11-11T15:00:00Z")); // 12:00 en Montevideo
  t.lines.length = 0;
  await seedRules(t);
});

const players = () => t.testDb.withStringIds("players");
const results = () => t.testDb.withStringIds("results");
const send = (token: string, challengeId: string, extra: Record<string, unknown> = {}) =>
  postResult(t, token, { eventId: eventId(), date: "2026-11-11", challengeId, durationMs: 5000, ...extra });

/** Registra, mete al player en un set general con `items` y le abre el dia. */
async function setup(items = [item("c1", 1, { family: "resolver" }), item("c2", 2, { family: "crear" }), item("c3", 3)]) {
  const p = await registerPlayer(t);
  await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items });
  expect((await getDay(t, p.token)).status).toBe(200);
  return p;
}
async function expectError(res: Response, status: number, code: string): Promise<void> {
  expect(res.status).toBe(status);
  const body: unknown = await res.json();
  expect(isErrorBody(body)).toBe(true);
  expect(body).toMatchObject({ code });
}

describe("POST /v1/results: logro feliz", () => {
  it("200 con puntaje y puntos ganados; guarda el resultado aplicado y actualiza puntaje y conteos", async () => {
    const p = await setup();
    const body = { eventId: eventId(), date: "2026-11-11", challengeId: "c2", durationMs: 4200 };
    const res = await postResult(t, p.token, body);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const json: unknown = await res.json();
    expect(isSubmitResultResponse(json)).toBe(true);
    expect(json).toEqual({ score: 20, pointsEarned: 20 });
    const doc = await results().findOne({ eventId: body.eventId });
    expect(doc).toMatchObject({ playerId: p.playerId, challengeId: "c2", daySetId: "s1", date: "2026-11-11", applied: true, durationMs: 4200, points: 20, difficulty: 2, family: "crear", groupId: null });
    const player = await players().findOne({ _id: p.playerId });
    expect(player).toMatchObject({ score: 20, countsByDifficulty: { "2": 1 }, countsByFamily: { crear: 1 }, countsByDifficultyFamily: { "2:crear": 1 } });
  });

  it("puntos del item si los trae; si no, los de la dificultad segun las reglas", async () => {
    const p = await setup([item("c1", 1, { points: 7 }), item("c2", 3)]);
    expect(await (await send(p.token, "c1")).json()).toEqual({ score: 7, pointsEarned: 7 });
    expect(await (await send(p.token, "c2")).json()).toEqual({ score: 37, pointsEarned: 30 });
  });

  it("un desafio sin familia suma a la dificultad y no a las familias", async () => {
    const p = await setup();
    await send(p.token, "c3");
    const player = await players().findOne({ _id: p.playerId });
    expect(player).toMatchObject({ score: 30, countsByDifficulty: { "3": 1 } });
    expect(player?.countsByFamily).toEqual({});
  });

  it("GET /day despues del logro: el desafio figura logrado y el puntaje sube", async () => {
    const p = await setup();
    await send(p.token, "c1");
    const d: unknown = await (await getDay(t, p.token)).json();
    if (!isDayResponse(d)) throw new Error("fuera de contrato");
    const typed: DayResponse = d;
    expect(typed.completedChallengeIds).toEqual(["c1"]);
    expect(typed.score).toBe(10);
  });
});

describe("POST /v1/results: idempotencia", () => {
  it("reenviar el mismo eventId responde 200 igual y no suma dos veces", async () => {
    const p = await setup();
    const body = { eventId: eventId(), date: "2026-11-11", challengeId: "c1", durationMs: 1000 };
    const first = await (await postResult(t, p.token, body)).json();
    const again = await postResult(t, p.token, body);
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual(first);
    expect(await results().countDocuments({ playerId: p.playerId })).toBe(1);
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(10);
  });

  it("el mismo logro con otro eventId tampoco suma (indice unico por set y desafio)", async () => {
    const p = await setup();
    await send(p.token, "c1");
    const res = await send(p.token, "c1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ score: 10, pointsEarned: 10 });
    expect(await results().countDocuments({ playerId: p.playerId })).toBe(1);
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(10);
  });

  it("un eventId ya usado para otro desafio es VALIDATION_FAILED y no suma", async () => {
    const p = await setup();
    const id = eventId();
    await send(p.token, "c1", { eventId: id });
    await expectError(await send(p.token, "c2", { eventId: id }), 400, "VALIDATION_FAILED");
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(10);
  });

  it("el eventId de OTRO player no sirve para colar ni leer nada", async () => {
    const a = await setup();
    const b = await registerPlayer(t, "Beto");
    await getDay(t, b.token);
    const id = eventId();
    await send(a.token, "c1", { eventId: id });
    await expectError(await send(b.token, "c1", { eventId: id }), 400, "VALIDATION_FAILED");
    expect((await players().findOne({ _id: b.playerId }))?.score).toBe(0);
  });
});

describe("POST /v1/results: reparacion de un resultado a medio aplicar (sin transacciones)", () => {
  const HALF = "00000000-0000-4000-8000-0000000000aa";
  async function halfApplied(p: { playerId: string }, claimedAt: string) {
    await results().insertOne({ _id: "r-half", eventId: HALF, playerId: p.playerId, challengeId: "c2", daySetId: "s1", date: "2026-11-11", groupId: null, applied: false, claimedAt: new Date(claimedAt), durationMs: 1, points: 20, difficulty: 2, family: "crear", createdAt: new Date(claimedAt) });
  }
  const retry = (token: string) => postResult(t, token, { eventId: HALF, date: "2026-11-11", challengeId: "c2", durationMs: 1 });

  it("applied=false con la reserva vencida: el reintento con el mismo eventId lo completa UNA vez", async () => {
    const p = await setup();
    await halfApplied(p, "2026-11-11T14:00:00Z"); // hace una hora
    expect(await (await retry(p.token)).json()).toEqual({ score: 20, pointsEarned: 20 });
    expect(await results().findOne({ _id: "r-half" })).toMatchObject({ applied: true });
    await retry(p.token);
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(20);
  });

  it("tambien lo completa un reenvio con otro eventId del mismo logro", async () => {
    const p = await setup();
    await halfApplied(p, "2026-11-11T14:00:00Z");
    await send(p.token, "c2");
    expect(await results().findOne({ _id: "r-half" })).toMatchObject({ applied: true });
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(20);
  });

  it("varios reintentos a la vez sobre un resultado vencido lo aplican una sola vez", async () => {
    const p = await setup();
    await halfApplied(p, "2026-11-11T14:00:00Z");
    const responses = await Promise.all(Array.from({ length: 8 }, () => retry(p.token)));
    expect(responses.map((r) => r.status)).toEqual(Array.from({ length: 8 }, () => 200));
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(20);
    expect(await results().findOne({ _id: "r-half" })).toMatchObject({ applied: true });
  });

  it("applied=false con la reserva vigente (otro pedido lo esta aplicando): responde 200 sin aplicar de nuevo", async () => {
    const p = await setup();
    await halfApplied(p, "2026-11-11T14:59:50Z");
    const res = await retry(p.token);
    expect(res.status).toBe(200);
    expect(await results().findOne({ _id: "r-half" })).toMatchObject({ applied: false });
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(0);
  });
});

describe("POST /v1/results: errores de dominio", () => {
  it("desafio que no esta en el set: 404 CHALLENGE_NOT_IN_SET, sin resultado ni puntos", async () => {
    const p = await setup();
    await expectError(await send(p.token, "otro-desafio"), 404, "CHALLENGE_NOT_IN_SET");
    expect(await results().countDocuments()).toBe(0);
  });

  it("un desafio del set de OTRO player no cuenta", async () => {
    const a = await setup();
    await seedSet(t, { id: "sB", date: "2026-11-11", groupId: "gB", items: [item("solo-de-b", 1)] });
    const b = await registerPlayer(t, "Beto");
    await putInGroup(t, b.playerId, "gB");
    await getDay(t, b.token);
    await expectError(await send(a.token, "solo-de-b"), 404, "CHALLENGE_NOT_IN_SET");
  });

  it("sin acceso al dia: 404 DAY_ACCESS_NOT_FOUND", async () => {
    const p = await registerPlayer(t);
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: [item("c1", 1)] });
    await expectError(await send(p.token, "c1"), 404, "DAY_ACCESS_NOT_FOUND");
    expect(await results().countDocuments()).toBe(0);
  });

  it("set eliminado despues del acceso: 404 DAY_SET_NOT_FOUND", async () => {
    const p = await setup();
    await t.testDb.withStringIds("daySets").deleteOne({ _id: "s1" });
    await expectError(await send(p.token, "c1"), 404, "DAY_SET_NOT_FOUND");
    expect(await results().countDocuments()).toBe(0);
  });

  it("cuerpo invalido: 400 VALIDATION_FAILED (eventId no UUID, fecha mala, duracion negativa, falta challengeId, no es objeto)", async () => {
    const p = await setup();
    for (const bad of [{ eventId: "x" }, { date: "11/11/2026" }, { durationMs: -1 }, { challengeId: undefined }]) {
      await expectError(await send(p.token, "c1", bad), 400, "VALIDATION_FAILED");
    }
    await expectError(await postResult(t, p.token, [1, 2]), 400, "VALIDATION_FAILED");
    await expectError(await postResult(t, p.token, null), 400, "VALIDATION_FAILED");
    expect(await results().countDocuments()).toBe(0);
  });

  it("sin token: 401", async () => {
    expect((await fetch(`${t.url}/v1/results`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(401);
  });
});

describe("POST /v1/results: fecha y tolerancia de medianoche (30 minutos)", () => {
  const yesterday = (token: string, challengeId = "c1") => send(token, challengeId, { date: "2026-11-11" });

  it("pasada la medianoche, dentro de la tolerancia: acepta el logro del dia anterior", async () => {
    const p = await setup();
    t.clock.set(new Date("2026-11-12T03:29:59Z")); // 00:29:59 en Montevideo
    expect((await yesterday(p.token)).status).toBe(200);
    expect(await results().findOne({ playerId: p.playerId })).toMatchObject({ date: "2026-11-11", applied: true });
  });

  it("fuera de la tolerancia: 409 RESULT_DATE_NOT_ALLOWED", async () => {
    const p = await setup();
    t.clock.set(new Date("2026-11-12T03:30:00Z")); // 00:30:00, ya no
    await expectError(await yesterday(p.token), 409, "RESULT_DATE_NOT_ALLOWED");
    expect(await results().countDocuments()).toBe(0);
  });

  it("la tolerancia sale de las reglas (10 minutos) y por defecto es 30 si no hay reglas", async () => {
    const p = await setup();
    await seedRules(t, { ...DUMMY_RULES, midnightToleranceMinutes: 10 });
    t.clock.set(new Date("2026-11-12T03:11:00Z"));
    await expectError(await yesterday(p.token), 409, "RESULT_DATE_NOT_ALLOWED");
    await t.testDb.settings.deleteOne({ _id: "rules" });
    t.clock.set(new Date("2026-11-12T03:29:00Z"));
    expect((await yesterday(p.token)).status).toBe(200);
    expect((await players().findOne({ _id: p.playerId }))?.score).toBe(0); // sin reglas: sin puntos por dificultad
  });

  it("fechas futuras, de anteayer o de otro dia: RESULT_DATE_NOT_ALLOWED", async () => {
    const p = await setup();
    for (const date of ["2026-11-12", "2026-11-09", "2026-10-11", "2027-11-11"]) {
      await expectError(await send(p.token, "c1", { date }), 409, "RESULT_DATE_NOT_ALLOWED");
    }
  });

  it("hoy es hoy: el logro del dia en curso se acepta hasta el ultimo segundo", async () => {
    const p = await setup();
    t.clock.set(new Date("2026-11-12T02:59:59Z")); // 23:59:59
    expect((await send(p.token, "c1")).status).toBe(200);
  });

  it("de 'ayer' sin acceso ese dia: DAY_ACCESS_NOT_FOUND (la tolerancia no inventa accesos)", async () => {
    const p = await registerPlayer(t);
    t.clock.set(new Date("2026-11-12T03:10:00Z"));
    await expectError(await yesterday(p.token), 404, "DAY_ACCESS_NOT_FOUND");
  });
});

describe("POST /v1/results: nivel (solo en el servidor)", () => {
  const five = () => [1, 2, 3, 4, 5].map((n) => item(`a${n}`, 1));

  it("el nivel se calcula con las reglas y se guarda; ninguna respuesta lo trae", async () => {
    const p = await setup(five());
    const bodies: string[] = [];
    for (const n of [1, 2, 3, 4]) {
      bodies.push(await (await send(p.token, `a${n}`)).text());
      expect((await players().findOne({ _id: p.playerId }))?.level).toBe(0);
    }
    bodies.push(await (await send(p.token, "a5")).text());
    expect((await players().findOne({ _id: p.playerId }))?.level).toBe(1);
    bodies.push(await (await getDay(t, p.token)).text());
    for (const b of bodies) expect(b).not.toMatch(/level|nivel/i);
    expect(JSON.parse(bodies[4] ?? "")).toEqual({ score: 50, pointsEarned: 10 });
  });

  it("un solo logro puede subir varios niveles", async () => {
    const p = await setup([item("x", 1), item("y", 3, { family: "crear" })]);
    await players().updateOne(
      { _id: p.playerId },
      { $set: { score: 90, countsByDifficulty: { "1": 4, "2": 3 }, countsByDifficultyFamily: { "3:crear": 1 } } },
    );
    await send(p.token, "x"); // 5 de dificultad 1: 0 -> 1 -> 2 (los 3 de dificultad 2 ya estaban)
    expect((await players().findOne({ _id: p.playerId }))?.level).toBe(2);
    await send(p.token, "y"); // 2 de dificultad 3 crear y 130 puntos: 2 -> 3
    expect((await players().findOne({ _id: p.playerId }))?.level).toBe(3);
  });

  it("el nivel nunca baja: aunque no se cumpla el requisito, queda donde estaba", async () => {
    const p = await setup(five());
    await players().updateOne({ _id: p.playerId }, { $set: { level: 3 } });
    await send(p.token, "a1");
    expect((await players().findOne({ _id: p.playerId }))?.level).toBe(3);
  });

  it("ninguna respuesta de /v1 contiene el nivel", async () => {
    const p = await setup(five());
    await players().updateOne({ _id: p.playerId }, { $set: { level: 2 } });
    const raw: string[] = [];
    raw.push(await (await send(p.token, "a1")).text());
    raw.push(await (await send(p.token, "a1")).text());
    raw.push(await (await send(p.token, "zzz")).text());
    raw.push(await (await getDay(t, p.token)).text());
    raw.push(await (await fetch(`${t.url}/v1/me`, { headers: { authorization: `Bearer ${p.token}` } })).text());
    raw.push(await (await fetch(`${t.url}/v1/players/recover`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.7.7" }, body: JSON.stringify({ recoveryCode: p.recoveryCode }) })).text());
    const reg = await fetch(`${t.url}/v1/players`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.7.8" }, body: JSON.stringify({ nickname: "Nuevo", termsVersion: "1" }) });
    raw.push(await reg.text());
    raw.push(await (await fetch(`${t.url}/v1/banned-words`)).text());
    raw.push(await (await fetch(`${t.url}/v1/healthz`)).text());
    expect(raw.every((r) => r.length > 0)).toBe(true);
    for (const r of raw) expect(r).not.toMatch(/level|nivel/i);
  });
});

describe("POST /v1/results: sin resultados a medio aplicar tras flujos normales", () => {
  it("aplicados todos, tambien tras reenvios", async () => {
    const p = await setup();
    const body = { eventId: eventId(), date: "2026-11-11", challengeId: "c1", durationMs: 1 };
    await postResult(t, p.token, body);
    await postResult(t, p.token, body);
    await send(p.token, "c2");
    await send(p.token, "c2");
    await send(p.token, "nope");
    expect(await results().countDocuments({ applied: false })).toBe(0);
    expect(await results().countDocuments({ applied: true })).toBe(2);
  });

  it("logs sin token, apodo, eventId ni challengeId", async () => {
    const p = await registerPlayer(t, "Zorzal");
    await seedSet(t, { id: "s1", date: "2026-11-11", groupId: null, items: [item("desafio-secreto", 1)] });
    await getDay(t, p.token);
    const id = eventId();
    await send(p.token, "desafio-secreto", { eventId: id });
    const logs = t.lines.join("\n");
    expect(logs).toContain("/v1/results");
    for (const secret of [p.token, "Zorzal", id, "desafio-secreto"]) expect(logs).not.toContain(secret);
  });
});

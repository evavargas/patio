import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { isErrorBody, isLoginRequest, isPanelSession, panelValidators } from "@patio/contracts";
import { sha256 as hashToken } from "../accounts/token.fixtures.ts";
import { type TestApp, startTestApp } from "../test-app.ts";
import { registerPlayer } from "../results/day.fixtures.ts";
import { type Api, MemoryMailer, TOMORROW, TODAY, YESTERDAY, apiFor, ids, seedBase, tokenFor, validChallenge } from "./panel.fixtures.ts";

let t: TestApp;
let api: Api;
let mailer: MemoryMailer;
const admin = (): string => tokenFor(ids.admin);
const modA = (): string => tokenFor(ids.modA);
const modB = (): string => tokenFor(ids.modB);

beforeAll(async () => {
  mailer = new MemoryMailer();
  t = await startTestApp({ TRUST_PROXY_HOPS: "1", NODE_ENV: "development" }, undefined, [], mailer);
  api = apiFor(t);
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await seedBase(t);
  mailer.sent.length = 0;
});

const json = async (res: Response): Promise<Record<string, unknown>> => {
  const body: unknown = await res.json();
  if (typeof body !== "object" || body === null) throw new Error("se esperaba un objeto");
  return Object.fromEntries(Object.entries(body));
};
/** Lista de objetos dentro de una respuesta. */
const items = (body: Record<string, unknown>, key = "items"): Record<string, unknown>[] => {
  const list = body[key];
  if (!Array.isArray(list)) throw new Error(`se esperaba una lista en ${key}`);
  return list.map((x: unknown) => (typeof x === "object" && x !== null ? Object.fromEntries(Object.entries(x)) : {}));
};
const valid = (shape: string, body: unknown): void => {
  expect(panelValidators[shape]?.(body), `${shape} cumple el contrato`).toBe(true);
};
const code = async (res: Response): Promise<string | undefined> => {
  const body: unknown = await res.json();
  return isErrorBody(body) ? body.code : undefined;
};

describe("grupos", () => {
  it("el moderator solo ve los suyos; crea y queda dueño; regenerar cambia el codigo; eliminar libera players y sets", async () => {
    const mine = await json(await api(modA(), "GET", "/groups"));
    valid("PanelGroupList", mine);
    expect(mine.items).toMatchObject([{ id: ids.groupA, playerCount: 2 }]);
    expect(items(await json(await api(admin(), "GET", "/groups")))).toHaveLength(2);

    const created = await json(await api(modB(), "POST", "/groups", { name: "Nuevo", maxSize: 10 }));
    valid("PanelGroup", created);
    expect(created.ownerIds).toEqual([ids.modB]);
    expect(created.code).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);

    const regenerated = await json(await api(modA(), "POST", `/groups/${ids.groupA}/regenerate-code`));
    expect(regenerated.code).not.toBe("AAAAA2");
    expect((await fetch(`${t.url}/v1/players`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.2" }, body: JSON.stringify({ nickname: "Tomi", termsVersion: "1", groupCode: "AAAAA2" }) })).status).toBe(404);

    const impact = await json(await api(admin(), "GET", `/groups/${ids.groupA}/deletion-impact`));
    valid("DeletionImpact", impact);
    expect(impact.counts).toEqual({ players: 2, daySets: 1 });
    expect((await api(admin(), "DELETE", `/groups/${ids.groupA}`)).status).toBe(400);
    expect((await api(admin(), "DELETE", `/groups/${ids.groupA}?confirm=true`)).status).toBe(204);
    expect(await t.testDb.db.collection("daySets").countDocuments({ groupId: ids.groupA })).toBe(0);
    expect(await t.testDb.withStringIds("players").findOne({ _id: ids.playerA1 })).toMatchObject({ groupId: null });
    const log = t.lines.find((l) => l.includes('"deletion"'));
    expect(log).toContain(ids.admin);
    expect(log).not.toMatch(/Sol|Luna|example\.org/);
  });
});

describe("players", () => {
  it("lista con filtros y cursor, ficha con nivel, nunca hashes", async () => {
    const page1 = await json(await api(admin(), "GET", "/players?limit=2"));
    valid("PanelPlayerList", page1);
    expect(items(page1)).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await json(await api(admin(), "GET", `/players?limit=2&cursor=${String(page1.nextCursor)}`));
    expect(items(page2)).toHaveLength(2);
    expect(page2.nextCursor).toBeNull();
    expect(JSON.stringify(page1)).not.toMatch(/Hash/);
    expect(items(page1).every((i) => typeof i.level === "number")).toBe(true);

    const mine = await json(await api(modA(), "GET", "/players"));
    expect(items(mine).map((i) => i.id).sort()).toEqual([ids.playerA1, ids.playerA2]);
    expect((await api(modA(), "GET", "/players?groupId=none")).status).toBe(403);
    expect(items(await json(await api(admin(), "GET", "/players?groupId=none")))).toHaveLength(1);

    const detail = await json(await api(modA(), "GET", `/players/${ids.playerA1}`));
    valid("PanelPlayerDetail", detail);
  });

  it("mover: el moderator respeta el maximo y no toca players ajenos; el administrator puede pasarse del maximo", async () => {
    await t.testDb.withStringIds("players").updateOne({ _id: ids.playerNone }, { $set: { groupId: ids.groupA } }); // grupo A llega a 3 de 3
    await t.testDb.withStringIds("groupMemberships").insertOne({ _id: "x", playerId: ids.playerB1, groupId: ids.groupB, joinedAt: new Date("2026-11-01T00:00:00Z") });
    expect((await api(modA(), "PATCH", `/players/${ids.playerB1}`, { groupId: ids.groupA })).status).toBe(403);
    expect((await api(modB(), "PATCH", `/players/${ids.playerB1}`, { groupId: ids.groupA })).status).toBe(403); // destino ajeno
    const full = await api(admin(), "POST", "/players/move", { playerIds: [ids.playerB1], groupId: ids.groupA });
    expect(full.status).toBe(200); // administrator no respeta el maximo
    expect(await json(full)).toEqual({ moved: 1 });
    const rows = await t.testDb.db.collection("groupMemberships").find({ playerId: ids.playerB1 }).toArray();
    expect(rows.filter((r) => r.leftAt === undefined).map((r) => r.groupId)).toEqual([ids.groupA]);
    expect(rows.filter((r) => r.leftAt !== undefined)).toHaveLength(1);
    // moderator A: sacar a un jugador propio, y GROUP_FULL al volver a llenar B (maxSize 3)
    expect((await api(modA(), "PATCH", `/players/${ids.playerA1}`, { groupId: null })).status).toBe(403); // sacar = "Sin grupo", solo administrator
    await t.testDb.withStringIds("groups").updateOne({ _id: ids.groupA }, { $set: { maxSize: 3 } });
    const r = await api(modA(), "POST", "/players/move", { playerIds: [ids.playerA1], groupId: ids.groupA });
    expect(r.status).toBe(200);
    expect(await json(r)).toEqual({ moved: 0 });
  });

  it("moderator: GROUP_FULL al mover a un grupo propio completo", async () => {
    await t.testDb.withStringIds("groups").updateOne({ _id: ids.groupA }, { $set: { ownerIds: [ids.modA, ids.modB] } }); // modB tambien dueño de A
    const res = await api(modB(), "PATCH", `/players/${ids.playerB1}`, { groupId: ids.groupA });
    expect(res.status).toBe(200); // A tiene 2 de 3
    await t.testDb.withStringIds("groups").updateOne({ _id: ids.groupB }, { $set: { maxSize: 1 } });
    const full = await api(modB(), "POST", "/players/move", { playerIds: [ids.playerA1, ids.playerA2], groupId: ids.groupB });
    expect(full.status).toBe(409);
    expect(await code(full)).toBe("GROUP_FULL");
  });

  it("reemitir codigo: devuelve uno nuevo UNA vez, el viejo deja de servir y el nuevo recupera la sesion", async () => {
    const reg = await registerPlayer(t, "Mica");
    const res = await json(await api(admin(), "POST", `/players/${reg.playerId}/reissue-recovery`));
    valid("ReissueRecoveryResponse", res);
    const recover = (recoveryCode: string): Promise<Response> => fetch(`${t.url}/v1/players/recover`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.3" }, body: JSON.stringify({ recoveryCode }) });
    expect((await recover(reg.recoveryCode)).status).toBe(404);
    expect((await recover(String(res.recoveryCode))).status).toBe(200);
  });

  it("apodo (solo administrator) pasa por el filtro; eliminar borra jugador, logros, accesos y filas", async () => {
    await api(admin(), "PUT", "/banned-words", { words: ["feo"] });
    expect((await api(admin(), "PATCH", `/players/${ids.playerA1}/nickname`, { nickname: "Feo" })).status).toBe(400);
    expect((await json(await api(admin(), "PATCH", `/players/${ids.playerA1}/nickname`, { nickname: "Estrella" }))).nickname).toBe("Estrella");

    await t.testDb.withStringIds("results").insertOne({ _id: "r1", playerId: ids.playerA1, date: YESTERDAY, groupId: ids.groupA, challengeId: ids.challengeMod, applied: true });
    await t.testDb.db.collection("dayAccess").insertOne({ playerId: ids.playerA1, date: YESTERDAY, daySetId: "x", groupId: ids.groupA });
    expect((await json(await api(admin(), "GET", `/players/${ids.playerA1}/deletion-impact`))).counts).toEqual({ results: 1, daysEntered: 1, membershipRows: 0 });
    expect((await api(admin(), "DELETE", `/players/${ids.playerA1}?confirm=true`)).status).toBe(204);
    expect(await t.testDb.withStringIds("players").countDocuments({ _id: ids.playerA1 })).toBe(0);
    expect(await t.testDb.db.collection("results").countDocuments({ playerId: ids.playerA1 })).toBe(0);
    expect(await t.testDb.db.collection("dayAccess").countDocuments({ playerId: ids.playerA1 })).toBe(0);
  });
});

describe("desafios", () => {
  it("crea validando la mecanica, edita subiendo la version, duplica y archiva; el set publicado conserva su copia", async () => {
    const created = await json(await api(modA(), "POST", "/challenges", validChallenge()));
    valid("PanelChallenge", created);
    expect(created).toMatchObject({ authorId: ids.modA, version: 1, status: "active" });
    const bad = { ...validChallenge(), mechanic: { type: "dragDrop", schemaVersion: 1, config: {} } };
    expect((await api(modA(), "POST", "/challenges", bad)).status).toBe(400);

    // publicar un set con el desafio del moderator A, editarlo despues
    expect((await api(modA(), "POST", `/day-sets/${ids.setA}/publish`)).status).toBe(200);
    const edited = await json(await api(modA(), "PUT", `/challenges/${ids.challengeMod}`, { ...validChallenge(), text: "Texto nuevo" }));
    expect(edited.version).toBe(2);
    expect((await t.testDb.withStringIds("daySets").findOne({ _id: ids.setA }))?.items).toMatchObject([{ challengeId: ids.challengeMod, text: expect.stringContaining("manzanas") }]);

    const copy = await json(await api(modB(), "POST", `/challenges/${ids.challengeMod}/duplicate`));
    expect(copy).toMatchObject({ authorId: ids.modB, version: 1 });
    const archived = await json(await api(modA(), "POST", `/challenges/${ids.challengeMod}/archive`));
    expect(archived.status).toBe("archived");
    valid("PanelChallengeList", await json(await api(modB(), "GET", "/challenges?status=archived&mine=false")));
  });
});

describe("sets del dia", () => {
  it("borrador, aviso fuera de 3 a 5, publicar copia items, SET_LOCKED cuando un player lo abre, el administrator elimina", async () => {
    const saved = await json(await api(modA(), "PUT", "/day-sets", { date: TOMORROW, groupId: ids.groupA, challengeIds: [ids.challengeMod, ids.challengeAdmin] }));
    valid("PanelDaySet", saved);
    expect(saved).toMatchObject({ id: ids.setA, status: "draft", outsideRecommendedRange: true });
    expect((await api(modA(), "PUT", "/day-sets", { date: YESTERDAY, groupId: ids.groupA, challengeIds: [] })).status).toBe(400);
    expect((await api(modA(), "PUT", "/day-sets", { date: TOMORROW, groupId: ids.groupA, challengeIds: ["c0000000-0000-4000-8000-00000000ffff"] })).status).toBe(404);

    // set de HOY para el grupo A, publicado, y un player del grupo lo abre
    const today = await json(await api(modA(), "PUT", "/day-sets", { date: TODAY, groupId: ids.groupA, challengeIds: [ids.challengeMod] }));
    const published = await json(await api(modA(), "POST", `/day-sets/${String(today.id)}/publish`));
    expect(published.status).toBe("published");
    await t.testDb.withStringIds("players").updateOne({ _id: ids.playerA1 }, { $set: { tokenHash: hashToken("T".repeat(43)) } });
    expect((await fetch(`${t.url}/v1/day`, { headers: { authorization: `Bearer ${"T".repeat(43)}` } })).status).toBe(200);
    const locked = await api(modA(), "PUT", "/day-sets", { date: TODAY, groupId: ids.groupA, challengeIds: [] });
    expect(locked.status).toBe(409);
    expect(await code(locked)).toBe("SET_LOCKED");
    expect((await api(modA(), "POST", `/day-sets/${String(today.id)}/unpublish`)).status).toBe(409);

    expect((await json(await api(admin(), "GET", `/day-sets/${String(today.id)}/deletion-impact`))).counts).toEqual({ playersWhoOpened: 1 });
    expect((await api(admin(), "DELETE", `/day-sets/${String(today.id)}?confirm=true`)).status).toBe(204);
    const list = await json(await api(modA(), "GET", `/day-sets?from=${TODAY}&to=${TOMORROW}`));
    valid("PanelDaySetList", list);
    expect(items(list)).toHaveLength(1);
  });
});

describe("reglas, limites y palabras", () => {
  it("las palabras suben la version en cada cambio y filtran el registro; reglas y limites se leen despues de guardarlos", async () => {
    const v1 = await json(await api(admin(), "PUT", "/banned-words", { words: ["Feo", " Feo ", "malo"] }));
    expect(v1).toEqual({ version: 1, words: ["Feo", "malo"] });
    expect((await json(await api(admin(), "PUT", "/banned-words", { words: ["malo"] }))).version).toBe(2);
    expect((await fetch(`${t.url}/v1/players`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.4" }, body: JSON.stringify({ nickname: "malo", termsVersion: "1" }) })).status).toBe(400);

    const rules = { pointsByDifficulty: { "1": 10 }, levels: [{ requirements: [{ difficulty: 1, min: 2 }] }], midnightToleranceMinutes: 15 };
    expect(await json(await api(admin(), "PUT", "/rules", rules))).toEqual(rules);
    expect(await json(await api(modA(), "GET", "/rules"))).toEqual(rules);
    expect((await api(admin(), "PUT", "/rules", { ...rules, midnightToleranceMinutes: -1 })).status).toBe(400);

    const before = await json(await api(admin(), "GET", "/limits"));
    valid("PanelLimits", before);
    const limits = { ...before, register: { max: 3, windowSeconds: 120 } };
    expect(await json(await api(admin(), "PUT", "/limits", limits))).toEqual(limits);
  });
});

describe("cuentas e invitaciones", () => {
  it("crear con clave temporal, reiniciar, desactivar revoca sesiones, no se elimina a si mismo ni al ultimo administrator", async () => {
    const created = await json(await api(admin(), "POST", "/accounts", { email: "  Nueva@Example.org ", temporaryPassword: "una contrasena temporal larga" }));
    valid("AccountSummary", created);
    expect(created).toMatchObject({ email: "nueva@example.org", role: "moderator", mustChangePassword: true });
    expect((await api(admin(), "POST", "/accounts", { email: "nueva@example.org", temporaryPassword: "una contrasena temporal larga" })).status).toBe(409);

    const login = await fetch(`${t.url}/v1/panel/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.5" }, body: JSON.stringify({ email: "nueva@example.org", password: "una contrasena temporal larga" }) });
    const session: unknown = await login.json();
    expect(isPanelSession(session) && session.account.mustChangePassword).toBe(true);
    const id = String(created.id);
    expect(await t.testDb.db.collection("refreshTokens").countDocuments({ accountId: id })).toBe(1);

    expect((await api(admin(), "PATCH", `/accounts/${id}`, { active: false })).status).toBe(200);
    expect(await t.testDb.db.collection("refreshTokens").countDocuments({ accountId: id })).toBe(0);
    expect(await code(await api(tokenFor(id), "GET", "/groups"))).toBe("ACCOUNT_INACTIVE");

    expect((await api(admin(), "POST", `/accounts/${id}/reset-password`, { temporaryPassword: "otra contrasena temporal larga" })).status).toBe(204);
    expect((await t.testDb.withStringIds("accounts").findOne({ _id: id }))?.mustChangePassword).toBe(true);

    expect(await code(await api(admin(), "DELETE", `/accounts/${ids.admin}?confirm=true`))).toBe("CANNOT_DELETE_OWN_ACCOUNT");
    await t.testDb.withStringIds("accounts").insertOne({ _id: "a0000000-0000-4000-8000-000000000002", email: "otro-admin@example.org", role: "administrator", passwordHash: "x", mustChangePassword: false, active: true, createdAt: new Date(0), passwordChangedAt: new Date(0) });
    const second = tokenFor("a0000000-0000-4000-8000-000000000002");
    expect((await api(second, "DELETE", `/accounts/${ids.admin}?confirm=true`)).status).toBe(204); // ya hay otro activo: se puede
    expect(await code(await api(second, "PATCH", `/accounts/${ids.admin}`, { active: false }))).toBe("ACCOUNT_NOT_FOUND");

    // eliminar un moderator lo quita de ownerIds y revoca sus sesiones
    expect((await json(await api(second, "GET", `/accounts/${ids.modA}/deletion-impact`))).counts).toEqual({ groupsOwned: 1, challengesAuthored: 1 });
    expect((await api(second, "DELETE", `/accounts/${ids.modA}?confirm=true`)).status).toBe(204);
    expect((await t.testDb.withStringIds("groups").findOne({ _id: ids.groupA }))?.ownerIds).toEqual([]);
    expect(await code(await api(modA(), "GET", "/groups"))).toBe("INVALID_TOKEN");
  });

  it("invitacion: el correo lleva el enlace, solo se guarda el hash, el enlace vuelve en la respuesta solo en development, aceptar crea el moderator y el enlace sirve una vez", async () => {
    const res = await json(await api(admin(), "POST", "/accounts/invitations", { email: "Docente@Example.org" }));
    valid("InvitationResponse", res);
    expect(res).toMatchObject({ email: "docente@example.org", emailSent: true });
    const link = String(res.link);
    const token = new URL(link).searchParams.get("token") ?? "";
    expect(link.startsWith("http://localhost:5173/accept-invitation?token=")).toBe(true);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe("docente@example.org");
    expect(mailer.sent[0]?.text).toContain(link);
    const stored = await t.testDb.db.collection("accountInvitations").findOne({ email: "docente@example.org" });
    expect(stored?.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(stored?.expiresAt.getTime() - stored?.createdAt.getTime()).toBe(7 * 86_400_000);
    expect(t.lines.join("\n")).not.toContain(token);

    const accept = (password: string, tk = token): Promise<Response> =>
      fetch(`${t.url}/v1/panel/auth/accept-invitation`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.6" }, body: JSON.stringify({ token: tk, password }) });
    expect((await accept("corta")).status).toBe(400);
    expect((await accept("una contrasena bastante larga")).status).toBe(204);
    expect(await code(await accept("una contrasena bastante larga"))).toBe("INVITATION_INVALID");
    expect(await t.testDb.withStringIds("accounts").findOne({ email: "docente@example.org" })).toMatchObject({ role: "moderator", active: true, mustChangePassword: false });
    expect(isLoginRequest({ email: "docente@example.org", password: "x" })).toBe(true);
    const login = await fetch(`${t.url}/v1/panel/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.7" }, body: JSON.stringify({ email: "docente@example.org", password: "una contrasena bastante larga" }) });
    expect(login.status).toBe(200);
  });

  it("invitacion vencida o con correo ya registrado se rechaza", async () => {
    expect((await api(admin(), "POST", "/accounts/invitations", { email: "moda@example.org" })).status).toBe(409);
    const res = await json(await api(admin(), "POST", "/accounts/invitations", { email: "tarde@example.org" }));
    const token = new URL(String(res.link)).searchParams.get("token") ?? "";
    t.clock.set(new Date(T_PLUS_8_DAYS));
    const late = await fetch(`${t.url}/v1/panel/auth/accept-invitation`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.8" }, body: JSON.stringify({ token, password: "una contrasena bastante larga" }) });
    expect(await code(late)).toBe("INVITATION_INVALID");
  });
});

const T_PLUS_8_DAYS = "2026-11-20T15:00:00Z";

describe("estadisticas", () => {
  it("llegan hasta ayer (nunca hoy), con alcance, y los rankings traen compromiso y avance por grupo", async () => {
    const res = (playerId: string, date: string, groupId: string, n: number): Record<string, unknown> => ({ _id: `r${n}`, eventId: `e${n}`, playerId, challengeId: ids.challengeMod, daySetId: `s${n}`, date, groupId, applied: true, durationMs: 4000, points: 10, difficulty: 1, createdAt: T_DATE });
    await t.testDb.withStringIds("players").updateMany({}, { $set: { createdAt: T_DATE } }); // el alta de hoy no cuenta
    await t.testDb.db.collection("results").insertMany([res(ids.playerA1, YESTERDAY, ids.groupA, 1), res(ids.playerA2, YESTERDAY, ids.groupA, 2), res(ids.playerB1, YESTERDAY, ids.groupB, 3), res(ids.playerA1, TODAY, ids.groupA, 4)]);
    await t.testDb.db.collection("dayAccess").insertMany(
      [ids.playerA1, ids.playerA2].map((playerId) => ({ playerId, date: YESTERDAY, daySetId: "dsx", groupId: ids.groupA, createdAt: T_DATE })).concat([{ playerId: ids.playerA1, date: TODAY, daySetId: "dsx", groupId: ids.groupA, createdAt: T_DATE }]),
    );
    await t.testDb.withStringIds("daySets").insertOne({ _id: "dsx", date: YESTERDAY, groupId: ids.groupA, status: "published", items: [{ challengeId: ids.challengeMod }, { challengeId: ids.challengeAdmin }], timezone: "x" });

    const all = await json(await api(admin(), "GET", `/stats/overview?to=${TODAY}`));
    valid("StatsOverview", all);
    expect(all).toMatchObject({ to: YESTERDAY, enteredOnLastDay: 2, withResultOnLastDay: 3, resultsOnLastDay: 3, totalPlayers: 4 });
    const mine = await json(await api(modA(), "GET", "/stats/overview"));
    expect(mine).toMatchObject({ resultsOnLastDay: 2, totalPlayers: 2 });
    expect((await api(modA(), "GET", `/stats/overview?groupId=${ids.groupB}`)).status).toBe(403);
    expect((await api(modA(), "GET", "/stats/overview?from=2026-01-01&to=2026-11-11")).status).toBe(400);

    const ch = await json(await api(modA(), "GET", "/stats/challenges"));
    valid("StatsChallenges", ch);
    expect(ch.items).toMatchObject([{ challengeId: ids.challengeMod, achieved: 2, avgDurationMs: 4000 }]);
    valid("StatsRegistrations", await json(await api(admin(), "GET", "/stats/registrations")));
    const groups = await json(await api(modA(), "GET", "/stats/groups"));
    valid("StatsGroups", groups);
    expect(groups.items).toMatchObject([{ groupId: ids.groupA, playerCount: 2, activePlayers: 2, results: 2 }]);

    const rankings = await json(await api(modA(), "GET", "/stats/rankings"));
    valid("StatsRankings", rankings);
    const byGroup = items(rankings, "groups");
    const g = byGroup[0] ?? {};
    expect(byGroup).toHaveLength(1);
    expect(g.groupId).toBe(ids.groupA);
    expect(items(g, "commitment").find((c) => c.playerId === ids.playerA1)).toMatchObject({ daysEntered: 1, achieved: 1, available: 2 });
    expect(items(g, "progress")).toHaveLength(2);
  });
});

const T_DATE = new Date("2026-11-11T15:00:00Z");

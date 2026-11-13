import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestApp, startTestApp } from "../test-app.ts";
import { type Api, MemoryMailer, TOMORROW, TODAY, apiFor, ids, seedBase, tokenFor, validChallenge } from "./panel.fixtures.ts";

let t: TestApp;
let api: Api;
let n = 0;

beforeAll(async () => {
  t = await startTestApp({ TRUST_PROXY_HOPS: "1" }, undefined, [], new MemoryMailer());
  api = apiFor(t);
});
afterAll(async () => {
  await t.close();
});
beforeEach(() => seedBase(t));

interface Row {
  name: string;
  method: string;
  path: string;
  body?: () => unknown;
  /** Estado esperado: administrator, moderator dueño, moderator ajeno. Sin token y con token de player: siempre 401. */
  expect: [admin: number, owner: number, foreign: number];
}

const p = ids;
// Los DELETE sin `?confirm=true` no destruyen nada: el administrator recibe 400 CONFIRMATION_REQUIRED (tiene permiso), los demas 403.
const ROWS: Row[] = [
  { name: "GET /groups", method: "GET", path: "/groups", expect: [200, 200, 200] },
  { name: "POST /groups", method: "POST", path: "/groups", body: () => ({ name: "Nuevo" }), expect: [201, 201, 201] },
  { name: "PATCH /groups/:id", method: "PATCH", path: `/groups/${p.groupA}`, body: () => ({ name: "Renombrado" }), expect: [200, 200, 403] },
  { name: "POST /groups/:id/regenerate-code", method: "POST", path: `/groups/${p.groupA}/regenerate-code`, expect: [200, 200, 403] },
  { name: "GET /groups/:id/deletion-impact", method: "GET", path: `/groups/${p.groupA}/deletion-impact`, expect: [200, 403, 403] },
  { name: "DELETE /groups/:id", method: "DELETE", path: `/groups/${p.groupA}`, expect: [400, 403, 403] },
  { name: "GET /players", method: "GET", path: "/players", expect: [200, 200, 200] },
  { name: "GET /players/:id", method: "GET", path: `/players/${p.playerA1}`, expect: [200, 200, 403] },
  { name: "PATCH /players/:id", method: "PATCH", path: `/players/${p.playerA1}`, body: () => ({ groupId: p.groupA }), expect: [200, 200, 403] },
  { name: "POST /players/move", method: "POST", path: "/players/move", body: () => ({ playerIds: [p.playerA1], groupId: p.groupA }), expect: [200, 200, 403] },
  { name: "PATCH /players/:id/nickname", method: "PATCH", path: `/players/${p.playerA1}/nickname`, body: () => ({ nickname: "Estrella" }), expect: [200, 403, 403] },
  { name: "POST /players/:id/reissue-recovery", method: "POST", path: `/players/${p.playerA1}/reissue-recovery`, expect: [200, 200, 403] },
  { name: "GET /players/:id/deletion-impact", method: "GET", path: `/players/${p.playerA1}/deletion-impact`, expect: [200, 403, 403] },
  { name: "DELETE /players/:id", method: "DELETE", path: `/players/${p.playerA1}`, expect: [400, 403, 403] },
  { name: "GET /challenges", method: "GET", path: "/challenges", expect: [200, 200, 200] },
  { name: "GET /challenges/:id", method: "GET", path: `/challenges/${p.challengeAdmin}`, expect: [200, 200, 200] },
  { name: "POST /challenges", method: "POST", path: "/challenges", body: validChallenge, expect: [201, 201, 201] },
  { name: "PUT /challenges/:id (autor moderator)", method: "PUT", path: `/challenges/${p.challengeMod}`, body: validChallenge, expect: [200, 200, 403] },
  { name: "PUT /challenges/:id (autor administrator)", method: "PUT", path: `/challenges/${p.challengeAdmin}`, body: validChallenge, expect: [200, 403, 403] },
  { name: "POST /challenges/:id/duplicate", method: "POST", path: `/challenges/${p.challengeAdmin}/duplicate`, expect: [201, 201, 201] },
  { name: "POST /challenges/:id/archive (autor moderator)", method: "POST", path: `/challenges/${p.challengeMod}/archive`, expect: [200, 200, 403] },
  { name: "GET /day-sets", method: "GET", path: `/day-sets?from=${TODAY}&to=${TOMORROW}`, expect: [200, 200, 200] },
  { name: "GET /day-sets/:id", method: "GET", path: `/day-sets/${p.setA}`, expect: [200, 200, 403] },
  { name: "PUT /day-sets (grupo)", method: "PUT", path: "/day-sets", body: () => ({ date: TOMORROW, groupId: p.groupA, challengeIds: [p.challengeAdmin] }), expect: [200, 200, 403] },
  { name: "PUT /day-sets (general)", method: "PUT", path: "/day-sets", body: () => ({ date: TOMORROW, groupId: null, challengeIds: [p.challengeAdmin] }), expect: [200, 403, 403] },
  { name: "POST /day-sets/:id/publish", method: "POST", path: `/day-sets/${p.setA}/publish`, expect: [200, 200, 403] },
  { name: "POST /day-sets/:id/unpublish", method: "POST", path: `/day-sets/${p.setA}/unpublish`, expect: [200, 200, 403] },
  { name: "GET /day-sets/:id/deletion-impact", method: "GET", path: `/day-sets/${p.setA}/deletion-impact`, expect: [200, 403, 403] },
  { name: "DELETE /day-sets/:id", method: "DELETE", path: `/day-sets/${p.setA}`, expect: [400, 403, 403] },
  { name: "GET /rules", method: "GET", path: "/rules", expect: [200, 200, 200] },
  { name: "PUT /rules", method: "PUT", path: "/rules", body: () => ({ pointsByDifficulty: { "1": 10 }, levels: [], midnightToleranceMinutes: 30 }), expect: [200, 403, 403] },
  { name: "GET /limits", method: "GET", path: "/limits", expect: [200, 403, 403] },
  { name: "PUT /limits", method: "PUT", path: "/limits", body: () => ({ register: { max: 5, windowSeconds: 60 }, groupCode: { max: 5, windowSeconds: 60 }, recover: { max: 5, windowSeconds: 60 }, login: { max: 5, windowSeconds: 60 } }), expect: [200, 403, 403] },
  { name: "GET /banned-words", method: "GET", path: "/banned-words", expect: [200, 403, 403] },
  { name: "PUT /banned-words", method: "PUT", path: "/banned-words", body: () => ({ words: ["prueba"] }), expect: [200, 403, 403] },
  { name: "GET /accounts", method: "GET", path: "/accounts", expect: [200, 403, 403] },
  { name: "POST /accounts", method: "POST", path: "/accounts", body: () => ({ email: `nuevo${++n}@example.org`, temporaryPassword: "una contrasena temporal larga" }), expect: [201, 403, 403] },
  { name: "POST /accounts/invitations", method: "POST", path: "/accounts/invitations", body: () => ({ email: `invitado${++n}@example.org` }), expect: [201, 403, 403] },
  { name: "PATCH /accounts/:id", method: "PATCH", path: `/accounts/${p.modB}`, body: () => ({ active: true }), expect: [200, 403, 403] },
  { name: "POST /accounts/:id/reset-password", method: "POST", path: `/accounts/${p.modB}/reset-password`, body: () => ({ temporaryPassword: "otra contrasena temporal larga" }), expect: [204, 403, 403] },
  { name: "GET /accounts/:id/deletion-impact", method: "GET", path: `/accounts/${p.modB}/deletion-impact`, expect: [200, 403, 403] },
  { name: "DELETE /accounts/:id", method: "DELETE", path: `/accounts/${p.modB}`, expect: [400, 403, 403] },
  ...["overview", "challenges", "registrations", "groups", "rankings"].map((s): Row => ({ name: `GET /stats/${s}`, method: "GET", path: `/stats/${s}`, expect: [200, 200, 200] })),
];

describe("matriz de permisos del panel (ruta x rol)", () => {
  it.each(ROWS)("$name", async (row) => {
    const send = (token: string | undefined): Promise<Response> => api(token, row.method, row.path, row.body?.());
    // Sin sesion y el ajeno van primero: lo que haga el administrator no cambia lo que ellos ven.
    expect((await send(undefined)).status, "sin token").toBe(401);
    expect((await send("A".repeat(43))).status, "token de player").toBe(401);
    expect((await send(tokenFor(ids.modB))).status, "moderator ajeno").toBe(row.expect[2]);
    expect((await send(tokenFor(ids.modA))).status, "moderator dueño").toBe(row.expect[1]);
    expect((await send(tokenFor(ids.admin))).status, "administrator").toBe(row.expect[0]);
  });
});

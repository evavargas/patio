import { readFileSync } from "node:fs";
import { join } from "node:path";
import { accessTokenFor } from "../accounts/token.fixtures.ts";
import { Clock } from "../platform/clock.ts";
import type { MailMessage, Mailer } from "../platform/mailer.ts";
import type { TestApp } from "../test-app.ts";

export const T0 = new Clock("UTC").fromEpochSeconds(Date.parse("2026-11-12T15:00:00Z") / 1000); // 12:00 en Montevideo: hoy = 2026-11-12
export const TODAY = "2026-11-12";
export const TOMORROW = "2026-11-13";
export const YESTERDAY = "2026-11-11";

export const ids = {
  admin: "a0000000-0000-4000-8000-000000000001",
  modA: "a0000000-0000-4000-8000-0000000000a1",
  modB: "a0000000-0000-4000-8000-0000000000b1",
  groupA: "b0000000-0000-4000-8000-0000000000a1",
  groupB: "b0000000-0000-4000-8000-0000000000b1",
  playerA1: "AAAAAAAAAAA2",
  playerA2: "AAAAAAAAAAA3",
  playerB1: "BBBBBBBBBBB2",
  playerNone: "CCCCCCCCCCC2",
  challengeMod: "c0000000-0000-4000-8000-0000000000a1",
  challengeAdmin: "c0000000-0000-4000-8000-0000000000a2",
  setA: "d0000000-0000-4000-8000-0000000000a1",
} as const;

export const validChallenge = (): Record<string, unknown> => JSON.parse(readFileSync(join(import.meta.dirname, "../../../../packages/contracts/examples/valid/drag-drop.json"), "utf8"));

/** Access token firmado a mano (evita el costo de argon2 en cada prueba). El reloj de prueba esta en T0. */
export const tokenFor = (accountId: string): string => accessTokenFor(accountId, T0);

export class MemoryMailer implements Mailer {
  sent: MailMessage[] = [];
  send(message: MailMessage): Promise<"sent"> {
    this.sent.push(message);
    return Promise.resolve("sent");
  }
}

export interface Api {
  (token: string | undefined, method: string, path: string, body?: unknown): Promise<Response>;
}

export const apiFor = (t: TestApp): Api => (token, method, path, body) =>
  fetch(`${t.url}/v1/panel${path}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.1", ...(token === undefined ? {} : { authorization: `Bearer ${token}` }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

/** Datos base: 1 administrator, 2 moderators dueños de un grupo cada uno, 4 players, 2 desafios y un borrador. Sin argon2. */
export async function seedBase(t: TestApp): Promise<void> {
  const db = t.testDb;
  for (const c of ["accounts", "groups", "players", "groupMemberships", "challenges", "daySets", "dayAccess", "results", "settings", "refreshTokens", "rateLimits", "accountInvitations"]) await db.db.collection(c).deleteMany({});
  const account = (_id: string, email: string, role: string) => ({ _id, email, role, passwordHash: "$argon2id$v=19$m=1,t=1,p=1$AAAA$AAAA", mustChangePassword: false, active: true, createdAt: T0, passwordChangedAt: T0 });
  await db.withStringIds("accounts").insertMany([account(ids.admin, "admin@example.org", "administrator"), account(ids.modA, "moda@example.org", "moderator"), account(ids.modB, "modb@example.org", "moderator")]);
  await db.withStringIds("groups").insertMany([
    { _id: ids.groupA, name: "Grupo A", code: "AAAAA2", ownerIds: [ids.modA], maxSize: 3, active: true, createdAt: T0 },
    { _id: ids.groupB, name: "Grupo B", code: "BBBBB2", ownerIds: [ids.modB], maxSize: 3, active: true, createdAt: T0 },
  ]);
  const player = (_id: string, nickname: string, groupId: string | null, n: number) => ({
    _id, nickname, groupId, tokenHash: `t${n}`, recoveryHash: `r${n}`, score: 10 * n, countsByDifficulty: { "1": n }, countsByFamily: {}, countsByDifficultyFamily: {}, level: n % 2, termsVersion: "1", termsAcceptedAt: T0, createdAt: T0, lastActiveAt: T0,
  });
  await db.withStringIds("players").insertMany([player(ids.playerA1, "Sol", ids.groupA, 1), player(ids.playerA2, "Luna", ids.groupA, 2), player(ids.playerB1, "Rayo", ids.groupB, 3), player(ids.playerNone, "Nube", null, 4)]);
  const content = validChallenge();
  const chal = (_id: string, authorId: string) => ({ _id, authorId, status: "active", version: 1, ...content, createdAt: T0, updatedAt: T0 });
  await db.withStringIds("challenges").insertMany([chal(ids.challengeMod, ids.modA), chal(ids.challengeAdmin, ids.admin)]);
  await db.withStringIds("daySets").insertOne({ _id: ids.setA, date: TOMORROW, groupId: ids.groupA, status: "draft", items: [], challengeIds: [ids.challengeMod], timezone: "America/Montevideo" });
  t.clock.set(T0);
  t.lines.length = 0;
}

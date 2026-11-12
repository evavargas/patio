import { type DayItem, type RegisterPlayerResponse, isChallengeId, isRegisterPlayerResponse } from "@patio/contracts";
import type { TestApp } from "../test-app.ts";

/** Entorno para pruebas que registran muchos players desde "IPs" distintas. */
export const FIXTURE_ENV = { TRUST_PROXY_HOPS: "1", RATE_LIMIT_REGISTER_MAX: "100000" };

/** Reglas dummy de doc 04 (no pedagogicas): 3 dificultades y 5 niveles (0 a 4). */
export const DUMMY_RULES = {
  _id: "rules",
  pointsByDifficulty: { "1": 10, "2": 20, "3": 30 },
  midnightToleranceMinutes: 30,
  levels: [
    { requirements: [{ difficulty: 1, min: 5 }] },
    { requirements: [{ difficulty: 2, min: 3 }] },
    { requirements: [{ difficulty: 3, family: "crear", min: 2 }], minScore: 100 },
    { requirements: [{ difficulty: 3, min: 5 }] },
  ],
};

let ipCounter = 0;
export const nextIp = (): string => `10.9.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
export const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

export async function registerPlayer(t: TestApp, nickname = "Lucía"): Promise<RegisterPlayerResponse> {
  const res = await fetch(`${t.url}/v1/players`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
    body: JSON.stringify({ nickname, termsVersion: "2026-11" }),
  });
  const body: unknown = await res.json();
  if (!isRegisterPlayerResponse(body)) throw new Error("registro fuera de contrato");
  return body;
}

/** Item de set de prueba (texto plano). Los campos extra simulan lo que el set guarda y NO debe salir. */
export function item(challengeId: string, difficulty: number, extra: { family?: "resolver" | "descubrir" | "crear"; points?: number; text?: string } = {}): DayItem & { version: number; authorId: string } {
  if (!isChallengeId(challengeId)) throw new Error("challengeId de fixture invalido");
  const mechanic: DayItem["mechanic"] = { type: "numberInput", schemaVersion: 1, config: { expression: "7 + {a} = 12", fields: [{ id: "a", expected: 5 }] } };
  const base = {
    challengeId,
    text: extra.text ?? `Consigna de ${challengeId}`,
    mechanic,
    difficulty,
    assets: [],
    version: 3,
    authorId: "autor-secreto",
  };
  return { ...base, ...(extra.family === undefined ? {} : { family: extra.family }), ...(extra.points === undefined ? {} : { points: extra.points }) };
}

export interface SeedSet {
  id: string;
  date: string;
  groupId: string | null;
  items: ReturnType<typeof item>[];
  status?: "draft" | "published";
  lockedAt?: Date;
}

export async function seedSet(t: TestApp, set: SeedSet): Promise<void> {
  await t.testDb.withStringIds("daySets").insertOne({
    _id: set.id,
    date: set.date,
    groupId: set.groupId,
    status: set.status ?? "published",
    items: set.items,
    timezone: "America/Montevideo",
    ...(set.lockedAt === undefined ? {} : { lockedAt: set.lockedAt }),
  });
}

export const seedRules = (t: TestApp, rules: Record<string, unknown> = DUMMY_RULES): Promise<unknown> => t.testDb.settings.replaceOne({ _id: "rules" }, { ...rules, _id: "rules" }, { upsert: true });

export const putInGroup = (t: TestApp, playerId: string, groupId: string | null): Promise<unknown> => t.testDb.withStringIds("players").updateOne({ _id: playerId }, { $set: { groupId } });

export const getDay = (t: TestApp, token: string): Promise<Response> => fetch(`${t.url}/v1/day`, { headers: bearer(token) });

export const postResult = (t: TestApp, token: string, body: unknown): Promise<Response> =>
  fetch(`${t.url}/v1/results`, { method: "POST", headers: { "content-type": "application/json", ...bearer(token) }, body: JSON.stringify(body) });

let eventCounter = 0;
export const eventId = (): string => `00000000-0000-4000-8000-${String(++eventCounter).padStart(12, "0")}`;

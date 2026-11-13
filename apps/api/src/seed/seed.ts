import "reflect-metadata";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Document, MongoClient } from "mongodb";
import { type Challenge, isChallenge } from "@patio/contracts";
import { ALPHABET } from "../auth/alphabet.ts";
import { hashRecoveryCode, hashToken } from "../auth/credentials.ts";
import { hashPassword } from "../auth/password.ts";
import { Clock } from "../platform/clock.ts";
import { loadConfig } from "../platform/config.ts";
import { type LevelRule, computeLevel } from "../rules/level.ts";

// Datos DUMMY para desarrollo. Solo con NODE_ENV=development y la base local `patio_dev`. Idempotente: ids fijos y upserts; lo que
// depende de la fecha (sets, accesos y logros de los ultimos 7 dias) se borra y se vuelve a generar en cada corrida.
export const DEV_ADMIN = { email: "admin@patio.local", password: "patio-desarrollo-admin" };
export const DEV_MODERATOR = { email: "docente@patio.local", password: "patio-desarrollo-docente" };

const ID = { admin: "d0000000-0000-4000-8000-000000000001", moderator: "d0000000-0000-4000-8000-000000000002" };
const GROUPS: { _id: string; name: string; code: string; ownerIds: string[] }[] = [
  { _id: "d1000000-0000-4000-8000-000000000001", name: "Tercero A", code: "TERCER", ownerIds: [ID.moderator] },
  { _id: "d1000000-0000-4000-8000-000000000002", name: "Sexto B", code: "SEXTAS", ownerIds: [ID.moderator] },
  { _id: "d1000000-0000-4000-8000-000000000003", name: "Taller libre", code: "NUBES3", ownerIds: [] },
];
const NICKNAMES = ["Sol", "Luna", "Nube", "Rayo", "Mora", "Pipa", "Tano", "Bruma", "Ciri", "Dino", "Fresa", "Gofio"];
const RULES: { pointsByDifficulty: Record<string, number>; midnightToleranceMinutes: number; levels: LevelRule[] } = {
  pointsByDifficulty: { "1": 10, "2": 20, "3": 30 },
  midnightToleranceMinutes: 30,
  levels: [
    { requirements: [{ difficulty: 1, min: 5 }] },
    { requirements: [{ difficulty: 2, min: 3 }] },
    { requirements: [{ difficulty: 3, family: "crear", min: 2 }], minScore: 100 },
    { requirements: [{ difficulty: 3, min: 5 }] },
  ],
};
const BANNED = ["palabrotaprueba", "insultoprueba", "groseriaprueba"];
const DAYS_BACK = 7;
const FAMILIES = ["resolver", "descubrir", "crear"] as const;

const examples = (): Challenge[] =>
  ["drag-drop.json", "drag-drop-target-counts.json", "number-input.json", "word-drop.json"].map((f) => {
    const parsed: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "../../../../packages/contracts/examples/valid", f), "utf8"));
    if (!isChallenge(parsed)) throw new Error(`ejemplo invalido: ${f}`);
    return parsed;
  });

/** Pseudoaleatorio determinista (0 a 1) para que cada corrida genere lo mismo. */
const roll = (...parts: (string | number)[]): number => parseInt(createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 8), 16) / 0xffffffff;
const uuidOf = (seed: string): string => {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const symbols = (seed: number, length: number): string => Array.from({ length }, (_, k) => ALPHABET.charAt((seed * 7 + k * 5 + 3) % ALPHABET.length)).join("");

async function main(): Promise<number> {
  const config = loadConfig(process.env);
  if (process.env.NODE_ENV !== "development" || config.mongoDb !== "patio_dev" || !config.mongoUri.startsWith("mongodb://127.0.0.1") && !config.mongoUri.startsWith("mongodb://localhost")) {
    process.stderr.write("El seed solo corre con NODE_ENV=development contra la base local patio_dev. No hizo nada.\n");
    return 1;
  }
  const clock = new Clock(config.timeZone);
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db(config.mongoDb);
    const col = (name: string) => db.collection<Document & { _id: string }>(name);
    const now = clock.now();
    const today = clock.today();
    const dayAt = (daysAgo: number): string => {
      let d = today;
      for (let i = 0; i < daysAgo; i++) d = clock.previousDay(d);
      return d;
    };
    const noon = (day: string): Date => clock.addMinutes(clock.startOfDay(clock.dayKey(day)), 12 * 60);

    // Cuentas (la contrasena de desarrollo se restablece en cada corrida)
    const accounts = col("accounts");
    for (const { _id, email, password, role } of [{ _id: ID.admin, ...DEV_ADMIN, role: "administrator" }, { _id: ID.moderator, ...DEV_MODERATOR, role: "moderator" }]) {
      await accounts.updateOne({ _id }, { $set: { email, role, passwordHash: await hashPassword(password), mustChangePassword: false, active: true, passwordChangedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
    }

    // Desafios: 10 variantes de los 4 ejemplos validos de contracts
    const base = examples();
    const challenges = Array.from({ length: 10 }, (_, i) => {
      const source = base[i % base.length];
      if (source === undefined) throw new Error("sin ejemplos");
      const difficulty = (i % 3) + 1;
      const family = FAMILIES[i % 3];
      const content: Challenge = { ...source, text: `${source.text} (variante ${i + 1})`, difficulty, ...(family === undefined ? {} : { family }) };
      if (!isChallenge(content)) throw new Error("desafio dummy invalido");
      return { _id: uuidOf(`challenge-${i}`), authorId: i < 6 ? ID.moderator : ID.admin, status: "active" as const, version: 1, ...content, createdAt: now, updatedAt: now };
    });
    for (const { _id, ...rest } of challenges) await col("challenges").updateOne({ _id }, { $set: rest }, { upsert: true });
    const item = (c: (typeof challenges)[number]): Record<string, unknown> => ({ challengeId: c._id, text: c.text, mechanic: c.mechanic, difficulty: c.difficulty, assets: c.assets, version: c.version, ...(c.family === undefined ? {} : { family: c.family }) });

    // Reglas y palabras
    await col("settings").updateOne({ _id: "rules" }, { $set: RULES }, { upsert: true });
    await col("settings").updateOne({ _id: "bannedWords" }, { $set: { words: BANNED }, $setOnInsert: { version: 1 } }, { upsert: true });

    // Grupos y players
    for (const g of GROUPS) {
      const { _id, ...doc } = g;
      await col("groups").updateOne({ _id }, { $set: { ...doc, maxSize: 30, active: true }, $setOnInsert: { createdAt: now } }, { upsert: true });
    }
    const groupOf = (i: number): string | null => (i < 11 ? (GROUPS[Math.floor(i / 4)] ?? GROUPS[2])?._id ?? null : null);
    const players = NICKNAMES.map((nickname, i) => ({ _id: symbols(i + 1, 12), nickname, groupId: i === 11 ? null : groupOf(i), recoveryCode: symbols(i + 20, 8), joinedDaysAgo: 1 + ((i * 3) % DAYS_BACK) }));
    const dummyIds = players.map((p) => p._id);

    // Lo que depende de la fecha se regenera
    await col("results").deleteMany({ playerId: { $in: dummyIds } });
    await db.collection("dayAccess").deleteMany({ playerId: { $in: dummyIds } });
    await col("daySets").deleteMany({ _id: { $regex: "^dummy-" } });
    await db.collection("groupMemberships").deleteMany({ playerId: { $in: dummyIds } });

    // Sets: hoy (grupo A y general, sin bloquear), manana (borrador del grupo A) y los ultimos 7 dias (bloqueados)
    const setFor = (day: string, groupId: string | null, picks: number[], extra: Document = {}): Document & { _id: string } => ({
      _id: `dummy-${day}-${groupId === null ? "general" : groupId.slice(-1)}`, date: day, groupId, status: "published", challengeIds: picks.map((k) => challenges[k]?._id), items: picks.map((k) => item(challenges[k] ?? challenges[0] ?? (() => { throw new Error("sin desafios"); })())), timezone: config.timeZone, ...extra,
    });
    const sets: (Document & { _id: string })[] = [setFor(today, GROUPS[0]?._id ?? null, [0, 1, 2, 4]), setFor(today, null, [3, 5, 7]), { ...setFor(clock.nextDay(today), GROUPS[0]?._id ?? null, [0, 2, 5]), status: "draft", items: [] }];
    for (let d = 1; d <= DAYS_BACK; d++) {
      const day = dayAt(d);
      sets.push(setFor(day, GROUPS[0]?._id ?? null, [(d + 0) % 10, (d + 3) % 10, (d + 5) % 10, (d + 7) % 10], { lockedAt: noon(day) }), setFor(day, null, [(d + 1) % 10, (d + 4) % 10, (d + 6) % 10], { lockedAt: noon(day) }));
    }
    await col("daySets").insertMany(sets);

    // Players, accesos y logros
    let resultCount = 0;
    for (const [i, p] of players.entries()) {
      const created = noon(dayAt(p.joinedDaysAgo));
      if (p.groupId !== null) await db.collection("groupMemberships").insertOne({ playerId: p._id, groupId: p.groupId, joinedAt: created });
      const counts: { byDifficulty: Record<string, number>; byFamily: Record<string, number>; byBoth: Record<string, number> } = { byDifficulty: {}, byFamily: {}, byBoth: {} };
      let score = 0;
      let lastActive = created;
      for (let d = p.joinedDaysAgo - 1; d >= 1; d--) {
        if (roll("enter", p._id, d) > 0.7) continue;
        const day = dayAt(d);
        const set = sets.find((s) => s.date === day && s.groupId === (p.groupId === GROUPS[0]?._id ? p.groupId : null));
        if (set === undefined || !Array.isArray(set.challengeIds)) continue;
        await db.collection("dayAccess").insertOne({ playerId: p._id, date: day, daySetId: set._id, groupId: p.groupId, createdAt: noon(day) });
        lastActive = noon(day);
        for (const cid of set.challengeIds) {
          const c = challenges.find((x) => x._id === cid);
          if (c === undefined || roll("win", p._id, d, cid) > 0.6) continue;
          const points = RULES.pointsByDifficulty[String(c.difficulty)] ?? 0;
          score += points;
          counts.byDifficulty[String(c.difficulty)] = (counts.byDifficulty[String(c.difficulty)] ?? 0) + 1;
          if (c.family !== undefined) {
            counts.byFamily[c.family] = (counts.byFamily[c.family] ?? 0) + 1;
            counts.byBoth[`${c.difficulty}:${c.family}`] = (counts.byBoth[`${c.difficulty}:${c.family}`] ?? 0) + 1;
          }
          await col("results").insertOne({
            _id: `dummy-${p._id}-${day}-${cid}`, eventId: uuidOf(`event-${p._id}-${day}-${cid}`), playerId: p._id, challengeId: String(cid), daySetId: String(set._id), date: day, groupId: p.groupId, applied: true, claimedAt: noon(day),
            durationMs: 8000 + Math.floor(roll("dur", p._id, d, cid) * 50_000), points, difficulty: c.difficulty, ...(c.family === undefined ? {} : { family: c.family }), createdAt: noon(day),
          });
          resultCount++;
        }
      }
      const level = computeLevel(RULES.levels, 0, { score, countsByDifficulty: counts.byDifficulty, countsByDifficultyFamily: counts.byBoth });
      await col("players").updateOne(
        { _id: p._id },
        { $set: { nickname: p.nickname, groupId: p.groupId, tokenHash: hashToken(`dev-token-${i}`), recoveryHash: hashRecoveryCode(p.recoveryCode, config.recoveryHmacSecret), score, countsByDifficulty: counts.byDifficulty, countsByFamily: counts.byFamily, countsByDifficultyFamily: counts.byBoth, level, termsVersion: "dev", termsAcceptedAt: created, createdAt: created, lastActiveAt: lastActive } },
        { upsert: true },
      );
    }

    const out = [
      "Seed de desarrollo listo (base patio_dev).",
      `  cuentas:    2   (administrator ${DEV_ADMIN.email}, moderator ${DEV_MODERATOR.email})`,
      `  grupos:     ${GROUPS.length}   (codigos ${GROUPS.map((g) => g.code).join(", ")})`,
      `  players:    ${players.length}   (apodos: ${NICKNAMES.join(", ")})`,
      `  desafios:   ${challenges.length}`,
      `  sets:       ${sets.length}   (hoy ${today}: grupo Tercero A y general publicados; manana: borrador)`,
      `  logros:     ${resultCount}   (ultimos ${DAYS_BACK} dias)`,
      `  reglas: 3 dificultades y 4 reglas de nivel; palabras prohibidas de prueba: ${BANNED.length}`,
      "",
      "Credenciales de DESARROLLO (no usar fuera de tu maquina):",
      `  administrator  ${DEV_ADMIN.email}  /  ${DEV_ADMIN.password}`,
      `  moderator      ${DEV_MODERATOR.email}  /  ${DEV_MODERATOR.password}`,
      `  recuperacion de un player de prueba (Sol): ${players[0]?.recoveryCode ?? ""}`,
    ];
    process.stdout.write(`${out.join("\n")}\n`);
    return 0;
  } finally {
    await client.close();
  }
}

process.exitCode = await main().catch((error: unknown) => {
  process.stderr.write(`El seed fallo: ${error instanceof Error ? error.message : "error desconocido"}\n`);
  return 1;
});

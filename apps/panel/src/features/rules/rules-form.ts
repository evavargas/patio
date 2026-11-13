import type { PanelLimits, PanelRules } from "@patio/contracts";
import { FAMILIES } from "../challenges/challenge-form";

// Limites a mano de PanelRules y PanelLimits (panel.schema.json); el servidor valida de nuevo.
const INT = /^\d+$/;
let k = 1;
export const nextKey = (): number => k++;

export interface PointsRow { key: number; difficulty: string; points: string }
export interface ReqRow { key: number; difficulty: string; family: string; min: string }
export interface LevelRow { key: number; minScore: string; reqs: ReqRow[] }
export interface RulesForm { points: PointsRow[]; levels: LevelRow[]; tolerance: string }

export const rulesToForm = (r: PanelRules): RulesForm => ({
  points: Object.entries(r.pointsByDifficulty).map(([d, p]) => ({ key: nextKey(), difficulty: d, points: String(p) })),
  levels: r.levels.map((l) => ({ key: nextKey(), minScore: l.minScore === undefined ? "" : String(l.minScore), reqs: l.requirements.map((q) => ({ key: nextKey(), difficulty: String(q.difficulty), family: q.family ?? "", min: String(q.min) })) })),
  tolerance: String(r.midnightToleranceMinutes),
});

const inRange = (v: string, min: number, max = Number.MAX_SAFE_INTEGER): boolean => INT.test(v) && Number(v) >= min && Number(v) <= max;

/** Devuelve el cuerpo o el codigo del primer problema (`rules.err.<codigo>`). */
export function buildRules(f: RulesForm): { body: PanelRules } | { error: string } {
  const difficulties = f.points.map((p) => p.difficulty);
  if (f.points.some((p) => !inRange(p.difficulty, 1, 99) || p.difficulty.startsWith("0"))) return { error: "difficulty" };
  if (new Set(difficulties).size !== difficulties.length) return { error: "duplicate" };
  if (f.points.some((p) => !inRange(p.points, 0, 100000))) return { error: "points" };
  if (!inRange(f.tolerance, 0, 240)) return { error: "tolerance" };
  for (const l of f.levels) {
    if (l.minScore !== "" && !inRange(l.minScore, 0)) return { error: "minScore" };
    if (l.reqs.some((q) => !inRange(q.difficulty, 1) || !inRange(q.min, 1))) return { error: "requirement" };
  }
  const pointsByDifficulty: Record<string, number> = {};
  for (const p of f.points) pointsByDifficulty[p.difficulty] = Number(p.points);
  return {
    body: {
      pointsByDifficulty,
      levels: f.levels.map((l) => ({
        requirements: l.reqs.map((q) => {
          const family = FAMILIES.find((x) => x === q.family);
          return { difficulty: Number(q.difficulty), min: Number(q.min), ...(family === undefined ? {} : { family }) };
        }),
        ...(l.minScore === "" ? {} : { minScore: Number(l.minScore) }),
      })),
      midnightToleranceMinutes: Number(f.tolerance),
    },
  };
}

interface RateForm { max: string; windowSeconds: string }
export type LimitsForm = Record<keyof PanelLimits, RateForm>;
export const LIMIT_KEYS = ["register", "groupCode", "recover", "login"] as const;
const rateToForm = (r: PanelLimits["login"]): RateForm => ({ max: String(r.max), windowSeconds: String(r.windowSeconds) });
const rateFromForm = (r: RateForm): PanelLimits["login"] => ({ max: Number(r.max), windowSeconds: Number(r.windowSeconds) });
export const limitsToForm = (l: PanelLimits): LimitsForm => ({ register: rateToForm(l.register), groupCode: rateToForm(l.groupCode), recover: rateToForm(l.recover), login: rateToForm(l.login) });
export function buildLimits(f: LimitsForm): PanelLimits | null {
  if (LIMIT_KEYS.some((key) => !inRange(f[key].max, 1) || !inRange(f[key].windowSeconds, 1))) return null;
  return { register: rateFromForm(f.register), groupCode: rateFromForm(f.groupCode), recover: rateFromForm(f.recover), login: rateFromForm(f.login) };
}

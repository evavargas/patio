import { describe, expect, it } from "vitest";
import { buildLimits, buildRules, limitsToForm, rulesToForm } from "./rules-form";

const rules = { pointsByDifficulty: { "1": 10, "2": 20 }, levels: [{ requirements: [{ difficulty: 1, min: 5 }], minScore: 50 }], midnightToleranceMinutes: 30 };

describe("rules-form", () => {
  it("ida y vuelta sin cambios", () => {
    expect(buildRules(rulesToForm(rules))).toEqual({ body: rules });
  });
  it("rechaza dificultad repetida y tolerancia fuera de rango", () => {
    const f = rulesToForm(rules);
    const dup = { ...f, points: f.points.map((p) => ({ ...p, difficulty: "1" })) };
    expect(buildRules(dup)).toEqual({ error: "duplicate" });
    expect(buildRules({ ...f, tolerance: "241" })).toEqual({ error: "tolerance" });
  });
  it("limites: minimo 1", () => {
    const f = limitsToForm({ register: { max: 5, windowSeconds: 60 }, groupCode: { max: 5, windowSeconds: 60 }, recover: { max: 5, windowSeconds: 60 }, login: { max: 5, windowSeconds: 60 } });
    expect(buildLimits(f)).not.toBeNull();
    expect(buildLimits({ ...f, login: { max: "0", windowSeconds: "60" } })).toBeNull();
  });
});

import { ESLint } from "eslint";
import { existsSync, mkdirSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
// no-restricted-paths solo evalua imports que resuelven a un archivo real: se crean archivos de mentira
// (`y.ts`). Se borra SOLO lo creado aca: nunca un directorio de modulo real.
const FIXTURE_FILES = ["groups", "players", "database", "word-filter", "auth", "membership", "rate-limit"].map((m) => join(ROOT, "apps/api/src", m, "y.ts"));
const createdDirs: string[] = [];

beforeAll(() => {
  for (const f of FIXTURE_FILES) {
    const dir = dirname(f);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      createdDirs.push(dir);
    }
    writeFileSync(f, "export const y = 1;\n");
  }
});
afterAll(() => {
  for (const f of FIXTURE_FILES) rmSync(f, { force: true });
  for (const d of createdDirs) rmdirSync(d);
});

// Pasa codigo virtual por la config real y devuelve los ids de reglas que fallan.
async function rulesFor(filePath: string, code: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: ROOT });
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, filePath) });
  return (result?.messages ?? []).map((m) => m.ruleId ?? "parse-error");
}

describe("reglas de lint del repo", () => {
  it("un paquete no puede importar de apps", async () => {
    const rules = await rulesFor("packages/contracts/src/x.ts", 'import "../../../apps/api/src/platform/clock.ts";\n');
    expect(rules).toContain("import-x/no-restricted-paths");
  });

  it("un modulo del back no puede depender de uno fuera del mapa (groups -> players)", async () => {
    const rules = await rulesFor("apps/api/src/groups/x.ts", 'import "../players/y.ts";\n');
    expect(rules).toContain("import-x/no-restricted-paths");
  });

  it("platform es transversal: groups puede importar de platform", async () => {
    const rules = await rulesFor("apps/api/src/groups/x.ts", 'import "../platform/clock.ts";\n');
    expect(rules).not.toContain("import-x/no-restricted-paths");
  });

  it("database es transversal: word-filter puede importarlo, pero database no puede importar de word-filter", async () => {
    const ok = await rulesFor("apps/api/src/word-filter/x.ts", 'import "../database/y.ts";\n');
    expect(ok).not.toContain("import-x/no-restricted-paths");
    const bad = await rulesFor("apps/api/src/database/x.ts", 'import "../word-filter/y.ts";\n');
    expect(bad).toContain("import-x/no-restricted-paths");
  });

  it("membership puede usar players y groups; players y groups no pueden usar membership ni entre si", async () => {
    expect(await rulesFor("apps/api/src/membership/x.ts", 'import "../players/y.ts";\nimport "../groups/y.ts";\n')).not.toContain("import-x/no-restricted-paths");
    expect(await rulesFor("apps/api/src/players/x.ts", 'import "../membership/y.ts";\n')).toContain("import-x/no-restricted-paths");
    expect(await rulesFor("apps/api/src/groups/x.ts", 'import "../membership/y.ts";\n')).toContain("import-x/no-restricted-paths");
    expect(await rulesFor("apps/api/src/players/x.ts", 'import "../groups/y.ts";\n')).toContain("import-x/no-restricted-paths");
  });

  it("membership no salta a auth ni a word-filter (solo a players y groups)", async () => {
    expect(await rulesFor("apps/api/src/membership/x.ts", 'import "../auth/y.ts";\n')).toContain("import-x/no-restricted-paths");
    expect(await rulesFor("apps/api/src/membership/x.ts", 'import "../word-filter/y.ts";\n')).toContain("import-x/no-restricted-paths");
  });

  it("players usa auth y word-filter; auth no usa a nadie ni toca la base", async () => {
    expect(await rulesFor("apps/api/src/players/x.ts", 'import "../auth/y.ts";\nimport "../word-filter/y.ts";\n')).not.toContain("import-x/no-restricted-paths");
    expect(await rulesFor("apps/api/src/auth/x.ts", 'import "../players/y.ts";\n')).toContain("import-x/no-restricted-paths");
    expect(await rulesFor("apps/api/src/auth/x.ts", 'import "../database/y.ts";\n')).toContain("import-x/no-restricted-paths");
    expect(await rulesFor("apps/api/src/auth/x.ts", 'import "../rate-limit/y.ts";\n')).toContain("import-x/no-restricted-paths");
  });

  it("rate-limit es transversal pero no puede importar de modulos de negocio", async () => {
    expect(await rulesFor("apps/api/src/membership/x.ts", 'import "../rate-limit/y.ts";\n')).not.toContain("import-x/no-restricted-paths");
    expect(await rulesFor("apps/api/src/rate-limit/x.ts", 'import "../players/y.ts";\n')).toContain("import-x/no-restricted-paths");
  });

  it("any, enum, as, Date.now, new Date y performance.now fallan fuera del reloj", async () => {
    const code = "export const a: any = 1;\nenum E { A }\nexport const b = a as number;\nexport const c = [Date.now(), new Date(), performance.now(), E.A, b];\n";
    const rules = await rulesFor("apps/api/src/x.ts", code);
    expect(rules).toEqual(
      expect.arrayContaining(["@typescript-eslint/no-explicit-any", "@typescript-eslint/consistent-type-assertions", "no-restricted-syntax"]),
    );
    expect(rules.filter((r) => r === "no-restricted-syntax")).toHaveLength(4);
  });

  it("los relojes si pueden leer la hora", async () => {
    const rules = await rulesFor("apps/api/src/platform/clock.ts", "export const t = [Date.now(), new Date(), performance.now()];\n");
    expect(rules).not.toContain("no-restricted-syntax");
  });
});

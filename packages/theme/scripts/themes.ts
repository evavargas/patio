// Uso: node scripts/themes.ts generate | check. Lee themes/*.json; `check` falla si falta un token o baja el contraste.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkColors } from "../src/contrast.ts";
import { COLOR_TOKENS, SHADOW_TOKENS, SHARED_TOKENS } from "../src/schema.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODES = ["light", "dark"] as const;
const hex = /^#[0-9a-f]{6}$/i;

type Group = Record<string, string>;
interface Theme {
  id: string;
  name: string;
  modes: Record<(typeof MODES)[number], { color: Group; shadow: Group }>;
  shared: Record<string, Group>;
}

const themes: Theme[] = readdirSync(join(root, "themes"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(root, "themes", f), "utf8")));

function validate(t: Theme): string[] {
  const errors: string[] = [];
  for (const m of MODES) {
    const mode = t.modes?.[m];
    for (const k of COLOR_TOKENS) {
      const v = mode?.color?.[k];
      if (v === undefined) errors.push(`${t.id}/${m}: falta color ${k}`);
      else if (!hex.test(v)) errors.push(`${t.id}/${m}: color ${k} debe ser #rrggbb`);
    }
    for (const k of SHADOW_TOKENS) if (mode?.shadow?.[k] === undefined) errors.push(`${t.id}/${m}: falta shadow ${k}`);
    errors.push(...checkColors(mode?.color ?? {}, m).map((e) => `${t.id}/${e}`));
  }
  for (const [g, keys] of Object.entries(SHARED_TOKENS)) {
    for (const k of keys) if (t.shared?.[g]?.[k] === undefined) errors.push(`${t.id}: falta ${g}.${k}`);
  }
  return errors;
}

function generate(): void {
  const block = (sel: string, vars: [string, string][]) =>
    `${sel} {\n${vars.map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}\n`;
  let tokens = "/* Generado por scripts/themes.ts. No editar. */\n";
  for (const t of themes) {
    const sel = `:root[data-theme="${t.id}"]`;
    const shared: [string, string][] = Object.entries(SHARED_TOKENS).flatMap(([g, keys]) =>
      keys.map((k): [string, string] => [`--t-${g}-${k}`, t.shared[g]?.[k] ?? ""]),
    );
    tokens += block(sel, shared);
    for (const m of MODES) {
      const mode = t.modes[m];
      tokens += block(`${sel}[data-mode="${m}"]`, [
        ["color-scheme", m],
        ...COLOR_TOKENS.map((k): [string, string] => [`--c-${k}`, mode.color[k] ?? ""]),
        ...SHADOW_TOKENS.map((k): [string, string] => [`--t-shadow-${k}`, mode.shadow[k] ?? ""]),
      ]);
    }
    tokens += `@media (prefers-reduced-motion: reduce) {\n${block(sel, [
      ["--t-motion-duration-fast", "0.01ms"],
      ["--t-motion-duration-base", "0.01ms"],
    ])}}\n`;
  }
  writeFileSync(join(root, "src/generated/tokens.css"), tokens);

  const map = (ns: string, g: string, keys: readonly string[]) =>
    keys.map((k) => `  --${ns}-${k}: var(--t-${g}-${k});`).join("\n");
  const tw = `/* Generado por scripts/themes.ts. No editar. Preset de Tailwind v4: tokens a utilidades. */
@theme inline {
  --color-*: initial;
${COLOR_TOKENS.map((k) => `  --color-${k}: var(--c-${k});`).join("\n")}
  --font-*: initial;
${map("font", "font", SHARED_TOKENS.font)}
  --text-*: initial;
${map("text", "text", SHARED_TOKENS.text)}
  --font-weight-*: initial;
${map("font-weight", "weight", SHARED_TOKENS.weight)}
  --leading-*: initial;
${map("leading", "leading", SHARED_TOKENS.leading)}
  --radius-*: initial;
${map("radius", "radius", SHARED_TOKENS.radius)}
  --shadow-*: initial;
${SHADOW_TOKENS.map((k) => `  --shadow-${k}: var(--t-shadow-${k});`).join("\n")}
  --spacing-touch: var(--t-size-touch);
  --default-transition-duration: var(--t-motion-duration-base);
  --default-transition-timing-function: var(--t-motion-ease);
}
`;
  writeFileSync(join(root, "src/generated/tailwind.css"), tw);

  const registry = `// Generado por scripts/themes.ts. No editar.
export const THEMES = ${JSON.stringify(themes.map((t) => ({ id: t.id, name: t.name })))} as const;
export const DEFAULT_THEME_ID = "default";
`;
  writeFileSync(join(root, "src/generated/themes.ts"), registry);
}

const cmd = process.argv[2];
const errors = themes.flatMap(validate);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
if (cmd === "generate") generate();
else if (cmd === "check") console.log(`Temas OK (${themes.map((t) => t.id).join(", ")}): tokens completos y contraste AA en claro y oscuro.`);
else {
  console.error("Uso: themes.ts generate | check");
  process.exit(1);
}

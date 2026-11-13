import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { importX, createNodeResolver } from "eslint-plugin-import-x";

// Mapa de dependencias de docs/context/02-arquitectura-general.md. `platform` y `database` son transversales
// (reloj y config; conexion a MongoDB): cualquier modulo puede importarlos. `database` solo importa de `platform`.
export const API_MODULE_DEPS = {
  auth: [],
  players: ["auth", "word-filter"],
  // groups genera el codigo de grupo con el alfabeto unico de auth (doc 01)
  groups: ["auth"],
  membership: ["players", "groups"],
  challenges: [],
  "day-sets": ["challenges", "groups"],
  results: ["players", "day-sets", "rules"],
  rules: [],
  "word-filter": [],
  database: [],
  "rate-limit": [],
  stats: ["results", "groups", "players"],
  accounts: ["auth"],
  // Superficie HTTP /v1/panel (menos auth): controladores delgados que llaman a los servicios de cada modulo. Nadie depende de panel.
  panel: ["accounts", "groups", "players", "membership", "challenges", "day-sets", "results", "rules", "word-filter", "stats"],
  platform: [],
};

// `rate-limit` es transversal como `platform` (doc 02 lo ubica en platform): vive aparte porque necesita MongoDB y
// `platform` no puede importar de `database` sin ciclo. Lo usan registro, recuperacion y login.
const TRANSVERSAL = ["platform", "database", "rate-limit"];

export function apiBoundaryZones(deps = API_MODULE_DEPS) {
  const names = Object.keys(deps);
  return names.flatMap((target) =>
    names
      .filter((from) => from !== target && !TRANSVERSAL.includes(from) && !deps[target].includes(from))
      .map((from) => ({
        target: `./apps/api/src/${target}/**`,
        from: `./apps/api/src/${from}/**`,
        message: `El modulo ${target} no puede depender de ${from} (doc 02).`,
      })),
  );
}

const FILES = ["**/*.ts", "**/*.tsx"];

const noRawTime = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: "Date.now() esta prohibido: usa el reloj (clock.ts).",
  },
  {
    selector: "CallExpression[callee.object.name='performance'][callee.property.name='now']",
    message: "performance.now() esta prohibido: usa el reloj (clock.ts).",
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: "new Date() esta prohibido: usa el reloj (clock.ts).",
  },
];

const noEnumOrHtml = [
  { selector: "TSEnumDeclaration", message: "Sin enum: usa uniones de literales." },
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: "Prohibido HTML: el texto se renderiza plano.",
  },
];

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "packages/contracts/src/generated/**"] },
  { ...js.configs.recommended, files: FILES },
  ...tseslint.configs.strict.map((c) => ({ ...c, files: FILES })),
  {
    files: FILES,
    plugins: { "import-x": importX },
    languageOptions: { globals: { ...globals.node } },
    settings: {
      "import-x/resolver-next": [createNodeResolver({ extensions: [".ts", ".tsx", ".js", ".json"], extensionAlias: { ".js": [".ts", ".js"] } })],
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      // clases de NestJS (@Module vacio o con estaticos) son validas
      "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "no-restricted-syntax": ["error", ...noRawTime, ...noEnumOrHtml],
      "import-x/no-cycle": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          basePath: import.meta.dirname, // sin esto las zonas dependen del cwd (lint por paquete)
          zones: [
            { target: "./packages/**", from: "./apps/**", message: "Los paquetes no importan de apps." },
            { target: "./apps/game/**", from: "./apps/api/**", message: "Entre apps no hay imports." },
            { target: "./apps/api/**", from: "./apps/game/**", message: "Entre apps no hay imports." },
            { target: "./apps/panel/**", from: ["./apps/api/**", "./apps/game/**"], message: "Entre apps no hay imports." },
            { target: ["./apps/api/**", "./apps/game/**"], from: "./apps/panel/**", message: "Entre apps no hay imports." },
            // doc 02: `auth` es puro, sin base de datos
            { target: "./apps/api/src/auth/**", from: "./apps/api/src/database/**", message: "auth no toca la base de datos (doc 02)." },
            { target: "./apps/api/src/auth/**", from: "./apps/api/src/rate-limit/**", message: "auth no toca la base de datos (doc 02)." },
            ...apiBoundaryZones(),
          ],
        },
      ],
    },
  },
  {
    files: ["apps/game/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "jsx-a11y": jsxA11y, "react-hooks": reactHooks },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["apps/panel/**/*.{ts,tsx}", "packages/theme/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "jsx-a11y": jsxA11y, "react-hooks": reactHooks },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    // Ningun color, radio ni tamano de letra en px dentro de componentes: todo sale de tokens (doc 08).
    files: ["apps/panel/src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...noRawTime,
        ...noEnumOrHtml,
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|hsl)a?\\(|\\[[0-9.]+px\\]/]",
          message: "Sin colores ni px literales en componentes: usa tokens del tema.",
        },
      ],
    },
  },
  {
    files: ["apps/game/src/clock.ts", "apps/api/src/platform/clock.ts"],
    rules: { "no-restricted-syntax": ["error", ...noEnumOrHtml] },
  },
);

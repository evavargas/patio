import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileFromFile } from "json-schema-to-typescript";

const root = join(import.meta.dirname, "..");
const ts = await compileFromFile(join(root, "schemas/index.schema.json"), {
  bannerComment: "/* GENERADO por `pnpm contracts:generate` desde schemas/. No editar a mano. */",
  additionalProperties: false,
  unreachableDefinitions: true,
  strictIndexSignatures: true,
});
writeFileSync(join(root, "src/generated/types.ts"), ts);

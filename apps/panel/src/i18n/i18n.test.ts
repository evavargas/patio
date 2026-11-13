import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import esUY from "./locales/es-UY.json";

const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v !== null ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe("catalogos", () => {
  it("es-UY y en tienen las mismas claves", () => {
    expect(keys(en).sort()).toEqual(keys(esUY).sort());
  });
});

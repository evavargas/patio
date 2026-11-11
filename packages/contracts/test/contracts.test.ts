import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  isBannedWordsResponse,
  isChallenge,
  isDayKey,
  isErrorBody,
  isHealthResponse,
  isIsoDateTime,
  isPlayerId,
} from "../src/index.ts";

const dir = (kind: "valid" | "invalid"): string[] =>
  readdirSync(join(import.meta.dirname, "../examples", kind)).sort();
const load = (kind: "valid" | "invalid", file: string): unknown =>
  JSON.parse(readFileSync(join(import.meta.dirname, "../examples", kind, file), "utf8"));

describe("challenge", () => {
  it("hay un ejemplo valido por mecanica", () => {
    const types = dir("valid").map((f) => {
      const c = load("valid", f);
      return typeof c === "object" && c !== null && "mechanic" in c ? JSON.stringify(c.mechanic).match(/"type":"(\w+)"/)?.[1] : undefined;
    });
    expect(new Set(types)).toEqual(new Set(["dragDrop", "numberInput", "wordDrop"]));
  });

  it.each(dir("valid"))("acepta %s", (f) => {
    expect(isChallenge(load("valid", f))).toBe(true);
  });

  it.each(dir("invalid"))("rechaza %s", (f) => {
    expect(isChallenge(load("invalid", f))).toBe(false);
  });
});

describe("primitivos", () => {
  it("DayKey", () => {
    expect(isDayKey("2026-11-11")).toBe(true);
    for (const bad of ["2026-13-01", "2026-11-32", "11-11-2026", "2026-1-1", 20261111]) {
      expect(isDayKey(bad)).toBe(false);
    }
  });
  it("IsoDateTime", () => {
    expect(isIsoDateTime("2026-11-11T10:00:00Z")).toBe(true);
    expect(isIsoDateTime("2026-11-11T10:00:00.250-03:00")).toBe(true);
    expect(isIsoDateTime("2026-11-11")).toBe(false);
  });
  it("PlayerId de 12 caracteres", () => {
    expect(isPlayerId("ABCDEFGH2345")).toBe(true);
    expect(isPlayerId("ABC")).toBe(false);
    expect(isPlayerId("ABCDEFGH234O")).toBe(false);
  });
});

describe("error", () => {
  it("acepta cuerpo con y sin details", () => {
    expect(isErrorBody({ code: "GROUP_FULL", message: "El grupo esta completo." })).toBe(true);
    expect(isErrorBody({ code: "SET_LOCKED", message: "m", details: { x: 1 } })).toBe(true);
  });
  it("rechaza codigo desconocido o sin message", () => {
    expect(isErrorBody({ code: "NOPE", message: "m" })).toBe(false);
    expect(isErrorBody({ code: "GROUP_FULL" })).toBe(false);
  });
  it("conserva los codigos ya publicados (solo se agregan, nunca se quitan)", () => {
    for (const code of ["FORBIDDEN_SCOPE", "GROUP_FULL", "GROUP_INACTIVE", "GROUP_NOT_FOUND", "NICKNAME_NOT_ALLOWED", "ROUTE_NOT_FOUND", "SET_LOCKED"]) {
      expect(ERROR_CODES).toContain(code);
    }
  });
  it("codigos unicos y en MAYUSCULAS_CON_GUION_BAJO", () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    for (const code of ERROR_CODES) expect(code).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
  });
});

describe("level", () => {
  it("ningun schema menciona level", () => {
    const schemasDir = join(import.meta.dirname, "../schemas");
    for (const f of readdirSync(schemasDir)) {
      expect(readFileSync(join(schemasDir, f), "utf8")).not.toMatch(/"level"/);
    }
  });
});

describe("health", () => {
  const example = (f: string): unknown =>
    JSON.parse(readFileSync(join(import.meta.dirname, "../examples/responses", f), "utf8"));
  it("acepta el ejemplo valido", () => {
    expect(isHealthResponse(example("health.valid.json"))).toBe(true);
  });
  it("rechaza el invalido y tolera campos nuevos (/v1 solo crece)", () => {
    expect(isHealthResponse(example("health.invalid.json"))).toBe(false);
    expect(isHealthResponse({})).toBe(false);
    expect(isHealthResponse({ status: "ok", extra: 1 })).toBe(true);
  });
});

describe("banned-words", () => {
  const example = (f: string): unknown =>
    JSON.parse(readFileSync(join(import.meta.dirname, "../examples/responses", f), "utf8"));
  it("acepta la lista vacia de arranque y una con palabras", () => {
    expect(isBannedWordsResponse(example("banned-words.valid.json"))).toBe(true);
    expect(isBannedWordsResponse({ version: 3, words: ["a", "b"] })).toBe(true);
  });
  it("rechaza version negativa o palabra vacia, y tolera campos nuevos", () => {
    expect(isBannedWordsResponse(example("banned-words.invalid.json"))).toBe(false);
    expect(isBannedWordsResponse({ version: 1.5, words: [] })).toBe(false);
    expect(isBannedWordsResponse({ words: [] })).toBe(false);
    expect(isBannedWordsResponse({ version: 1, words: [], extra: 1 })).toBe(true);
  });
});

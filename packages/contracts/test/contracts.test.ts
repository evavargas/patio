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
  isRegisterPlayerRequest,
  isRegisterPlayerResponse,
  isRecoverPlayerRequest,
  isRecoverPlayerResponse,
  isMeResponse,
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

describe("registro de player", () => {
  const ex = (kind: "requests" | "responses", f: string): unknown =>
    JSON.parse(readFileSync(join(import.meta.dirname, "../examples", kind, f), "utf8"));
  const files = (kind: "requests" | "responses", ext: string, prefix = "register-player"): string[] =>
    readdirSync(join(import.meta.dirname, "../examples", kind)).filter((f) => f.startsWith(prefix) && f.endsWith(ext)).sort();

  it.each(files("requests", ".valid.json"))("pedido: acepta %s", (f) => {
    expect(isRegisterPlayerRequest(ex("requests", f))).toBe(true);
  });
  it.each(files("requests", ".invalid.json"))("pedido: rechaza %s", (f) => {
    expect(isRegisterPlayerRequest(ex("requests", f))).toBe(false);
  });
  it("pedido: tolera campos nuevos (/v1 solo crece)", () => {
    expect(isRegisterPlayerRequest({ nickname: "Sol", termsVersion: "1", extra: true })).toBe(true);
  });
  it("pedido: el apodo se acota a 64 en el schema (el limite de 20 lo aplica el servidor)", () => {
    expect(isRegisterPlayerRequest({ nickname: "a".repeat(64), termsVersion: "1" })).toBe(true);
    expect(isRegisterPlayerRequest({ nickname: "a".repeat(65), termsVersion: "1" })).toBe(false);
  });
  it("respuesta: acepta el ejemplo y rechaza token corto, codigo de 7 y sin campos", () => {
    expect(isRegisterPlayerResponse(ex("responses", "register-player.valid.json"))).toBe(true);
    expect(isRegisterPlayerResponse(ex("responses", "register-player.invalid.json"))).toBe(false);
    const ok = { playerId: "ABCDEFGH2345", token: "a".repeat(43), recoveryCode: "K7QM2XPT" };
    expect(isRegisterPlayerResponse(ok)).toBe(true);
    expect(isRegisterPlayerResponse({ ...ok, recoveryCode: "K7QM2XP" })).toBe(false);
    expect(isRegisterPlayerResponse({ playerId: ok.playerId })).toBe(false);
  });
  it("respuesta: el ejemplo no trae nivel ni hashes", () => {
    expect(Object.keys(JSON.parse(readFileSync(join(import.meta.dirname, "../examples/responses/register-player.valid.json"), "utf8"))).sort()).toEqual(["playerId", "recoveryCode", "token"]);
  });
  it("GroupCode y RecoveryCode usan el mismo alfabeto de 31 simbolos que PlayerId", () => {
    const sym = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    expect(sym).toHaveLength(31);
    expect(isRegisterPlayerRequest({ nickname: "a", termsVersion: "1", groupCode: sym.slice(0, 6) })).toBe(true);
    for (const bad of ["0", "O", "1", "I", "L"]) {
      expect(isRegisterPlayerRequest({ nickname: "a", termsVersion: "1", groupCode: `ABCDE${bad}` })).toBe(false);
    }
  });
});

describe("recuperar player y perfil", () => {
  const keysOf = (f: string): Record<string, unknown> =>
    JSON.parse(readFileSync(join(import.meta.dirname, "../examples/responses", f), "utf8"));
  const ex = (kind: "requests" | "responses", f: string): unknown =>
    JSON.parse(readFileSync(join(import.meta.dirname, "../examples", kind, f), "utf8"));
  const files = (kind: "requests" | "responses", prefix: string, ext: string): string[] =>
    readdirSync(join(import.meta.dirname, "../examples", kind)).filter((f) => f.startsWith(prefix) && f.endsWith(ext)).sort();

  it.each(files("requests", "recover-player", ".valid.json"))("pedido: acepta %s", (f) => {
    expect(isRecoverPlayerRequest(ex("requests", f))).toBe(true);
  });
  it.each(files("requests", "recover-player", ".invalid.json"))("pedido: rechaza %s", (f) => {
    expect(isRecoverPlayerRequest(ex("requests", f))).toBe(false);
  });
  it("pedido: tolera campos nuevos", () => {
    expect(isRecoverPlayerRequest({ recoveryCode: "K7QM2XPT", extra: 1 })).toBe(true);
  });
  it("respuesta de recuperar: acepta el ejemplo, rechaza token corto o sin apodo, solo trae playerId, token y nickname", () => {
    expect(isRecoverPlayerResponse(ex("responses", "recover-player.valid.json"))).toBe(true);
    expect(isRecoverPlayerResponse(ex("responses", "recover-player.invalid.json"))).toBe(false);
    expect(isRecoverPlayerResponse({ playerId: "ABCDEFGH2345", token: "a".repeat(43) })).toBe(false);
    expect(Object.keys(keysOf("recover-player.valid.json")).sort()).toEqual(["nickname", "playerId", "token"]);
  });
  it("respuesta de recuperar: no devuelve el codigo (no cambia, el cliente ya lo tiene)", () => {
    expect(Object.keys(keysOf("recover-player.valid.json"))).not.toContain("recoveryCode");
  });
  it("perfil: acepta el ejemplo, rechaza puntaje negativo o decimal, y no trae nivel", () => {
    expect(isMeResponse(ex("responses", "me.valid.json"))).toBe(true);
    expect(isMeResponse(ex("responses", "me.invalid.json"))).toBe(false);
    expect(isMeResponse({ nickname: "a", score: 1.5 })).toBe(false);
    expect(isMeResponse({ nickname: "a" })).toBe(false);
    expect(isMeResponse({ nickname: "a", score: 0, extra: 1 })).toBe(true);
    expect(Object.keys(keysOf("me.valid.json")).sort()).toEqual(["nickname", "score"]);
  });
});

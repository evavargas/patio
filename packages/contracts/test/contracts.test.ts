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
  isDayResponse,
  isSubmitResultRequest,
  isSubmitResultResponse,
  isLoginRequest,
  isRefreshRequest,
  isLogoutRequest,
  isChangePasswordRequest,
  isPanelSession,
  isPanelAccount,
  isAccountRecord,
  panelValidators,
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
    // panel.schema.json SI lleva nivel: es la ficha del player para el panel, nunca /v1.
    for (const f of readdirSync(schemasDir).filter((n) => n !== "panel.schema.json")) {
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

describe("pedir el dia y enviar logro", () => {
  const ex = (kind: "requests" | "responses", f: string): Record<string, unknown> =>
    JSON.parse(readFileSync(join(import.meta.dirname, "../examples", kind, f), "utf8"));
  const files = (kind: "requests" | "responses", prefix: string, ext: string): string[] =>
    readdirSync(join(import.meta.dirname, "../examples", kind)).filter((f) => f.startsWith(prefix) && f.endsWith(ext)).sort();

  it.each(files("responses", "day", ".valid.json"))("dia: acepta %s", (f) => {
    expect(isDayResponse(ex("responses", f))).toBe(true);
  });
  it.each(files("responses", "day", ".invalid.json"))("dia: rechaza %s", (f) => {
    expect(isDayResponse(ex("responses", f))).toBe(false);
  });
  it("dia: hay un ejemplo con set y uno sin set (con la hora de fin del dia)", () => {
    expect(ex("responses", "day.valid.json")).toMatchObject({ status: "available" });
    expect(ex("responses", "day-no-set.valid.json")).toMatchObject({ status: "noSet", items: [] });
    expect(typeof ex("responses", "day-no-set.valid.json").dayEndsAt).toBe("string");
  });
  it("dia: un item sin challengeId o con mecanica desconocida no es valido, y tolera campos nuevos", () => {
    const ok = ex("responses", "day.valid.json");
    const item: Record<string, unknown> = Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(ok.items))[0]));
    const withoutId = Object.fromEntries(Object.entries(item).filter(([k]) => k !== "challengeId"));
    expect(isDayResponse({ ...ok, items: [withoutId] })).toBe(false);
    expect(isDayResponse({ ...ok, items: [{ ...item, mechanic: { type: "otra", schemaVersion: 1, config: {} } }] })).toBe(false);
    expect(isDayResponse({ ...ok, extra: 1 })).toBe(true);
  });
  it("dia: sin nivel ni datos de otros en los ejemplos", () => {
    for (const f of files("responses", "day", ".valid.json")) {
      expect(JSON.stringify(ex("responses", f))).not.toMatch(/level|groupId|daySetId|playerId/i);
    }
  });

  it.each(files("requests", "submit-result", ".valid.json"))("logro pedido: acepta %s", (f) => {
    expect(isSubmitResultRequest(ex("requests", f))).toBe(true);
  });
  it.each(files("requests", "submit-result", ".invalid.json"))("logro pedido: rechaza %s", (f) => {
    expect(isSubmitResultRequest(ex("requests", f))).toBe(false);
  });
  it("logro pedido: tolera campos nuevos y acota durationMs", () => {
    const ok = ex("requests", "submit-result.valid.json");
    expect(isSubmitResultRequest({ ...ok, extra: 1 })).toBe(true);
    expect(isSubmitResultRequest({ ...ok, durationMs: 0 })).toBe(true);
    expect(isSubmitResultRequest({ ...ok, durationMs: 86_400_001 })).toBe(false);
    expect(isSubmitResultRequest({ ...ok, durationMs: 1.5 })).toBe(false);
  });
  it("logro respuesta: solo puntaje y puntos ganados (ni nivel, ni intentos, ni solucion)", () => {
    expect(isSubmitResultResponse(ex("responses", "submit-result.valid.json"))).toBe(true);
    expect(isSubmitResultResponse(ex("responses", "submit-result.invalid.json"))).toBe(false);
    expect(Object.keys(ex("responses", "submit-result.valid.json")).sort()).toEqual(["pointsEarned", "score"]);
    expect(isSubmitResultResponse({ score: 10 })).toBe(false);
  });
});

describe("autenticacion del panel", () => {
  const ex = (kind: "requests" | "responses" | "records", f: string): Record<string, unknown> =>
    JSON.parse(readFileSync(join(import.meta.dirname, "../examples", kind, f), "utf8"));
  const files = (kind: "requests" | "responses" | "records", prefix: string, ext: string): string[] =>
    readdirSync(join(import.meta.dirname, "../examples", kind)).filter((f) => f.startsWith(prefix) && f.endsWith(ext)).sort();
  const checks = [
    ["panel-login", isLoginRequest],
    ["panel-refresh", isRefreshRequest],
    ["panel-logout", isLogoutRequest],
    ["panel-change-password", isChangePasswordRequest],
  ] as const;

  for (const [prefix, check] of checks) {
    it.each(files("requests", prefix, ".valid.json"))("pedido: acepta %s", (f) => {
      expect(check(ex("requests", f))).toBe(true);
    });
    it.each(files("requests", prefix, ".invalid.json"))("pedido: rechaza %s", (f) => {
      expect(check(ex("requests", f))).toBe(false);
    });
  }
  it("hay al menos un ejemplo invalido por cada pedido", () => {
    for (const [prefix] of checks) expect(files("requests", prefix, ".invalid.json").length).toBeGreaterThan(0);
  });
  it("login: acota el largo de la contrasena (el servidor no revela la politica) y tolera campos nuevos", () => {
    const ok = ex("requests", "panel-login.valid.json");
    expect(isLoginRequest({ ...ok, password: "a".repeat(128) })).toBe(true);
    expect(isLoginRequest({ ...ok, password: "a".repeat(129) })).toBe(false);
    expect(isLoginRequest({ ...ok, email: "a".repeat(255) })).toBe(false);
    expect(isLoginRequest({ ...ok, extra: 1 })).toBe(true);
  });
  it("cambiar contrasena: la nueva tiene entre 15 y 128 caracteres", () => {
    const ok = ex("requests", "panel-change-password.valid.json");
    expect(isChangePasswordRequest({ ...ok, newPassword: "a".repeat(15) })).toBe(true);
    expect(isChangePasswordRequest({ ...ok, newPassword: "a".repeat(14) })).toBe(false);
    expect(isChangePasswordRequest({ ...ok, newPassword: "a".repeat(129) })).toBe(false);
  });
  it("sesion: acepta el ejemplo, rechaza el invalido y no trae hashes ni nivel", () => {
    expect(isPanelSession(ex("responses", "panel-session.valid.json"))).toBe(true);
    expect(isPanelSession(ex("responses", "panel-session.invalid.json"))).toBe(false);
    expect(Object.keys(ex("responses", "panel-session.valid.json")).sort()).toEqual(["accessToken", "account", "expiresAt", "refreshToken"]);
    for (const f of ["panel-session.valid.json", "panel-account.valid.json"]) {
      expect(JSON.stringify(ex("responses", f))).not.toMatch(/hash|"password"|level/i);
    }
  });
  it("cuenta del panel: solo id, correo, rol y mustChangePassword; el rol es moderator o administrator", () => {
    expect(isPanelAccount(ex("responses", "panel-account.valid.json"))).toBe(true);
    expect(isPanelAccount(ex("responses", "panel-account.invalid.json"))).toBe(false);
    expect(Object.keys(ex("responses", "panel-account.valid.json")).sort()).toEqual(["email", "id", "mustChangePassword", "role"]);
    expect(isPanelAccount({ ...ex("responses", "panel-account.valid.json"), role: "player" })).toBe(false);
  });
  it("documento accounts: acepta el ejemplo y rechaza un hash que no sea argon2id", () => {
    expect(isAccountRecord(ex("records", "account.valid.json"))).toBe(true);
    expect(isAccountRecord(ex("records", "account.invalid.json"))).toBe(false);
    expect(isAccountRecord({ ...ex("records", "account.valid.json"), role: "player" })).toBe(false);
  });
});

describe("formas del panel", () => {
  const dirPanel = join(import.meta.dirname, "../examples/panel");
  const kebab = (n: string): string => n.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  const read = (f: string): unknown => JSON.parse(readFileSync(join(dirPanel, f), "utf8"));

  it.each(Object.keys(panelValidators))("%s: acepta su ejemplo valido", (name) => {
    expect(panelValidators[name]?.(read(`${kebab(name)}.valid.json`))).toBe(true);
  });
  it("rechaza contrasena corta, cambio vacio y lote vacio", () => {
    expect(panelValidators.AcceptInvitationRequest?.(read("accept-invitation-short-password.invalid.json"))).toBe(false);
    expect(panelValidators.UpdateGroupRequest?.(read("update-group-empty.invalid.json"))).toBe(false);
    expect(panelValidators.MovePlayersRequest?.(read("move-players-empty.invalid.json"))).toBe(false);
  });
  it("las respuestas de /v1 siguen sin nivel; la ficha del panel si lo trae", () => {
    expect(JSON.stringify(read("panel-player.valid.json"))).toContain('"level"');
    expect(JSON.stringify(read("reissue-recovery-response.valid.json"))).not.toMatch(/hash/i);
  });
});

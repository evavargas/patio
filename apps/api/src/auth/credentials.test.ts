import { createHash, createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { isPlayerId } from "@patio/contracts";
import { ALPHABET } from "./alphabet.ts";
import { generatePlayerId, generateRecoveryCode, generateToken, hashRecoveryCode, hashToken } from "./credentials.ts";

// Espia crypto: comprueba que la aleatoriedad sale de ahi y no de Math.random.
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomInt: vi.fn(actual.randomInt), randomBytes: vi.fn(actual.randomBytes) };
});
const crypto = await import("node:crypto");

describe("alfabeto", () => {
  it("tiene 31 simbolos unicos, sin 0, O, 1, I, L", () => {
    expect(ALPHABET).toHaveLength(31);
    expect(new Set(ALPHABET).size).toBe(31);
    for (const banned of "0O1IL") expect(ALPHABET).not.toContain(banned);
    expect(ALPHABET).toMatch(/^[A-Z2-9]+$/);
  });
});

describe("alfabeto y contrato", () => {
  it("el patron de PlayerId del contrato acepta exactamente los 31 simbolos de ALPHABET", () => {
    for (const c of ALPHABET) expect(isPlayerId(c.repeat(12))).toBe(true);
    for (const c of "0O1IL") expect(isPlayerId(c.repeat(12))).toBe(false);
    for (const c of "abcdefghijklmnopqrstuvwxyz-_") expect(isPlayerId(c.repeat(12))).toBe(false);
  });
});

describe("generacion", () => {
  it("ID publico de 12 y codigo de recuperacion de 8, solo con el alfabeto", () => {
    const id = generatePlayerId();
    const code = generateRecoveryCode();
    expect(id).toMatch(/^[A-HJ-KM-NP-Z2-9]{12}$/);
    expect(code).toMatch(/^[A-HJ-KM-NP-Z2-9]{8}$/);
    expect(isPlayerId(id)).toBe(true);
  });

  it("token de 32 bytes aleatorios en base64url (43 caracteres)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("no se repiten en 20000 generaciones", () => {
    expect(new Set(Array.from({ length: 20000 }, generatePlayerId)).size).toBe(20000);
    expect(new Set(Array.from({ length: 20000 }, generateRecoveryCode)).size).toBe(20000);
    expect(new Set(Array.from({ length: 20000 }, generateToken)).size).toBe(20000);
  });

  it("aparecen los 31 simbolos (sin sesgo grosero)", () => {
    const seen = new Set(Array.from({ length: 2000 }, generateRecoveryCode).join(""));
    expect(seen.size).toBe(31);
  });

  it("usa crypto.randomInt y crypto.randomBytes, nunca Math.random", () => {
    const random = vi.spyOn(Math, "random");
    vi.mocked(crypto.randomInt).mockClear();
    vi.mocked(crypto.randomBytes).mockClear();
    generatePlayerId();
    generateRecoveryCode();
    generateToken();
    expect(crypto.randomInt).toHaveBeenCalledTimes(12 + 8);
    expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });
});

describe("hashes", () => {
  it("hashToken es SHA-256 en hexadecimal", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hashToken("abc")).toBe(createHash("sha256").update("abc").digest("hex"));
  });

  it("hashRecoveryCode es HMAC-SHA256 (vector RFC 4231, caso 2)", () => {
    expect(hashRecoveryCode("what do ya want for nothing?", "Jefe")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
    expect(hashRecoveryCode("K7QM2XPT", "s")).toBe(createHmac("sha256", "s").update("K7QM2XPT").digest("hex"));
  });

  it("el HMAC depende del secreto y no es el SHA-256 plano", () => {
    expect(hashRecoveryCode("K7QM2XPT", "uno")).not.toBe(hashRecoveryCode("K7QM2XPT", "dos"));
    expect(hashRecoveryCode("K7QM2XPT", "uno")).not.toBe(hashToken("K7QM2XPT"));
  });
});

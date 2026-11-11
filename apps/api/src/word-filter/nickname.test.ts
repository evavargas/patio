import { describe, expect, it } from "vitest";
import { NICKNAME_MAX_LENGTH, checkNickname, normalizeText } from "./nickname.ts";

describe("normalizeText", () => {
  it("pasa a minusculas y quita tildes, y nada mas", () => {
    expect(normalizeText("MARÍA")).toBe("maria");
    expect(normalizeText("Ñandú")).toBe("nandu");
    expect(normalizeText("Pingüino")).toBe("pinguino");
    expect(normalizeText("a-b_c")).toBe("a-b_c");
  });
});

describe("checkNickname", () => {
  const none: string[] = [];

  it("sin lista de palabras permite apodos validos y devuelve el apodo recortado", () => {
    expect(checkNickname("  Lucía  ", none)).toBe("Lucía");
  });

  it("compara sin importar mayusculas ni tildes", () => {
    expect(checkNickname("MARIA", ["María"])).toBeNull();
    expect(checkNickname("maría", ["MARIA"])).toBeNull();
    expect(checkNickname("Ñandú", ["nandu"])).toBeNull();
  });

  it("compara por palabra completa: bloquea la palabra sola o rodeada de separadores, no dentro de otra", () => {
    const words = ["maria"];
    expect(checkNickname("Ana Maria", words)).toBeNull();
    expect(checkNickname("Maria-Jose", words)).toBeNull();
    expect(checkNickname("maria_7", words)).toBeNull();
    expect(checkNickname("Mariano", words)).toBe("Mariano");
    expect(checkNickname("Amariana", words)).toBe("Amariana");
  });

  it("una entrada de varias palabras bloquea esa secuencia contigua", () => {
    const words = ["pepe grillo"];
    expect(checkNickname("Pepe  Grillo", words)).toBeNull();
    expect(checkNickname("el pepe grillo", words)).toBeNull();
    expect(checkNickname("Pepe", words)).toBe("Pepe");
    expect(checkNickname("grillo pepe", words)).toBe("grillo pepe");
  });

  it("ignora entradas vacias de la lista", () => {
    expect(checkNickname("Sol", ["", "  "])).toBe("Sol");
  });

  it(`acepta hasta ${NICKNAME_MAX_LENGTH} caracteres y rechaza mas (cuenta caracteres, no bytes)`, () => {
    expect(checkNickname("a".repeat(20), none)).toBe("a".repeat(20));
    expect(checkNickname("a".repeat(21), none)).toBeNull();
    expect(checkNickname("😀".repeat(20), none)).toBe("😀".repeat(20));
    expect(checkNickname("😀".repeat(21), none)).toBeNull();
  });

  it("rechaza vacio, solo espacios y caracteres de control", () => {
    expect(checkNickname("", none)).toBeNull();
    expect(checkNickname("   ", none)).toBeNull();
    expect(checkNickname("Sol\u0000", none)).toBeNull();
    expect(checkNickname("So\nl", none)).toBeNull();
  });

  it("no toca el contenido: es texto plano (no escapa ni interpreta)", () => {
    expect(checkNickname("<b>Sol</b> & co", none)).toBe("<b>Sol</b> & co");
  });
});

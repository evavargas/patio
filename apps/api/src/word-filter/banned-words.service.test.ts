import { describe, expect, it } from "vitest";
import type { BannedWordsDoc } from "./banned-words.repository.ts";
import { BannedWordsService } from "./banned-words.service.ts";

const serviceWith = (doc: BannedWordsDoc | null) => new BannedWordsService({ find: () => Promise.resolve(doc), replace: () => Promise.reject(new Error("no se usa")) });

describe("BannedWordsService", () => {
  it("sin documento responde version 0 y lista vacia", async () => {
    expect(await serviceWith(null).get()).toEqual({ version: 0, words: [] });
  });
  it("devuelve solo version y palabras (no filtra _id ni campos internos)", async () => {
    const doc: BannedWordsDoc = { _id: "bannedWords", version: 2, words: ["a"] };
    expect(await serviceWith(doc).get()).toEqual({ version: 2, words: ["a"] });
  });
});

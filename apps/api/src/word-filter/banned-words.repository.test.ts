import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestDatabase, openTestDatabase } from "../database/test-database.ts";
import { BannedWordsRepository } from "./banned-words.repository.ts";

let testDb: TestDatabase;
let repository: BannedWordsRepository;

beforeAll(async () => {
  testDb = await openTestDatabase();
  repository = new BannedWordsRepository({ db: testDb.db });
});
afterAll(async () => {
  await testDb.drop();
});
beforeEach(async () => {
  await testDb.settings.deleteMany({});
});

describe("BannedWordsRepository", () => {
  it("sin documento devuelve null (la lista arranca vacia)", async () => {
    expect(await repository.find()).toBeNull();
  });

  it("lee version y palabras del documento settings/bannedWords", async () => {
    await testDb.settings.insertOne({ _id: "bannedWords", version: 4, words: ["uno", "dos"] });
    expect(await repository.find()).toEqual({ _id: "bannedWords", version: 4, words: ["uno", "dos"] });
  });

  it("no mezcla otros documentos de settings", async () => {
    await testDb.settings.insertOne({ _id: "rules", version: 9, words: ["x"] });
    expect(await repository.find()).toBeNull();
  });
});

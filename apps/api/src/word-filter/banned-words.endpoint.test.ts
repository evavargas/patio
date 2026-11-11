import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { isBannedWordsResponse } from "@patio/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../app.module.ts";
import { configureApp } from "../app.ts";
import { type TestDatabase, openTestDatabase } from "../database/test-database.ts";
import { loadConfig } from "../platform/config.ts";

let testDb: TestDatabase;
let app: INestApplication;
let url: string;
const lines: string[] = [];

beforeAll(async () => {
  testDb = await openTestDatabase();
  const config = loadConfig({ NODE_ENV: "test", MONGODB_URI: testDb.uri, MONGODB_DB: testDb.dbName });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register({ config, logSink: (l) => lines.push(l) })],
  }).compile();
  const nest = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(nest, config);
  await nest.listen(0, "127.0.0.1");
  app = nest;
  const address = nest.getHttpServer().address();
  if (address === null || typeof address === "string") throw new Error("el servidor no abrio un puerto");
  url = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});
beforeEach(async () => {
  await testDb.settings.deleteMany({});
});

describe("GET /v1/banned-words", () => {
  it("publico y vacio al arrancar: 200, forma del contrato, version 0", async () => {
    const res = await fetch(`${url}/v1/banned-words`);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(isBannedWordsResponse(body)).toBe(true);
    expect(body).toEqual({ version: 0, words: [] });
  });

  it("devuelve la lista guardada y su version, sin nivel ni campos internos", async () => {
    await testDb.settings.insertOne({ _id: "bannedWords", version: 3, words: ["palabra"], level: 7 });
    const res = await fetch(`${url}/v1/banned-words`);
    expect(await res.json()).toEqual({ version: 3, words: ["palabra"] });
  });

  // cache: "no-cache" evita que fetch agregue `Cache-Control: no-cache` al pedido condicional (invalidaria el 304).
  it("es cacheable: Cache-Control publico y ETag segun la version; 304 si no cambio", async () => {
    await testDb.settings.insertOne({ _id: "bannedWords", version: 3, words: ["palabra"] });
    const first = await fetch(`${url}/v1/banned-words`);
    const etag = first.headers.get("etag");
    expect(etag).toBe('"banned-words-v3"');
    expect(first.headers.get("cache-control")).toMatch(/public, max-age=\d+/);
    const again = await fetch(`${url}/v1/banned-words`, { headers: { "if-none-match": etag ?? "" }, cache: "no-cache" });
    expect(again.status).toBe(304);
    await testDb.settings.updateOne({ _id: "bannedWords" }, { $set: { version: 4 } });
    const changed = await fetch(`${url}/v1/banned-words`, { headers: { "if-none-match": etag ?? "" }, cache: "no-cache" });
    expect(changed.status).toBe(200);
    expect(changed.headers.get("etag")).toBe('"banned-words-v4"');
  });

  it("no loguea las palabras", async () => {
    await testDb.settings.insertOne({ _id: "bannedWords", version: 1, words: ["secretisima"] });
    await (await fetch(`${url}/v1/banned-words`)).text();
    await new Promise((r) => setTimeout(r, 20));
    expect(lines.join("\n")).not.toContain("secretisima");
    expect(lines.join("\n")).toContain("/v1/banned-words");
  });
});

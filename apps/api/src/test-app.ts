import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module.ts";
import { configureApp } from "./app.ts";
import { type TestDatabase, openTestDatabase } from "./database/test-database.ts";
import { Clock } from "./platform/clock.ts";
import { type AppConfig, loadConfig } from "./platform/config.ts";

/** Reloj de pruebas: la hora solo cambia cuando la prueba lo pide. */
export class TestClock extends Clock {
  private current: Date | undefined;
  override now(): Date {
    return this.current ?? super.now();
  }
  set(value: Date): void {
    this.current = value;
  }
}

export interface TestApp {
  url: string;
  testDb: TestDatabase;
  config: AppConfig;
  clock: TestClock;
  /** Lineas de log emitidas hasta ahora. */
  lines: string[];
  app: INestApplication;
  close(): Promise<void>;
}

/** Levanta la API real en un puerto libre contra una base de pruebas nueva (o la dada). */
export async function startTestApp(env: NodeJS.ProcessEnv = {}, existing?: TestDatabase): Promise<TestApp> {
  const testDb = existing ?? (await openTestDatabase());
  const config = loadConfig({ NODE_ENV: "test", MONGODB_URI: testDb.uri, MONGODB_DB: testDb.dbName, ...env });
  const clock = new TestClock(config.timeZone);
  const lines: string[] = [];
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register({ config, clock, logSink: (l) => lines.push(l) })],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app, config);
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address();
  if (address === null || typeof address === "string") throw new Error("el servidor no abrio un puerto");
  return {
    url: `http://127.0.0.1:${address.port}`,
    testDb,
    config,
    clock,
    lines,
    app,
    close: async () => {
      await app.close();
      if (existing === undefined) await testDb.drop();
    },
  };
}

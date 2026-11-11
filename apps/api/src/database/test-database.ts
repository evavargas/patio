import { randomUUID } from "node:crypto";
import { type Collection, type Db, type Document, MongoClient } from "mongodb";

const TEST_URI = process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017";

export interface TestDatabase {
  uri: string;
  dbName: string;
  db: Db;
  /** `settings` con `_id` string, como la usa el codigo real. */
  settings: Collection<Document & { _id: string }>;
  /** Borra la base de pruebas y cierra la conexion. */
  drop(): Promise<void>;
}

/**
 * Base de pruebas NUEVA en cada corrida (nombre aleatorio, nunca la de desarrollo).
 * Si Mongo no esta arriba falla con un mensaje que dice que hacer.
 */
export async function openTestDatabase(): Promise<TestDatabase> {
  const client = new MongoClient(TEST_URI, { serverSelectionTimeoutMS: 2000 });
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
  } catch {
    await client.close();
    throw new Error("MongoDB local no responde. Las pruebas de integracion lo necesitan: corre `pnpm db:up` y repeti `pnpm test`.");
  }
  const dbName = `patio_test_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const db = client.db(dbName);
  return {
    uri: TEST_URI,
    dbName,
    db,
    settings: db.collection<Document & { _id: string }>("settings"),
    drop: async () => {
      await db.dropDatabase();
      await client.close();
    },
  };
}

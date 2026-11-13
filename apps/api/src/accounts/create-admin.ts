import "reflect-metadata";
import { MongoClient } from "mongodb";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { Clock } from "../platform/clock.ts";
import { loadConfig } from "../platform/config.ts";
import { AccountsRepository } from "./accounts.repository.ts";
import { createAdministrator } from "./administrator.ts";

// Comando de despliegue: crea el primer administrator. Correo y contrasena NUNCA se imprimen ni se registran.
// Vienen de PATIO_ADMIN_EMAIL / PATIO_ADMIN_PASSWORD o, si faltan, se preguntan en la terminal (la contrasena sin eco).
async function ask(question: string, hidden: boolean): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!muted) process.stdout.write(chunk);
      done();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write(question);
  muted = hidden;
  const answer = await rl.question("");
  rl.close();
  if (hidden) process.stdout.write("\n");
  return answer;
}

async function readCredentials(): Promise<{ email: string; password: string } | null> {
  const email = process.env.PATIO_ADMIN_EMAIL;
  const password = process.env.PATIO_ADMIN_PASSWORD;
  if (email !== undefined && password !== undefined) return { email, password };
  if (!process.stdin.isTTY) return null;
  const askedEmail = email ?? (await ask("Correo del administrator: ", false));
  if (password !== undefined) return { email: askedEmail, password };
  const first = await ask("Contrasena (15 a 128 caracteres): ", true);
  if (first !== (await ask("Repetila: ", true))) return { email: askedEmail, password: "" };
  return { email: askedEmail, password: first };
}

async function main(): Promise<number> {
  const config = loadConfig(process.env);
  const credentials = await readCredentials();
  if (credentials === null) {
    process.stderr.write("Sin terminal interactiva: defini PATIO_ADMIN_EMAIL y PATIO_ADMIN_PASSWORD.\n");
    return 1;
  }
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const repository = new AccountsRepository({ db: client.db(config.mongoDb) });
    await repository.onModuleInit();
    const result = await createAdministrator({ repository, clock: new Clock(config.timeZone), ...credentials });
    if (!result.ok) {
      process.stderr.write(`No se creo la cuenta: ${credentials.password === "" ? "las contrasenas no coinciden o estan vacias." : result.reason}\n`);
      return 1;
    }
    process.stdout.write("Administrator creado. Va a tener que cambiar la contrasena al iniciar sesion.\n");
    return 0;
  } catch {
    // Sin el error del driver: puede traer la URI de conexion.
    process.stderr.write("No se pudo conectar a MongoDB o escribir la cuenta (revisa MONGODB_URI).\n");
    return 1;
  } finally {
    await client.close();
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Error desconocido"}\n`);
  process.exitCode = 1;
}

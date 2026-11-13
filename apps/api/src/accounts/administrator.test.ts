import { isAccountRecord } from "@patio/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TestDatabase, openTestDatabase } from "../database/test-database.ts";
import { Clock } from "../platform/clock.ts";
import { createAdministrator } from "./administrator.ts";
import { normalizeEmail } from "./email.ts";
import { AccountsRepository } from "./accounts.repository.ts";

let db: TestDatabase;
let repository: AccountsRepository;
const clock = new Clock("America/Montevideo");

beforeAll(async () => {
  db = await openTestDatabase();
  repository = new AccountsRepository({ db: db.db });
  await repository.onModuleInit();
});
afterAll(async () => {
  await db.drop();
});
beforeEach(async () => {
  await db.db.collection("accounts").deleteMany({});
});

describe("normalizeEmail", () => {
  it("recorta y pasa a minusculas", () => {
    expect(normalizeEmail("  Maria@Example.ORG\n")).toBe("maria@example.org");
  });
});

describe("createAdministrator (comando del primer administrator)", () => {
  it("crea un administrator con mustChangePassword, correo normalizado, hash argon2id y documento valido", async () => {
    const result = await createAdministrator({ repository, clock, email: " Root@Example.org ", password: "una contrasena bastante larga" });
    expect(result).toEqual({ ok: true });
    const doc = await db.db.collection("accounts").findOne({ email: "root@example.org" });
    expect(doc).toMatchObject({ role: "administrator", mustChangePassword: true, active: true });
    expect(doc?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(doc)).not.toContain("bastante");
    expect(isAccountRecord(JSON.parse(JSON.stringify(doc)))).toBe(true);
  });

  it("falla con mensaje claro si ya existe ese correo, sin pisar la cuenta", async () => {
    await createAdministrator({ repository, clock, email: "root@example.org", password: "una contrasena bastante larga" });
    const again = await createAdministrator({ repository, clock, email: "ROOT@example.org", password: "otra contrasena bastante larga" });
    expect(again).toEqual({ ok: false, reason: "Ya existe una cuenta con ese correo." });
    expect(await db.db.collection("accounts").countDocuments()).toBe(1);
  });

  it("rechaza correo invalido o contrasena fuera de 15 a 128 caracteres, sin escribir y sin repetir la contrasena", async () => {
    for (const [email, password] of [["no-es-correo", "una contrasena bastante larga"], ["root@example.org", "corta"], ["root@example.org", "x".repeat(129)]] as const) {
      const r = await createAdministrator({ repository, clock, email, password });
      expect(r.ok).toBe(false);
      expect(JSON.stringify(r)).not.toContain(password);
    }
    expect(await db.db.collection("accounts").countDocuments()).toBe(0);
  });
});

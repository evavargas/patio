import { type PanelSession, isErrorBody, isPanelAccount, isPanelSession } from "@patio/contracts";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "../auth/password.ts";
import { hashToken } from "../auth/credentials.ts";
import { DEV_JWT_SECRET } from "../platform/config.ts";
import { type TestApp, startTestApp } from "../test-app.ts";
import { PanelProbeModule } from "./panel-probe.fixtures.ts";

const PASSWORD = "una contrasena bastante larga";
const NEW_PASSWORD = "otra contrasena igual de larga";
const WRONG = "contrasena equivocada 123";
const T0 = new Date("2026-11-11T15:00:00Z");

let t: TestApp;
let n = 0;

beforeAll(async () => {
  t = await startTestApp({ TRUST_PROXY_HOPS: "1", RATE_LIMIT_LOGIN_MAX: "5" }, undefined, [PanelProbeModule]);
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  for (const c of ["accounts", "refreshTokens", "rateLimits"]) await t.testDb.db.collection(c).deleteMany({});
  t.clock.set(T0);
  t.lines.length = 0;
});

const ip = (): string => `10.2.0.${++n}`;
const call = (path: string, init: RequestInit = {}, from = ip()): Promise<Response> =>
  fetch(`${t.url}${path}`, { ...init, headers: { "content-type": "application/json", "x-forwarded-for": from, ...init.headers } });
const post = (path: string, body: unknown, headers: Record<string, string> = {}, from?: string): Promise<Response> =>
  call(path, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers }, from);
const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });
const login = (email: string, password = PASSWORD, from?: string): Promise<Response> => post("/v1/panel/auth/login", { email, password }, {}, from);
const refresh = (refreshToken: string): Promise<Response> => post("/v1/panel/auth/refresh", { refreshToken });
const logout = (refreshToken: string): Promise<Response> => post("/v1/panel/auth/logout", { refreshToken });
const me = (token?: string): Promise<Response> => call("/v1/panel/auth/me", { headers: token === undefined ? {} : bearer(token) });
const probe = (name: string, token: string): Promise<Response> => call(`/v1/panel/probe/${name}`, { headers: bearer(token) });
const changePassword = (token: string, currentPassword: string, newPassword: string): Promise<Response> =>
  post("/v1/panel/auth/change-password", { currentPassword, newPassword }, bearer(token));

interface Seed {
  email?: string;
  role?: "moderator" | "administrator";
  password?: string;
  mustChangePassword?: boolean;
  active?: boolean;
}
async function seed({ email = `cuenta${++n}@example.org`, role = "moderator", password = PASSWORD, mustChangePassword = false, active = true }: Seed = {}): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  await t.testDb.withStringIds("accounts").insertOne({ _id: id, email, role, passwordHash: await hashPassword(password), mustChangePassword, active, createdAt: T0, passwordChangedAt: T0 });
  return { id, email };
}
async function session(res: Response): Promise<PanelSession> {
  const body: unknown = await res.json();
  if (!isPanelSession(body)) throw new Error("la respuesta no cumple el contrato");
  return body;
}
async function errorCode(res: Response): Promise<string | undefined> {
  const body: unknown = await res.json();
  return isErrorBody(body) ? body.code : undefined;
}
const signedIn = async (seedArgs: Seed = {}): Promise<{ id: string; email: string; s: PanelSession }> => {
  const a = await seed(seedArgs);
  return { ...a, s: await session(await login(a.email)) };
};
interface TokenRow {
  accountId: string;
  familyId: string;
  tokenHash: string;
  rotatedAt?: Date;
  expiresAt: Date;
}
const tokens = (): Promise<TokenRow[]> => t.testDb.db.collection<TokenRow>("refreshTokens").find().toArray();

describe("POST /v1/panel/auth/login", () => {
  it("200 con sesion del contrato; no se cachea; no trae hashes; guarda solo el hash del refresh token", async () => {
    const a = await seed({ role: "administrator" });
    const res = await login(a.email);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const raw = await res.clone().text();
    expect(raw).not.toMatch(/hash|"password"|level/i);
    const s = await session(res);
    expect(s.account).toEqual({ id: a.id, email: a.email, role: "administrator", mustChangePassword: false });
    expect(s.expiresAt).toBe("2026-11-11T15:15:00.000Z");
    const rows = await tokens();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).toBe(hashToken(s.refreshToken));
    expect(rows[0]?.expiresAt.toISOString()).toBe("2026-11-18T15:00:00.000Z");
    expect(JSON.stringify(rows)).not.toContain(s.refreshToken);
    const doc = await t.testDb.withStringIds("accounts").findOne({ _id: a.id });
    expect(doc?.lastLoginAt).toEqual(T0);
  });

  it("normaliza el correo (recorte y minusculas)", async () => {
    await seed({ email: "maria@example.org" });
    expect((await login("  MARIA@Example.ORG ")).status).toBe(200);
  });

  it("correo inexistente y contrasena mala: misma respuesta y tiempo parecido", async () => {
    const a = await seed();
    const timed = async (email: string): Promise<{ status: number; body: string; ms: number }> => {
      const start = t.clock.monotonicMs();
      const res = await login(email, WRONG);
      return { status: res.status, body: await res.text(), ms: t.clock.monotonicMs() - start };
    };
    const known: number[] = [];
    const unknown: number[] = [];
    let k: { status: number; body: string } = { status: 0, body: "" };
    let u: { status: number; body: string } = { status: 0, body: "" };
    for (let i = 0; i < 3; i++) {
      const [kr, ur] = [await timed(a.email), await timed(`nadie${i}@example.org`)];
      known.push(kr.ms);
      unknown.push(ur.ms);
      k = kr;
      u = ur;
    }
    expect(k.status).toBe(401);
    expect({ status: u.status, body: u.body }).toEqual({ status: k.status, body: k.body });
    expect(JSON.parse(k.body)).toMatchObject({ code: "INVALID_CREDENTIALS" });
    const median = (xs: number[]): number => xs.sort((x, y) => x - y)[1] ?? 0;
    expect(median(unknown)).toBeGreaterThan(median(known) * 0.5);
  });

  it("cuenta inactiva: con la contrasena correcta ACCOUNT_INACTIVE 403; con una mala, lo mismo que cualquiera", async () => {
    const a = await seed({ active: false });
    const ok = await login(a.email);
    expect(ok.status).toBe(403);
    expect(await errorCode(ok)).toBe("ACCOUNT_INACTIVE");
    const bad = await login(a.email, WRONG);
    expect(bad.status).toBe(401);
    expect(await errorCode(bad)).toBe("INVALID_CREDENTIALS");
    expect(await tokens()).toHaveLength(0);
  });

  it("limite por IP y correo: al pasar el maximo responde 429 aunque la contrasena sea correcta", async () => {
    const a = await seed();
    const from = ip();
    for (let i = 0; i < 5; i++) expect((await login(a.email, WRONG, from)).status).toBe(401);
    const blocked = await login(a.email, PASSWORD, from);
    expect(blocked.status).toBe(429);
    expect(await errorCode(blocked)).toBe("RATE_LIMITED");
    expect((await login(a.email, PASSWORD, ip())).status).toBe(200); // otra IP, mismo correo
    expect((await login((await seed()).email, PASSWORD, from)).status).toBe(200); // misma IP, otro correo
  });

  it("el contador no guarda el correo en claro (la IP si, mientras dura la ventana: doc 03)", async () => {
    await seed({ email: "reservado@example.org" });
    await login("reservado@example.org", PASSWORD, "10.99.99.99");
    const dump = JSON.stringify(await t.testDb.db.collection("rateLimits").find().toArray());
    expect(dump).toContain("login:");
    expect(dump).not.toContain("reservado");
  });

  it("cuerpo invalido: 400 VALIDATION_FAILED sin tocar el limite", async () => {
    for (const body of [{}, { email: "a@b.co" }, { email: "a@b.co", password: "" }, { email: "a@b.co", password: "x".repeat(129) }, "no es json"]) {
      const res = await post("/v1/panel/auth/login", body);
      expect(res.status).toBe(400);
      expect(await errorCode(res)).toBe("VALIDATION_FAILED");
    }
    expect(await t.testDb.db.collection("rateLimits").countDocuments()).toBe(0);
  });
});

describe("guard del panel (GET /v1/panel/auth/me y rutas de prueba)", () => {
  it("token valido: 200 con la cuenta del contrato, sin hashes", async () => {
    const { s, id } = await signedIn({ role: "administrator" });
    const res = await me(s.accessToken);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body: unknown = await res.json();
    if (!isPanelAccount(body)) throw new Error("la respuesta no cumple el contrato");
    expect(body.id).toBe(id);
  });

  it("ausente, malformado, alg none, manipulado o vencido: INVALID_TOKEN 401 con mensaje del panel", async () => {
    const { s } = await signedIn();
    const [h = "", p = "", sig = ""] = s.accessToken.split(".");
    const b64 = (v: unknown): string => Buffer.from(JSON.stringify(v)).toString("base64url");
    const claims: object = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    const bad: (string | undefined)[] = [
      undefined,
      "",
      "x",
      `${b64({ alg: "none", typ: "JWT" })}.${p}.`,
      `${b64({ alg: "none", typ: "JWT" })}.${p}.${sig}`,
      `${h}.${b64({ ...claims, sub: "otra" })}.${sig}`,
      `${h}.${p}.${sig.slice(0, -2)}AA`,
    ];
    for (const token of bad) {
      const res = await me(token);
      expect(res.status).toBe(401);
      const body: unknown = await res.json();
      if (!isErrorBody(body)) throw new Error("no es un error del contrato");
      expect(body.code).toBe("INVALID_TOKEN");
      expect(body.message).not.toMatch(/recuperacion/i);
    }
    expect((await call("/v1/panel/auth/me", { headers: { authorization: `Basic ${s.accessToken}` } })).status).toBe(401);
    t.clock.set(new Date(T0.getTime() + 15 * 60_000));
    const expired = await me(s.accessToken);
    expect(expired.status).toBe(401);
    expect(await errorCode(expired)).toBe("INVALID_TOKEN");
  });

  it("un token de player no sirve en el panel, y el del panel no sirve en /v1", async () => {
    const { s } = await signedIn();
    expect((await me("A".repeat(43))).status).toBe(401);
    expect((await call("/v1/me", { headers: bearer(s.accessToken) })).status).toBe(401);
  });

  it("lee la cuenta en cada pedido: eliminada = INVALID_TOKEN, inactiva = ACCOUNT_INACTIVE, ya mismo", async () => {
    const a = await signedIn();
    expect((await me(a.s.accessToken)).status).toBe(200);
    await t.testDb.withStringIds("accounts").updateOne({ _id: a.id }, { $set: { active: false } });
    const inactive = await me(a.s.accessToken);
    expect(inactive.status).toBe(403);
    expect(await errorCode(inactive)).toBe("ACCOUNT_INACTIVE");
    await t.testDb.withStringIds("accounts").deleteOne({ _id: a.id });
    const gone = await me(a.s.accessToken);
    expect(gone.status).toBe(401);
    expect(await errorCode(gone)).toBe("INVALID_TOKEN");
  });

  it("matriz de permisos del panel: rol por ruta", async () => {
    const admin = await signedIn({ role: "administrator" });
    const moderator = await signedIn({ role: "moderator" });
    const expected: Record<string, [number, number]> = { any: [200, 200], administrator: [200, 403], moderator: [403, 200] };
    for (const [route, [adminStatus, moderatorStatus]] of Object.entries(expected)) {
      expect((await probe(route, admin.s.accessToken)).status, `administrator ${route}`).toBe(adminStatus);
      const res = await probe(route, moderator.s.accessToken);
      expect(res.status, `moderator ${route}`).toBe(moderatorStatus);
      if (moderatorStatus === 403) expect(await errorCode(res)).toBe("FORBIDDEN_ROLE");
    }
    expect((await call("/v1/panel/probe/any")).status).toBe(401);
  });

  it("el rol se lee de la base en cada pedido: un cambio de rol rige de inmediato", async () => {
    const a = await signedIn({ role: "administrator" });
    expect((await probe("administrator", a.s.accessToken)).status).toBe(200);
    await t.testDb.withStringIds("accounts").updateOne({ _id: a.id }, { $set: { role: "moderator" } });
    expect((await probe("administrator", a.s.accessToken)).status).toBe(403);
  });

  it("mustChangePassword: todo da PASSWORD_CHANGE_REQUIRED salvo cambiar la contrasena (antes que el rol)", async () => {
    const a = await signedIn({ mustChangePassword: true });
    expect(a.s.account.mustChangePassword).toBe(true);
    for (const res of [await me(a.s.accessToken), await probe("any", a.s.accessToken), await probe("administrator", a.s.accessToken)]) {
      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe("PASSWORD_CHANGE_REQUIRED");
    }
    expect((await changePassword(a.s.accessToken, PASSWORD, NEW_PASSWORD)).status).toBe(200);
  });
});

describe("POST /v1/panel/auth/refresh", () => {
  it("emite un par nuevo en la misma familia, marca el anterior como rotado y mantiene el vencimiento", async () => {
    const a = await signedIn();
    t.clock.set(new Date(T0.getTime() + 60_000));
    const res = await refresh(a.s.refreshToken);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const s2 = await session(res);
    expect(s2.refreshToken).not.toBe(a.s.refreshToken);
    expect(s2.accessToken).not.toBe(a.s.accessToken);
    expect(s2.account.id).toBe(a.id);
    const rows = await tokens();
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.familyId)).size).toBe(1);
    expect(rows.filter((r) => r.rotatedAt !== undefined).map((r) => r.tokenHash)).toEqual([hashToken(a.s.refreshToken)]);
    expect(new Set(rows.map((r) => r.expiresAt.getTime())).size).toBe(1);
    expect((await me(s2.accessToken)).status).toBe(200);
  });

  it("reutilizar un token ya rotado revoca TODA la familia, tambien el vigente", async () => {
    const a = await signedIn();
    const s2 = await session(await refresh(a.s.refreshToken));
    const s3 = await session(await refresh(s2.refreshToken));
    const reuse = await refresh(a.s.refreshToken);
    expect(reuse.status).toBe(401);
    expect(await errorCode(reuse)).toBe("INVALID_REFRESH_TOKEN");
    expect((await refresh(s3.refreshToken)).status).toBe(401);
    expect(await tokens()).toHaveLength(0);
  });

  it("revocar una familia no toca las otras sesiones de la misma cuenta", async () => {
    const a = await signedIn();
    const other = await session(await login(a.email));
    await refresh(a.s.refreshToken);
    await refresh(a.s.refreshToken); // reutilizacion
    expect((await refresh(other.refreshToken)).status).toBe(200);
  });

  it("desconocido o vencido: INVALID_REFRESH_TOKEN 401; formato malo 400", async () => {
    const a = await signedIn();
    const unknown = await refresh("A".repeat(43));
    expect(unknown.status).toBe(401);
    expect(await errorCode(unknown)).toBe("INVALID_REFRESH_TOKEN");
    expect((await post("/v1/panel/auth/refresh", { refreshToken: "corto" })).status).toBe(400);
    t.clock.set(new Date(T0.getTime() + 7 * 86_400_000));
    const expired = await refresh(a.s.refreshToken);
    expect(expired.status).toBe(401);
    expect(await errorCode(expired)).toBe("INVALID_REFRESH_TOKEN");
  });

  it("cuenta inactiva o eliminada: no renueva y se revoca la familia", async () => {
    const a = await signedIn();
    await t.testDb.withStringIds("accounts").updateOne({ _id: a.id }, { $set: { active: false } });
    const res = await refresh(a.s.refreshToken);
    expect(res.status).toBe(403);
    expect(await errorCode(res)).toBe("ACCOUNT_INACTIVE");
    expect(await tokens()).toHaveLength(0);
    const b = await signedIn();
    await t.testDb.withStringIds("accounts").deleteOne({ _id: b.id });
    const gone = await refresh(b.s.refreshToken);
    expect(gone.status).toBe(401);
    expect(await errorCode(gone)).toBe("INVALID_REFRESH_TOKEN");
    expect(await tokens()).toHaveLength(0);
  });

  it("con mustChangePassword renueva (la cuenta lo informa) y sigue bloqueada", async () => {
    const a = await signedIn({ mustChangePassword: true });
    const s2 = await session(await refresh(a.s.refreshToken));
    expect(s2.account.mustChangePassword).toBe(true);
    expect((await me(s2.accessToken)).status).toBe(403);
  });

});

describe("POST /v1/panel/auth/logout", () => {
  it("204 sin cuerpo; el token y toda su familia dejan de servir", async () => {
    const a = await signedIn();
    const s2 = await session(await refresh(a.s.refreshToken));
    const res = await logout(s2.refreshToken);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect((await refresh(s2.refreshToken)).status).toBe(401);
    expect(await tokens()).toHaveLength(0);
  });

  it("es idempotente: un token desconocido tambien da 204; formato malo 400; no toca otras sesiones", async () => {
    const a = await signedIn();
    const other = await session(await login(a.email));
    expect((await logout("A".repeat(43))).status).toBe(204);
    expect((await post("/v1/panel/auth/logout", {})).status).toBe(400);
    expect((await logout(a.s.refreshToken)).status).toBe(204);
    expect((await logout(a.s.refreshToken)).status).toBe(204);
    expect((await refresh(other.refreshToken)).status).toBe(200);
  });

  it("con mustChangePassword igual se puede salir", async () => {
    const a = await signedIn({ mustChangePassword: true });
    expect((await logout(a.s.refreshToken)).status).toBe(204);
  });
});

describe("POST /v1/panel/auth/change-password", () => {
  it("cambia la clave, apaga mustChangePassword, revoca refresh tokens y access tokens previos, y abre sesion nueva", async () => {
    const a = await signedIn({ mustChangePassword: true });
    const other = await session(await login(a.email));
    const bystander = await signedIn();
    t.clock.set(new Date(T0.getTime() + 10_000));
    const res = await changePassword(a.s.accessToken, PASSWORD, NEW_PASSWORD);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const s2 = await session(res);
    expect(s2.account.mustChangePassword).toBe(false);
    expect((await me(s2.accessToken)).status).toBe(200);
    expect((await refresh(a.s.refreshToken)).status).toBe(401);
    expect((await refresh(other.refreshToken)).status).toBe(401);
    expect((await me(a.s.accessToken)).status).toBe(401); // access token emitido antes del cambio
    expect((await refresh(s2.refreshToken)).status).toBe(200);
    expect((await login(a.email, PASSWORD)).status).toBe(401);
    expect((await login(a.email, NEW_PASSWORD)).status).toBe(200);
    expect((await me(bystander.s.accessToken)).status).toBe(200); // otras cuentas intactas
    expect((await refresh(bystander.s.refreshToken)).status).toBe(200);
    const doc = await t.testDb.withStringIds("accounts").findOne({ _id: a.id });
    expect(doc?.mustChangePassword).toBe(false);
    expect(doc?.passwordChangedAt).toEqual(new Date(T0.getTime() + 10_000));
  });

  it("contrasena actual mala: INVALID_CREDENTIALS 401 y no cambia nada; la nueva igual a la actual o corta: 400", async () => {
    const a = await signedIn();
    const bad = await changePassword(a.s.accessToken, WRONG, NEW_PASSWORD);
    expect(bad.status).toBe(401);
    expect(await errorCode(bad)).toBe("INVALID_CREDENTIALS");
    for (const next of [PASSWORD, "corta"]) {
      const res = await changePassword(a.s.accessToken, PASSWORD, next);
      expect(res.status).toBe(400);
      expect(await errorCode(res)).toBe("VALIDATION_FAILED");
    }
    expect((await login(a.email)).status).toBe(200);
    expect((await refresh(a.s.refreshToken)).status).toBe(200);
  });

  it("sin token: 401; con el limite de intentos agotado: 429 aunque la actual sea correcta", async () => {
    expect((await post("/v1/panel/auth/change-password", { currentPassword: PASSWORD, newPassword: NEW_PASSWORD })).status).toBe(401);
    const a = await signedIn();
    for (let i = 0; i < 5; i++) expect((await changePassword(a.s.accessToken, WRONG, NEW_PASSWORD)).status).toBe(401);
    const blocked = await changePassword(a.s.accessToken, PASSWORD, NEW_PASSWORD);
    expect(blocked.status).toBe(429);
    expect(await errorCode(blocked)).toBe("RATE_LIMITED");
  });
});

describe("secretos", () => {
  it("ni la base, ni los logs, ni los errores contienen contrasenas, tokens, hashes en respuestas ni el secreto", async () => {
    const a = await signedIn({ mustChangePassword: true });
    const s2 = await session(await changePassword(a.s.accessToken, PASSWORD, NEW_PASSWORD));
    const s3 = await session(await refresh(s2.refreshToken));
    const errors = [await login(a.email, WRONG), await refresh(s2.refreshToken), await me("x"), await post("/v1/panel/auth/login", { email: a.email })];
    const errorBodies = await Promise.all(errors.map((r) => r.text()));
    await logout(s3.refreshToken);
    const secrets = [PASSWORD, NEW_PASSWORD, WRONG, DEV_JWT_SECRET, ...[a.s, s2, s3].flatMap((s) => [s.accessToken, s.refreshToken])];
    const dump = JSON.stringify(await Promise.all(["accounts", "refreshTokens", "rateLimits"].map((c) => t.testDb.db.collection(c).find().toArray())));
    for (const [where, text] of [["logs", t.lines.join("\n")], ["base", dump], ["errores", errorBodies.join("\n")]] as const) {
      for (const secret of secrets) expect(text.includes(secret), `${where} contiene un secreto`).toBe(false);
    }
    expect(errorBodies.join("\n")).not.toMatch(/argon2|hash/i);
    expect(t.lines.join("\n")).not.toContain(a.email);
    const account = await t.testDb.withStringIds("accounts").findOne({ _id: a.id });
    expect(account?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("los logs de pedido guardan la ruta como patron, no el correo", async () => {
    await login("alguien@example.org");
    const line = t.lines.find((l) => l.includes("/auth/login"));
    expect(line).toBeDefined();
    expect(line).not.toContain("alguien");
  });
});

describe("indices", () => {
  it("accounts.email unico, refreshTokens.tokenHash unico y TTL en expiresAt; arrancar dos veces no falla", async () => {
    const accounts = await t.testDb.db.collection("accounts").indexes();
    expect(accounts.find((i) => i.key.email === 1)?.unique).toBe(true);
    const tokensIdx = await t.testDb.db.collection("refreshTokens").indexes();
    expect(tokensIdx.find((i) => i.key.tokenHash === 1)?.unique).toBe(true);
    expect(tokensIdx.find((i) => i.key.expiresAt === 1)?.expireAfterSeconds).toBe(0);
    expect(tokensIdx.some((i) => i.key.familyId === 1)).toBe(true);
    expect(tokensIdx.some((i) => i.key.accountId === 1)).toBe(true);
    const second = await startTestApp({}, t.testDb);
    await second.close();
  });
});

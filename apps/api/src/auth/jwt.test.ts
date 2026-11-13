import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signJwt, verifyJwt } from "./jwt.ts";

const SECRET = "test-secret-test-secret-test-secret-0123456789";
const NOW = 1_800_000_000;
const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const sign = (head: string, body: string, secret = SECRET): string => createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
const forge = (header: unknown, payload: unknown, secret = SECRET): string => {
  const [h, p] = [b64(header), b64(payload)];
  return `${h}.${p}.${sign(h, p, secret)}`;
};
const HS256 = { alg: "HS256", typ: "JWT" };
const good = { sub: "acc-1", iat: NOW, exp: NOW + 900 };

describe("JWT HS256", () => {
  it("firma y verifica; devuelve sub, iat y exp", () => {
    const token = signJwt(good, SECRET);
    expect(token.split(".")).toHaveLength(3);
    expect(verifyJwt(token, SECRET, NOW + 10)).toEqual(good);
  });

  it("rechaza un token vencido (exp <= ahora) y acepta hasta el ultimo segundo", () => {
    const token = signJwt(good, SECRET);
    expect(verifyJwt(token, SECRET, NOW + 899)).not.toBeNull();
    expect(verifyJwt(token, SECRET, NOW + 900)).toBeNull();
  });

  it("rechaza iat en el futuro mas alla de 30 s de tolerancia de reloj entre instancias", () => {
    const token = signJwt(good, SECRET);
    expect(verifyJwt(token, SECRET, NOW - 30)).not.toBeNull();
    expect(verifyJwt(token, SECRET, NOW - 31)).toBeNull();
  });

  it("rechaza un token con vida mayor a 15 minutos", () => {
    expect(verifyJwt(signJwt({ ...good, exp: NOW + 901 }, SECRET), SECRET, NOW)).toBeNull();
  });

  it("rechaza carga manipulada con la firma original", () => {
    const [h, , s] = signJwt(good, SECRET).split(".");
    expect(verifyJwt(`${h}.${b64({ ...good, sub: "otra" })}.${s}`, SECRET, NOW)).toBeNull();
  });

  it("rechaza firma de otro secreto o alterada", () => {
    expect(verifyJwt(forge(HS256, good, "otro-secreto-otro-secreto-otro-secreto"), SECRET, NOW)).toBeNull();
    const token = signJwt(good, SECRET);
    expect(verifyJwt(`${token.slice(0, -2)}AA`, SECRET, NOW)).toBeNull();
  });

  it("rechaza alg none (sin firma, con firma vacia o con firma cualquiera)", () => {
    const none = { alg: "none", typ: "JWT" };
    expect(verifyJwt(`${b64(none)}.${b64(good)}.`, SECRET, NOW)).toBeNull();
    expect(verifyJwt(`${b64(none)}.${b64(good)}`, SECRET, NOW)).toBeNull();
    expect(verifyJwt(forge(none, good), SECRET, NOW)).toBeNull();
    expect(verifyJwt(`${b64({ alg: "None" })}.${b64(good)}.`, SECRET, NOW)).toBeNull();
  });

  it("rechaza cualquier algoritmo que no sea HS256, aunque la firma sea HMAC valida", () => {
    for (const alg of ["HS384", "HS512", "RS256", "ES256", "hs256"]) {
      expect(verifyJwt(forge({ alg, typ: "JWT" }, good), SECRET, NOW)).toBeNull();
    }
  });

  it("rechaza formas mal formadas", () => {
    for (const bad of ["", "a", "a.b", "a.b.c.d", "...", "!!!.???.***", `${b64(HS256)}.${Buffer.from("no json").toString("base64url")}.x`]) {
      expect(verifyJwt(bad, SECRET, NOW)).toBeNull();
    }
  });

  it("rechaza carga sin sub, o con exp/iat que no son enteros", () => {
    expect(verifyJwt(forge(HS256, { iat: NOW, exp: NOW + 10 }), SECRET, NOW)).toBeNull();
    expect(verifyJwt(forge(HS256, { sub: "a", iat: "1", exp: NOW + 10 }), SECRET, NOW)).toBeNull();
    expect(verifyJwt(forge(HS256, { sub: "a", iat: NOW, exp: NOW + 10.5 }), SECRET, NOW)).toBeNull();
    expect(verifyJwt(forge(HS256, { sub: "", iat: NOW, exp: NOW + 10 }), SECRET, NOW)).toBeNull();
  });
});

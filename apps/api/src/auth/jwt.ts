import { createHmac, timingSafeEqual } from "node:crypto";

/** Unico encabezado aceptado: {"alg":"HS256","typ":"JWT"}. Cualquier otro (none, HS512, RS256...) se rechaza sin mirar mas. */
const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
const MAX_LIFETIME_SECONDS = 900;
const IAT_LEEWAY_SECONDS = 30;

export interface JwtClaims {
  sub: string;
  iat: number;
  exp: number;
}

const mac = (data: string, secret: string): string => createHmac("sha256", secret).update(data).digest("base64url");

export function signJwt(claims: JwtClaims, secret: string): string {
  const body = `${HEADER}.${Buffer.from(JSON.stringify({ sub: claims.sub, iat: claims.iat, exp: claims.exp })).toString("base64url")}`;
  return `${body}.${mac(body, secret)}`;
}

/** `nowSeconds` lo da el reloj del back. null por CUALQUIER falla (no se distingue la causa). */
export function verifyJwt(token: string, secret: string, nowSeconds: number): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (header !== HEADER || payload === undefined || signature === undefined) return null;
  const expected = Buffer.from(mac(`${header}.${payload}`, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof claims !== "object" || claims === null) return null;
  const sub = Object.getOwnPropertyDescriptor(claims, "sub")?.value;
  const iat = Object.getOwnPropertyDescriptor(claims, "iat")?.value;
  const exp = Object.getOwnPropertyDescriptor(claims, "exp")?.value;
  if (typeof sub !== "string" || sub === "" || sub.length > 64) return null;
  if (typeof iat !== "number" || typeof exp !== "number" || !Number.isSafeInteger(iat) || !Number.isSafeInteger(exp)) return null;
  if (exp <= nowSeconds || iat > nowSeconds + IAT_LEEWAY_SECONDS || exp - iat > MAX_LIFETIME_SECONDS || exp <= iat) return null;
  return { sub, iat, exp };
}

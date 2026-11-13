import { signJwt } from "../auth/jwt.ts";
import { hashToken } from "../auth/credentials.ts";
import { DEV_JWT_SECRET } from "../platform/config.ts";

/** SOLO pruebas: access token firmado a mano para `now` (evita el costo de argon2 en cada prueba). */
export const accessTokenFor = (accountId: string, now: Date): string => {
  const iat = Math.floor(now.getTime() / 1000);
  return signJwt({ sub: accountId, iat, exp: iat + 900 }, DEV_JWT_SECRET);
};

export const sha256 = hashToken;

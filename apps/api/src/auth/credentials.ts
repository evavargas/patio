import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { type PlayerId, isPlayerId } from "@patio/contracts";
import { ALPHABET } from "./alphabet.ts";

const PLAYER_ID_LENGTH = 12;
const RECOVERY_CODE_LENGTH = 8;
const TOKEN_BYTES = 32;

// randomInt rechaza valores para no sesgar el resultado (31 no divide a 2^n).
const randomSymbols = (length: number): string =>
  Array.from({ length }, () => ALPHABET.charAt(randomInt(ALPHABET.length))).join("");

export function generatePlayerId(): PlayerId {
  const id = randomSymbols(PLAYER_ID_LENGTH);
  if (!isPlayerId(id)) throw new Error("ID generado fuera del contrato");
  return id;
}

export const generateRecoveryCode = (): string => randomSymbols(RECOVERY_CODE_LENGTH);

/** 32 bytes aleatorios en base64url (43 caracteres). */
export const generateToken = (): string => randomBytes(TOKEN_BYTES).toString("base64url");

/** SHA-256 hexadecimal del token tal como viaja en `Authorization: Bearer`. */
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

/** HMAC-SHA256 hexadecimal con un secreto que vive fuera de la base. */
export const hashRecoveryCode = (code: string, secret: string): string =>
  createHmac("sha256", secret).update(code).digest("hex");

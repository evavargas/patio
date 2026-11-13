import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

// OWASP Password Storage Cheat Sheet: argon2id con m=19456 KiB (19 MiB), t=2, p=1 es una de las configuraciones minimas
// equivalentes. Costo real en Cloud Run 512 MiB: sin medir.
const MEMORY_KIB = 19_456;
const PASSES = 2;
const PARALLELISM = 1;
const TAG_BYTES = 32;
const SALT_BYTES = 16;

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;
const b64 = (bytes: Buffer): string => bytes.toString("base64").replace(/=+$/, "");

interface Params {
  memory: number;
  passes: number;
  parallelism: number;
  salt: Buffer;
  tag: Buffer;
}

function parse(stored: string): Params | null {
  const m = PHC.exec(stored);
  if (m === null) return null;
  const [memory, passes, parallelism] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const salt = Buffer.from(m[4] ?? "", "base64");
  const tag = Buffer.from(m[5] ?? "", "base64");
  if (parallelism < 1 || passes < 1 || memory < 8 * parallelism || salt.length < 8 || tag.length < 4) return null;
  return { memory, passes, parallelism, salt, tag };
}

// Las contrasenas se normalizan (NFKC) para que la misma clave escrita en otro teclado o sistema sea la misma.
const derive = (password: string, p: Omit<Params, "tag">, tagLength: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    argon2(
      "argon2id",
      { message: password.normalize("NFKC"), nonce: p.salt, memory: p.memory, passes: p.passes, parallelism: p.parallelism, tagLength },
      (error, key) => (error === null ? resolve(key) : reject(error)),
    );
  });

/** Hash PHC `$argon2id$v=19$m=..,t=..,p=..$sal$hash`. Sal aleatoria propia. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const tag = await derive(password, { memory: MEMORY_KIB, passes: PASSES, parallelism: PARALLELISM, salt }, TAG_BYTES);
  return `$argon2id$v=19$m=${MEMORY_KIB},t=${PASSES},p=${PARALLELISM}$${b64(salt)}$${b64(tag)}`;
}

let fake: Promise<string> | undefined;
/** Hash de una clave aleatoria que nadie conoce: gasta el mismo tiempo cuando la cuenta no existe. */
const fakeHash = (): Promise<string> => (fake ??= hashPassword(randomBytes(16).toString("hex")));

/** `stored` null = la cuenta no existe: igual se calcula un hash completo y el resultado es siempre false. */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const params = parse(stored ?? (await fakeHash()));
  if (params === null) return false;
  const tag = await derive(password, params, params.tag.length);
  return stored !== null && timingSafeEqual(tag, params.tag);
}

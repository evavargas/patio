import { isEmail } from "@patio/contracts";
import { MongoServerError } from "mongodb";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth/password.ts";
import type { Clock } from "../platform/clock.ts";
import type { AccountsRepository } from "./accounts.repository.ts";
import { normalizeEmail } from "./email.ts";

export type CreateAdministratorResult = { ok: true } | { ok: false; reason: string };

/**
 * Crea el primer administrator (comando de despliegue). La cuenta nace con `mustChangePassword`.
 * El motivo del rechazo nunca repite el correo ni la contrasena. 1 escritura.
 */
export async function createAdministrator(input: { repository: Pick<AccountsRepository, "insert">; clock: Clock; email: string; password: string }): Promise<CreateAdministratorResult> {
  const email = normalizeEmail(input.email);
  if (!isEmail(email)) return { ok: false, reason: "El correo no es valido." };
  const length = [...input.password].length;
  if (length < 15 || length > 128) return { ok: false, reason: "La contrasena debe tener entre 15 y 128 caracteres." };
  const now = input.clock.now();
  try {
    await input.repository.insert({ _id: randomUUID(), email, role: "administrator", passwordHash: await hashPassword(input.password), mustChangePassword: true, active: true, createdAt: now, passwordChangedAt: now });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return { ok: false, reason: "Ya existe una cuenta con ese correo." };
    throw error;
  }
  return { ok: true };
}

import { DomainException } from "../platform/domain.exception.ts";

export type Query = Record<string, unknown>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** Texto simple de la query, o undefined si falta. Repetida o con forma rara = VALIDATION_FAILED. */
export function text(query: Query, name: string, maxLength = 128): string | undefined {
  const value = query[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value === "" || value.length > maxLength) throw new DomainException("VALIDATION_FAILED", 400);
  return value;
}

export function int(query: Query, name: string, min: number, max: number): number | undefined {
  const value = text(query, name, 9);
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!/^\d+$/.test(value) || n < min || n > max) throw new DomainException("VALIDATION_FAILED", 400);
  return n;
}

/** Pagina: `limit` de 1 a 100 (50 por defecto) y cursor opaco. */
export function page(query: Query): { cursor: string | undefined; limit: number } {
  return { cursor: text(query, "cursor"), limit: int(query, "limit", 1, MAX_LIMIT) ?? DEFAULT_LIMIT };
}

/** Las eliminaciones definitivas exigen `?confirm=true`. */
export function requireConfirm(query: Query): void {
  if (query.confirm !== "true") throw new DomainException("CONFIRMATION_REQUIRED", 400);
}

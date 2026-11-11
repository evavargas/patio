// Unica fuente de hora del juego. Nadie mas llama a Date.now(), new Date() ni performance.now().
// Mas adelante, nowMs() pasa a sumar la diferencia servidor-dispositivo.

/** Milisegundos monotonicos desde que cargo la pagina. Para duraciones. */
export function monotonicMs(): number {
  return performance.now();
}

/** Instante actual en ms epoch. Para marcas de tiempo. */
export function nowMs(): number {
  return performance.timeOrigin + performance.now();
}

export function nowIso(): string {
  return new Date(nowMs()).toISOString();
}

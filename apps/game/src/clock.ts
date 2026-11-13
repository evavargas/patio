// Unica fuente de hora del juego. Nadie mas llama a Date.now(), new Date() ni performance.now().

/** Milisegundos monotonicos desde que cargo la pagina. Para duraciones. */
export function monotonicMs(): number {
  return performance.now();
}

/** Instante actual en ms epoch segun el dispositivo. Solo para marcas internas: para decidir algo usa serverNowMs(). */
export function nowMs(): number {
  return performance.timeOrigin + performance.now();
}

export function nowIso(): string {
  return new Date(nowMs()).toISOString();
}

let serverOffsetMs = 0;

/** Se llama con `serverTime` de cada GET /day. Cambiar la hora del celular despues no altera el reloj. */
export function syncServerTime(serverTimeIso: string): void {
  const serverMs = Date.parse(serverTimeIso);
  if (!Number.isNaN(serverMs)) serverOffsetMs = serverMs - nowMs();
}

/** Hora del servidor estimada: reloj del dispositivo mas la diferencia medida en el ultimo GET /day. */
export function serverNowMs(): number {
  return nowMs() + serverOffsetMs;
}

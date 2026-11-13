import type { SubmitResultRequest, SubmitResultResponse } from '@patio/contracts';
import { ApiError } from './api';
import { webStorage, type KeyValueStorage } from './storage';

const KEY = 'patio-pending-results';
const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 60_000;

export type ResultQueueDeps = {
  submit: (request: SubmitResultRequest) => Promise<SubmitResultResponse>;
  onSuccess: (request: SubmitResultRequest, response: SubmitResultResponse) => void;
  onUnauthorized: () => void;
  storage?: KeyValueStorage;
  setTimer?: (fn: () => void, ms: number) => void;
};

function isPending(v: unknown): v is SubmitResultRequest {
  return (
    typeof v === 'object' &&
    v !== null &&
    'eventId' in v && typeof v.eventId === 'string' &&
    'date' in v && typeof v.date === 'string' &&
    'challengeId' in v && typeof v.challengeId === 'string' &&
    'durationMs' in v && typeof v.durationMs === 'number'
  );
}

/**
 * Cola de logros: reenvia con el MISMO eventId (el servidor es idempotente), sin avisar al jugador.
 * Red caida, 5xx o 429: reintenta con espera creciente. 401: espera a que se recupere la sesion (flush()).
 * Cualquier otro 4xx no puede mejorar al reintentar: se descarta.
 */
export function createResultQueue(deps: ResultQueueDeps) {
  const storage = deps.storage ?? webStorage;
  const setTimer = deps.setTimer ?? ((fn, ms) => void setTimeout(fn, ms));
  let pending: SubmitResultRequest[] = [];
  let isRunning = false;
  let failures = 0;

  const persist = () => storage.set(KEY, JSON.stringify(pending));

  async function flush(): Promise<void> {
    if (isRunning) return;
    isRunning = true;
    try {
      while (pending[0] !== undefined) {
        const request = pending[0];
        try {
          const response = await deps.submit(request);
          pending = pending.filter((p) => p.eventId !== request.eventId);
          failures = 0;
          await persist();
          deps.onSuccess(request, response);
        } catch (error) {
          const status = error instanceof ApiError ? error.status : 0;
          if (status === 401) return deps.onUnauthorized();
          if (status !== 0 && status !== 429 && status < 500) {
            pending = pending.filter((p) => p.eventId !== request.eventId);
            await persist();
            continue;
          }
          failures++;
          setTimer(() => void flush(), Math.min(BASE_DELAY_MS * 2 ** (failures - 1), MAX_DELAY_MS));
          return;
        }
      }
    } finally {
      isRunning = false;
    }
  }

  return {
    flush,
    /** Carga lo que quedo guardado de una sesion anterior y lo intenta. */
    async load(): Promise<void> {
      const raw = await storage.get(KEY);
      try {
        const parsed: unknown = raw === null ? [] : JSON.parse(raw);
        pending = Array.isArray(parsed) ? parsed.filter(isPending) : [];
      } catch {
        pending = [];
      }
      await flush();
    },
    async add(request: SubmitResultRequest): Promise<void> {
      if (!pending.some((p) => p.eventId === request.eventId)) pending.push(request);
      await persist();
      await flush();
    },
    get size(): number {
      return pending.length;
    },
  };
}

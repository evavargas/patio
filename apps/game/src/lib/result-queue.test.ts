import type { SubmitResultRequest, SubmitResultResponse } from '@patio/contracts';
import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { createResultQueue } from './result-queue';
import type { KeyValueStorage } from './storage';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    get: (k) => Promise.resolve(data[k] ?? null),
    set: (k, v) => ((data[k] = v), Promise.resolve()),
    remove: (k) => ((data[k] = ''), Promise.resolve()),
  };
}

// El JSON evita armar a mano los ids de marca del contrato.
const req = (eventId: string): SubmitResultRequest =>
  JSON.parse(JSON.stringify({ eventId, date: '2026-11-13', challengeId: 'c1', durationMs: 1000 }));
const ok: SubmitResultResponse = { score: 10, pointsEarned: 10 };

function setup(submit: (r: SubmitResultRequest) => Promise<SubmitResultResponse>, storage = memoryStorage()) {
  const timers: number[] = [];
  const done: string[] = [];
  let unauthorized = 0;
  const queue = createResultQueue({
    submit,
    storage,
    onSuccess: (r) => void done.push(r.eventId),
    onUnauthorized: () => void unauthorized++,
    setTimer: (_fn, ms) => void timers.push(ms),
  });
  return { queue, timers, done, storage, unauthorized: () => unauthorized };
}

describe('result queue', () => {
  it('envia y vacia la cola', async () => {
    const { queue, done, storage } = setup(() => Promise.resolve(ok));
    await queue.add(req('e1'));
    expect(done).toEqual(['e1']);
    expect(queue.size).toBe(0);
    expect(storage.data['patio-pending-results']).toBe('[]');
  });

  it('sin red guarda el logro, reintenta con espera creciente y mantiene el mismo eventId', async () => {
    const seen: string[] = [];
    let isUp = false;
    const { queue, timers, done } = setup((r) => {
      seen.push(r.eventId);
      return isUp ? Promise.resolve(ok) : Promise.reject(new ApiError(0, null));
    });
    await queue.add(req('e1'));
    await queue.flush();
    expect(timers).toEqual([5000, 10000]); // dos fallos
    expect(queue.size).toBe(1);
    isUp = true;
    await queue.flush();
    expect(seen).toEqual(['e1', 'e1', 'e1']);
    expect(done).toEqual(['e1']);
  });

  it('un 4xx que no mejora al reintentar se descarta; el 401 espera a la recuperacion', async () => {
    const bad = setup(() => Promise.reject(new ApiError(409, null)));
    await bad.queue.add(req('e1'));
    expect(bad.queue.size).toBe(0);

    const auth = setup(() => Promise.reject(new ApiError(401, 'INVALID_TOKEN')));
    await auth.queue.add(req('e1'));
    expect(auth.unauthorized()).toBe(1);
    expect(auth.queue.size).toBe(1);
    expect(auth.timers).toEqual([]);
  });

  it('no duplica el mismo eventId y recupera lo guardado al cargar', async () => {
    const storage = memoryStorage({ 'patio-pending-results': JSON.stringify([req('e9'), { basura: true }]) });
    const { queue, done } = setup(() => Promise.resolve(ok), storage);
    await queue.load();
    expect(done).toEqual(['e9']);
  });
});

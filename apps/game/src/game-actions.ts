// Orquesta la sesion, el dia y los logros. Vive fuera de los componentes y de la escena: la escena solo lee el store.
import type { DayResponse } from '@patio/contracts';
import { monotonicMs, serverNowMs, syncServerTime } from './clock';
import { useGameStore } from './game-store';
import { detectLocale } from './i18n/texts';
import { ApiError, getDay, recoverPlayer, registerPlayer, submitResult } from './lib/api';
import { createResultQueue } from './lib/result-queue';
import {
  clearPendingRecoveryCode,
  loadPendingRecoveryCode,
  loadSession,
  saveSession,
  savePendingRecoveryCode,
} from './lib/session';
import { webStorage } from './lib/storage';
import { uuid } from './lib/uuid';
import { layoutToys } from './scene/toy-layout';

export const TERMS_VERSION = '1';
const LOCALE_KEY = 'patio-locale';
const MAX_DURATION_MS = 86_400_000;

const store = useGameStore;
const set = store.setState;

const resultQueue = createResultQueue({
  submit: (request) => {
    const token = store.getState().session?.token;
    return token === undefined ? Promise.reject(new ApiError(401, 'INVALID_TOKEN')) : submitResult(token, request);
  },
  // El servidor manda el puntaje actual: se reemplaza, no se suma.
  onSuccess: (request, response) =>
    set((s) => ({ score: response.score, earned: { ...s.earned, [request.challengeId]: response.pointsEarned } })),
  onUnauthorized: () => {
    if (store.getState().screen === 'challenge') set({ needsRecovery: true });
    else goRecover();
  },
});

function goRecover() {
  set({ screen: 'recover', isRecoverForced: true, needsRecovery: false });
}

export async function boot(): Promise<void> {
  const savedLocale = await webStorage.get(LOCALE_KEY);
  store.getState().changeLocale(savedLocale === 'en' || savedLocale === 'es-UY' ? savedLocale : detectLocale());
  const session = await loadSession();
  if (!session) return void set({ screen: 'welcome' });
  set({ session, recoveryCode: await loadPendingRecoveryCode() });
  // Si cerro la app antes de anotar el codigo, se lo mostramos otra vez.
  if (store.getState().recoveryCode !== null) return void set({ screen: 'recoveryCode' });
  await enterDay();
  void resultQueue.load();
}

export async function changeLocale(locale: 'es-UY' | 'en'): Promise<void> {
  store.getState().changeLocale(locale);
  await webStorage.set(LOCALE_KEY, locale);
}

function targetScreen(day: DayResponse, completed: readonly string[]) {
  if (day.status === 'noSet' || day.items.length === 0) return 'noSet' as const;
  return day.items.every((i) => completed.includes(i.challengeId)) ? ('closing' as const) : ('yard' as const);
}

function applyDay(day: DayResponse, isRefresh: boolean) {
  syncServerTime(day.serverTime);
  const { session, day: previous, completed: local } = store.getState();
  const isSameDay = previous?.date === day.date && previous.status === day.status;
  // Los logros todavia en cola cuentan como logrados aunque el servidor no los haya recibido.
  const completed = [...new Set([...day.completedChallengeIds, ...(isSameDay ? local : [])])];
  set({
    day,
    completed,
    score: day.score,
    toys: session ? layoutToys(session.playerId, day.date, day.items.length) : [],
    ...(isRefresh && isSameDay ? {} : { screen: targetScreen(day, completed), activeIndex: null }),
  });
}

export async function enterDay(): Promise<void> {
  const token = store.getState().session?.token;
  if (token === undefined) return void set({ screen: 'welcome' });
  try {
    applyDay(await getDay(token), false);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) goRecover();
    else set({ screen: 'retry' });
  }
}

/** Al volver de segundo plano o al pasar la medianoche. Sin avisos si falla. */
export async function refreshDay(): Promise<void> {
  const { session, screen } = store.getState();
  if (!session || (screen !== 'yard' && screen !== 'noSet' && screen !== 'closing')) return;
  try {
    applyDay(await getDay(session.token), true);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) goRecover();
  }
  void resultQueue.flush();
}

export async function register(nickname: string, groupCode: string): Promise<void> {
  const response = await registerPlayer({
    nickname: nickname.trim(),
    termsVersion: TERMS_VERSION,
    ...(groupCode === '' ? {} : { groupCode }),
  });
  const session = { playerId: response.playerId, token: response.token, nickname: nickname.trim() };
  await savePendingRecoveryCode(response.recoveryCode);
  await saveSession(session);
  set({ session, recoveryCode: response.recoveryCode, screen: 'recoveryCode' });
}

export async function confirmRecoveryCode(): Promise<void> {
  await clearPendingRecoveryCode();
  set({ recoveryCode: null });
  await enterDay();
}

export async function recover(recoveryCode: string): Promise<void> {
  const response = await recoverPlayer({ recoveryCode });
  const session = { playerId: response.playerId, token: response.token, nickname: response.nickname };
  await saveSession(session);
  set({ session, isRecoverForced: false, needsRecovery: false });
  await enterDay();
  void resultQueue.load();
}

export function achieve(index: number, openedAtMs: number): void {
  const { day } = store.getState();
  const item = day?.items[index];
  if (!day || !item || store.getState().completed.includes(item.challengeId)) return;
  const durationMs = Math.min(MAX_DURATION_MS, Math.max(0, Math.round(monotonicMs() - openedAtMs)));
  set((s) => ({ completed: [...s.completed, item.challengeId] }));
  void resultQueue.add({ eventId: uuid(), date: day.date, challengeId: item.challengeId, durationMs });
}

export function closeActiveChallenge(): void {
  const { day, completed, needsRecovery } = store.getState();
  if (needsRecovery) return goRecover();
  const isAllDone = day !== null && day.items.length > 0 && day.items.every((i) => completed.includes(i.challengeId));
  set({ screen: isAllDone ? 'closing' : 'yard' });
  // La hora sale del servidor (diferencia medida en GET /day), no del reloj del celular.
  if (day && serverNowMs() >= Date.parse(day.dayEndsAt)) void refreshDay();
}

export function leaveToYard(): void {
  set({ screen: 'yard' });
}

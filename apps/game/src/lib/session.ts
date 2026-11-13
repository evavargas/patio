import { webStorage, type KeyValueStorage } from './storage';

export type Session = { playerId: string; token: string; nickname: string };

const SESSION_KEY = 'patio-session';
const PENDING_CODE_KEY = 'patio-pending-recovery-code';

function isSession(v: unknown): v is Session {
  return (
    typeof v === 'object' &&
    v !== null &&
    'playerId' in v && typeof v.playerId === 'string' &&
    'token' in v && typeof v.token === 'string' &&
    'nickname' in v && typeof v.nickname === 'string'
  );
}

export async function loadSession(store: KeyValueStorage = webStorage): Promise<Session | null> {
  const raw = await store.get(SESSION_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const saveSession = (session: Session, store: KeyValueStorage = webStorage) => store.set(SESSION_KEY, JSON.stringify(session));
export const clearSession = (store: KeyValueStorage = webStorage) => store.remove(SESSION_KEY);

// El codigo de recuperacion se guarda SOLO hasta que la persona confirma que lo anoto; despues se borra.
export const savePendingRecoveryCode = (code: string, store: KeyValueStorage = webStorage) => store.set(PENDING_CODE_KEY, code);
export const loadPendingRecoveryCode = (store: KeyValueStorage = webStorage) => store.get(PENDING_CODE_KEY);
export const clearPendingRecoveryCode = (store: KeyValueStorage = webStorage) => store.remove(PENDING_CODE_KEY);

import type {
  BannedWordsResponse,
  DayResponse,
  ErrorBody,
  RecoverPlayerRequest,
  RecoverPlayerResponse,
  RegisterPlayerRequest,
  RegisterPlayerResponse,
  SubmitResultRequest,
  SubmitResultResponse,
} from '@patio/contracts';

// Solo tipos del contrato: los validadores de @patio/contracts usan ajv (eval) y no entran al juego.
// Los clientes toleran campos nuevos, asi que la respuesta no se revalida.
const BASE_URL: string = import.meta.env.VITE_API_URL ?? '';
const TIMEOUT_MS = 15_000;

/** `status` 0 = sin red o sin respuesta. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorBody['code'] | null;
  constructor(status: number, code: ErrorBody['code'] | null) {
    super(code ?? `HTTP ${status}`);
    this.status = status;
    this.code = code;
  }
}

type Options = { method?: 'GET' | 'POST'; token?: string; body?: unknown };

export type Fetcher = typeof fetch;

export async function request<T>(path: string, { method = 'GET', token, body }: Options = {}, fetcher: Fetcher = fetch): Promise<T> {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetcher(`${BASE_URL}/v1${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, null);
  }
  const data = await res.json().catch(() => null); // any: la forma la fija el contrato
  if (!res.ok) {
    throw new ApiError(res.status, toErrorCode(data?.code));
  }
  return data;
}

function toErrorCode(code: unknown): ErrorBody['code'] | null {
  return KNOWN_CODES.find((c) => c === code) ?? null;
}

// Los codigos que el juego sabe explicar; cualquier otro cae en el mensaje generico.
const KNOWN_CODES: ReadonlyArray<ErrorBody['code']> = [
  'NICKNAME_NOT_ALLOWED',
  'GROUP_NOT_FOUND',
  'GROUP_INACTIVE',
  'GROUP_FULL',
  'RECOVERY_CODE_INVALID',
  'INVALID_TOKEN',
  'RATE_LIMITED',
  'VALIDATION_FAILED',
];

export const getBannedWords = () => request<BannedWordsResponse>('/banned-words');
export const registerPlayer = (body: RegisterPlayerRequest) => request<RegisterPlayerResponse>('/players', { method: 'POST', body });
export const recoverPlayer = (body: RecoverPlayerRequest) => request<RecoverPlayerResponse>('/players/recover', { method: 'POST', body });
export const getDay = (token: string) => request<DayResponse>('/day', { token });
export const submitResult = (token: string, body: SubmitResultRequest) =>
  request<SubmitResultResponse>('/results', { method: 'POST', token, body });

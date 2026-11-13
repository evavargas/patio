import type { ErrorBody } from "@patio/contracts";
import { useSession } from "../auth/session-store";

const BASE = `${import.meta.env["VITE_API_URL"] ?? ""}/v1/panel`;

/** `code` es un codigo de dominio de contracts (ErrorCode) o NETWORK_ERROR / UNKNOWN. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function isErrorBody(v: unknown): v is Pick<ErrorBody, "code"> {
  return typeof v === "object" && v !== null && "code" in v && typeof v.code === "string";
}

async function send(method: string, path: string, body: unknown, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token !== null) headers["Authorization"] = `Bearer ${token}`;
  try {
    return await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR");
  }
}

async function toError(res: Response): Promise<ApiError> {
  const json: unknown = await res.json().catch(() => null);
  return new ApiError(res.status, isErrorBody(json) ? json.code : "UNKNOWN");
}

let inflight: Promise<void> | null = null;

/** Renovacion unica: las llamadas simultaneas con 401 esperan la misma promesa. */
export function refreshOnce(): Promise<void> {
  inflight ??= doRefresh().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doRefresh(): Promise<void> {
  const { refreshToken, setSession, clear } = useSession.getState();
  if (refreshToken === null) {
    clear();
    throw new ApiError(401, "INVALID_REFRESH_TOKEN");
  }
  const res = await send("POST", "/auth/refresh", { refreshToken }, null);
  if (!res.ok) {
    clear();
    throw await toError(res);
  }
  setSession(await res.json());
}

interface Options {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function call(path: string, { method = "POST", body, auth = false }: Options): Promise<Response> {
  let res = await send(method, path, body, auth ? useSession.getState().accessToken : null);
  // Solo INVALID_TOKEN pide renovar: un 401 INVALID_CREDENTIALS (contrasena actual mala) no es un token vencido.
  if (auth && res.status === 401) {
    const error = await toError(res);
    if (error.code !== "INVALID_TOKEN") throw error;
    await refreshOnce();
    res = await send(method, path, body, useSession.getState().accessToken);
    if (res.status === 401) useSession.getState().clear();
  }
  if (!res.ok) throw await toError(res);
  return res;
}

export async function requestJson<T>(path: string, options: Options = {}): Promise<T> {
  return (await call(path, options)).json();
}

export async function requestVoid(path: string, options: Options = {}): Promise<void> {
  await call(path, options);
}

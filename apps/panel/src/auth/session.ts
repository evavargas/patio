import { logout as apiLogout, login as apiLogin } from "../api/panel-api";
import { queryClient } from "../api/query-client";
import { refreshOnce } from "../api/http";
import { useSession } from "./session-store";

export async function login(email: string, password: string): Promise<void> {
  useSession.getState().setSession(await apiLogin({ email, password }));
}

/** Al abrir la app: si hay un refresh guardado, lo canjea una sola vez. */
export async function restoreSession(): Promise<void> {
  if (useSession.getState().refreshToken === null) return;
  try {
    await refreshOnce();
  } catch {
    useSession.getState().clear();
  }
}

export async function logout(): Promise<void> {
  const { refreshToken, clear } = useSession.getState();
  clear();
  queryClient.clear();
  if (refreshToken !== null) {
    // Revoca la familia en el servidor; si falla la red, el token vence solo (7 dias).
    await apiLogout({ refreshToken }).catch(() => undefined);
  }
}

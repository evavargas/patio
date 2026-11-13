import type { PanelAccount, PanelSession } from "@patio/contracts";
import { create } from "zustand";

// Decision: el refresh token vive en sessionStorage (sobrevive a recargas, muere al cerrar la pestana y no viaja
// solo como una cookie). El access token (15 min) solo esta en memoria. La CSP estricta es la defensa contra XSS.
const REFRESH_KEY = "patio-panel-refresh";

function readRefresh(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeRefresh(token: string | null): void {
  try {
    if (token === null) sessionStorage.removeItem(REFRESH_KEY);
    else sessionStorage.setItem(REFRESH_KEY, token);
  } catch {
    // sin almacenamiento: la sesion no sobrevive a una recarga
  }
}

interface SessionState {
  status: "loading" | "anonymous" | "authenticated";
  account: PanelAccount | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: PanelSession) => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => {
  const refreshToken = readRefresh();
  return {
    status: refreshToken === null ? "anonymous" : "loading",
    account: null,
    accessToken: null,
    refreshToken,
    setSession: (s) => {
      writeRefresh(s.refreshToken);
      set({ status: "authenticated", account: s.account, accessToken: s.accessToken, refreshToken: s.refreshToken });
    },
    clear: () => {
      writeRefresh(null);
      set({ status: "anonymous", account: null, accessToken: null, refreshToken: null });
    },
  };
});

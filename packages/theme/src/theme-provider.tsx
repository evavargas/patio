import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_THEME_ID, THEMES } from "./generated/themes.ts";

export type ThemeMode = "light" | "dark" | "system";

// Las mismas claves las lee public/theme-init.js (archivo externo, sin parpadeo).
const MODE_KEY = "patio-theme-mode";
const THEME_KEY = "patio-theme-id";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // almacenamiento bloqueado: la preferencia vale solo para esta sesion
  }
}

interface ThemeContextValue {
  themeId: string;
  mode: ThemeMode;
  effectiveMode: "light" | "dark";
  setThemeId: (id: string) => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(() => {
    const stored = read(THEME_KEY);
    return THEMES.some((t) => t.id === stored) && stored !== null ? stored : DEFAULT_THEME_ID;
  });
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = read(MODE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const effectiveMode = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset["theme"] = themeId;
    root.dataset["mode"] = effectiveMode;
    root.style.colorScheme = effectiveMode;
  }, [themeId, effectiveMode]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    write(THEME_KEY, id);
  }, []);
  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    write(MODE_KEY, m);
  }, []);

  const value = useMemo(
    () => ({ themeId, mode, effectiveMode, setThemeId, setMode }),
    [themeId, mode, effectiveMode, setThemeId, setMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme requiere ThemeProvider");
  return ctx;
}

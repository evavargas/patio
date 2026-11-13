import type { DayResponse } from '@patio/contracts';
import { create } from 'zustand';
import { setLocale, type Locale } from './i18n/texts';
import type { Session } from './lib/session';
import type { PerfResult } from './perf/perf-recorder';
import type { ToyPlacement } from './scene/toy-layout';

export type Screen =
  | 'boot'
  | 'retry'
  | 'welcome'
  | 'register'
  | 'recoveryCode'
  | 'recover'
  | 'yard'
  | 'challenge'
  | 'noSet'
  | 'closing';

type GameState = {
  screen: Screen;
  locale: Locale;
  session: Session | null;
  /** Se muestra una sola vez; se borra al confirmar. */
  recoveryCode: string | null;
  isRecoverForced: boolean; // el token dejo de servir: mostrar el mensaje de "volve a entrar"
  needsRecovery: boolean; // 401 con un desafio abierto: se atiende al cerrarlo
  day: DayResponse | null;
  toys: ToyPlacement[];
  completed: string[];
  score: number;
  earned: Record<string, number>;
  activeIndex: number | null;
  perfResult: PerfResult | null;
  openToy: (index: number) => void;
  openChallenge: () => void;
  closeChallenge: () => void;
  changeLocale: (locale: Locale) => void;
  setPerfResult: (result: PerfResult) => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'boot',
  locale: 'es-UY',
  session: null,
  recoveryCode: null,
  isRecoverForced: false,
  needsRecovery: false,
  day: null,
  toys: [],
  completed: [],
  score: 0,
  earned: {},
  activeIndex: null,
  perfResult: null,
  openToy: (index) => {
    const { day, completed, screen } = get();
    const item = day?.items[index];
    if (!item || screen !== 'yard' || completed.includes(item.challengeId)) return;
    set({ activeIndex: index, screen: 'challenge' });
  },
  // Compatibilidad con la prueba de rendimiento: solo pausa y reanuda el bucle de R3F.
  openChallenge: () => set({ screen: 'challenge', activeIndex: 0 }),
  closeChallenge: () => set({ screen: 'yard' }),
  changeLocale: (locale) => {
    setLocale(locale);
    set({ locale });
  },
  setPerfResult: (perfResult) => set({ perfResult }),
}));

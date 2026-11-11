import { create } from 'zustand';
import type { PerfResult } from './perf/perf-recorder';

type GameState = {
  screen: 'yard' | 'challenge';
  perfResult: PerfResult | null;
  openChallenge: () => void;
  closeChallenge: () => void;
  setPerfResult: (result: PerfResult) => void;
};

export const useGameStore = create<GameState>((set) => ({
  screen: 'yard',
  perfResult: null,
  openChallenge: () => set({ screen: 'challenge' }),
  closeChallenge: () => set({ screen: 'yard' }),
  setPerfResult: (perfResult) => set({ perfResult }),
}));

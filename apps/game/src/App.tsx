import { useEffect } from 'react';
import { DragChallenge } from './challenge/DragChallenge';
import { useGameStore } from './game-store';
import { attachKeyboard } from './input/input-state';
import { isPerfMode } from './perf/perf-recorder';
import { PerfPanel } from './perf/PerfPanel';
import { Scene } from './scene/Scene';
import { Hud } from './ui/Hud';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const hasResult = useGameStore((s) => s.perfResult !== null);
  useEffect(attachKeyboard, []);
  return (
    <>
      <div className="scene">
        <Scene />
      </div>
      {screen === 'yard' && !hasResult && <Hud />}
      {screen === 'challenge' && <DragChallenge />}
      {isPerfMode && <PerfPanel />}
    </>
  );
}

import { inputState, scriptVector } from '../input/input-state';
import { isScriptRunning } from './perf-recorder';

// Circuito caminando por el borde del patio; cruza el escalon en z=8.
const WAYPOINTS: ReadonlyArray<readonly [number, number]> = [
  [8, 8],
  [8, -8],
  [-8, -8],
  [-8, 8],
];
const JUMP_EVERY_STEPS = 180; // 3 s a 60 pasos por segundo
let target = 0;
let steps = 0;

/** Se llama en cada paso de fisica, antes de resolver la entrada. Solo escribe en referencias. */
export function stepPerfScript(x: number, z: number) {
  scriptVector.active = isScriptRunning();
  if (!scriptVector.active) return;
  const wp = WAYPOINTS[target % WAYPOINTS.length];
  if (!wp) return;
  const dx = wp[0] - x;
  const dz = wp[1] - z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.8) target++;
  scriptVector.x = dx / (dist || 1);
  scriptVector.z = dz / (dist || 1);
  if (++steps % JUMP_EVERY_STEPS === 0) inputState.jumpRequested = true;
}

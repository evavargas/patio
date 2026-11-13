import { OBSTACLES, SIZE, TREES } from './layout-data';
import { PALETTE } from './palette';

export type ToyPlacement = { position: readonly [number, number, number]; variant: number };

const GRID_STEP = 2;
const EDGE_MARGIN = 4; // lejos de los arboles y vallas
const CLEARANCE = 2; // distancia a obstaculos, arboles y punto de salida
const MIN_TOY_DISTANCE = 5;

/** Hash de texto a entero de 32 bits (FNV-1a). */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** PRNG con semilla (mulberry32): mismo resultado en cada dispositivo. */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

// Puntos validos precalculados: grilla dentro del patio, fuera de obstaculos, arboles y punto de salida.
const VALID_POINTS: ReadonlyArray<readonly [number, number]> = (() => {
  const points: Array<readonly [number, number]> = [];
  const limit = SIZE - EDGE_MARGIN;
  for (let x = -limit; x <= limit; x += GRID_STEP) {
    for (let z = -limit; z <= limit; z += GRID_STEP) {
      const isFree =
        Math.hypot(x, z) > CLEARANCE * 2 &&
        OBSTACLES.every((o) => Math.abs(x - o.pos[0]) > o.size[0] / 2 + CLEARANCE || Math.abs(z - o.pos[2]) > o.size[2] / 2 + CLEARANCE) &&
        TREES.every((tree) => Math.hypot(x - tree[0], z - tree[2]) > CLEARANCE + 1.5);
      if (isFree) points.push([x, z]);
    }
  }
  return points;
})();

/** El juguete n del desafio n. Semilla hash(playerId + fecha): igual para el mismo jugador y dia. */
export function layoutToys(playerId: string, date: string, count: number): ToyPlacement[] {
  const random = createRandom(hashString(playerId + date));
  const shuffled = [...VALID_POINTS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = shuffled[i];
    const b = shuffled[j];
    if (a && b) [shuffled[i], shuffled[j]] = [b, a];
  }
  const chosen: Array<readonly [number, number]> = [];
  // Distancia minima; si no alcanzan los puntos, se relaja de a poco en vez de fallar.
  for (let minDistance = MIN_TOY_DISTANCE; chosen.length < count && minDistance >= 0; minDistance -= 1) {
    for (const p of shuffled) {
      if (chosen.length >= count) break;
      if (chosen.includes(p)) continue;
      if (chosen.every((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) >= minDistance)) chosen.push(p);
    }
  }
  return chosen.map(([x, z]) => ({
    position: [x, 0.6, z] as const,
    variant: Math.floor(random() * PALETTE.toys.length),
  }));
}

export type FrameStats = {
  frames: number;
  avgFps: number;
  avgFrameMs: number;
  p99FrameMs: number;
  maxFrameMs: number;
  /** fps equivalentes al promedio del 1 % de cuadros mas lentos. */
  worst1PercentFps: number;
};

export function computeFrameStats(frameMs: readonly number[]): FrameStats | null {
  const n = frameMs.length;
  if (n === 0) return null;
  const sorted = [...frameMs].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  const worstCount = Math.max(1, Math.ceil(n * 0.01));
  const worst = sorted.slice(n - worstCount);
  const worstMean = worst.reduce((s, v) => s + v, 0) / worstCount;
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    frames: n,
    avgFps: r((n * 1000) / total),
    avgFrameMs: r(total / n),
    p99FrameMs: r(sorted[Math.min(n - 1, Math.floor(n * 0.99))] ?? 0),
    maxFrameMs: r(sorted[n - 1] ?? 0),
    worst1PercentFps: r(1000 / worstMean),
  };
}

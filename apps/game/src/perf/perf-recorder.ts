import { monotonicMs, nowIso } from '../clock';
import { useGameStore } from '../game-store';
import { computeFrameStats, type FrameStats } from './frame-stats';

export type PerfResult = {
  startedAt: string;
  device: {
    label: string;
    userAgent: string;
    gpu: string;
    screen: string;
    devicePixelRatio: number;
    renderDpr: number;
    hardwareConcurrency: number;
    deviceMemoryGb: number | null;
  };
  config: { durationS: number; sceneS: number; challengeS: number; frameloopPausedInChallenge: boolean };
  timeToPlayableMs: number;
  scene: FrameStats | null;
  challengePaused: FrameStats | null;
  rendered: { sceneFrames: number; challengeFrames: number };
  gpu: { maxDrawCalls: number; maxTriangles: number; geometries: number; textures: number };
  jsHeapMb: { start: number | null; peak: number | null };
  note: string;
};

type Phase = 'idle' | 'scene' | 'challenge' | 'done';

const params = new URLSearchParams(window.location.search);
export const isPerfMode = params.get('perf') === '1';
export const renderDpr = Math.min(Number(params.get('dpr')) || window.devicePixelRatio, 2);
const durationS = Number(params.get('duration')) || 60;
const sceneS = Math.round(durationS * 0.75);

export const perfState: { phase: Phase; startMs: number } = { phase: 'idle', startMs: 0 };

const sceneFrames: number[] = [];
const challengeFrames: number[] = [];
const rendered = { sceneFrames: 0, challengeFrames: 0 };
const gpuMax = { drawCalls: 0, triangles: 0, geometries: 0, textures: 0 };
let timeToPlayableMs = 0;
let gpuName = 'unknown';
let heapStart: number | null = null;
let heapPeak: number | null = null;
let lastRaf = 0;

// performance.memory solo existe en Chromium
function heapMb(): number | null {
  const m: unknown = 'memory' in performance ? performance.memory : null;
  if (typeof m !== 'object' || m === null || !('usedJSHeapSize' in m) || typeof m.usedJSHeapSize !== 'number') return null;
  return Math.round((m.usedJSHeapSize / 1048576) * 10) / 10;
}

export function isScriptRunning(): boolean {
  return perfState.phase === 'scene';
}

/** Llamado una vez, desde la escena, cuando ya se puede jugar. */
export function markPlayable(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  if (perfState.phase !== 'idle' || timeToPlayableMs) return;
  timeToPlayableMs = Math.round(monotonicMs());
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (ext) gpuName = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
  if (isPerfMode) {
    perfState.phase = 'scene';
    perfState.startMs = monotonicMs();
    heapStart = heapPeak = heapMb();
    requestAnimationFrame(tick);
  }
}

/** Llamado desde useFrame de R3F: solo escribe en variables de modulo, sin tocar React. */
export function onRenderedFrame(info: { calls: number; triangles: number; geometries: number; textures: number }) {
  if (perfState.phase === 'scene') {
    rendered.sceneFrames++;
    gpuMax.drawCalls = Math.max(gpuMax.drawCalls, info.calls);
    gpuMax.triangles = Math.max(gpuMax.triangles, info.triangles);
    gpuMax.geometries = info.geometries;
    gpuMax.textures = info.textures;
  } else if (perfState.phase === 'challenge') rendered.challengeFrames++;
}

function tick(now: number) {
  if (perfState.phase === 'done') return;
  if (lastRaf) {
    const dt = now - lastRaf;
    (perfState.phase === 'scene' ? sceneFrames : challengeFrames).push(dt);
  }
  lastRaf = now;
  const h = heapMb();
  if (h !== null) heapPeak = Math.max(heapPeak ?? 0, h);
  const elapsedS = (monotonicMs() - perfState.startMs) / 1000;
  if (perfState.phase === 'scene' && elapsedS >= sceneS) {
    perfState.phase = 'challenge';
    lastRaf = 0;
    useGameStore.getState().openChallenge(); // pausa el frameloop de R3F
  } else if (perfState.phase === 'challenge' && elapsedS >= durationS) {
    perfState.phase = 'done';
    useGameStore.getState().closeChallenge();
    const result = buildResult();
    Object.assign(window, { __perfResult: result });
    useGameStore.getState().setPerfResult(result);
    return;
  }
  requestAnimationFrame(tick);
}

export function perfElapsedS(): number {
  return perfState.phase === 'idle' ? 0 : Math.min(durationS, Math.round((monotonicMs() - perfState.startMs) / 1000));
}
export const perfTotalS = durationS;

function buildResult(): PerfResult {
  return {
    startedAt: nowIso(),
    device: {
      label: params.get('device') ?? 'unspecified',
      userAgent: navigator.userAgent,
      gpu: gpuName,
      screen: `${screen.width}x${screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      renderDpr,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGb: 'deviceMemory' in navigator && typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null,
    },
    config: { durationS, sceneS, challengeS: durationS - sceneS, frameloopPausedInChallenge: true },
    timeToPlayableMs,
    scene: computeFrameStats(sceneFrames),
    challengePaused: computeFrameStats(challengeFrames),
    rendered: { ...rendered },
    gpu: { maxDrawCalls: gpuMax.drawCalls, maxTriangles: gpuMax.triangles, geometries: gpuMax.geometries, textures: gpuMax.textures },
    jsHeapMb: { start: heapStart, peak: heapPeak },
    note: 'Valores validos solo para el dispositivo indicado. jsHeapMb solo existe en Chromium. rAF se limita al refresco de pantalla.',
  };
}

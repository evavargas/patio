import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { onRenderedFrame, renderDpr } from '../perf/perf-recorder';
import { t } from '../i18n/texts';
import { useGameStore } from '../game-store';
import { Mover } from './Mover';
import { PALETTE } from './palette';
import { Player } from './Player';
import { World } from './World';

// Lee info de render del cuadro anterior; solo escribe en variables de modulo.
function FrameProbe() {
  useFrame(({ gl }) => {
    const { render, memory } = gl.info;
    onRenderedFrame({ calls: render.calls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures });
  });
  return null;
}

export function Scene() {
  const isPaused = useGameStore((s) => s.screen === 'challenge');
  return (
    <Canvas
      role="img"
      aria-label={t('sceneLabel')}
      frameloop={isPaused ? 'never' : 'always'}
      dpr={renderDpr}
      shadows
      camera={{ position: [0, 7, 9], fov: 55 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[PALETTE.sky]} />
      <fog attach="fog" args={[PALETTE.fog, 25, 60]} />
      <hemisphereLight args={['#ffe0c0', '#556b2f', 1.1]} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-far={60}
      />
      <Physics gravity={[0, 0, 0]} timeStep={1 / 60} interpolate>
        <World />
        <Player />
      </Physics>
      <Mover />
      <FrameProbe />
    </Canvas>
  );
}

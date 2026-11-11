import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { PALETTE } from './palette';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Mover() {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (reducedMotion || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.set(Math.cos(t * 0.6) * 5, 0.8 + Math.sin(t * 3) * 0.2, -6 + Math.sin(t * 0.6) * 3);
    group.current.rotation.y = t;
  });
  return (
    <group ref={group} position={[5, 0.8, -6]}>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color={PALETTE.mover} />
      </mesh>
    </group>
  );
}

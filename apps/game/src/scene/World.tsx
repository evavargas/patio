import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import { useGameStore } from '../game-store';
import { OBSTACLES, SIZE, TREES } from './layout-data';
import { PALETTE } from './palette';

const dummy = new Object3D();

function place(mesh: InstancedMesh | null, items: ReadonlyArray<readonly [number, number, number]>, scale = 1) {
  if (!mesh) return;
  items.forEach(([x, y, z], i) => {
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

const POSTS: Array<[number, number, number]> = [];
for (let i = -SIZE; i <= SIZE; i += 2) {
  POSTS.push([i, 0.6, -SIZE], [i, 0.6, SIZE], [-SIZE, 0.6, i], [SIZE, 0.6, i]);
}
export function World() {
  const posts = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const toys = useRef<InstancedMesh>(null);
  // Cambia solo cuando llega el dia o se logra un desafio (eventos de la interfaz), nunca desde useFrame.
  const toyPlacements = useGameStore((s) => s.toys);
  const day = useGameStore((s) => s.day);
  const completed = useGameStore((s) => s.completed);
  const toyIsDone = useMemo(() => day?.items.map((i) => completed.includes(i.challengeId)) ?? [], [day, completed]);

  useLayoutEffect(() => {
    place(posts.current, POSTS);
    place(trunks.current, TREES.map(([x, , z]) => [x, 1, z] as const));
    place(crowns.current, TREES.map(([x, , z]) => [x, 3.2, z] as const));
  }, []);

  useLayoutEffect(() => {
    const mesh = toys.current;
    if (!mesh) return;
    // Un juguete logrado queda apagado: gris y mas chico.
    toyPlacements.forEach((toy, i) => {
      const isDone = toyIsDone[i] === true;
      const [x, y, z] = toy.position;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(isDone ? 0.7 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new Color(isDone ? PALETTE.toyOff : (PALETTE.toys[toy.variant] ?? PALETTE.toys[0])));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [toyPlacements, toyIsDone]);

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[SIZE + 2, 0.5, SIZE + 2]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[SIZE + 2, 2, 0.5]} position={[0, 2, -SIZE - 1]} />
        <CuboidCollider args={[SIZE + 2, 2, 0.5]} position={[0, 2, SIZE + 1]} />
        <CuboidCollider args={[0.5, 2, SIZE + 2]} position={[-SIZE - 1, 2, 0]} />
        <CuboidCollider args={[0.5, 2, SIZE + 2]} position={[SIZE + 1, 2, 0]} />
        {OBSTACLES.map((o, i) => (
          <CuboidCollider key={i} args={[o.size[0] / 2, o.size[1] / 2, o.size[2] / 2]} position={o.pos} />
        ))}
      </RigidBody>

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[(SIZE + 2) * 2, (SIZE + 2) * 2]} />
        <meshStandardMaterial color={PALETTE.ground} />
      </mesh>
      {OBSTACLES.map((o, i) => (
        <mesh key={i} position={o.pos} castShadow receiveShadow>
          <boxGeometry args={o.size} />
          <meshStandardMaterial color={i === 3 ? PALETTE.step : PALETTE.obstacle} />
        </mesh>
      ))}

      <instancedMesh ref={posts} args={[undefined, undefined, POSTS.length]}>
        <boxGeometry args={[0.2, 1.2, 0.2]} />
        <meshStandardMaterial color={PALETTE.post} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREES.length]}>
        <cylinderGeometry args={[0.25, 0.35, 2, 8]} />
        <meshStandardMaterial color={PALETTE.trunk} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, TREES.length]}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color={PALETTE.crown} />
      </instancedMesh>
      {toyPlacements.length > 0 && (
        <instancedMesh
          key={toyPlacements.length}
          ref={toys}
          args={[undefined, undefined, toyPlacements.length]}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            if (e.instanceId !== undefined) useGameStore.getState().openToy(e.instanceId);
          }}
        >
          <octahedronGeometry args={[0.6]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}

import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useLayoutEffect, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import { PALETTE } from './palette';

const SIZE = 16; // medio lado del patio
const OBSTACLES: ReadonlyArray<{ pos: [number, number, number]; size: [number, number, number] }> = [
  { pos: [6, 0.75, -3], size: [2, 1.5, 2] },
  { pos: [-5, 0.75, 3], size: [2, 1.5, 2] },
  { pos: [0, 0.5, -11], size: [5, 1, 1] },
  { pos: [3, 0.15, 8], size: [3, 0.3, 3] }, // escalon sobre el circuito
];
export const TOY_POSITIONS: ReadonlyArray<readonly [number, number, number]> = [
  [4, 0.6, 2],
  [-3, 0.6, -6],
  [-10, 0.6, -2],
  [1, 0.6, 12],
];

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
const TREES: Array<[number, number, number]> = [
  [-13, 0, -13], [13, 0, -13], [-13, 0, 13], [13, 0, 13], [-13, 0, 0], [13, 0, 0], [0, 0, 14], [10, 0, -9],
];

export function World() {
  const posts = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const toys = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    place(posts.current, POSTS);
    place(trunks.current, TREES.map(([x, , z]) => [x, 1, z] as const));
    place(crowns.current, TREES.map(([x, , z]) => [x, 3.2, z] as const));
    place(toys.current, TOY_POSITIONS);
    TOY_POSITIONS.forEach((_, i) => toys.current?.setColorAt(i, new Color(PALETTE.toys[i % PALETTE.toys.length])));
    if (toys.current?.instanceColor) toys.current.instanceColor.needsUpdate = true;
  }, []);

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
      <instancedMesh ref={toys} args={[undefined, undefined, TOY_POSITIONS.length]}>
        <octahedronGeometry args={[0.6]} />
        <meshStandardMaterial />
      </instancedMesh>
    </>
  );
}

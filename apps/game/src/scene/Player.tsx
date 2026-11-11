import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import { Vector3, type Mesh } from 'three';
import { inputState, playerPosition, resolveInput } from '../input/input-state';
import { markPlayable } from '../perf/perf-recorder';
import { stepPerfScript } from '../perf/perf-script';
import { PALETTE } from './palette';

type Controller = ReturnType<ReturnType<typeof useRapier>['world']['createCharacterController']>;

const STEP = 1 / 60;
const SPEED = 5;
const JUMP_SPEED = 7;
const GRAVITY = 20;
const HALF = 0.5;
const RADIUS = 0.35;
const CAMERA_OFFSET = new Vector3(0, 7, 9);

const tmp = new Vector3();

export function Player() {
  const { world } = useRapier();
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Mesh>(null);
  const controller = useRef<Controller | null>(null);
  const vy = useRef(0);
  const grounded = useRef(false);
  const pos = useRef({ x: 0, y: 1, z: 0 });
  const frames = useRef(0);

  useEffect(() => {
    const c = world.createCharacterController(0.02);
    c.setUp({ x: 0, y: 1, z: 0 });
    c.enableAutostep(0.4, 0.2, false);
    c.enableSnapToGround(0.3);
    controller.current = c;
    return () => {
      controller.current = null;
      world.removeCharacterController(c);
    };
  }, [world]);

  useBeforePhysicsStep(() => {
    const c = controller.current;
    const b = body.current;
    const collider = b?.collider(0);
    if (!c || !b || !collider) return;
    stepPerfScript(pos.current.x, pos.current.z);
    resolveInput();
    if (grounded.current && vy.current < 0) vy.current = 0;
    if (inputState.jumpRequested && grounded.current) vy.current = JUMP_SPEED;
    inputState.jumpRequested = false;
    vy.current -= GRAVITY * STEP;
    c.computeColliderMovement(collider, {
      x: inputState.moveX * SPEED * STEP,
      y: vy.current * STEP,
      z: inputState.moveZ * SPEED * STEP,
    });
    const m = c.computedMovement();
    grounded.current = c.computedGrounded();
    pos.current = { x: pos.current.x + m.x, y: pos.current.y + m.y, z: pos.current.z + m.z };
    b.setNextKinematicTranslation(pos.current);
  });

  useFrame((state, delta) => {
    const v = visual.current;
    if (!v) return;
    v.getWorldPosition(tmp);
    playerPosition.x = tmp.x;
    playerPosition.y = tmp.y;
    playerPosition.z = tmp.z;
    if (inputState.moveX || inputState.moveZ) v.rotation.y = Math.atan2(inputState.moveX, inputState.moveZ);
    const k = 1 - Math.exp(-6 * delta);
    state.camera.position.lerp(tmp.clone().add(CAMERA_OFFSET), k);
    state.camera.lookAt(tmp.x, tmp.y, tmp.z);
    if (++frames.current === 3 && controller.current) markPlayable(state.gl.getContext());
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, 1, 0]}>
      <CapsuleCollider args={[HALF - RADIUS, RADIUS]} />
      <mesh ref={visual} castShadow>
        <capsuleGeometry args={[RADIUS, 2 * (HALF - RADIUS), 6, 12]} />
        <meshStandardMaterial color={PALETTE.player} />
        <mesh position={[0, 0.45, 0.1]} castShadow>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshStandardMaterial color={PALETTE.playerHead} />
        </mesh>
      </mesh>
    </RigidBody>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { Euler, MathUtils, Quaternion } from 'three';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { HIGHWAY_CONFIG, LANES, laneX } from '../systems/highwayConfig';
import { audioSystem } from '../systems/soundSystem';

function parseCollision(payload) {
  const other = payload?.other;
  const collider = other?.colliderObject;
  const rigidBody = other?.rigidBodyObject;
  const userData = collider?.userData ?? rigidBody?.userData ?? {};
  return {
    type: userData.type || userData.name || collider?.name || rigidBody?.name || '',
    name: userData.name || collider?.name || rigidBody?.name || '',
    checkpointId: userData.checkpointId,
  };
}

function BikeVisual() {
  const { scene } = useGLTF('/models/player-bike.glb');
  const bikeScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    bikeScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
      }
    });
  }, [bikeScene]);

  return (
    <group position={[0, -0.2, -0.02]} rotation={[0, 0, 0]} scale={0.12}>
      <primitive object={bikeScene} />
    </group>
  );
}

export function Player({ debug = false }) {
  const bodyRef = useRef(null);
  const trailRef = useRef(null);
  const speedInputRef = useRef({ up: false, down: false });
  const tiltEuler = useMemo(() => new Euler(), []);
  const tiltQuat = useMemo(() => new Quaternion(), []);
  const raceStatus = useGameStore((state) => state.raceStatus);
  const knockbackRef = useRef(0);

  useEffect(() => {
    const onKeyDown = (event) => {
      const state = useGameStore.getState();
      if (state.raceStatus !== 'running') {
        return;
      }

      if (event.key === 'ArrowLeft' && !event.repeat) {
        event.preventDefault();
        state.setLaneIndex(Math.max(state.currentLaneIndex - 1, 0));
      }

      if (event.key === 'ArrowRight' && !event.repeat) {
        event.preventDefault();
        state.setLaneIndex(Math.min(state.currentLaneIndex + 1, LANES.length - 1));
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        speedInputRef.current.up = true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        speedInputRef.current.down = true;
      }
    };

    const onKeyUp = (event) => {
      if (event.key === 'ArrowUp') {
        speedInputRef.current.up = false;
      }
      if (event.key === 'ArrowDown') {
        speedInputRef.current.down = false;
      }
    };

    const onWindowBlur = () => {
      speedInputRef.current.up = false;
      speedInputRef.current.down = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    if (raceStatus === 'menu' || raceStatus === 'countdown') {
      speedInputRef.current.up = false;
      speedInputRef.current.down = false;
      body.setTranslation({ x: laneX(1), y: HIGHWAY_CONFIG.startY, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    }
  }, [raceStatus]);

  const onCollisionEnter = (payload) => {
    const info = parseCollision(payload);
    const state = useGameStore.getState();
    if (state.raceStatus !== 'running') {
      return;
    }

    if (debug) {
      console.log('[collision]', info.type || info.name, info.checkpointId ?? '');
    }

    const body = bodyRef.current;
    const position = body?.translation();
    const sparkOrigin = [position?.x ?? 0, (position?.y ?? HIGHWAY_CONFIG.startY) + 0.35, position?.z ?? 0];
    const otherZ = payload?.other?.rigidBody?.translation?.().z
      ?? payload?.other?.rigidBodyObject?.position?.z
      ?? Number.NEGATIVE_INFINITY;
    const playerZ = position?.z ?? 0;
    const isRearTrafficHit = (info.type === 'traffic' || info.name === 'vehicle') && otherZ > playerZ + 0.75;

    if (isRearTrafficHit) {
      return;
    }

    if (info.type === 'traffic' || info.name === 'vehicle' || info.type === 'barrier') {
      const damaged = state.reduceLife();
      if (damaged) {
        state.spawnCrashSparks(sparkOrigin);
        knockbackRef.current = 28;
        audioSystem.playCrash();
      }
      return;
    }

    if (info.type === 'closedGate' || info.name === 'closedGate') {
      state.failCheckpointByCollision(info.checkpointId);
      state.spawnCrashSparks(sparkOrigin);
      audioSystem.playCrash();
    }
  };

  useFrame((_, dt) => {
    let state = useGameStore.getState();
    const body = bodyRef.current;
    if (!body) {
      return;
    }

    const running = state.raceStatus === 'running';
    if (running) {
      let speedDelta = 0;
      if (speedInputRef.current.up) {
        speedDelta += 26 * dt;
      }
      if (speedInputRef.current.down) {
        speedDelta -= 34 * dt;
      }
      if (speedDelta !== 0) {
        state.adjustSpeed(speedDelta);
        state = useGameStore.getState();
      }
    }

    const position = body.translation();
    const targetX = laneX(state.currentLaneIndex);

    const nextX = MathUtils.lerp(position.x, targetX, 0.15);
    let forwardStep = running ? state.currentSpeed * dt * 0.32 : 0;
    if (knockbackRef.current > 0) {
      forwardStep -= knockbackRef.current * dt;
      knockbackRef.current = Math.max(0, knockbackRef.current - dt * 28);
    }
    const nextZ = position.z - forwardStep;

    body.setTranslation({ x: nextX, y: HIGHWAY_CONFIG.startY, z: nextZ }, true);
    body.setLinvel({ x: 0, y: 0, z: running ? -(state.currentSpeed * 0.32) : 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);

    const laneDelta = targetX - position.x;
    const hitTilt = state.isHit ? Math.sin(performance.now() * 0.02) * 0.12 : 0;
    tiltEuler.set(0, 0, -MathUtils.clamp(laneDelta * 0.05, -0.22, 0.22) + hitTilt);
    tiltQuat.setFromEuler(tiltEuler);
    body.setRotation(tiltQuat, true);

    if (running) {
      state.handleCheckpointPass(nextZ);
    }

    state.updatePlayerFrame({
      dt,
      playerWorld: [nextX, HIGHWAY_CONFIG.startY, nextZ],
    });

    if (trailRef.current?.material) {
      const boostVisual = state.currentSpeed > state.baseSpeed + 8;
      trailRef.current.visible = boostVisual;
      trailRef.current.material.opacity = boostVisual ? 0.65 : 0;
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      mass={1}
      friction={1.1}
      restitution={0}
      gravityScale={0}
      ccd
      enabledRotations={[false, false, false]}
      canSleep={false}
      position={[laneX(1), HIGHWAY_CONFIG.startY, 0]}
      name="player"
      userData={{ type: 'player', name: 'player' }}
      onCollisionEnter={onCollisionEnter}
    >
      <group>
        <CuboidCollider args={[0.62, 0.52, 1.26]} position={[0, 0.52, 0]} userData={{ type: 'player', name: 'player' }} />
        <BikeVisual />
        <mesh ref={trailRef} visible={false} position={[0, 0.15, 1.95]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 3.4]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </RigidBody>
  );
}

useGLTF.preload('/models/player-bike.glb');

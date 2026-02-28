import { useEffect, useMemo, useRef } from 'react';
import { MathUtils } from 'three';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useGameStore } from '../store/gameStore';
import { BASE_SPEEDS, LANES } from '../systems/highwayConfig';
import { audioSystem } from '../systems/soundSystem';

const MAX_TRAFFIC = 20;
const BASE_TRAFFIC = 8;
const SPAWN_AHEAD_MIN = 240;
const SPAWN_AHEAD_MAX = 640;
const RECYCLE_BEHIND_DISTANCE = 120;
const REAR_HIT_GUARD_DISTANCE = 1;

const CAR_COLORS = ['#9ca3af', '#64748b', '#f97316', '#84cc16', '#60a5fa'];
const TRUCK_COLORS = ['#475569', '#334155', '#0f172a', '#7c2d12', '#1d4ed8'];

function randomLane() {
  return MathUtils.randInt(0, LANES.length - 1);
}

function randomType() {
  return Math.random() < 0.36 ? 'truck' : 'car';
}

function randomColor(type) {
  const palette = type === 'truck' ? TRUCK_COLORS : CAR_COLORS;
  return palette[MathUtils.randInt(0, palette.length - 1)];
}

function spawnVehicle(playerZ, checkpointIndex, seed) {
  const laneIndex = randomLane();
  const type = seed.type ?? randomType();
  const y = type === 'truck' ? 0.78 : 0.6;
  const checkpointSlot = Math.max(0, Math.min(checkpointIndex, BASE_SPEEDS.length - 1));
  const playerCruise = BASE_SPEEDS[checkpointSlot] * 0.32;
  const minSpeed = Math.max(6, playerCruise - 8);
  const maxSpeed = Math.max(minSpeed + 1.2, playerCruise - 3);
  return {
    id: seed.id,
    type,
    color: seed.color || randomColor(type),
    laneIndex,
    x: LANES[laneIndex],
    y,
    z: playerZ - MathUtils.randFloat(SPAWN_AHEAD_MIN, SPAWN_AHEAD_MAX),
    speed: MathUtils.randFloat(minSpeed, maxSpeed),
  };
}

function TrafficVehicleMesh({ type, color }) {
  if (type === 'truck') {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, 0.6, 0]} frustumCulled={false}>
          <boxGeometry args={[2.05, 1.2, 4.9]} />
          <meshStandardMaterial color={color} roughness={0.74} metalness={0.18} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.25, -1.05]} frustumCulled={false}>
          <boxGeometry args={[1.9, 1.1, 1.8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.48} metalness={0.25} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.52, 0]} frustumCulled={false}>
        <boxGeometry args={[1.85, 1.04, 3.4]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.2} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.02, -0.22]} frustumCulled={false}>
        <boxGeometry args={[1.44, 0.62, 1.52]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.45} metalness={0.28} />
      </mesh>
    </group>
  );
}

export function TrafficSystem({ debug = false }) {
  const bodyRefs = useRef([]);
  const initialVehicles = useMemo(
    () => Array.from({ length: MAX_TRAFFIC }, (_, id) => {
      const type = randomType();
      return spawnVehicle(0, 0, {
        id,
        type,
        color: randomColor(type),
      });
    }),
    [],
  );
  const trafficRef = useRef(initialVehicles.map((vehicle) => ({ ...vehicle })));

  const raceStatus = useGameStore((state) => state.raceStatus);

  useEffect(() => {
    const state = useGameStore.getState();
    const playerZ = state.playerWorld[2];
    trafficRef.current = initialVehicles.map((seed) => spawnVehicle(playerZ, state.currentCheckpoint, seed));
  }, [raceStatus, initialVehicles]);

  useFrame((_, dt) => {
    const state = useGameStore.getState();
    const running = state.raceStatus === 'running';
    const playerZ = state.playerWorld[2];
    const activeCount = Math.min(MAX_TRAFFIC, BASE_TRAFFIC + Math.floor(state.currentCheckpoint / 2));

    for (let i = 0; i < MAX_TRAFFIC; i += 1) {
      const body = bodyRefs.current[i];
      const vehicle = trafficRef.current[i];
      if (!body || !vehicle) {
        continue;
      }

      if (i >= activeCount) {
        body.setNextKinematicTranslation({ x: vehicle.x, y: -40 - i, z: vehicle.z });
        continue;
      }

      if (running) {
        vehicle.z -= vehicle.speed * dt;
        const behindPlayer = vehicle.z > playerZ + REAR_HIT_GUARD_DISTANCE;
        const driftedTooFar = vehicle.z < playerZ - (SPAWN_AHEAD_MAX + RECYCLE_BEHIND_DISTANCE);
        if (behindPlayer || driftedTooFar) {
          const respawned = spawnVehicle(playerZ, state.currentCheckpoint, vehicle);
          vehicle.laneIndex = respawned.laneIndex;
          vehicle.x = respawned.x;
          vehicle.y = respawned.y;
          vehicle.z = respawned.z;
          vehicle.speed = respawned.speed;

          if (debug) {
            console.log('[traffic-recycle]', i, vehicle.type, vehicle.x.toFixed(2), vehicle.z.toFixed(2));
          }
        }
      }

      body.setNextKinematicTranslation({ x: vehicle.x, y: vehicle.y, z: vehicle.z });
    }
  });

  const onTrafficCollisionEnter = (index) => (payload) => {
    const state = useGameStore.getState();
    if (state.raceStatus !== 'running') {
      return;
    }

    const otherData = payload?.other?.colliderObject?.userData ?? payload?.other?.rigidBodyObject?.userData ?? {};
    const otherType = otherData.type || otherData.name || payload?.other?.colliderObject?.name || payload?.other?.rigidBodyObject?.name || '';
    if (otherType !== 'player') {
      return;
    }

    const vehicle = trafficRef.current[index];
    const playerZ = state.playerWorld[2];
    if ((vehicle?.z ?? Number.NEGATIVE_INFINITY) > playerZ + REAR_HIT_GUARD_DISTANCE) {
      return;
    }
    const impact = [state.playerWorld[0], state.playerWorld[1] + 0.35, state.playerWorld[2]];
    if (debug) {
      console.log('[traffic-collision]', index, vehicle?.type ?? 'vehicle');
    }

    const damaged = state.reduceLife();
    if (damaged) {
      state.spawnCrashSparks(impact);
      audioSystem.playCrash();
    }
  };

  return (
    <group>
      {initialVehicles.map((seed, i) => {
        const isTruck = seed.type === 'truck';
        const collider = isTruck
          ? { args: [1.05, 1.05, 2.5], y: 1.05 }
          : { args: [0.95, 0.72, 1.72], y: 0.72 };

        return (
          <RigidBody
            key={`traffic-${seed.id}`}
            ref={(body) => {
              bodyRefs.current[i] = body;
            }}
            type="kinematicPosition"
            colliders={false}
            friction={1}
            restitution={0}
            ccd
            position={[seed.x, seed.y, seed.z]}
            name="vehicle"
            userData={{ type: 'traffic', name: 'vehicle', index: seed.id }}
            onCollisionEnter={onTrafficCollisionEnter(seed.id)}
          >
            <CuboidCollider
              args={collider.args}
              position={[0, collider.y, 0]}
              name="vehicle"
              userData={{ type: 'traffic', name: 'vehicle', index: seed.id }}
            />
            <TrafficVehicleMesh type={seed.type} color={seed.color} />
          </RigidBody>
        );
      })}
    </group>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { MathUtils, Euler, Quaternion } from 'three';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useGameStore } from '../store/gameStore';
import {
  TRACK_CONFIG,
  didCompleteLap,
  getTrackDistance,
  getTrackTransform,
  normalizeProgress,
} from '../systems/lapSystem';
import {
  chooseSafeLane,
  computeAiTargetSpeed,
  smoothLane,
} from '../systems/aiSystem';

export function Competitor({ profile, index }) {
  const initialLane = ((index % 3) - 1) * 0.6;

  const bodyRef = useRef(null);
  const progressRef = useRef((index + 1) * 0.07);
  const lapRef = useRef(1);
  const speedRef = useRef(profile.baseSpeed * 0.8);
  const laneRef = useRef(initialLane);
  const laneTargetRef = useRef(initialLane);
  const nextLaneDecisionRef = useRef(0);
  const transformCache = useRef({});
  const euler = useMemo(() => new Euler(), []);
  const quaternion = useMemo(() => new Quaternion(), []);

  const raceStatus = useGameStore((state) => state.raceStatus);
  const totalLaps = useGameStore((state) => state.totalLaps);

  useEffect(() => {
    if (raceStatus === 'menu' || raceStatus === 'countdown') {
      progressRef.current = (index + 1) * 0.07;
      lapRef.current = 1;
      speedRef.current = profile.baseSpeed * 0.8;
      laneRef.current = ((index % 3) - 1) * 0.6;
      laneTargetRef.current = laneRef.current;
      nextLaneDecisionRef.current = 0;
    }
  }, [index, profile.baseSpeed, raceStatus]);

  useFrame((_, dt) => {
    const store = useGameStore.getState();
    const now = performance.now();
    const activeRace = store.raceStatus === 'racing';
    const racerFinished = lapRef.current > totalLaps;

    if (activeRace && !racerFinished) {
      const lapDifficulty = Math.max(0, store.currentLap - 1);

      if (now >= nextLaneDecisionRef.current) {
        laneTargetRef.current = chooseSafeLane({
          currentLane: laneRef.current,
          progress: progressRef.current,
          traffic: store.trafficSnapshot,
          lookAhead: 0.06,
        }) + profile.laneBias;
        laneTargetRef.current = MathUtils.clamp(laneTargetRef.current, -1, 1);
        nextLaneDecisionRef.current = now + MathUtils.randFloat(250, 450);
      }

      laneRef.current = smoothLane(laneRef.current, laneTargetRef.current, dt, 5.8);

      let targetSpeed = computeAiTargetSpeed(profile, lapRef.current, lapDifficulty);
      for (let i = 0; i < store.trafficSnapshot.length; i += 1) {
        const obstacle = store.trafficSnapshot[i];
        const laneGap = Math.abs(obstacle.lane - laneRef.current);
        if (laneGap > 0.38) {
          continue;
        }
        const delta = normalizeProgress(obstacle.progress - progressRef.current);
        if (delta > 0 && delta < 0.03) {
          targetSpeed *= 0.75;
          break;
        }
      }

      speedRef.current = MathUtils.lerp(speedRef.current, targetSpeed, dt * 1.5);
      const prevProgress = progressRef.current;
      progressRef.current = normalizeProgress(progressRef.current + (speedRef.current * dt) / TRACK_CONFIG.length);
      if (didCompleteLap(prevProgress, progressRef.current)) {
        lapRef.current += 1;
      }
    }

    const transform = getTrackTransform(progressRef.current, laneRef.current, 1.05, transformCache.current);
    const body = bodyRef.current;
    if (body) {
      body.setNextKinematicTranslation({ x: transform.x, y: transform.y, z: transform.z });
      euler.set(0, transform.yaw, -0.08 * (laneTargetRef.current - laneRef.current));
      quaternion.setFromEuler(euler);
      body.setNextKinematicRotation(quaternion);
    }

    store.setRacerTelemetry(profile.id, {
      lap: lapRef.current,
      progress: progressRef.current,
      distance: getTrackDistance(lapRef.current, progressRef.current),
      time: store.elapsedMs,
      status: lapRef.current > totalLaps ? 'Finished' : 'Racing',
    });
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      userData={{ type: 'ai', id: profile.id }}
    >
      <CuboidCollider args={[0.72, 0.4, 1.15]} sensor />

      <group>
        <mesh castShadow position={[0, 0.22, 0]}>
          <boxGeometry args={[0.85, 0.24, 2]} />
          <meshStandardMaterial color="#f97316" metalness={0.28} roughness={0.42} />
        </mesh>
        <mesh castShadow position={[0, 0.4, -0.12]}>
          <boxGeometry args={[0.58, 0.2, 0.78]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh castShadow position={[0, 0.04, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.14, 14]} />
          <meshStandardMaterial color="#0b1120" />
        </mesh>
        <mesh castShadow position={[0, 0.04, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.14, 14]} />
          <meshStandardMaterial color="#0b1120" />
        </mesh>
      </group>
    </RigidBody>
  );
}

import { Fragment } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { HIGHWAY_CONFIG } from '../systems/highwayConfig';

function GateVisual({ gate }) {
  if (gate.open) {
    return (
      <group>
        <mesh castShadow position={[0, 1.55, 0]}>
          <boxGeometry args={[HIGHWAY_CONFIG.gateWidth, 0.24, 0.5]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0369a1" emissiveIntensity={0.8} />
        </mesh>
        <mesh castShadow position={[0, 0.7, 0]}>
          <boxGeometry args={[0.18, 1.7, 0.3]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.34} roughness={0.35} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[HIGHWAY_CONFIG.gateWidth, 1.8, 1.05]} />
        <meshStandardMaterial color="#ef4444" emissive="#991b1b" emissiveIntensity={1.15} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshBasicMaterial color="#f87171" />
      </mesh>
    </group>
  );
}

function Gate({ checkpointId, gate }) {
  if (!gate.open) {
    return (
      <RigidBody
        type="fixed"
        colliders={false}
        position={[gate.laneX, 0, 0]}
        userData={{ type: 'closedGate', name: 'closedGate', checkpointId }}
      >
        <CuboidCollider
          args={[HIGHWAY_CONFIG.gateWidth * 0.5, 0.95, 0.55]}
          position={[0, 1.1, 0]}
          userData={{ type: 'closedGate', name: 'closedGate', checkpointId }}
        />
        <GateVisual gate={gate} />
        <Text
          position={[0, 3.2, 0]}
          fontSize={1.08}
          fontWeight={900}
          color="#fecaca"
          outlineWidth={0.08}
          outlineColor="#450a0a"
          anchorX="center"
          anchorY="middle"
        >
          {gate.label}
        </Text>
      </RigidBody>
    );
  }

  return (
    <group position={[gate.laneX, 0, 0]}>
      <GateVisual gate={gate} />
      <Text
        position={[0, 3.2, 0]}
        fontSize={1.08}
        fontWeight={900}
        color="#cbd5e1"
        outlineWidth={0.075}
        outlineColor="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        {gate.label}
      </Text>
    </group>
  );
}

function OverheadBoard({ checkpoint }) {
  const boardZ = HIGHWAY_CONFIG.boardLeadDistance;
  const headline = checkpoint.prompt;

  return (
    <group position={[0, 0, boardZ]} scale={[1.4, 1.4, 1.4]}>
      <mesh castShadow position={[10.8, 5.2, 0]}>
        <boxGeometry args={[0.56, 10.4, 0.56]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[2.7, 9.4, 0]}>
        <boxGeometry args={[16.6, 0.44, 0.5]} />
        <meshStandardMaterial color="#64748b" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[-1.6, 7.1, 0]}>
        <boxGeometry args={[14.4, 3.6, 0.38]} />
        <meshStandardMaterial color="#0f766e" metalness={0.45} roughness={0.25} />
      </mesh>
      <Text
        position={[-1.6, 7.6, 0.24]}
        color="#f8fafc"
        fontSize={0.9}
        maxWidth={13.2}
        outlineWidth={0.02}
        outlineColor="#022c22"
        anchorX="center"
        anchorY="middle"
      >
        {headline}
      </Text>
      <Text
        position={[-1.6, 6.35, 0.24]}
        color="#bae6fd"
        fontSize={0.68}
        maxWidth={12.6}
        outlineWidth={0.018}
        outlineColor="#0c4a6e"
        anchorX="center"
        anchorY="middle"
      >
        {`CHECKPOINT ${checkpoint.checkpointId + 1}  |  +${checkpoint.rewardPoints} PTS`}
      </Text>
    </group>
  );
}

export function CheckpointSystem() {
  const checkpoints = useGameStore((state) => state.checkpoints);
  const currentCheckpoint = useGameStore((state) => state.currentCheckpoint);
  const playerZ = useGameStore((state) => state.playerWorld[2]);

  return (
    <group>
      {checkpoints.map((checkpoint, index) => {
        if (checkpoint.resolved) {
          return null;
        }
        if (checkpoint.z > playerZ + 35) {
          return null;
        }
        if (checkpoint.z < playerZ - 1000) {
          return null;
        }

        const isCurrent = index === currentCheckpoint;
        return (
          <group key={`checkpoint-${checkpoint.checkpointId}`} position={[0, 0, checkpoint.z]}>
            <OverheadBoard checkpoint={checkpoint} />
            <mesh position={[0, 0.04, 0]}>
              <boxGeometry args={[HIGHWAY_CONFIG.roadWidth, 0.05, 0.25]} />
              <meshBasicMaterial color={isCurrent ? '#fde047' : '#e2e8f0'} />
            </mesh>
            {checkpoint.gates.map((gate) => (
              <Fragment key={`gate-${checkpoint.checkpointId}-${gate.laneIndex}`}>
                <Gate checkpointId={checkpoint.checkpointId} gate={gate} />
              </Fragment>
            ))}
          </group>
        );
      })}
    </group>
  );
}

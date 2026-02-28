import { useEffect, useMemo, useRef } from 'react';
import { Object3D } from 'three';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Line } from '@react-three/drei';
import { HIGHWAY_CONFIG } from '../systems/highwayConfig';

function LaneMarkers() {
  const markerRefA = useRef(null);
  const markerRefB = useRef(null);
  const markerRefC = useRef(null);
  const dummy = useMemo(() => new Object3D(), []);
  const markerCount = Math.floor(HIGHWAY_CONFIG.worldLength / 22);
  const spacing = 24;

  useEffect(() => {
    const markerRefs = [markerRefA, markerRefB, markerRefC];
    const dividerX = [
      -HIGHWAY_CONFIG.roadWidth * 0.5 + HIGHWAY_CONFIG.laneWidth,
      0,
      HIGHWAY_CONFIG.roadWidth * 0.5 - HIGHWAY_CONFIG.laneWidth,
    ];

    for (let lane = 0; lane < markerRefs.length; lane += 1) {
      const mesh = markerRefs[lane].current;
      if (!mesh) continue;
      for (let i = 0; i < markerCount; i += 1) {
        const z = 120 - i * spacing;
        dummy.position.set(dividerX[lane], 0.05, z);
        dummy.scale.set(0.14, 0.1, 9);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [dummy, markerCount]);

  return (
    <>
      <instancedMesh ref={markerRefA} args={[null, null, markerCount]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={markerRefB} args={[null, null, markerCount]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={markerRefC} args={[null, null, markerCount]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
      </instancedMesh>
    </>
  );
}

function DebugBounds({ x }) {
  const startZ = 500;
  const endZ = -HIGHWAY_CONFIG.worldLength;
  return (
    <>
      <Line
        points={[
          [x, 0.3, startZ],
          [x, 0.3, endZ],
        ]}
        color="#f97316"
        linewidth={2}
      />
      <Line
        points={[
          [-x, 0.3, startZ],
          [-x, 0.3, endZ],
        ]}
        color="#f97316"
        linewidth={2}
      />
    </>
  );
}

export function Track({ debug = false }) {
  const halfRoad = HIGHWAY_CONFIG.roadWidth * 0.5;
  const halfSidewalk = HIGHWAY_CONFIG.sidewalkWidth * 0.5;
  const grassOffset = halfRoad + HIGHWAY_CONFIG.sidewalkWidth + HIGHWAY_CONFIG.grassWidth * 0.5;
  const sideBarrierX = halfRoad + HIGHWAY_CONFIG.sidewalkWidth + 0.55;
  const centerZ = HIGHWAY_CONFIG.worldCenterZ;
  const length = HIGHWAY_CONFIG.worldLength;

  return (
    <group>
      <mesh receiveShadow position={[0, -0.03, centerZ]}>
        <boxGeometry args={[HIGHWAY_CONFIG.roadWidth, 0.08, length]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.9} metalness={0.06} />
      </mesh>

      <mesh receiveShadow position={[-halfRoad - halfSidewalk, 0.03, centerZ]}>
        <boxGeometry args={[HIGHWAY_CONFIG.sidewalkWidth, 0.16, length]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.68} metalness={0.14} />
      </mesh>
      <mesh receiveShadow position={[halfRoad + halfSidewalk, 0.03, centerZ]}>
        <boxGeometry args={[HIGHWAY_CONFIG.sidewalkWidth, 0.16, length]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.68} metalness={0.14} />
      </mesh>

      <mesh castShadow receiveShadow position={[sideBarrierX, 0.75, centerZ]}>
        <boxGeometry args={[0.4, 1.15, length]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh castShadow receiveShadow position={[-sideBarrierX, 0.75, centerZ]}>
        <boxGeometry args={[0.4, 1.15, length]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.55} metalness={0.35} />
      </mesh>

      <mesh receiveShadow position={[-grassOffset, -0.08, centerZ]}>
        <boxGeometry args={[HIGHWAY_CONFIG.grassWidth, 0.12, length]} />
        <meshStandardMaterial color="#228B22" roughness={0.98} metalness={0.02} />
      </mesh>
      <mesh receiveShadow position={[grassOffset, -0.08, centerZ]}>
        <boxGeometry args={[HIGHWAY_CONFIG.grassWidth, 0.12, length]} />
        <meshStandardMaterial color="#228B22" roughness={0.98} metalness={0.02} />
      </mesh>

      <LaneMarkers />

      <RigidBody type="fixed" colliders={false} userData={{ type: 'ground' }}>
        <CuboidCollider
          args={[HIGHWAY_CONFIG.boundaryX, 0.7, length * 0.5]}
          position={[0, -0.55, centerZ]}
          userData={{ type: 'ground' }}
        />

        <CuboidCollider
          args={[0.6, 2, length * 0.5]}
          position={[sideBarrierX, 1.5, centerZ]}
          userData={{ type: 'barrier', name: 'barrier' }}
        />
        <CuboidCollider
          args={[0.6, 2, length * 0.5]}
          position={[-sideBarrierX, 1.5, centerZ]}
          userData={{ type: 'barrier', name: 'barrier' }}
        />
      </RigidBody>

      {debug ? <DebugBounds x={sideBarrierX} /> : null}
    </group>
  );
}

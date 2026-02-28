import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { getTrackTransform } from '../systems/lapSystem';

export function Ramp({ progress, lane = 0 }) {
  const transform = getTrackTransform(progress, lane, 0.35);

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[transform.x, transform.y, transform.z]}
      rotation={[0, transform.yaw, 0]}
      userData={{ type: 'ramp' }}
    >
      <CuboidCollider args={[1.4, 0.45, 2.2]} userData={{ type: 'ramp' }} />
      <mesh castShadow receiveShadow rotation={[-0.24, 0, 0]} position={[0, 0, 0]}>
        <boxGeometry args={[2.8, 0.5, 4.4]} />
        <meshStandardMaterial color="#2563eb" metalness={0.25} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <planeGeometry args={[2.4, 3.8]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.35} />
      </mesh>
    </RigidBody>
  );
}

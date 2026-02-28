import { MathUtils, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';

const targetPosition = new Vector3();
const lookAtPosition = new Vector3();

export function FollowCamera() {
  useFrame(({ camera }, dt) => {
    const state = useGameStore.getState();
    const [px, py, pz] = state.playerWorld;

    targetPosition.set(px, py + 5.2, pz + 12.8);

    if (performance.now() < state.cameraShakeUntil) {
      const shake = 0.16;
      targetPosition.x += (Math.random() - 0.5) * shake;
      targetPosition.y += (Math.random() - 0.5) * shake;
      targetPosition.z += (Math.random() - 0.5) * shake;
    }

    camera.position.lerp(targetPosition, 1 - Math.exp(-dt * 6));

    lookAtPosition.set(px, py + 1.1, pz - 22);
    camera.lookAt(lookAtPosition);

    const fast = state.currentSpeed > state.baseSpeed + 2;
    const targetFov = fast ? 70 : 62;
    const nextFov = MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-dt * 5));
    if (Math.abs(nextFov - camera.fov) > 0.01) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

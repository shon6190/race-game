import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { MAX_SPARK_PARTICLES } from '../systems/particleSystem';

export function Sparks() {
  const meshRef = useRef(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tint = useMemo(() => new Color(), []);

  useFrame((_, dt) => {
    const store = useGameStore.getState();
    store.stepSparks(dt);
    const sparks = store.sparks;
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const count = Math.min(sparks.length, MAX_SPARK_PARTICLES);
    mesh.count = count;

    for (let i = 0; i < count; i += 1) {
      const spark = sparks[i];
      const lifeAlpha = spark.life / spark.maxLife;
      const size = spark.smoke ? 0.32 + (1 - lifeAlpha) * 0.42 : 0.06 + lifeAlpha * 0.18;

      dummy.position.set(spark.position[0], spark.position[1], spark.position[2]);
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tint.setRGB(spark.color[0] * lifeAlpha, spark.color[1] * lifeAlpha, spark.color[2] * lifeAlpha);
      mesh.setColorAt(i, tint);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, MAX_SPARK_PARTICLES]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={AdditiveBlending}
        vertexColors
      />
    </instancedMesh>
  );
}

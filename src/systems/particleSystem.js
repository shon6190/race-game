export const MAX_SPARK_PARTICLES = 420;

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

let particleId = 0;

export function spawnSparkBurst(origin, count = 18, heavy = false) {
  const [x, y, z] = origin;
  const particles = [];
  const baseCount = heavy ? count + 12 : count;

  for (let i = 0; i < baseCount; i += 1) {
    const spread = heavy ? 1.2 : 0.8;
    const speed = heavy ? randomRange(7, 13) : randomRange(5, 10);
    const angle = randomRange(0, Math.PI * 2);
    const lift = randomRange(0.4, 1.6);

    particles.push({
      id: particleId += 1,
      position: [x + randomRange(-0.2, 0.2), y + 0.25, z + randomRange(-0.2, 0.2)],
      velocity: [Math.cos(angle) * speed * spread, lift * speed * 0.35, Math.sin(angle) * speed * spread],
      life: randomRange(0.3, 0.6),
      maxLife: randomRange(0.3, 0.6),
      color: [1, randomRange(0.45, 0.8), randomRange(0.05, 0.2)],
      smoke: false,
    });
  }

  if (heavy) {
    for (let i = 0; i < 14; i += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const smokeSpeed = randomRange(1.6, 2.8);
      particles.push({
        id: particleId += 1,
        position: [x + randomRange(-0.4, 0.4), y + 0.4, z + randomRange(-0.4, 0.4)],
        velocity: [Math.cos(angle) * smokeSpeed, randomRange(0.8, 1.8), Math.sin(angle) * smokeSpeed],
        life: randomRange(0.4, 0.9),
        maxLife: randomRange(0.4, 0.9),
        color: [0.55, 0.55, 0.58],
        smoke: true,
      });
    }
  }

  return particles;
}

export function updateSparkParticles(particles, dt) {
  const nextParticles = [];

  for (let i = 0; i < particles.length; i += 1) {
    const particle = particles[i];
    const life = particle.life - dt;
    if (life <= 0) {
      continue;
    }

    const drag = particle.smoke ? 0.88 : 0.92;
    const gravity = particle.smoke ? -1.2 : -16;
    const velocity = [
      particle.velocity[0] * drag,
      particle.velocity[1] + gravity * dt,
      particle.velocity[2] * drag,
    ];
    const position = [
      particle.position[0] + velocity[0] * dt,
      particle.position[1] + velocity[1] * dt,
      particle.position[2] + velocity[2] * dt,
    ];

    nextParticles.push({
      ...particle,
      life,
      velocity,
      position,
    });
  }

  return nextParticles.slice(0, MAX_SPARK_PARTICLES);
}

import { wrappedDeltaForward } from './lapSystem';

const LANES = [-1, 0, 1];

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

export function createAiProfile(index) {
  return {
    id: `ai-${index + 1}`,
    name: ['Axel', 'Blaze', 'Nyx', 'Rogue'][index] ?? `Racer-${index + 1}`,
    baseSpeed: randomInRange(34, 40),
    aggression: randomInRange(0.75, 1.1),
    laneBias: randomInRange(-0.25, 0.25),
  };
}

export function computeAiTargetSpeed(profile, lap, lapDifficulty) {
  const lapBoost = (lap - 1) * 2.8;
  const difficultyBoost = lapDifficulty * 2.2;
  const variance = profile.aggression * 1.4;
  return profile.baseSpeed + lapBoost + difficultyBoost + variance;
}

export function chooseSafeLane({
  currentLane,
  progress,
  traffic,
  lookAhead = 0.05,
}) {
  let bestLane = currentLane;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const lane of LANES) {
    let score = -Math.abs(lane - currentLane) * 0.3;

    for (const obstacle of traffic) {
      const delta = wrappedDeltaForward(progress, obstacle.progress);
      if (delta <= 0 || delta > lookAhead) {
        continue;
      }

      const laneGap = Math.abs(lane - obstacle.lane);
      if (laneGap < 0.35) {
        score -= 10 * (lookAhead - delta);
      } else {
        score += 0.4;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestLane = lane;
    }
  }

  return bestLane;
}

export function smoothLane(currentLane, targetLane, dt, sharpness = 6) {
  const factor = 1 - Math.exp(-sharpness * dt);
  return currentLane + (targetLane - currentLane) * factor;
}

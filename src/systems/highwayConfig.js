export const LANES = [-6, -2, 2, 6];
export const TOTAL_CHECKPOINTS = 10;
export const MAX_SPEED = 90;
export const BASE_SPEEDS = Array.from(
  { length: TOTAL_CHECKPOINTS },
  (_, index) => Math.min(50 + index * 10, MAX_SPEED),
);
export const CHECKPOINT_REWARD_POINTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export const HIGHWAY_CONFIG = Object.freeze({
  laneCount: LANES.length,
  laneWidth: 4,
  roadWidth: 18,
  sidewalkWidth: 2,
  grassWidth: 36,
  boundaryX: 52,
  worldLength: 10000,
  worldCenterZ: -5000,
  checkpointSpacing: 420,
  boardLeadDistance: 130,
  startY: 1.05,
  gateWidth: 3.2,
});

export function clampLaneIndex(laneIndex) {
  return Math.max(0, Math.min(laneIndex, LANES.length - 1));
}

export function laneX(laneIndex) {
  return LANES[clampLaneIndex(laneIndex)];
}

export function getOpenGateCount(index) {
  if (index < 3) return 4;
  if (index < 6) return 3;
  if (index < 8) return 2;
  if (index === 8) return 3;
  return 1;
}

export function isOffRoad(x) {
  return Math.abs(x) > HIGHWAY_CONFIG.roadWidth * 0.5;
}

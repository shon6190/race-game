const TAU = Math.PI * 2;

export const TRACK_CONFIG = Object.freeze({
  radiusX: 72,
  radiusZ: 40,
  roadWidth: 14,
  laneWidth: 3.3,
  laneCount: 3,
  totalLaps: 3,
  get length() {
    const { radiusX, radiusZ } = this;
    return TAU * Math.sqrt((radiusX * radiusX + radiusZ * radiusZ) / 2);
  },
});

export function normalizeProgress(progress) {
  const wrapped = progress % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function laneToOffset(lane) {
  return lane * TRACK_CONFIG.laneWidth;
}

export function getTrackTransform(progress, lane = 0, y = 0, out = {}) {
  const clampedProgress = normalizeProgress(progress);
  const theta = clampedProgress * TAU - Math.PI / 2;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const laneOffset = laneToOffset(lane);

  const normalX = cosTheta;
  const normalZ = sinTheta;
  const centerX = TRACK_CONFIG.radiusX * cosTheta;
  const centerZ = TRACK_CONFIG.radiusZ * sinTheta;
  const x = centerX + normalX * laneOffset;
  const z = centerZ + normalZ * laneOffset;

  const tangentX = -TRACK_CONFIG.radiusX * sinTheta;
  const tangentZ = TRACK_CONFIG.radiusZ * cosTheta;
  const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
  const tx = tangentX / tangentLength;
  const tz = tangentZ / tangentLength;
  const yaw = Math.atan2(tx, tz);

  out.x = x;
  out.y = y;
  out.z = z;
  out.yaw = yaw;
  out.tangentX = tx;
  out.tangentZ = tz;
  out.normalX = normalX;
  out.normalZ = normalZ;
  out.progress = clampedProgress;

  return out;
}

export function wrappedDeltaForward(fromProgress, toProgress) {
  const from = normalizeProgress(fromProgress);
  const to = normalizeProgress(toProgress);
  const delta = to - from;
  return delta < 0 ? delta + 1 : delta;
}

export function didCompleteLap(previousProgress, nextProgress) {
  return normalizeProgress(nextProgress) < normalizeProgress(previousProgress);
}

export function getTrackDistance(lap, progress) {
  const lapDistance = Math.max(0, lap - 1) * TRACK_CONFIG.length;
  return lapDistance + normalizeProgress(progress) * TRACK_CONFIG.length;
}

export function worldToTrackProgress(x, z) {
  const scaledX = x / TRACK_CONFIG.radiusX;
  const scaledZ = z / TRACK_CONFIG.radiusZ;
  const theta = Math.atan2(scaledZ, scaledX);
  const progress = (theta + Math.PI / 2) / TAU;
  return normalizeProgress(progress);
}

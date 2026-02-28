import { create } from 'zustand';
import { spawnSparkBurst, updateSparkParticles } from '../systems/particleSystem';
import { audioSystem } from '../systems/soundSystem';
import {
  BASE_SPEEDS,
  CHECKPOINT_REWARD_POINTS,
  HIGHWAY_CONFIG,
  LANES,
  MAX_SPEED,
  TOTAL_CHECKPOINTS,
  clampLaneIndex,
  getOpenGateCount,
} from '../systems/highwayConfig';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffle(values) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function generateMathProblem() {
  if (Math.random() > 0.5) {
    const a = randomInt(1, 9);
    const b = randomInt(1, 9);
    return {
      prompt: `${a} + ${b} = ?`,
      answer: a + b,
    };
  }

  const a = randomInt(2, 9);
  const b = randomInt(1, a);
  return {
    prompt: `${a} - ${b} = ?`,
    answer: a - b,
  };
}

function generateCheckpoints() {
  const checkpoints = [];
  const laneIndices = LANES.map((_, laneIndex) => laneIndex);
  let previousMode = Math.random() > 0.5 ? 'highest' : 'math';

  for (let index = 0; index < TOTAL_CHECKPOINTS; index += 1) {
    const mode = Math.random() > 0.5 ? (previousMode === 'math' ? 'highest' : 'math') : previousMode;
    previousMode = mode;

    const openLaneCount = getOpenGateCount(index);
    const openLanes = new Set(shuffle(laneIndices).slice(0, openLaneCount));
    const gates = laneIndices.map((laneIndex) => ({
      laneIndex,
      laneX: LANES[laneIndex],
      label: 0,
      open: openLanes.has(laneIndex),
      isCorrect: false,
    }));

    const openOnly = gates.filter((gate) => gate.open);
    const correctGate = openOnly[Math.floor(Math.random() * openOnly.length)] ?? gates[0];
    correctGate.isCorrect = true;

    let prompt = 'Go through Highest Number';
    if (mode === 'highest') {
      correctGate.label = randomInt(72, 99);
      for (let i = 0; i < gates.length; i += 1) {
        if (gates[i].isCorrect) {
          continue;
        }
        gates[i].label = randomInt(18, 88);
      }
      for (let i = 0; i < gates.length; i += 1) {
        if (!gates[i].isCorrect && gates[i].label >= correctGate.label) {
          gates[i].label = correctGate.label - randomInt(2, 11);
        }
      }
    } else {
      const problem = generateMathProblem();
      prompt = problem.prompt;
      correctGate.label = problem.answer;
      const used = new Set([problem.answer]);
      for (let i = 0; i < gates.length; i += 1) {
        if (gates[i].isCorrect) {
          continue;
        }
        let option = problem.answer + randomInt(-4, 4);
        while (option === problem.answer || used.has(option) || option < 0 || option > 18) {
          option = randomInt(0, 18);
        }
        used.add(option);
        gates[i].label = option;
      }
    }

    checkpoints.push({
      checkpointId: index,
      z: -(index + 1) * HIGHWAY_CONFIG.checkpointSpacing,
      mode,
      prompt,
      rewardPoints: CHECKPOINT_REWARD_POINTS[index],
      gates,
      resolved: false,
      result: null,
      resolvedAtMs: 0,
      checkpointTime: 0,
    });
  }

  return checkpoints;
}

function getSpeedBounds(baseSpeed) {
  return {
    min: baseSpeed,
    max: MAX_SPEED,
  };
}

let hitResetTimer = null;

function setHitTemporary(set) {
  set({ isHit: true });
  if (hitResetTimer) {
    clearTimeout(hitResetTimer);
  }
  hitResetTimer = setTimeout(() => {
    set({ isHit: false });
    hitResetTimer = null;
  }, 300);
}

function createInitialState() {
  const baseSpeed = BASE_SPEEDS[0];
  return {
    raceStatus: 'menu',
    outcome: null,
    countdownValue: 3,
    countdownLabel: '3',
    totalCheckpoints: TOTAL_CHECKPOINTS,
    currentCheckpoint: 0,
    checkpointsCovered: 0,
    checkpoints: generateCheckpoints(),
    maxLives: 5,
    lives: 5,
    totalPoints: 0,
    pointsFlashUntil: 0,
    currentLaneIndex: 1,
    baseSpeed,
    currentSpeed: baseSpeed,
    playerThrottle: 0.5,
    totalDistance: 0,
    elapsedMs: 0,
    averageSpeed: 0,
    startAtMs: 0,
    endAtMs: 0,
    checkpointStartTime: 0,
    checkpointTime: 0,
    totalTime: 0,
    playerWorld: [LANES[1], HIGHWAY_CONFIG.startY, 0],
    damageFlashUntil: 0,
    cameraShakeUntil: 0,
    lastDamageAt: 0,
    isHit: false,
    sparks: [],
  };
}

export const useGameStore = create((set, get) => ({
  ...createInitialState(),

  goMenu: () => {
    set({ ...createInitialState(), raceStatus: 'menu' });
  },

  startCountdown: () => {
    set({
      ...createInitialState(),
      raceStatus: 'countdown',
      countdownValue: 3,
      countdownLabel: '3',
    });
  },

  setCountdownValue: (value, label) => {
    set({ countdownValue: value, countdownLabel: label });
  },

  startRun: () => {
    const now = performance.now();
    const state = createInitialState();
    set({
      ...state,
      raceStatus: 'running',
      startAtMs: now,
      checkpointStartTime: now,
    });
  },

  startCheckpointTimer: () => {
    set({ checkpointStartTime: performance.now() });
  },

  finishCheckpoint: () => {
    const now = performance.now();
    const start = get().checkpointStartTime;
    const spent = start > 0 ? (now - start) / 1000 : 0;
    set((state) => ({
      checkpointTime: spent,
      totalTime: state.totalTime + spent,
    }));
    return spent;
  },

  setLaneIndex: (nextLaneIndex) => {
    set((state) => ({
      currentLaneIndex: clampLaneIndex(nextLaneIndex),
      playerThrottle: state.playerThrottle,
    }));
  },

  adjustSpeed: (delta) => {
    set((state) => {
      if (state.raceStatus !== 'running') {
        return state;
      }
      const bounds = getSpeedBounds(state.baseSpeed);
      return {
        currentSpeed: clamp(state.currentSpeed + delta, bounds.min, bounds.max),
        playerThrottle: delta > 0 ? 1 : 0.3,
      };
    });
  },

  spawnCrashSparks: (origin) => {
    const particles = spawnSparkBurst(origin, 24, false);
    set((state) => ({
      sparks: [...state.sparks, ...particles].slice(-420),
    }));
  },

  stepSparks: (dt) => {
    set((state) => ({
      sparks: updateSparkParticles(state.sparks, dt),
    }));
  },

  reduceLife: ({ ignoreCooldown = false, slowdown = true } = {}) => {
    const state = get();
    const now = performance.now();
    if (state.raceStatus !== 'running') {
      return false;
    }
    if (!ignoreCooldown && now - state.lastDamageAt < 450) {
      return false;
    }

    const nextLives = Math.max(0, state.lives - 1);
    const nextSpeed = slowdown ? Math.max(state.baseSpeed, state.currentSpeed * 0.72) : state.currentSpeed;

    setHitTemporary(set);
    set({
      lives: nextLives,
      currentSpeed: nextSpeed,
      lastDamageAt: now,
      damageFlashUntil: now + 280,
      cameraShakeUntil: now + 320,
    });

    if (nextLives <= 0) {
      const partial = state.checkpointStartTime > 0 ? (now - state.checkpointStartTime) / 1000 : 0;
      set({
        raceStatus: 'ended',
        outcome: 'failed',
        endAtMs: now,
        elapsedMs: Math.max(state.elapsedMs, now - state.startAtMs),
        checkpointTime: partial,
        totalTime: state.totalTime + partial,
      });
    }

    return true;
  },

  resolveCurrentCheckpoint: (source = 'pass') => {
    const state = get();
    if (state.raceStatus !== 'running') {
      return;
    }

    const checkpointIndex = state.currentCheckpoint;
    const checkpoint = state.checkpoints[checkpointIndex];
    if (!checkpoint || checkpoint.resolved) {
      return;
    }

    const selectedGate = checkpoint.gates.find((gate) => gate.laneIndex === state.currentLaneIndex);
    const success = Boolean(selectedGate?.open && selectedGate?.isCorrect);
    const now = performance.now();
    const checkpointTime = get().finishCheckpoint();
    const reward = success ? checkpoint.rewardPoints : 0;

    let nextLives = state.lives;
    if (!success) {
      nextLives = Math.max(0, state.lives - 1);
      setHitTemporary(set);
    }

    const nextCheckpoint = checkpointIndex + 1;
    const completedRun = nextCheckpoint >= TOTAL_CHECKPOINTS;
    const failedRun = nextLives <= 0;
    const nextBase = completedRun ? state.baseSpeed : BASE_SPEEDS[nextCheckpoint];
    const nextSpeed = success
      ? nextBase
      : Math.max(nextBase, state.currentSpeed * 0.75);

    const checkpoints = state.checkpoints.map((item, idx) => (
      idx === checkpointIndex
        ? {
          ...item,
          resolved: true,
          result: success ? 'success' : source,
          resolvedAtMs: now - state.startAtMs,
          checkpointTime,
        }
        : item
    ));

    set({
      checkpoints,
      totalPoints: state.totalPoints + reward,
      pointsFlashUntil: success ? now + 260 : state.pointsFlashUntil,
      checkpointsCovered: nextCheckpoint,
      currentCheckpoint: nextCheckpoint,
      baseSpeed: nextBase,
      currentSpeed: nextSpeed,
      lives: nextLives,
      checkpointStartTime: completedRun || failedRun ? state.checkpointStartTime : now,
      raceStatus: completedRun || failedRun ? 'ended' : 'running',
      outcome: completedRun ? 'completed' : failedRun ? 'failed' : null,
      endAtMs: completedRun || failedRun ? now : state.endAtMs,
      elapsedMs: Math.max(state.elapsedMs, now - state.startAtMs),
      lastDamageAt: success ? state.lastDamageAt : now,
      damageFlashUntil: success ? state.damageFlashUntil : now + 280,
      cameraShakeUntil: success ? state.cameraShakeUntil : now + 320,
      checkpointTime,
      totalTime: state.totalTime + checkpointTime,
    });

    if (!success) {
      const [px, py, pz] = state.playerWorld;
      get().spawnCrashSparks([px, py + 0.35, pz]);
      audioSystem.playCrash();
    }
  },

  failCheckpointByCollision: (checkpointId) => {
    const state = get();
    if (state.raceStatus !== 'running') {
      return;
    }
    if (checkpointId !== state.currentCheckpoint) {
      return;
    }
    get().resolveCurrentCheckpoint('closed_gate_collision');
  },

  handleCheckpointPass: (playerZ) => {
    const state = get();
    if (state.raceStatus !== 'running') {
      return;
    }
    const checkpoint = state.checkpoints[state.currentCheckpoint];
    if (!checkpoint || checkpoint.resolved) {
      return;
    }
    if (playerZ <= checkpoint.z) {
      get().resolveCurrentCheckpoint('wrong_gate');
    }
  },

  updatePlayerFrame: ({ dt, playerWorld }) => {
    const state = get();
    if (state.raceStatus !== 'running') {
      set({ playerWorld });
      return;
    }

    const now = performance.now();
    const elapsedMs = Math.max(0, now - state.startAtMs);
    const totalDistance = state.totalDistance + Math.abs(state.currentSpeed) * dt;
    const averageSpeed = elapsedMs > 0 ? totalDistance / (elapsedMs / 1000) : 0;
    const bounds = getSpeedBounds(state.baseSpeed);

    let nextSpeed = state.currentSpeed;
    if (nextSpeed > state.baseSpeed) {
      nextSpeed = Math.max(state.baseSpeed, nextSpeed - dt * 6);
    }
    nextSpeed = clamp(nextSpeed, bounds.min, bounds.max);

    set({
      elapsedMs,
      totalDistance,
      averageSpeed,
      currentSpeed: nextSpeed,
      playerWorld,
      playerThrottle: Math.max(0.3, nextSpeed / bounds.max),
    });
  },
}));

import { Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Sky } from '@react-three/drei';
import { Player } from './components/Player';
import { TrafficSystem } from './components/TrafficSystem';
import { Track } from './components/Track';
import { CheckpointSystem } from './components/CheckpointSystem';
import { FollowCamera } from './components/FollowCamera';
import { Countdown } from './components/Countdown';
import { Sparks } from './components/Sparks';
import { HUD } from './components/HUD';
import { MiniMap } from './components/MiniMap';
import { Leaderboard } from './components/Leaderboard';
import { LandingPage } from './components/LandingPage';
import { useGameStore } from './store/gameStore';
import { audioSystem } from './systems/soundSystem';
import { MAX_SPEED } from './systems/highwayConfig';
import './App.css';

const DEBUG_MODE = import.meta.env.DEV && import.meta.env.VITE_DEBUG_PHYSICS === 'true';

function SoundController() {
  const raceStatus = useGameStore((state) => state.raceStatus);

  useFrame(() => {
    const state = useGameStore.getState();
    if (state.raceStatus !== 'running') {
      return;
    }
    const speedNorm = Math.min(1, state.currentSpeed / MAX_SPEED);
    audioSystem.updateEngine(speedNorm, state.playerThrottle);
  });

  useEffect(() => {
    if (raceStatus === 'running') {
      audioSystem.startEngine();
      return;
    }
    audioSystem.stopEngine();
  }, [raceStatus]);

  return null;
}

function Scene() {
  return (
    <>
      <Sky distance={700} sunPosition={[22, 9, 10]} turbidity={4} rayleigh={0.5} />
      <ambientLight intensity={0.52} />
      <hemisphereLight args={['#bfdbfe', '#14532d', 0.45]} />
      <directionalLight
        castShadow
        intensity={1.15}
        position={[24, 34, 16]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Physics gravity={[0, -30, 0]} colliders={false} debug={DEBUG_MODE}>
        <Track debug={DEBUG_MODE} />
        <CheckpointSystem />
        <TrafficSystem debug={DEBUG_MODE} />
        <Player debug={DEBUG_MODE} />
      </Physics>

      <Sparks />
      <FollowCamera />
      <SoundController />
    </>
  );
}

function StartMenu() {
  const raceStatus = useGameStore((state) => state.raceStatus);
  if (raceStatus !== 'menu') {
    return null;
  }

  const handleStart = async () => {
    await audioSystem.resume();
    useGameStore.getState().startCountdown();
  };

  return (
    <div className="menu-overlay">
      <div className="menu-card">
        <h1>4-Lane Arcade Checkpoint Run</h1>
        <p>
          Clear 10 checkpoints with 5 lives. Each checkpoint randomly switches between
          highest-value and math-puzzle gate rules.
        </p>
        <button type="button" onClick={handleStart}>Start Run</button>
        <div className="controls">
          <span>ArrowLeft/ArrowRight: lane snap</span>
          <span>ArrowUp: speed boost</span>
          <span>ArrowDown: speed trim (never below base)</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [username, setUsername] = useState(null);

  useEffect(() => {
    useGameStore.getState().goMenu();
  }, []);

  const handleStartFromLanding = async (riderName) => {
    setUsername(riderName);
    await audioSystem.resume();
    useGameStore.getState().startCountdown();
  };

  if (!username) {
    return <LandingPage onStart={handleStartFromLanding} />;
  }

  return (
    <div className="game-shell">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 62, near: 0.1, far: 1200, position: [0, 8, 14] }}
      >
        <color attach="background" args={['#0b1220']} />
        <fog attach="fog" args={['#0b1220', 90, 320]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <HUD />
      <MiniMap />
      <Countdown />
      <Leaderboard />
      <StartMenu />
    </div>
  );
}

export default App;

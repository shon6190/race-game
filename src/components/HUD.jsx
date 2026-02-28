import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { MAX_SPEED } from '../systems/highwayConfig';

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds
    .toString()
    .padStart(2, '0')}`;
}

function hearts(lives, maxLives) {
  return `${'❤️'.repeat(lives)}${'🖤'.repeat(Math.max(0, maxLives - lives))}`;
}

export function HUD() {
  const raceStatus = useGameStore((state) => state.raceStatus);
  const lives = useGameStore((state) => state.lives);
  const maxLives = useGameStore((state) => state.maxLives);
  const totalPoints = useGameStore((state) => state.totalPoints);
  const currentSpeed = useGameStore((state) => state.currentSpeed);
  const baseSpeed = useGameStore((state) => state.baseSpeed);
  const currentCheckpoint = useGameStore((state) => state.currentCheckpoint);
  const totalCheckpoints = useGameStore((state) => state.totalCheckpoints);
  const elapsedMs = useGameStore((state) => state.elapsedMs);
  const totalTime = useGameStore((state) => state.totalTime);
  const checkpointTime = useGameStore((state) => state.checkpointTime);
  const pointsFlashUntil = useGameStore((state) => state.pointsFlashUntil);
  const countdownLabel = useGameStore((state) => state.countdownLabel);
  const damageFlashUntil = useGameStore((state) => state.damageFlashUntil);

  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (raceStatus === 'menu') {
    return null;
  }

  const lifeDanger = lives <= 2;
  const scoreFlash = now < pointsFlashUntil;
  const speedDanger = currentSpeed >= 85 && currentSpeed <= 90;
  const speedRatio = Math.max(0, Math.min(1, currentSpeed / MAX_SPEED));
  const speedPercent = Math.round(speedRatio * 100);
  const speedPulse = currentSpeed >= baseSpeed + 8;
  const speedOverBase = Math.max(0, Math.round(currentSpeed - baseSpeed));

  return (
    <>
      <div className="hud-cards">
        <div className={`hud-card ${lifeDanger ? 'danger' : ''}`}>
          <div className="hud-title">Life</div>
          <div className="hud-value">{hearts(lives, maxLives)}</div>
        </div>
        <div className={`hud-card ${scoreFlash ? 'score-flash' : ''}`}>
          <div className="hud-title">Points</div>
          <div className="hud-value">{totalPoints}</div>
        </div>
        <div className={`hud-card speed-card ${speedDanger ? 'speed-danger' : ''} ${speedPulse ? 'speed-pulse' : ''}`}>
          <div className="hud-title">Speed</div>
          <div className="hud-value">{Math.round(currentSpeed)} km/h</div>
          <div className="speed-meter">
            <div className="speed-meter-fill" style={{ width: `${speedPercent}%` }} />
          </div>
          <div className="speed-meta">
            <span>{`${speedPercent}% of max`}</span>
            <span>{speedOverBase > 0 ? `+${speedOverBase} over base` : 'at base speed'}</span>
          </div>
        </div>
      </div>

      <div className="hud-meta">
        <span>{`Checkpoint ${Math.min(currentCheckpoint + 1, totalCheckpoints)}/${totalCheckpoints}`}</span>
        <span>{`Base ${Math.round(baseSpeed)} km/h`}</span>
        <span>{`Run ${formatMs(elapsedMs)}`}</span>
        <span>{`CP ${checkpointTime.toFixed(2)}s`}</span>
        <span>{`Total ${totalTime.toFixed(2)}s`}</span>
        {raceStatus === 'countdown' ? <span>{`Start In ${countdownLabel}`}</span> : null}
      </div>

      <div className={`damage-overlay ${now < damageFlashUntil ? 'visible' : ''}`} />
    </>
  );
}

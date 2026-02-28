import { useGameStore } from '../store/gameStore';

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds
    .toString()
    .padStart(2, '0')}`;
}

export function Leaderboard() {
  const raceStatus = useGameStore((state) => state.raceStatus);
  const outcome = useGameStore((state) => state.outcome);
  const elapsedMs = useGameStore((state) => state.elapsedMs);
  const totalPoints = useGameStore((state) => state.totalPoints);
  const averageSpeed = useGameStore((state) => state.averageSpeed);
  const lives = useGameStore((state) => state.lives);
  const checkpointsCovered = useGameStore((state) => state.checkpointsCovered);
  const totalCheckpoints = useGameStore((state) => state.totalCheckpoints);
  const totalTime = useGameStore((state) => state.totalTime);
  const startCountdown = useGameStore((state) => state.startCountdown);
  const goMenu = useGameStore((state) => state.goMenu);

  if (raceStatus !== 'ended') {
    return null;
  }

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-card">
        <h2>{outcome === 'completed' ? 'Run Complete' : 'Run Failed'}</h2>
        <div className="final-stat">Total Time: {formatMs(Math.round(totalTime * 1000) || elapsedMs)}</div>
        <div className="final-stat">Final Points: {totalPoints}</div>
        <div className="final-stat">Avg Speed: {averageSpeed.toFixed(1)}</div>
        <div className="final-stat">Lives Remaining: {lives}</div>
        <div className="final-stat">Checkpoints: {checkpointsCovered} / {totalCheckpoints}</div>
        <div className="leaderboard-actions">
          <button type="button" onClick={startCountdown}>Restart</button>
          <button type="button" onClick={goMenu}>Return To Menu</button>
        </div>
      </div>
    </div>
  );
}

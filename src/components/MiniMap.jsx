import { useGameStore } from '../store/gameStore';

function checkpointColor(index, currentCheckpoint, raceStatus, checkpointsCovered) {
  if (index < checkpointsCovered) {
    return '#22c55e';
  }
  if ((raceStatus === 'running' || raceStatus === 'countdown') && index === currentCheckpoint) {
    return '#fde047';
  }
  return '#f8fafc';
}

export function MiniMap() {
  const raceStatus = useGameStore((state) => state.raceStatus);
  const totalCheckpoints = useGameStore((state) => state.totalCheckpoints);
  const currentCheckpoint = useGameStore((state) => state.currentCheckpoint);
  const checkpointsCovered = useGameStore((state) => state.checkpointsCovered);

  const dots = Array.from({ length: totalCheckpoints }, (_, idx) => idx);

  return (
    <div className="minimap">
      <div className="minimap-title">Checkpoint Map</div>
      <svg viewBox="0 0 220 86" width="100%" height="86">
        <line x1="18" y1="42" x2="202" y2="42" stroke="#334155" strokeWidth="6" />
        {dots.map((idx) => (
          <circle
            key={`cp-dot-${idx}`}
            cx={18 + idx * 20.5}
            cy="42"
            r={idx === currentCheckpoint && raceStatus === 'running' ? 8 : 6}
            fill={checkpointColor(idx, currentCheckpoint, raceStatus, checkpointsCovered)}
            stroke="#0f172a"
            strokeWidth="1.4"
          />
        ))}
      </svg>
      <div className="minimap-rank">
        {`Completed ${checkpointsCovered} / ${totalCheckpoints}`}
      </div>
    </div>
  );
}

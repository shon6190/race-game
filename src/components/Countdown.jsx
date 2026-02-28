import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { audioSystem } from '../systems/soundSystem';

export function Countdown() {
  const raceStatus = useGameStore((state) => state.raceStatus);
  const countdownLabel = useGameStore((state) => state.countdownLabel);
  const setCountdownValue = useGameStore((state) => state.setCountdownValue);
  const startRun = useGameStore((state) => state.startRun);

  useEffect(() => {
    if (raceStatus !== 'countdown') {
      return undefined;
    }

    let cancelled = false;
    const labels = ['3', '2', '1', 'GO'];
    let index = 0;
    let timerId = 0;

    const emit = async () => {
      if (cancelled) {
        return;
      }
      if (index >= labels.length) {
        if (timerId) {
          clearInterval(timerId);
        }
        return;
      }
      const label = labels[index];
      const value = label === 'GO' ? 0 : Number(label);
      setCountdownValue(value, label);
      if (label === 'GO') {
        await audioSystem.playCountdownGo();
      } else {
        await audioSystem.playCountdownTick();
      }
      index += 1;
      if (index >= labels.length) {
        if (timerId) {
          clearInterval(timerId);
        }
        setTimeout(() => {
          if (!cancelled) {
            startRun();
          }
        }, 450);
      }
    };

    emit();
    timerId = setInterval(emit, 1000);

    return () => {
      cancelled = true;
      clearInterval(timerId);
    };
  }, [raceStatus, setCountdownValue, startRun]);

  if (raceStatus !== 'countdown') {
    return null;
  }

  return (
    <div className="countdown-overlay">
      <div className={`countdown-number ${countdownLabel === 'GO' ? 'go' : ''}`}>{countdownLabel}</div>
    </div>
  );
}

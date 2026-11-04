import { useEffect, useRef, useState } from 'react';

interface Props {
  seconds: number;
  active: boolean;
  onDone?: () => void;
  onDismiss?: () => void;
}

export function RestTimer({ seconds, active, onDone, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    setPaused(false);
    doneRef.current = false;
  }, [active, seconds]);

  useEffect(() => {
    if (!active || paused) return;
    if (remaining <= 0) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(id);
  }, [active, paused, remaining, onDone]);

  if (!active) return null;

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="rest-timer" role="status" aria-live="polite">
      <div className="rest-timer__label">Rest</div>
      <div className="rest-timer__time">
        {m}:{s.toString().padStart(2, '0')}
      </div>
      <div className="rest-timer__controls">
        <button type="button" className="btn btn--ghost" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setRemaining((r) => r + 15)}>
          +15s
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setRemaining(0);
            onDismiss?.();
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

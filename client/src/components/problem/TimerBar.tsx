import { useState, useEffect, useRef } from 'react';

/**
 * Countdown timer for the live match.
 * Editorial treatment: mono tabular numerals; warm text → gold warning at 60s
 * → cardinal pulse at 10s. No panic motion.
 */

interface TimerBarProps {
  startTimeMicros: bigint;  // game.startTime.microsSinceUnixEpoch
  status: string;            // game.status
  onExpire: () => void;      // called when timer hits 0
}

export default function TimerBar({ startTimeMicros, status, onExpire }: TimerBarProps) {
  const [seconds, setSeconds] = useState<number>(20 * 60);
  const lastExpireAttemptRef = useRef(0);

  useEffect(() => {
    const startMs = Number(startTimeMicros / 1000n);
    const maxSeconds = 20 * 60;
    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startMs) / 1000);
      const remaining = Math.max(0, maxSeconds - elapsed);
      setSeconds(remaining);
      if (remaining === 0 && status === 'in_progress' && now - lastExpireAttemptRef.current > 10_000) {
        lastExpireAttemptRef.current = now;
        onExpire();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startTimeMicros, status, onExpire]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const timeStr = `${mins}:${secs}`;

  const urgent = seconds <= 10 && seconds > 0;
  const warning = seconds <= 60 && !urgent;

  const color =
    urgent  ? 'var(--color-accent)' :
    warning ? 'var(--color-gold-bright)' :
              'var(--color-text)';

  const cls = urgent ? 'timer-pulse-urgent' : warning ? 'timer-pulse-soft' : '';

  return (
    <div className="flex flex-col items-end">
      <span className="label-eyebrow">Time left</span>
      <span
        className={`mono-tabular tracking-tight ${cls}`}
        style={{ fontSize: 22, color, lineHeight: 1.1, fontFeatureSettings: '"tnum","zero"' }}
      >
        {timeStr}
      </span>
    </div>
  );
}

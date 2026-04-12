import { useState, useEffect, useRef } from 'react';

/**
 * Countdown timer that displays remaining match time.
 *
 * Teaching note: extracting the timer into its own component means ProblemScreen
 * doesn't need to know about setSeconds, lastExpireAttemptRef, or the tick math.
 * The component just receives what it needs and manages its own local state.
 * Game expiry (calling the server reducer) is the caller's responsibility via onExpire.
 */

interface TimerBarProps {
  startTimeMicros: bigint;  // game.startTime.microsSinceUnixEpoch
  status: string;            // game.status
  onExpire: () => void;      // called when timer hits 0; caller owns expireGame
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
      // Once the clock hits 0, notify the caller. Retry every 10s in case the
      // server's elapsed check rejects due to clock skew.
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

  return (
    <div className="text-center">
      <div className="text-[11px] text-text-muted">TIME LEFT</div>
      <div className={`font-extrabold text-lg tracking-tight ${seconds < 300 ? 'text-red' : 'text-text'}`}>
        {timeStr}
      </div>
    </div>
  );
}

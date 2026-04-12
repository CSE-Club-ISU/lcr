import { useState, useEffect, useRef } from 'react';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '../../module_bindings';

/**
 * Countdown timer that displays remaining match time and triggers game expiry.
 *
 * Teaching note: extracting the timer into its own component means ProblemScreen
 * doesn't need to know about setSeconds, lastExpireAttemptRef, or the tick math.
 * The component just receives what it needs and manages its own local state.
 */

interface TimerBarProps {
  startTimeMicros: bigint;  // game.startTime.microsSinceUnixEpoch
  status: string;            // game.status
  gameId: string;
  onExpire: () => void;      // called when timer hits 0 (triggers expireGame reducer)
}

export default function TimerBar({ startTimeMicros, status, gameId, onExpire }: TimerBarProps) {
  const [seconds, setSeconds] = useState<number>(20 * 60);
  const lastExpireAttemptRef = useRef(0);
  const expireGame = useReducer(reducers.expireGame);

  useEffect(() => {
    const startMs = Number(startTimeMicros / 1000n);
    const maxSeconds = 20 * 60;
    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startMs) / 1000);
      const remaining = Math.max(0, maxSeconds - elapsed);
      setSeconds(remaining);
      // Once the clock hits 0, nudge the server to resolve. Retry every 10s in
      // case the server's elapsed check rejects us due to clock skew.
      if (remaining === 0 && status === 'in_progress' && now - lastExpireAttemptRef.current > 10_000) {
        lastExpireAttemptRef.current = now;
        expireGame({ gameId });
        onExpire();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startTimeMicros, status, gameId, expireGame, onExpire]);

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

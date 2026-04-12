import { useCallback, useRef } from 'react';

/**
 * Returns a debounced version of `fn` that delays execution by `delayMs`.
 * The latest `fn` is captured via ref so the debounced call always uses
 * the current closure without needing `fn` in the dependency array.
 *
 * Teaching note: debouncing prevents rapid-fire calls (like typing in an editor)
 * from triggering expensive operations (like a network request) on every keystroke.
 * The ref holds the timer across renders without causing re-renders itself.
 */
export function useDebouncedCallback(fn: () => void, delayMs: number): () => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(), delayMs);
  }, [delayMs]);
}

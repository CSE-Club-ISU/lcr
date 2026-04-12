import { useCallback, useRef } from 'react';

/**
 * Returns a debounced version of `fn` that delays execution by `delayMs`.
 * Cancels the pending call on unmount (via cleanup in the returned cancel fn).
 *
 * Teaching note: debouncing prevents rapid-fire calls (like typing in an editor)
 * from triggering expensive operations (like a network request) on every keystroke.
 * The ref holds the timer across renders without causing re-renders itself.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number,
): [debounced: (...args: Parameters<T>) => void, cancel: () => void] {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const debounced = useCallback((...args: Parameters<T>) => {
    cancel();
    timerRef.current = setTimeout(() => fnRef.current(...args), delayMs);
  }, [cancel, delayMs]);

  return [debounced, cancel];
}

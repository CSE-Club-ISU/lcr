import { useState, useCallback } from 'react';
import type { StatusEntry } from './StatusBox';

let _nextId = 1;

/**
 * Maintains an append-only log of StatusEntry items (newest-first).
 * push/clear are stable useCallback refs — safe as effect deps.
 */
export function useStatusHistory() {
  const [entries, setEntries] = useState<StatusEntry[]>([]);

  const push = useCallback((entry: Omit<StatusEntry, 'id' | 'timestamp'>) => {
    const id = _nextId++;
    setEntries(prev => [{ ...entry, id, timestamp: Date.now() }, ...prev]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, push, clear };
}

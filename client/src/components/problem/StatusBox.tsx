import { useState, useCallback } from 'react';
import type { TestResult } from '../../utils/executor-types';

// ── Types ────────────────────────────────────────────────────────────────────

export type StatusEntryKind =
  | 'notice'      // sabotage, quiz result, draft saved, etc.
  | 'error'       // compile / runtime / fetch error
  | 'run'         // test-run result (with optional test rows)
  | 'stdout';     // sandbox free-run output

export interface StatusEntry {
  id: number;
  kind: StatusEntryKind;
  /** Plain text summary or notice message */
  text: string;
  /** For 'notice' kind — tailwind text colour token, e.g. 'text-orange' */
  color?: string;
  /** For 'run' kind */
  testResults?: TestResult[];
  /** For 'stdout' kind — raw program output */
  stdout?: string;
  /** Whether the run result was fully passing */
  allPassed?: boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

let _nextId = 1;

/**
 * Maintains an append-only log of StatusEntry items (newest-first).
 * Returns `{ entries, push, clear }`.
 * `push` and `clear` are stable (useCallback) so they're safe as effect deps.
 */
export function useStatusHistory() {
  const [entries, setEntries] = useState<StatusEntry[]>([]);

  const push = useCallback((entry: Omit<StatusEntry, 'id'>) => {
    const id = _nextId++;
    setEntries(prev => [{ ...entry, id }, ...prev]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, push, clear };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  entries: StatusEntry[];
  /** Override the outer container classes. */
  className?: string;
}

export default function StatusBox({
  entries,
  className = 'card text-sm shrink-0 h-32 overflow-y-auto',
}: Props) {
  return (
    <div className={className}>
      {entries.length === 0 && (
        <div className="px-4 py-2 text-text-faint text-xs">Ready.</div>
      )}
      {entries.map((entry, i) => {
        const rowBg = i % 2 === 0 ? '' : 'bg-surface-alt';
        return (
          <div key={entry.id} className={`px-4 py-2 ${rowBg}`}>
            {entry.kind === 'notice' && (
              <div className={`text-xs font-semibold ${entry.color ?? 'text-text'}`}>
                {entry.text}
              </div>
            )}

            {entry.kind === 'error' && (
              <pre className="text-red text-xs whitespace-pre-wrap">{entry.text}</pre>
            )}

            {entry.kind === 'run' && (
              <>
                <div className={`font-semibold text-xs mb-1 ${entry.allPassed ? 'text-green' : 'text-red'}`}>
                  {entry.text}
                </div>
                {entry.testResults?.map((r, j) => (
                  <div key={j} className="flex items-start gap-2 mb-0.5 text-xs">
                    <span className={r.passed ? 'text-green' : 'text-red'}>{r.passed ? '✓' : '✗'}</span>
                    <span className="text-text-muted">
                      in: <span className="text-text">{r.input}</span>
                      {' → '}expected: <span className="text-text">{r.expected}</span>
                      {' → '}got: <span className={r.passed ? 'text-text-muted' : 'text-red'}>{r.actual || r.error}</span>
                    </span>
                  </div>
                ))}
              </>
            )}

            {entry.kind === 'stdout' && (
              <pre className="text-green text-xs whitespace-pre-wrap">{entry.stdout || '(no output)'}</pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

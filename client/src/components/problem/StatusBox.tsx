import type { TestResult } from '../../utils/executor-types';

// ── Types ────────────────────────────────────────────────────────────────────

export type StatusEntryKind =
  | 'notice'   // sabotage, quiz result, draft saved, etc.
  | 'error'    // compile / runtime / fetch error
  | 'run'      // test-run result with per-test rows
  | 'stdout';  // sandbox free-run output

export interface StatusEntry {
  id: number;
  timestamp: number; // Date.now() when pushed
  kind: StatusEntryKind;
  text: string;
  /** tailwind text colour token for 'notice' kind, e.g. 'text-orange' */
  color?: string;
  testResults?: TestResult[];
  stdout?: string;
  allPassed?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  entries?: StatusEntry[];
  className?: string;
}

export default function StatusBox({
  entries = [],
  className = 'card text-sm shrink-0 h-32 overflow-y-auto',
}: Props) {
  return (
    <div className={className}>
      {entries.length === 0 && (
        <div className="px-4 py-2 text-text-faint text-xs">Ready.</div>
      )}
      {entries.map((entry, i) => {
        const rowBg = i % 2 === 0 ? 'bg-surface' : 'bg-surface-alt';
        return (
          <div key={entry.id} className={`px-4 py-2 ${rowBg}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
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

              <span className="text-[10px] text-text-faint font-mono shrink-0 pt-0.5">
                {formatTime(entry.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

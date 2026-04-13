import type { TestResult } from '../../utils/executor-types';

export type StatusEntryKind =
  | 'notice'
  | 'error'
  | 'run'
  | 'stdout';

export interface StatusEntry {
  id: number;
  timestamp: number;
  kind: StatusEntryKind;
  text: string;
  color?: string;
  testResults?: TestResult[];
  stdout?: string;
  allPassed?: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

interface Props {
  entries?: StatusEntry[];
  className?: string;
}

/**
 * Severity-coded status log for the live match.
 * Editorial treatment: each row is a hairline-left stripe in severity color;
 * no alternating row shades, no card chrome, mono timestamps.
 */
export default function StatusBox({
  entries = [],
  className = 'text-sm shrink-0 h-32 overflow-y-auto',
}: Props) {
  const severityColor = (entry: StatusEntry): string => {
    if (entry.kind === 'error') return 'var(--color-accent)';
    if (entry.kind === 'run') return entry.allPassed ? 'var(--color-green)' : 'var(--color-accent)';
    if (entry.kind === 'stdout') return 'var(--color-green)';
    // notice — rely on entry.color hint
    if (entry.color?.includes('green')) return 'var(--color-green)';
    if (entry.color?.includes('red')) return 'var(--color-accent)';
    if (entry.color?.includes('orange') || entry.color?.includes('yellow'))
      return 'var(--color-gold-bright)';
    return 'var(--color-hairline-strong)';
  };

  return (
    <div className={className}>
      {entries.length === 0 && (
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="w-1 h-3 rounded-sm bg-[var(--color-hairline-strong)]" />
          <span className="label-eyebrow">Ready</span>
        </div>
      )}
      {entries.map((entry) => {
        const accent = severityColor(entry);
        return (
          <div
            key={entry.id}
            className="px-4 py-2.5 flex items-start gap-3"
            style={{ borderBottom: '1px solid var(--color-hairline)' }}
          >
            <span
              className="w-0.5 self-stretch shrink-0 mt-0.5"
              style={{ background: accent }}
            />
            <div className="flex-1 min-w-0">
              {entry.kind === 'notice' && (
                <div
                  className="text-[12px]"
                  style={{ color: entry.color?.startsWith('text-') ? undefined : accent }}
                >
                  {entry.text}
                </div>
              )}

              {entry.kind === 'error' && (
                <pre className="text-[12px] mono-tabular whitespace-pre-wrap m-0" style={{ color: 'var(--color-accent)' }}>
                  {entry.text}
                </pre>
              )}

              {entry.kind === 'run' && (
                <>
                  <div
                    className="text-[12px] font-medium mb-1 mono-tabular"
                    style={{ color: accent }}
                  >
                    {entry.text}
                  </div>
                  {entry.testResults?.map((r, j) => (
                    <div key={j} className="flex items-start gap-2 mb-0.5 text-[11px] mono-tabular">
                      <span style={{ color: r.passed ? 'var(--color-green)' : 'var(--color-accent)' }}>
                        {r.passed ? '✓' : '✗'}
                      </span>
                      <span className="text-text-muted">
                        in: <span className="text-text">{r.input}</span>
                        {' → '}expected: <span className="text-text">{r.expected}</span>
                        {' → '}got:{' '}
                        <span style={{ color: r.passed ? 'var(--color-text-muted)' : 'var(--color-accent)' }}>
                          {r.actual || r.error}
                        </span>
                      </span>
                    </div>
                  ))}
                </>
              )}

              {entry.kind === 'stdout' && (
                <pre
                  className="text-[12px] mono-tabular whitespace-pre-wrap m-0"
                  style={{ color: 'var(--color-green)' }}
                >
                  {entry.stdout || '(no output)'}
                </pre>
              )}
            </div>

            <span
              className="label-eyebrow shrink-0 pt-0.5 mono-tabular"
              style={{ fontSize: 9 }}
            >
              {formatTime(entry.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

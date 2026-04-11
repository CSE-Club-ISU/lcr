import { useState } from 'react';
import type { Problem } from '../../module_bindings/types';

interface Props {
  problem: Problem | undefined;
}

export default function ProblemPanel({ problem }: Props) {
  const [tab, setTab] = useState<'problem' | 'examples'>('problem');

  const sampleCases: string[] = (() => {
    try { return JSON.parse(problem?.sampleTestCases ?? '[]'); } catch { return []; }
  })();
  const sampleResults: string[] = (() => {
    try { return JSON.parse(problem?.sampleTestResults ?? '[]'); } catch { return []; }
  })();

  return (
    <div className="card flex-[0_0_340px] p-5 overflow-y-auto flex flex-col gap-0">
      {/* Tabs */}
      <div className="flex gap-0.5 mb-4 border-b border-border pb-3">
        {(['problem', 'examples'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-[5px] rounded-[7px] border-none text-[13px] cursor-pointer capitalize ${
              tab === t
                ? 'bg-surface-alt text-text font-bold'
                : 'bg-transparent text-text-muted font-medium'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'problem' && (
        <div className="text-sm text-text leading-[1.7]">
          {problem ? (
            <div className="whitespace-pre-wrap">{problem.description}</div>
          ) : (
            <div className="text-text-muted">Loading problem…</div>
          )}
        </div>
      )}

      {tab === 'examples' && (
        <div className="flex flex-col gap-3">
          {sampleCases.length === 0 ? (
            <div className="text-[13px] text-text-muted">No examples available.</div>
          ) : (
            sampleCases.map((input, i) => (
              <div key={i} className="bg-surface-alt rounded-lg p-3.5">
                <div className="text-xs font-bold text-text-muted mb-2">EXAMPLE {i + 1}</div>
                <code className="font-mono text-[13px] block">
                  Input: {input}<br />
                  Output: {sampleResults[i] ?? '?'}
                </code>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

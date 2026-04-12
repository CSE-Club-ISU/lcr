import type { Problem } from '../../module_bindings/types';
import type { ReactNode } from 'react';

interface Props {
  problem: Problem | undefined;
  header?: ReactNode;
  topRight?: ReactNode;
  children?: ReactNode;
}

export default function ProblemPanel({ problem, header, topRight, children }: Props) {
  const sampleCases: string[] = problem?.sampleTestCases
    ? problem.sampleTestCases.split('|').filter(Boolean)
    : [];
  const sampleResults: string[] = problem?.sampleTestResults
    ? problem.sampleTestResults.split('|').filter(Boolean)
    : [];

  return (
    <div className="card flex-[0_0_340px] p-5 overflow-y-auto flex flex-col gap-0">
      {(header || topRight) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">{header}</div>
          {topRight && <div className="shrink-0">{topRight}</div>}
        </div>
      )}
      {children ? (
        children
      ) : problem ? (
        <>
          <div className="text-sm text-text leading-[1.7] whitespace-pre-wrap">
            {problem.description}
          </div>

          {sampleCases.length > 0 && (
            <div className="flex flex-col gap-3 mt-5">
              {sampleCases.map((input, i) => (
                <div key={i} className="bg-surface-alt rounded-lg p-3.5">
                  <div className="text-xs font-bold text-text-muted mb-2">EXAMPLE {i + 1}</div>
                  <code className="font-mono text-[13px] block">
                    Input: {input}<br />
                    Output: {sampleResults[i] ?? '?'}
                  </code>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-text-muted text-sm">Loading problem…</div>
      )}
    </div>
  );
}

import type { Problem } from '../../module_bindings/types';

interface Props {
  problem: Problem | undefined;
}

export default function ProblemPanel({ problem }: Props) {
  const sampleCases: string[] = problem?.sampleTestCases
    ? problem.sampleTestCases.split('|').filter(Boolean)
    : [];
  const sampleResults: string[] = problem?.sampleTestResults
    ? problem.sampleTestResults.split('|').filter(Boolean)
    : [];

  return (
    <div className="card flex-[0_0_340px] p-5 overflow-y-auto flex flex-col gap-0">
      {problem ? (
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

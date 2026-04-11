import { useState } from 'react';

export default function ProblemPanel() {
  const [tab, setTab] = useState<'problem' | 'examples' | 'hints'>('problem');

  return (
    <div className="card flex-[0_0_340px] p-5 overflow-y-auto flex flex-col gap-0">
      {/* Tabs */}
      <div className="flex gap-0.5 mb-4 border-b border-border pb-3">
        {(['problem', 'examples', 'hints'] as const).map(t => (
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
          <p className="mt-0">
            Given an array of integers{' '}
            <code className="bg-surface-alt px-1 py-px rounded font-mono">nums</code> and an
            integer{' '}
            <code className="bg-surface-alt px-1 py-px rounded font-mono">target</code>, return
            indices of the two numbers such that they add up to{' '}
            <code className="bg-surface-alt px-1 py-px rounded font-mono">target</code>.
          </p>
          <p>
            You may assume that each input would have <strong>exactly one solution</strong>, and
            you may not use the same element twice.
          </p>

          <div className="bg-surface-alt rounded-lg p-3.5 mt-3">
            <div className="text-xs font-bold text-text-muted mb-2">EXAMPLE 1</div>
            <code className="font-mono text-[13px]">
              Input: nums = [2,7,11,15], target = 9<br />
              Output: [0,1]
            </code>
          </div>
          <div className="bg-surface-alt rounded-lg p-3.5 mt-2">
            <div className="text-xs font-bold text-text-muted mb-2">EXAMPLE 2</div>
            <code className="font-mono text-[13px]">
              Input: nums = [3,2,4], target = 6<br />
              Output: [1,2]
            </code>
          </div>

          <div className="mt-4">
            <div className="text-xs font-bold text-text-muted mb-1.5">CONSTRAINTS</div>
            <ul className="m-0 pl-[18px] text-[13px] text-text-muted">
              <li>2 &le; nums.length &le; 10&sup4;</li>
              <li>&minus;10&sup9; &le; nums[i] &le; 10&sup9;</li>
              <li>Only one valid answer exists</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'examples' && (
        <div className="text-[13px] text-text-muted">Test cases appear here.</div>
      )}

      {tab === 'hints' && (
        <div className="text-[13px] text-text-muted">Think about hash maps.</div>
      )}
    </div>
  );
}

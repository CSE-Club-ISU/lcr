import CodeBlock from '../ui/CodeBlock';
import Pill from '../ui/Pill';

const INITIAL_CODE = `def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []`;

export default function CodeEditor() {
  return (
    <div className="flex-1 flex flex-col gap-3">
      <div className="flex-1 bg-surface-alt border border-border rounded-xl p-5 overflow-y-auto font-mono">
        <div className="flex justify-between mb-3.5 items-center">
          <Pill label="Python" color="blue" />
          <span className="text-xs text-text-faint">Auto-save on</span>
        </div>
        <CodeBlock code={INITIAL_CODE} />
      </div>
    </div>
  );
}

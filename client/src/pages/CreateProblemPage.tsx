import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '../module_bindings';

type Kind = 'algorithm' | 'data_structure';
type Difficulty = 'easy' | 'medium' | 'hard';

interface TestRow {
  input: string;
  expected: string;
}

const DEFAULT_COMPARE = 'def compare(expected, actual): return expected == actual';

const KIND_HINTS: Record<Kind, { input: string; expected: string }> = {
  algorithm: {
    input:    'JSON arg array, e.g. [1, 2, 3] or [[1,2], 5]',
    expected: 'JSON expected return value, e.g. 6 or [0,1]',
  },
  data_structure: {
    input:    'JSON op sequence, e.g. [["push",1],["push",2],["pop"]]',
    expected: 'JSON return value of the last op, e.g. 1',
  },
};

function emptyRow(): TestRow {
  return { input: '', expected: '' };
}

interface TestCaseEditorProps {
  label: string;
  rows: TestRow[];
  onChange: (rows: TestRow[]) => void;
  kind: Kind;
}

function TestCaseEditor({ label, rows, onChange, kind }: TestCaseEditorProps) {
  const hints = KIND_HINTS[kind];

  function updateRow(i: number, field: keyof TestRow, value: string) {
    const next = rows.map((r, j) => j === i ? { ...r, [field]: value } : r);
    onChange(next);
  }

  function addRow() {
    onChange([...rows, emptyRow()]);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, j) => j !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-text">{label}</div>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 flex flex-col gap-1">
            <input
              className="input-field font-mono text-[13px]"
              placeholder={hints.input}
              value={row.input}
              onChange={e => updateRow(i, 'input', e.target.value)}
            />
            <input
              className="input-field font-mono text-[13px]"
              placeholder={hints.expected}
              value={row.expected}
              onChange={e => updateRow(i, 'expected', e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="mt-1 px-2 py-1.5 rounded-[7px] border border-border bg-transparent text-text-muted text-[13px] cursor-pointer hover:text-red"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="self-start px-3 py-1.5 rounded-[7px] border border-border bg-transparent text-text-muted text-[13px] cursor-pointer hover:text-text"
      >
        + Add row
      </button>
    </div>
  );
}

export default function CreateProblemPage() {
  const navigate = useNavigate();
  const insertProblem = useReducer(reducers.insertProblem);

  const [kind, setKind] = useState<Kind>('algorithm');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [methodName, setMethodName] = useState('');
  const [boilerplate, setBoilerplate] = useState('');
  const [compareFunc, setCompareFunc] = useState(DEFAULT_COMPARE);
  const [sampleRows, setSampleRows] = useState<TestRow[]>([emptyRow()]);
  const [hiddenRows, setHiddenRows] = useState<TestRow[]>([emptyRow()]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function handleKindChange(next: Kind) {
    setKind(next);
    setMethodName('');
    setBoilerplate(next === 'algorithm'
      ? 'def my_function():\n    pass'
      : 'class MyStructure:\n    def __init__(self):\n        pass\n'
    );
  }

  function validate(): string {
    if (!title.trim()) return 'Title is required';
    if (!description.trim()) return 'Description is required';
    if (!methodName.trim()) return kind === 'algorithm' ? 'Method name is required' : 'Class name is required';
    if (!boilerplate.trim()) return 'Boilerplate code is required';
    if (sampleRows.every(r => !r.input.trim())) return 'At least one sample test case is required';
    if (hiddenRows.every(r => !r.input.trim())) return 'At least one hidden test case is required';
    for (const r of [...sampleRows, ...hiddenRows]) {
      if (!r.input.trim() || !r.expected.trim()) return 'All test case rows must have both input and expected filled in (or remove empty rows)';
    }
    return '';
  }

  function buildPipeString(rows: TestRow[], field: keyof TestRow): string {
    return rows.map(r => r[field]).join('|');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }

    insertProblem({
      title: title.trim(),
      description: description.trim(),
      difficulty,
      methodName: methodName.trim(),
      sampleTestCases: buildPipeString(sampleRows, 'input'),
      sampleTestResults: buildPipeString(sampleRows, 'expected'),
      hiddenTestCases: buildPipeString(hiddenRows, 'input'),
      hiddenTestResults: buildPipeString(hiddenRows, 'expected'),
      boilerplatePython: boilerplate.trim(),
      boilerplateJava: '',
      boilerplateCpp: '',
      compareFuncPython: compareFunc.trim() || DEFAULT_COMPARE,
      compareFuncJava: '',
      compareFuncCpp: '',
      isApproved: false,
      problemKind: kind,
    });

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-[640px] mx-auto pt-8">
        <div className="card p-8 flex flex-col gap-4 items-start">
          <div className="text-lg font-bold text-text">Problem submitted!</div>
          <p className="m-0 text-text-muted text-sm leading-relaxed">
            Your problem has been submitted for review. It will appear in games once an admin approves it.
          </p>
          <div className="flex gap-3">
            <button
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => {
                setSubmitted(false);
                setTitle(''); setDescription(''); setMethodName('');
                setBoilerplate(''); setCompareFunc(DEFAULT_COMPARE);
                setSampleRows([emptyRow()]); setHiddenRows([emptyRow()]);
              }}
            >
              Create another
            </button>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => navigate('/play')}>
              Back to play
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto pt-4 pb-12">
      <h1 className="text-2xl font-bold text-text mb-1">Create a problem</h1>
      <p className="text-text-muted text-sm mb-6">
        Problems are reviewed before going live. All players will see them once approved.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Kind */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-text">Problem type</div>
          <div className="flex gap-3">
            {(['algorithm', 'data_structure'] as Kind[]).map(k => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-sm text-text">
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => handleKindChange(k)}
                  className="accent-gold-bright"
                />
                {k === 'algorithm' ? 'Algorithm' : 'Data Structure'}
              </label>
            ))}
          </div>
          <p className="m-0 text-[12px] text-text-muted">
            {kind === 'algorithm'
              ? 'A standalone function that takes inputs and returns an output.'
              : 'A class with methods that operates on internal state. Test cases are op sequences; the last op\'s return value is graded.'}
          </p>
        </div>

        {/* Title */}
        <label className="flex flex-col gap-1.5 text-sm text-text font-semibold">
          Title
          <input
            className="input-field font-normal"
            placeholder="e.g. Two Sum"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </label>

        {/* Description */}
        <label className="flex flex-col gap-1.5 text-sm text-text font-semibold">
          Description
          <textarea
            className="input-field font-normal resize-y min-h-[120px] text-sm leading-relaxed"
            placeholder="Describe the problem. Markdown is not rendered — keep formatting simple."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </label>

        {/* Difficulty */}
        <div className="flex flex-col gap-1.5">
          <div className="text-sm font-semibold text-text">Difficulty</div>
          <div className="flex gap-3">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <label key={d} className="flex items-center gap-2 cursor-pointer text-sm text-text">
                <input
                  type="radio"
                  name="difficulty"
                  value={d}
                  checked={difficulty === d}
                  onChange={() => setDifficulty(d)}
                  className="accent-gold-bright"
                />
                <span className={d === 'easy' ? 'text-green' : d === 'medium' ? 'text-yellow' : 'text-red'}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Method / Class name */}
        <label className="flex flex-col gap-1.5 text-sm text-text font-semibold">
          {kind === 'algorithm' ? 'Method name' : 'Class name'}
          <input
            className="input-field font-mono font-normal"
            placeholder={kind === 'algorithm' ? 'e.g. two_sum' : 'e.g. MinStack'}
            value={methodName}
            onChange={e => setMethodName(e.target.value)}
            required
          />
          <span className="text-[12px] text-text-muted font-normal">
            {kind === 'algorithm'
              ? 'The exact Python function name the harness will call.'
              : 'The exact Python class name the harness will instantiate.'}
          </span>
        </label>

        {/* Boilerplate */}
        <label className="flex flex-col gap-1.5 text-sm text-text font-semibold">
          Starter code (Python)
          <textarea
            className="input-field font-mono font-normal resize-y min-h-[120px] text-[13px] leading-relaxed"
            placeholder={kind === 'algorithm'
              ? 'def two_sum(nums: list, target: int) -> list:\n    pass'
              : 'class MinStack:\n    def __init__(self):\n        pass\n\n    def push(self, val: int) -> None:\n        pass\n\n    def pop(self) -> None:\n        pass\n\n    def top(self) -> int:\n        pass'}
            value={boilerplate}
            onChange={e => setBoilerplate(e.target.value)}
            required
          />
        </label>

        {/* Compare func */}
        <label className="flex flex-col gap-1.5 text-sm text-text font-semibold">
          Comparison function (Python)
          <textarea
            className="input-field font-mono font-normal resize-y min-h-[60px] text-[13px] leading-relaxed"
            value={compareFunc}
            onChange={e => setCompareFunc(e.target.value)}
          />
          <span className="text-[12px] text-text-muted font-normal">
            Must define <code className="font-mono bg-surface-alt px-1 rounded">compare(expected, actual) -&gt; bool</code>.
            Use <code className="font-mono bg-surface-alt px-1 rounded">sorted()</code> for order-independent results.
          </span>
        </label>

        {/* Test cases */}
        <div className="flex flex-col gap-5">
          <TestCaseEditor
            label="Sample test cases (shown to players)"
            rows={sampleRows}
            onChange={setSampleRows}
            kind={kind}
          />
          <TestCaseEditor
            label="Hidden test cases (used for grading)"
            rows={hiddenRows}
            onChange={setHiddenRows}
            kind={kind}
          />
        </div>

        {error && (
          <p className="m-0 text-red text-[13px]">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
            Submit for review
          </button>
          <button type="button" className="btn-secondary px-4 py-2.5 text-sm" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}

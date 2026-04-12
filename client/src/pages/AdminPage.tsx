import { useState, useMemo } from 'react';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { Problem, User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProblemJson {
  title: string;
  kind: 'algorithm' | 'data_structure';
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  method_name: string;
  boilerplate_python: string;
  compare_func_python?: string;
  sample_test_cases: unknown[][];
  sample_test_results: unknown[];
  hidden_test_cases: unknown[][];
  hidden_test_results: unknown[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_COMPARE = 'def compare(expected, actual): return expected == actual';

function serializeCases(cases: unknown[][]): string {
  return cases.map(c => JSON.stringify(c)).join('|');
}

function serializeResults(results: unknown[]): string {
  return results.map(r => JSON.stringify(r)).join('|');
}

function validateProblemJson(obj: Record<string, unknown>): string {
  if (typeof obj.title !== 'string' || !obj.title.trim()) return 'Missing "title"';
  if (obj.kind !== 'algorithm' && obj.kind !== 'data_structure') return '"kind" must be "algorithm" or "data_structure"';
  if (obj.difficulty !== 'easy' && obj.difficulty !== 'medium' && obj.difficulty !== 'hard') return '"difficulty" must be "easy", "medium", or "hard"';
  if (typeof obj.description !== 'string' || !obj.description.trim()) return 'Missing "description"';
  if (typeof obj.method_name !== 'string' || !obj.method_name.trim()) return 'Missing "method_name"';
  if (typeof obj.boilerplate_python !== 'string' || !obj.boilerplate_python.trim()) return 'Missing "boilerplate_python"';
  if (!Array.isArray(obj.sample_test_cases) || obj.sample_test_cases.length === 0) return '"sample_test_cases" must be a non-empty array';
  if (!Array.isArray(obj.sample_test_results) || obj.sample_test_results.length === 0) return '"sample_test_results" must be a non-empty array';
  if (!Array.isArray(obj.hidden_test_cases) || obj.hidden_test_cases.length === 0) return '"hidden_test_cases" must be a non-empty array';
  if (!Array.isArray(obj.hidden_test_results) || obj.hidden_test_results.length === 0) return '"hidden_test_results" must be a non-empty array';
  return '';
}

// ---------------------------------------------------------------------------
// Problems tab
// ---------------------------------------------------------------------------

function ProblemsTab() {
  const [problems] = useTypedTable<Problem>(tables.problem);
  const [users] = useTypedTable<User>(tables.user);
  const deleteProblem = useReducer(reducers.deleteProblem);

  const sorted = useMemo(() => {
    return [...problems].sort((a, b) => a.title.localeCompare(b.title));
  }, [problems]);

  function creatorName(p: Problem): string {
    const u = users.find(u => identityEq(u.identity, p.createdBy));
    return u?.username || '—';
  }

  function handleDelete(p: Problem) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    deleteProblem({ id: p.id });
  }

  if (problems.length === 0) {
    return <div className="text-text-muted text-sm">No problems yet.</div>;
  }

  return (
    <div className="flex flex-col gap-0 rounded-[12px] overflow-hidden border border-border">
      {/* Header */}
      <div className="grid grid-cols-[1fr_110px_80px_90px_60px] gap-4 px-4 py-2.5 bg-surface-alt text-[11px] font-bold text-text-muted uppercase tracking-wide">
        <span>Title</span>
        <span>Kind</span>
        <span>Difficulty</span>
        <span>Created by</span>
        <span></span>
      </div>

      {sorted.map((p, i) => (
        <div
          key={p.id.toString()}
          className={`grid grid-cols-[1fr_110px_80px_90px_60px] gap-4 px-4 py-3 items-center text-sm ${
            i % 2 === 0 ? 'bg-surface' : 'bg-surface/60'
          } border-t border-border`}
        >
          <span className="font-medium text-text truncate">{p.title}</span>
          <span className="text-text-muted text-[12px]">
            {p.problemKind === 'data_structure' ? 'Data Struct.' : 'Algorithm'}
          </span>
          <span className={`text-[12px] font-semibold ${
            p.difficulty === 'easy' ? 'text-green' :
            p.difficulty === 'medium' ? 'text-yellow' : 'text-red'
          }`}>
            {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
          </span>
          <span className="text-text-muted text-[12px] truncate">{creatorName(p)}</span>
          <div className="flex items-center">
            <button
              onClick={() => handleDelete(p)}
              className="px-2 py-0.5 rounded-[6px] text-[12px] border border-border text-text-muted bg-transparent cursor-pointer hover:border-red hover:text-red"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create tab
// ---------------------------------------------------------------------------

const SCHEMA_EXAMPLE = `{
  "title": "Min Stack",
  "kind": "data_structure",
  "difficulty": "medium",
  "description": "Design a stack with O(1) getMin.",
  "method_name": "MinStack",
  "boilerplate_python": "class MinStack:\\n    def __init__(self): pass\\n    def push(self, val): pass\\n    def pop(self): pass\\n    def top(self): pass\\n    def getMin(self): pass",
  "sample_test_cases": [
    [["MinStack"],["push",-2],["push",0],["push",-3],["getMin"],["pop"],["top"],["getMin"]]
  ],
  "sample_test_results": [-3],
  "hidden_test_cases": [
    [["push",-2],["push",0],["push",-3],["getMin"],["pop"],["top"],["getMin"]]
  ],
  "hidden_test_results": [0]
}`;

const LLM_PROMPT = `Generate a coding problem in the following JSON format for a competitive programming app. Output only valid JSON (or a JSON array for multiple problems), no extra text.

Schema:
{
  "title": string,                  // problem name
  "kind": "algorithm" | "data_structure",
  "difficulty": "easy" | "medium" | "hard",
  "description": string,            // full problem statement
  "method_name": string,            // Python function name (algorithm) or class name (data_structure)
  "boilerplate_python": string,     // starter code shown to the player (use \\n for newlines)
  "compare_func_python": string,    // optional — Python function: def compare(expected, actual): return bool
                                    // omit for strict equality; use sorted() for order-independent results
  "sample_test_cases": array[],     // algorithm: list of arg arrays e.g. [[2,7,11,15], 9]
                                    // data_structure: list of op sequences e.g. [["push",1],["pop"]]
  "sample_test_results": array,     // one expected result per test case
                                    // data_structure: return value of the LAST op in each sequence
  "hidden_test_cases": array[],     // same format, used for final grading (not shown to player)
  "hidden_test_results": array
}

Algorithm example:
{
  "title": "Two Sum",
  "kind": "algorithm",
  "difficulty": "easy",
  "description": "Given an array of integers and a target, return indices of the two numbers that add up to the target.",
  "method_name": "two_sum",
  "boilerplate_python": "def two_sum(nums: list, target: int) -> list:\\n    pass",
  "compare_func_python": "def compare(expected, actual): return sorted(expected) == sorted(actual)",
  "sample_test_cases": [[[2,7,11,15], 9], [[3,2,4], 6]],
  "sample_test_results": [[0,1], [1,2]],
  "hidden_test_cases": [[[2,7,11,15], 9], [[3,2,4], 6], [[-1,-2,-3,-4,-5], -8]],
  "hidden_test_results": [[0,1], [1,2], [2,4]],
  "auto_approve": true
}

Data structure example:
${SCHEMA_EXAMPLE}

Now generate: `;

function CreateTab() {
  const insertProblem = useReducer(reducers.insertProblem);
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ProblemJson[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  function handleParse() {
    setParseError('');
    setParsed(null);
    setSubmitted(false);

    let data: unknown;
    try {
      data = JSON.parse(raw.trim());
    } catch (e) {
      setParseError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }

    const items: Record<string, unknown>[] = Array.isArray(data) ? data : [data as Record<string, unknown>];

    for (let i = 0; i < items.length; i++) {
      const err = validateProblemJson(items[i]);
      if (err) {
        setParseError(`Problem ${i + 1}: ${err}`);
        return;
      }
    }

    setParsed(items as unknown as ProblemJson[]);
  }

  function handleSubmit() {
    if (!parsed) return;
    for (const p of parsed) {
      insertProblem({
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        methodName: p.method_name,
        sampleTestCases: serializeCases(p.sample_test_cases),
        sampleTestResults: serializeResults(p.sample_test_results),
        hiddenTestCases: serializeCases(p.hidden_test_cases),
        hiddenTestResults: serializeResults(p.hidden_test_results),
        boilerplatePython: p.boilerplate_python,
        boilerplateJava: '',
        boilerplateCpp: '',
        compareFuncPython: p.compare_func_python || DEFAULT_COMPARE,
        compareFuncJava: '',
        compareFuncCpp: '',
        problemKind: p.kind,
      });
    }
    setSubmitCount(parsed.length);
    setSubmitted(true);
    setRaw('');
    setParsed(null);
  }

  const [schemaCopied, setSchemaCopied] = useState(false);

  function handleCopyPrompt() {
    navigator.clipboard.writeText(LLM_PROMPT)
      .then(() => {
        setSchemaCopied(true);
        setTimeout(() => setSchemaCopied(false), 2000);
      })
      .catch(err => console.error('Clipboard write failed:', err));
  }

  return (
    <div className="flex flex-col gap-5 max-w-[720px]">
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-text-muted text-sm leading-relaxed">
          Paste a JSON problem (or array of problems). Any LLM can generate this format.
          Arrays are accepted for bulk import.
        </p>
      </div>

      {/* Schema reference + copy prompt */}
      <details className="text-sm">
        <summary className="cursor-pointer text-text-muted hover:text-text select-none">
          Show JSON schema reference
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-text-muted">Copy a ready-made prompt to paste into any LLM, then fill in what you want at the end.</span>
            <button
              onClick={handleCopyPrompt}
              className="shrink-0 px-3 py-1 rounded-[7px] border border-border bg-transparent text-[12px] font-semibold cursor-pointer hover:border-gold-bright hover:text-text text-text-muted transition-colors"
            >
              {schemaCopied ? '✓ Copied!' : 'Copy LLM prompt'}
            </button>
          </div>
          <pre className="p-4 bg-surface-alt rounded-[10px] text-[12px] font-mono text-text overflow-x-auto whitespace-pre-wrap border border-border">
            {LLM_PROMPT}
          </pre>
        </div>
      </details>

      {/* Paste area */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-text">Paste JSON</label>
        <textarea
          className="input-field font-mono text-[13px] resize-y min-h-[240px] leading-relaxed"
          placeholder={SCHEMA_EXAMPLE}
          value={raw}
          onChange={e => { setRaw(e.target.value); setParsed(null); setParseError(''); setSubmitted(false); }}
          spellCheck={false}
        />
      </div>

      <div className="flex gap-3 items-center">
        <button
          className="btn-primary px-4 py-2 text-sm"
          onClick={handleParse}
          disabled={!raw.trim()}
        >
          Parse
        </button>
        {parseError && <span className="text-red text-[13px]">{parseError}</span>}
      </div>

      {/* Preview */}
      {parsed && (
        <div className="flex flex-col gap-4">
          <div className="text-sm font-semibold text-text">
            Preview — {parsed.length} problem{parsed.length !== 1 ? 's' : ''}
          </div>
          {parsed.map((p, i) => (
            <div key={i} className="card p-4 flex flex-col gap-2 text-sm border border-border">
              <div className="flex items-center gap-3">
                <span className="font-bold text-text">{p.title}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  p.difficulty === 'easy' ? 'bg-green/20 text-green' :
                  p.difficulty === 'medium' ? 'bg-yellow/20 text-yellow' :
                  'bg-red/20 text-red'
                }`}>
                  {p.difficulty}
                </span>
                <span className="text-[11px] text-text-muted bg-surface-alt px-2 py-0.5 rounded-full">
                  {p.kind}
                </span>
              </div>
              <p className="m-0 text-text-muted text-[13px] line-clamp-2">{p.description}</p>
              <div className="text-[12px] text-text-muted">
                <span className="font-mono bg-surface-alt px-1.5 py-0.5 rounded">{p.method_name}</span>
                &nbsp;·&nbsp;
                {p.sample_test_cases.length} sample test{p.sample_test_cases.length !== 1 ? 's' : ''}
                &nbsp;·&nbsp;
                {p.hidden_test_cases.length} hidden test{p.hidden_test_cases.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}

          <button className="btn-primary px-5 py-2.5 text-sm self-start" onClick={handleSubmit}>
            Submit {parsed.length} problem{parsed.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {submitted && (
        <div className="text-green text-sm font-semibold">
          ✓ {submitCount} problem{submitCount !== 1 ? 's' : ''} submitted. Check the Problems tab.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AdminPage
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const ctx = useSpacetimeDB();
  const [users] = useTypedTable<User>(tables.user);
  const [tab, setTab] = useState<'problems' | 'create'>('problems');

  const myUser = ctx.identity
    ? users.find(u => identityEq(u.identity, ctx.identity))
    : undefined;

  if (!myUser) {
    return <div className="text-text-muted text-sm">Loading…</div>;
  }

  if (!myUser.isAdmin) {
    return (
      <div className="text-text-muted text-sm">
        You don't have admin access.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-1">Admin</h1>
        <p className="text-text-muted text-sm">Manage problems and approve submissions.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border pb-3">
        {(['problems', 'create'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-[5px] rounded-[7px] border-none text-[13px] cursor-pointer capitalize ${
              tab === t
                ? 'bg-surface-alt text-text font-bold'
                : 'bg-transparent text-text-muted font-medium'
            }`}
          >
            {t === 'problems' ? 'Problems' : 'Create'}
          </button>
        ))}
      </div>

      {tab === 'problems' && <ProblemsTab />}
      {tab === 'create'   && <CreateTab />}
    </div>
  );
}

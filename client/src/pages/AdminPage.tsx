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
  boilerplate_java?: string;
  boilerplate_cpp?: string;
  sample_test_cases: unknown[][];
  sample_test_results: unknown[];
  hidden_test_cases: unknown[][];
  hidden_test_results: unknown[];
}

// Fields shown/edited in the inline editor (raw pipe-delimited strings)
interface EditDraft {
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problemKind: 'algorithm' | 'data_structure';
  description: string;
  methodName: string;
  boilerplatePython: string;
  boilerplateJava: string;
  boilerplateCpp: string;
  sampleTestCases: string;
  sampleTestResults: string;
  hiddenTestCases: string;
  hiddenTestResults: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

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

function problemToDraft(p: Problem): EditDraft {
  return {
    title:             p.title,
    difficulty:        p.difficulty as EditDraft['difficulty'],
    problemKind:       p.problemKind as EditDraft['problemKind'],
    description:       p.description,
    methodName:        p.methodName,
    boilerplatePython: p.boilerplatePython,
    boilerplateJava:   p.boilerplateJava ?? '',
    boilerplateCpp:    p.boilerplateCpp  ?? '',
    sampleTestCases:   p.sampleTestCases,
    sampleTestResults: p.sampleTestResults,
    hiddenTestCases:   p.hiddenTestCases,
    hiddenTestResults: p.hiddenTestResults,
  };
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------

function EditModal({ problem, onClose }: { problem: Problem; onClose: () => void }) {
  const updateProblem = useReducer(reducers.updateProblem);
  const [draft, setDraft] = useState<EditDraft>(() => problemToDraft(problem));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [boilerplateTab, setBoilerplateTab] = useState<'python' | 'java' | 'cpp'>('python');

  function field(key: keyof EditDraft) {
    return {
      value: draft[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setDraft(prev => ({ ...prev, [key]: e.target.value })),
    };
  }

  function handleSave() {
    if (!draft.title.trim()) { setError('Title is required'); return; }
    if (!draft.methodName.trim()) { setError('Method name is required'); return; }
    if (!draft.description.trim()) { setError('Description is required'); return; }
    setError('');
    setSaving(true);
    updateProblem({
      id:                 problem.id,
      title:              draft.title.trim(),
      description:        draft.description,
      difficulty:         draft.difficulty,
      methodName:         draft.methodName.trim(),
      sampleTestCases:    draft.sampleTestCases,
      sampleTestResults:  draft.sampleTestResults,
      hiddenTestCases:    draft.hiddenTestCases,
      hiddenTestResults:  draft.hiddenTestResults,
      boilerplatePython:  draft.boilerplatePython,
      boilerplateJava:    draft.boilerplateJava,
      boilerplateCpp:     draft.boilerplateCpp,
      problemKind:        draft.problemKind,
    });
    setSaving(false);
    onClose();
  }

  const inputCls = 'input-field text-sm w-full';
  const textareaCls = 'input-field text-sm w-full font-mono resize-y';
  const labelCls = 'text-[11px] font-bold text-text-muted uppercase tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg border border-border rounded-[16px] w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <span className="font-bold text-text">Edit Problem</span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text bg-transparent border-none cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Title</label>
            <input className={inputCls} {...field('title')} />
          </div>

          {/* Difficulty + Kind row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Difficulty</label>
              <select className={inputCls} {...field('difficulty')}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Kind</label>
              <select className={inputCls} {...field('problemKind')}>
                <option value="algorithm">Algorithm</option>
                <option value="data_structure">Data Structure</option>
              </select>
            </div>
          </div>

          {/* Method name */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Method / Class Name</label>
            <input className={`${inputCls} font-mono`} {...field('methodName')} />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Description</label>
            <textarea className={textareaCls} rows={5} {...field('description')} />
          </div>

          {/* Boilerplate (tabbed) */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Boilerplate</label>
            <div className="flex gap-1 mb-1">
              {(['python', 'java', 'cpp'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setBoilerplateTab(lang)}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-md border cursor-pointer ${boilerplateTab === lang ? 'border-accent text-accent bg-surface-alt' : 'border-border text-text-muted bg-transparent hover:text-text'}`}
                >
                  {lang === 'python' ? 'Python' : lang === 'java' ? 'Java' : 'C++'}
                </button>
              ))}
            </div>
            {boilerplateTab === 'python' && <textarea className={textareaCls} rows={6} {...field('boilerplatePython')} />}
            {boilerplateTab === 'java'   && <textarea className={textareaCls} rows={6} {...field('boilerplateJava')} />}
            {boilerplateTab === 'cpp'    && <textarea className={textareaCls} rows={6} {...field('boilerplateCpp')} />}
          </div>

          {/* Test cases — pipe-delimited raw strings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Sample Test Cases <span className="normal-case font-normal">(pipe-delimited)</span></label>
              <textarea className={textareaCls} rows={4} {...field('sampleTestCases')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Sample Results <span className="normal-case font-normal">(pipe-delimited)</span></label>
              <textarea className={textareaCls} rows={4} {...field('sampleTestResults')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Hidden Test Cases <span className="normal-case font-normal">(pipe-delimited)</span></label>
              <textarea className={textareaCls} rows={4} {...field('hiddenTestCases')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Hidden Results <span className="normal-case font-normal">(pipe-delimited)</span></label>
              <textarea className={textareaCls} rows={4} {...field('hiddenTestResults')} />
            </div>
          </div>

          {error && <p className="text-red text-sm m-0">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2 text-sm">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Problems tab
// ---------------------------------------------------------------------------

function ProblemsTab() {
  const [problems] = useTypedTable<Problem>(tables.problem);
  const [users] = useTypedTable<User>(tables.user);
  const deleteProblem = useReducer(reducers.deleteProblem);

  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [filterKind, setFilterKind] = useState<'all' | 'algorithm' | 'data_structure'>('all');
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...problems]
      .filter(p => {
        if (filterDifficulty !== 'all' && p.difficulty !== filterDifficulty) return false;
        if (filterKind !== 'all' && p.problemKind !== filterKind) return false;
        if (q && !p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const dd = (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0);
        return dd !== 0 ? dd : a.title.localeCompare(b.title);
      });
  }, [problems, search, filterDifficulty, filterKind]);

  function creatorName(p: Problem): string {
    const u = users.find(u => identityEq(u.identity, p.createdBy));
    return u?.username || '—';
  }

  function handleDelete(p: Problem) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    deleteProblem({ id: p.id });
  }

  const filterBtnCls = (active: boolean) =>
    `px-2.5 py-1 rounded-[7px] border text-[12px] font-semibold cursor-pointer transition-all ${
      active
        ? 'border-accent bg-accent/10 text-accent'
        : 'border-border bg-transparent text-text-muted hover:text-text'
    }`;

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input-field text-sm w-56"
          placeholder="Search problems…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="flex items-center gap-1.5">
          {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => setFilterDifficulty(d)}
              className={filterBtnCls(filterDifficulty === d)}
            >
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'algorithm', 'data_structure'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilterKind(k)}
              className={filterBtnCls(filterKind === k)}
            >
              {k === 'all' ? 'All kinds' : k === 'algorithm' ? 'Algorithm' : 'Data Struct.'}
            </button>
          ))}
        </div>

        <span className="text-[12px] text-text-muted ml-auto">
          {filtered.length} / {problems.length} problems
        </span>
      </div>

      {problems.length === 0 && (
        <div className="text-text-muted text-sm">No problems yet.</div>
      )}

      {problems.length > 0 && filtered.length === 0 && (
        <div className="text-text-muted text-sm">No problems match the current filter.</div>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col gap-0 rounded-[12px] overflow-hidden border border-border">
          {/* Header */}
          <div className="grid grid-cols-[1fr_110px_80px_90px_100px] gap-4 px-4 py-2.5 bg-surface-alt text-[11px] font-bold text-text-muted uppercase tracking-wide">
            <span>Title</span>
            <span>Kind</span>
            <span>Difficulty</span>
            <span>Created by</span>
            <span></span>
          </div>

          {filtered.map((p, i) => (
            <div
              key={p.id.toString()}
              className={`grid grid-cols-[1fr_110px_80px_90px_100px] gap-4 px-4 py-3 items-center text-sm ${
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingProblem(p)}
                  className="px-2 py-0.5 rounded-[6px] text-[12px] border border-border text-text-muted bg-transparent cursor-pointer hover:border-accent hover:text-accent"
                >
                  Edit
                </button>
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
      )}

      {editingProblem && (
        <EditModal
          problem={editingProblem}
          onClose={() => setEditingProblem(null)}
        />
      )}
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
  "boilerplate_java": "class MinStack {\\n    public MinStack() {}\\n    public void push(Object... args) {}\\n    public Object pop(Object... args) { return null; }\\n    public Object top(Object... args) { return null; }\\n    public Object getMin(Object... args) { return null; }\\n    public Object call(String m, Object... a) throws Exception {\\n        return (Object) getClass().getMethod(m, Object[].class).invoke(this, (Object) a);\\n    }\\n}",
  "boilerplate_cpp": "#include <stack>\\nstruct MinStack {\\n    json call(const std::string& m, const json& a) {\\n        if (m == \\"push\\") { /* ... */ return nullptr; }\\n        if (m == \\"pop\\")  { /* ... */ return nullptr; }\\n        if (m == \\"top\\")  { return nullptr; }\\n        if (m == \\"getMin\\") { return nullptr; }\\n        throw std::runtime_error(\\"unknown op: \\" + m);\\n    }\\n};",
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
  "method_name": string,            // function name (algorithm) or class name (data_structure)
  "boilerplate_python": string,     // Python starter code (use \\n for newlines)
  "boilerplate_java": string,       // optional — Java starter code
  "boilerplate_cpp": string,        // optional — C++ starter code
  "sample_test_cases": array[],     // algorithm: list of arg arrays e.g. [[2,7,11,15], 9]
                                    // data_structure: list of op sequences e.g. [["push",1],["pop"]]
  "sample_test_results": array,     // one expected result per test case
                                    // data_structure: return value of the LAST op in each sequence
  "hidden_test_cases": array[],     // same format, used for final grading (not shown to player)
  "hidden_test_results": array
}

Java contract: algorithm methods must have signature \`public static Object <method_name>(Object... args)\`.
Data structure classes must have a \`public Object call(String m, Object... a)\` dispatch method.

C++ contract: algorithm functions must have signature \`json <method_name>(const json& args)\`.
Data structure structs must have a \`json call(const std::string& m, const json& a)\` dispatch method.

Algorithm example:
{
  "title": "Two Sum",
  "kind": "algorithm",
  "difficulty": "easy",
  "description": "Given an array of integers and a target, return indices of the two numbers that add up to the target.",
  "method_name": "two_sum",
  "boilerplate_python": "def two_sum(nums: list, target: int) -> list:\\n    pass",
  "boilerplate_java": "public static Object two_sum(Object... args) {\\n    return null;\\n}",
  "boilerplate_cpp": "json two_sum(const json& args) {\\n    return nullptr;\\n}",
  "sample_test_cases": [[[2,7,11,15], 9], [[3,2,4], 6]],
  "sample_test_results": [[0,1], [1,2]],
  "hidden_test_cases": [[[2,7,11,15], 9], [[3,2,4], 6], [[-1,-2,-3,-4,-5], -8]],
  "hidden_test_results": [[0,1], [1,2], [2,4]]
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
        boilerplateJava: p.boilerplate_java ?? '',
        boilerplateCpp: p.boilerplate_cpp ?? '',
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

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSpacetimeDB } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { Problem } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { difficultyColor } from '../utils/difficulty';
import { useSettings } from '../hooks/useSettings';
import type { ExecuteResponse } from '../utils/executor-types';
import Pill from '../components/ui/Pill';
import ProblemPanel from '../components/problem/ProblemPanel';
import CodeEditor from '../components/problem/CodeEditor';
import StatusBox, { useStatusHistory } from '../components/problem/StatusBox';
import { type Language, getBoilerplate, loadSavedLang, saveLang } from '../utils/languages';
import SandboxTab from '../components/practice/SandboxTab';
import QuizModeTab from '../components/practice/QuizModeTab';

const EXECUTOR_URL = import.meta.env.VITE_EXECUTOR_URL ?? 'http://localhost:8000';
const EXECUTOR_SECRET = import.meta.env.VITE_EXECUTOR_SECRET ?? '';


// ── Problem picker dropdown ──────────────────────────────────────────────────

interface ProblemPickerProps {
  problems: Problem[];
  selected: Problem | undefined;
  onSelect: (p: Problem) => void;
}

function ProblemPicker({ problems, selected, onSelect }: ProblemPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(
      p => p.title.toLowerCase().includes(q) || p.difficulty.toLowerCase().includes(q),
    );
  }, [problems, query]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleSelect(p: Problem) {
    onSelect(p);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border border-border bg-surface rounded-lg px-3 py-1.5 text-[13px] text-text cursor-pointer hover:bg-surface-alt max-w-56 min-w-40"
      >
        {selected ? (
          <>
            <span className={`text-[11px] font-semibold shrink-0 ${
              selected.difficulty === 'easy' ? 'text-green' :
              selected.difficulty === 'hard' ? 'text-red' : 'text-yellow'
            }`}>
              {selected.difficulty[0].toUpperCase()}
            </span>
            <span className="truncate">{selected.title}</span>
          </>
        ) : (
          <span className="text-text-muted">Select problem…</span>
        )}
        <span className="ml-auto text-text-faint text-[10px] shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-surface border border-border rounded-xl shadow-lg flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search problems…"
              className="w-full bg-surface-alt border border-border rounded-lg px-3 py-1.5 text-[13px] text-text placeholder:text-text-faint outline-none focus:border-border-strong"
            />
          </div>
          <div className="overflow-y-auto max-h-64">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-text-muted">No problems found.</div>
            ) : (
              filtered.map(p => (
                <button
                  key={String(p.id)}
                  onClick={() => handleSelect(p)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] border-none cursor-pointer transition-colors ${
                    p.id === selected?.id
                      ? 'bg-accent-soft text-text'
                      : 'bg-transparent text-text hover:bg-surface-alt'
                  }`}
                >
                  <span className={`text-[10px] font-bold w-5 shrink-0 ${
                    p.difficulty === 'easy' ? 'text-green' :
                    p.difficulty === 'hard' ? 'text-red' : 'text-yellow'
                  }`}>
                    {p.difficulty[0].toUpperCase()}
                  </span>
                  <span className="truncate">{p.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

type PracticeTab = 'coding' | 'sandbox' | 'quiz';

const TAB_LABELS: Record<PracticeTab, string> = {
  coding:  'Coding',
  sandbox: 'Sandbox',
  quiz:    'Quiz Mode',
};

export default function PracticeScreen() {
  const ctx = useSpacetimeDB();
  const [settings] = useSettings();
  const [activeTab, setActiveTab] = useState<PracticeTab>('coding');

  const [problems] = useTypedTable<Problem>(tables.problem);

  const approvedProblems = useMemo(
    () => problems.filter(p => p.isApproved),
    [problems],
  );

  const [problemId, setProblemIdRaw] = useState<bigint | undefined>(undefined);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [code, setCode] = useState('');
  const [resetCount, setResetCount] = useState(0);
  const baseRef = useRef(0);
  const [selectedLangState, setSelectedLangState] = useState<Language>(loadSavedLang);
  function setSelectedLang(lang: Language) {
    saveLang(lang);
    setSelectedLangState(lang);
  }

  // Auto-select first problem if nothing stored or stored id is gone
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || approvedProblems.length === 0) return;
    seededRef.current = true;
    if (problemId !== undefined && approvedProblems.some(p => p.id === problemId)) return;
    setProblemIdRaw(approvedProblems[0].id);
  }, [approvedProblems]);

  const problem = useMemo(
    () => (problemId !== undefined ? problems.find(p => p.id === problemId) : undefined),
    [problems, problemId],
  );

  const status = useStatusHistory();

  function selectProblem(p: Problem) {
    setProblemIdRaw(p.id);
    setCode(getBoilerplate(p, selectedLangState));
    setResetCount(c => c + 1);
    status.clear();
  }

  // ── Stopwatch ────────────────────────────────────────────────────────────────

  const [isRunning, setIsRunning] = useState(false);
  const segStartRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) return;
    segStartRef.current = Date.now();
    const tick = () => {
      setElapsedSec(baseRef.current + Math.floor((Date.now() - segStartRef.current) / 1000));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  function toggleTimer() {
    if (isRunning) {
      baseRef.current = baseRef.current + Math.floor((Date.now() - segStartRef.current) / 1000);
      setElapsedSec(baseRef.current);
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  }

  function resetTimer() {
    setIsRunning(false);
    baseRef.current = 0;
    setElapsedSec(0);
  }

  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const secs = String(elapsedSec % 60).padStart(2, '0');
  const timeStr = `${mins}:${secs}`;

  // ── Editor ───────────────────────────────────────────────────────────────────

  function resetCode() {
    if (!problem) return;
    setCode(getBoilerplate(problem, selectedLangState));
    setResetCount(c => c + 1);
    status.clear();
  }


  // ── Execute ──────────────────────────────────────────────────────────────────

  const [running, setRunning] = useState(false);

  async function runTests() {
    if (!problem || running) return;
    setRunning(true);
    try {
      const res = await fetch(`${EXECUTOR_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(EXECUTOR_SECRET ? { 'X-Executor-Secret': EXECUTOR_SECRET } : {}),
        },
        body: JSON.stringify({
          game_id: '',
          player_identity: ctx.identity?.toHexString() ?? '',
          code,
          lang: selectedLangState,
          problem_id: Number(problem.id),
          mode: 'run',
          solve_time: elapsedSec,
        }),
      });
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        status.push({ kind: 'error', text: `Too many requests — wait ${retryAfter ?? 'a few'} second(s) before running again.` });
        return;
      }
      const data: ExecuteResponse = await res.json();
      if (data.compile_error) {
        status.push({ kind: 'error', text: data.compile_error });
      } else if (data.runtime_error) {
        status.push({ kind: 'error', text: data.runtime_error });
      } else {
        status.push({
          kind: 'run',
          text: `${data.passed} / ${data.total} tests passed`,
          testResults: data.results,
          allPassed: data.results.every(r => r.passed),
        });
      }
    } catch (e) {
      status.push({ kind: 'error', text: String(e) });
    } finally {
      setRunning(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-120px)]">
      {/* Tab bar */}
      <div className="flex gap-1 mb-3 border-b border-border shrink-0">
        {(Object.keys(TAB_LABELS) as PracticeTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors cursor-pointer',
              activeTab === tab
                ? 'border-accent text-accent bg-accent-soft'
                : 'border-transparent text-text-muted hover:text-text hover:bg-surface',
            ].join(' ')}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Coding tab */}
      {activeTab === 'coding' && (
        <>
          {/* Top bar */}
          <div className="card px-5 py-3 mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {problem && (
                <>
                  <Pill label={problem.difficulty} color={difficultyColor(problem.difficulty)} />
                  <span className="font-bold text-[15px] text-text truncate">{problem.title}</span>
                </>
              )}
              {!problem && <span className="text-text-muted text-sm">Loading…</span>}
            </div>

            <ProblemPicker
              problems={approvedProblems}
              selected={problem}
              onSelect={selectProblem}
            />

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center">
                <div className="text-[11px] text-text-muted">TIME</div>
                <div className="font-extrabold text-lg tracking-tight text-text font-mono">{timeStr}</div>
              </div>
              <button
                onClick={toggleTimer}
                className="text-[12px] text-text border border-border bg-surface rounded-lg px-3 py-1 cursor-pointer hover:bg-surface-alt w-16"
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={resetTimer}
                className="text-[12px] text-text-faint border border-border bg-transparent rounded-lg px-3 py-1 cursor-pointer hover:text-text"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Main split */}
          <div className="flex gap-3 flex-1 min-h-0">
            <ProblemPanel problem={problem} />
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {problem && (
                <CodeEditor
                  key={`${String(problemId)}:${selectedLangState}-${resetCount}`}
                  initialCode={getBoilerplate(problem, selectedLangState)}
                  onChange={setCode}
                  language={selectedLangState}
                  onLanguageChange={(lang) => {
                    setSelectedLang(lang);
                    setCode(getBoilerplate(problem, lang));
                    setResetCount(c => c + 1);
                  }}
                  vimMode={settings.vimMode}
                />
              )}

              <StatusBox entries={status.entries} />

              <div className="flex gap-2.5 shrink-0">
                <button
                  onClick={resetCode}
                  disabled={!problem}
                  className="py-[11px] px-5 rounded-[10px] border border-border bg-transparent text-text-muted font-bold text-sm cursor-pointer hover:text-text hover:bg-surface disabled:opacity-50"
                >
                  ↺ Reset
                </button>
                <button
                  onClick={runTests}
                  disabled={!problem || running}
                  className="flex-1 py-[11px] rounded-[10px] border border-border bg-surface text-text font-bold text-sm cursor-pointer hover:bg-surface-alt disabled:opacity-50"
                >
                  {running ? 'Running…' : '▷ Run Tests'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sandbox tab */}
      {activeTab === 'sandbox' && <SandboxTab />}

      {/* Quiz tab */}
      {activeTab === 'quiz' && (
        <div className="card flex-1 min-h-0 overflow-hidden p-6">
          <QuizModeTab />
        </div>
      )}
    </div>
  );
}

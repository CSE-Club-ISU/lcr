import { useState, useEffect, useMemo, useRef } from 'react';
import { useSpacetimeDB } from 'spacetimedb/react';
import { ChevronDown, Play, RotateCcw, Search } from 'lucide-react';
import { tables } from '../module_bindings';
import type { Problem } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { difficultyColor } from '../utils/difficulty';
import { useSettings } from '../hooks/useSettings';
import type { ExecuteResponse } from '../utils/executor-types';
import Pill from '../components/ui/Pill';
import ProblemPanel from '../components/problem/ProblemPanel';
import CodeEditor from '../components/problem/CodeEditor';
import StatusBox from '../components/problem/StatusBox';
import { useStatusHistory } from '../components/problem/useStatusHistory';
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

  const diffDot = (d: string) =>
    d === 'easy' ? 'var(--color-green)' : d === 'hard' ? 'var(--color-accent)' : 'var(--color-gold-bright)';

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-text cursor-pointer max-w-64 min-w-44 rounded-md transition-colors"
        style={{ border: '1px solid var(--color-hairline-strong)', background: 'transparent' }}
      >
        {selected ? (
          <>
            <span className="block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: diffDot(selected.difficulty) }} />
            <span className="truncate" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>{selected.title}</span>
          </>
        ) : (
          <span className="text-text-muted">Select problem…</span>
        )}
        <ChevronDown size={12} className="ml-auto text-text-faint shrink-0" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-80 flex flex-col overflow-hidden rounded-md"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline-strong)', boxShadow: 'var(--shadow-md)' }}
        >
          <div className="px-3 pt-3 pb-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-hairline)' }}>
            <Search size={13} className="text-text-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search problems…"
              className="w-full bg-transparent text-[13px] text-text placeholder:text-text-faint outline-none border-0"
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
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] border-none cursor-pointer transition-colors"
                  style={{
                    background: p.id === selected?.id ? 'rgba(192, 39, 45, 0.06)' : 'transparent',
                    color: 'var(--color-text)',
                  }}
                >
                  <span className="block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: diffDot(p.difficulty) }} />
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

  // Seed code when problem first resolves (auto-select sets problemId but not code)
  useEffect(() => {
    if (problem && !code) setCode(getBoilerplate(problem, selectedLangState));
  }, [problem?.id]);

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
    <div className="enter-fade flex flex-col gap-0 h-[calc(100vh-120px)]">
      {/* Editorial tab strip */}
      <div className="flex items-center gap-6 mb-5 shrink-0" style={{ borderBottom: '1px solid var(--color-hairline)' }}>
        {(Object.keys(TAB_LABELS) as PracticeTab[]).map(tab => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-1 pb-3 -mb-px text-[13px] cursor-pointer transition-colors"
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: active ? 'italic' : 'normal',
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                borderBottom: active ? '1px solid var(--color-gold-bright)' : '1px solid transparent',
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {/* Coding tab */}
      {activeTab === 'coding' && (
        <>
          {/* Top bar */}
          <div
            className="px-5 py-3 mb-4 flex items-center justify-between gap-4 rounded-md"
            style={{ border: '1px solid var(--color-hairline)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {problem && (
                <>
                  <Pill label={problem.difficulty} color={difficultyColor(problem.difficulty)} variant="hairline" />
                  <span
                    className="truncate"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 17,
                      color: 'var(--color-text)',
                      fontVariationSettings: '"opsz" 144',
                    }}
                  >
                    {problem.title}
                  </span>
                </>
              )}
              {!problem && <span className="text-text-muted text-sm">Loading…</span>}
            </div>

            <ProblemPicker
              problems={approvedProblems}
              selected={problem}
              onSelect={selectProblem}
            />

            <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col items-end leading-none">
                <span className="label-eyebrow" style={{ fontSize: 9 }}>Time</span>
                <span className="mono-tabular tracking-tight" style={{ fontSize: 18 }}>{timeStr}</span>
              </div>
              <button
                onClick={toggleTimer}
                className="text-[12px] text-text px-3 py-1 cursor-pointer rounded-sm transition-colors"
                style={{ border: '1px solid var(--color-hairline-strong)', background: 'transparent', minWidth: 60 }}
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={resetTimer}
                className="text-[12px] text-text-faint px-3 py-1 cursor-pointer rounded-sm hover:text-text transition-colors"
                style={{ background: 'transparent', border: 'none' }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Main split */}
          <div className="flex gap-4 flex-1 min-h-0">
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

              <div style={{ border: '1px solid var(--color-hairline)' }} className="rounded-md overflow-hidden">
                <StatusBox entries={status.entries} />
              </div>

              <div className="flex gap-2.5 shrink-0">
                <button
                  onClick={resetCode}
                  disabled={!problem}
                  className="btn-ghost"
                  style={{ opacity: !problem ? 0.4 : 1 }}
                >
                  <RotateCcw size={13} /> Reset
                </button>
                <button
                  onClick={runTests}
                  disabled={!problem || running}
                  className="btn-editorial flex-1 justify-center"
                  style={{ opacity: !problem || running ? 0.5 : 1 }}
                >
                  <Play size={13} /> {running ? 'Running…' : 'Run tests'}
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
        <div className="flex-1 min-h-0 overflow-hidden p-6 rounded-md" style={{ border: '1px solid var(--color-hairline)' }}>
          <QuizModeTab />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { GameState, Problem, Room, User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';
import { useSettings } from '../hooks/useSettings';
import { usePowerupCurrency } from '../hooks/usePowerupCurrency';
import type { TestResult, ExecuteResponse } from '../utils/executor-types';
import Pill from '../components/ui/Pill';
import CodeEditor, { type CodeEditorHandle } from '../components/problem/CodeEditor';
import { useSabotageHandler } from '../components/powerup/useSabotageHandler';
import { type Language, getBoilerplate, loadSavedLang, saveLang } from '../utils/languages';
import { parseRoomSettings } from '../types/roomSettings';
import PowerupShop from '../components/powerup/PowerupShop';

const EXECUTOR_URL = import.meta.env.VITE_EXECUTOR_URL ?? 'http://localhost:8000';
const EXECUTOR_SECRET = import.meta.env.VITE_EXECUTOR_SECRET ?? '';
const DRAFT_DEBOUNCE_MS = 1000;

export default function ProblemScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctx = useSpacetimeDB();
  const forfeit = useReducer(reducers.forfeit);
  const saveDraft = useReducer(reducers.saveDraft);
  const adminSolveProblem = useReducer(reducers.adminSolveProblem);
  const [settings] = useSettings();

  const gameId = searchParams.get('game') ?? '';

  const [games]    = useTypedTable<GameState>(tables.game_state);
  const [problems] = useTypedTable<Problem>(tables.problem);
  const [users]    = useTypedTable<User>(tables.user);
  const [rooms]    = useTypedTable<Room>(tables.room);

  const game = games.find(g => g.id === gameId);
  const isP1 = identityEq(game?.player1Identity, ctx.identity);

  // All problem ids for this game, ordered as assigned by server (easy→hard)
  const problemIds: string[] = useMemo(() => {
    if (!game) return [];
    try { return JSON.parse(game.problemIds); }
    catch (e) { console.error('[ProblemScreen] failed to parse problemIds:', e); return []; }
  }, [game?.problemIds]);

  const problemCount = problemIds.length;

  // My solved ids (set for O(1) lookup)
  const mySolvedIds: Set<string> = useMemo(() => {
    if (!game) return new Set();
    try {
      const raw = isP1 ? game.player1SolvedIds : game.player2SolvedIds;
      return new Set(JSON.parse(raw ?? '[]'));
    } catch (e) { console.error('[ProblemScreen] failed to parse my solvedIds:', e); return new Set(); }
  }, [game?.player1SolvedIds, game?.player2SolvedIds, isP1]);

  // Opponent's solved ids
  const oppSolvedIds: Set<string> = useMemo(() => {
    if (!game) return new Set();
    try {
      const raw = isP1 ? game.player2SolvedIds : game.player1SolvedIds;
      return new Set(JSON.parse(raw ?? '[]'));
    } catch (e) { console.error('[ProblemScreen] failed to parse opp solvedIds:', e); return new Set(); }
  }, [game?.player1SolvedIds, game?.player2SolvedIds, isP1]);

  // Currently viewed problem index (navigation)
  const [viewIndex, setViewIndex] = useState(0);
  const [panelTab, setPanelTab] = useState<'problem' | 'powerups'>('problem');

  // When a new problem is solved, stay on current view (don't auto-advance)
  const viewedProblemId = problemIds[viewIndex] ?? '';
  const viewedProblem: Problem | undefined = useMemo(() => {
    if (!viewedProblemId) return undefined;
    return problems.find(p => p.id === BigInt(viewedProblemId));
  }, [viewedProblemId, problems]);

  const isSolved = mySolvedIds.has(viewedProblemId);

  // Selected language — persisted to localStorage, shared across all problems/games
  const [selectedLang, setSelectedLangState] = useState<Language>(loadSavedLang);

  function setSelectedLang(lang: Language) {
    saveLang(lang);
    setSelectedLangState(lang);
  }

  // Per-(problem, language) code: keyed by `${problemId}:${lang}`
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [resetCount, setResetCount] = useState(0);

  const codeKey = `${viewedProblemId}:${selectedLang}`;

  // Initialise code for a (problem, language) pair if not yet in map
  useEffect(() => {
    if (!viewedProblemId || !viewedProblem) return;
    setCodeMap(prev => {
      if (prev[codeKey] !== undefined) return prev;
      return { ...prev, [codeKey]: getBoilerplate(viewedProblem, selectedLang) };
    });
  }, [codeKey, viewedProblem]);

  const currentCode = codeMap[codeKey] ?? '';

  const handleCodeChange = useCallback((val: string) => {
    setCodeMap(prev => ({ ...prev, [codeKey]: val }));
  }, [codeKey]);

  // Debounced draft save — keyed by (game, problem, language)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!viewedProblemId || !gameId) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft({ gameId, problemId: BigInt(viewedProblemId), language: selectedLang, code: currentCode });
    }, DRAFT_DEBOUNCE_MS);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [currentCode, viewedProblemId, gameId, selectedLang]);

  function resetCode() {
    if (!viewedProblem) return;
    setCodeMap(prev => ({ ...prev, [codeKey]: getBoilerplate(viewedProblem, selectedLang) }));
    setResetCount(c => c + 1);
    setTestResults(null);
    setRunSummary(null);
    setError(null);
  }

  const oppIdentity = isP1 ? game?.player2Identity : game?.player1Identity;
  const oppUser = oppIdentity
    ? users.find(u => identityEq(u.identity, oppIdentity))
    : undefined;
  const myUser = ctx.identity
    ? users.find(u => identityEq(u.identity, ctx.identity))
    : undefined;

  const playerHp = isP1 ? (game?.player1Hp ?? 0) : (game?.player2Hp ?? 0);
  const oppHp    = isP1 ? (game?.player2Hp ?? 0) : (game?.player1Hp ?? 0);
  const currency = usePowerupCurrency(game, isP1);

  const editorRef = useRef<CodeEditorHandle>(null);
  const onDeleteLine = useCallback(() => editorRef.current?.deleteRandomLine(), []);
  const sabotageEffects = useSabotageHandler(gameId, ctx.identity ?? undefined, onDeleteLine);
  const startingHp = useMemo(() => {
    if (!game) return 100;
    const room = rooms.find(r => r.code === game.roomCode);
    return parseRoomSettings(room?.settings ?? '{}').startingHp;
  }, [game?.roomCode, rooms]);

  // Execution state
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [runSummary, setRunSummary] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear execution state when switching problems
  useEffect(() => {
    setTestResults(null);
    setRunSummary(null);
    setError(null);
  }, [viewedProblemId]);

  // Timer
  const [seconds, setSeconds] = useState<number>(20 * 60);
  useEffect(() => {
    if (!game) return;
    const startMs = Number(game.startTime.microsSinceUnixEpoch / 1000n);
    const maxSeconds = 20 * 60;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      setSeconds(Math.max(0, maxSeconds - elapsed));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [game?.startTime]);

  // Navigate to results when game finishes
  useEffect(() => {
    if (game?.status === 'finished') {
      navigate(`/results?game=${gameId}`);
    }
  }, [game?.status, gameId, navigate]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const timeStr = `${mins}:${secs}`;

  const difficultyColor = (d: string): 'green' | 'yellow' | 'red' =>
    d === 'easy' ? 'green' : d === 'hard' ? 'red' : 'yellow';

  const solveTimeSec = useMemo(() => {
    if (!game) return 0;
    const startMs = Number(game.startTime.microsSinceUnixEpoch / 1000n);
    return Math.floor((Date.now() - startMs) / 1000);
  }, [game, submitting]);

  async function callExecutor(mode: 'run' | 'submit') {
    if (!viewedProblem || !game) return;
    setError(null);
    setTestResults(null);
    setRunSummary(null);
    try {
      const res = await fetch(`${EXECUTOR_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(mode === 'submit' && EXECUTOR_SECRET ? { 'X-Executor-Secret': EXECUTOR_SECRET } : {}),
        },
        body: JSON.stringify({
          game_id: gameId,
          player_identity: ctx.identity?.toHexString() ?? '',
          code: currentCode,
          lang: selectedLang,
          problem_id: Number(viewedProblem.id),
          mode,
          solve_time: solveTimeSec,
        }),
      });
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const verb = mode === 'run' ? 'running' : 'submitting';
        setError(`Too many requests — wait ${retryAfter ?? 'a few'} second(s) before ${verb} again.`);
        return;
      }
      const data: ExecuteResponse = await res.json();
      if (data.compile_error) {
        setError(data.compile_error);
      } else if (data.runtime_error) {
        setError(data.runtime_error);
      } else {
        setTestResults(data.results);
        setRunSummary(`${data.passed} / ${data.total} tests passed`);
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function runTests() {
    if (running) return;
    setRunning(true);
    try {
      await callExecutor('run');
    } finally {
      setRunning(false);
    }
  }

  async function submit() {
    if (!viewedProblem || !game || submitting || isSolved) return;
    setSubmitting(true);
    try {
      await callExecutor('submit');
    } finally {
      setSubmitting(false);
    }
  }

  function hpColor(hp: number, max: number) {
    const pct = hp / max;
    if (pct > 0.5) return 'bg-green';
    if (pct > 0.25) return 'bg-orange';
    return 'bg-red';
  }

  const navBar = (
    <div className="px-3 py-2 flex items-center gap-3 shrink-0">
      <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
        {problemIds.map((pid, idx) => {
          const prob = problems.find(p => p.id === BigInt(pid));
          const solved = mySolvedIds.has(pid);
          const oppSolved = oppSolvedIds.has(pid);
          const active = idx === viewIndex;
          return (
            <button
              key={pid}
              onClick={() => setViewIndex(idx)}
              className={[
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer',
                active
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-transparent text-text-muted hover:text-text hover:bg-surface',
              ].join(' ')}
              title={prob?.title ?? `Problem ${idx + 1}`}
            >
              <span>{idx + 1}</span>
              {solved && <span className="text-green text-xs">&#10003;</span>}
              {oppSolved && !solved && <span className="text-orange text-xs">&#9679;</span>}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setPanelTab(panelTab === 'problem' ? 'powerups' : 'problem')}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-accent transition-all cursor-pointer"
      >
        {panelTab === 'problem' ? 'powerups →' : 'problem →'}
      </button>
    </div>
  );

  const titleBar = (
    <div className="px-4 py-3 shrink-0">
      {viewedProblem ? (
        <div className="flex items-center gap-2 min-w-0">
          <Pill label={viewedProblem.difficulty} color={difficultyColor(viewedProblem.difficulty)} />
          <span className="font-bold text-[15px] text-text truncate">{viewedProblem.title}</span>
          {isSolved && <span className="text-green text-xs font-semibold">Solved</span>}
        </div>
      ) : (
        <span className="text-text-muted text-sm">Loading…</span>
      )}
    </div>
  );

  const activeEffectLabels: string[] = [];
  if (sabotageEffects.frozen)   activeEffectLabels.push('Editor frozen');
  if (sabotageEffects.blurred)  activeEffectLabels.push('Editor blurred');
  if (sabotageEffects.fontSize) activeEffectLabels.push('Font size changed');

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-120px)]">
      {/* Top bar */}
      <div className="card px-5 py-3 mb-3 flex items-center justify-between gap-4">
        {/* Left: HP bars + Energy */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col gap-1 w-28">
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>YOU ({mySolvedIds.size}/{problemCount})</span>
              <span>{playerHp} HP</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${hpColor(playerHp, startingHp)}`}
                style={{ width: `${Math.max(0, (playerHp / startingHp) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 w-28">
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>{oppUser?.username ?? 'OPP'} ({oppSolvedIds.size}/{problemCount})</span>
              <span>{oppHp} HP</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${hpColor(oppHp, startingHp)}`}
                style={{ width: `${Math.max(0, (oppHp / startingHp) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 px-3 py-1 rounded-lg border border-border bg-surface">
            <span className="text-[11px] text-text-muted uppercase tracking-wider">Energy</span>
            <span className="font-extrabold text-accent text-lg leading-none">{currency}</span>
          </div>
        </div>

        {/* Right: time + actions */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-center">
            <div className="text-[11px] text-text-muted">TIME LEFT</div>
            <div className={`font-extrabold text-lg tracking-tight ${seconds < 300 ? 'text-red' : 'text-text'}`}>
              {timeStr}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          {myUser?.isAdmin && viewedProblem && !isSolved && (
            <button
              onClick={() => {
                if (!viewedProblem) return;
                adminSolveProblem({ gameId, problemId: viewedProblem.id });
              }}
              title="Admin: instantly mark this problem solved"
              className="text-[12px] text-accent border border-accent/50 bg-transparent rounded-lg px-3 py-1 cursor-pointer hover:bg-accent/10"
            >
              Admin Solve
            </button>
          )}
          <button
            onClick={() => { if (gameId) forfeit({ gameId }); }}
            className="text-[12px] text-text-faint border border-border bg-transparent rounded-lg px-3 py-1 cursor-pointer hover:text-red"
          >
            Forfeit
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex gap-3 flex-1 min-h-0">
        <div className="card flex-[0_0_340px] flex flex-col min-h-0 overflow-hidden">
          {navBar}
          {panelTab === 'problem' && titleBar}
          <div className="p-5 overflow-y-auto flex-1 min-h-0">
            {panelTab === 'powerups' && game ? (
              <PowerupShop
                game={game}
                myIdentity={ctx.identity ?? undefined}
                currency={currency}
              />
            ) : viewedProblem ? (
              <div className="flex flex-col gap-0">
                <div className="text-sm text-text leading-[1.7] whitespace-pre-wrap">
                  {viewedProblem.description}
                </div>
                {(() => {
                  const cases = viewedProblem.sampleTestCases?.split('|').filter(Boolean) ?? [];
                  const results = viewedProblem.sampleTestResults?.split('|').filter(Boolean) ?? [];
                  if (cases.length === 0) return null;
                  return (
                    <div className="flex flex-col gap-3 mt-5">
                      {cases.map((input, i) => (
                        <div key={i} className="bg-surface-alt rounded-lg p-3.5">
                          <div className="text-xs font-bold text-text-muted mb-2">EXAMPLE {i + 1}</div>
                          <code className="font-mono text-[13px] block">
                            Input: {input}<br />
                            Output: {results[i] ?? '?'}
                          </code>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-text-muted text-sm">Loading problem…</div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <CodeEditor
            ref={editorRef}
            key={`${viewedProblemId}:${selectedLang}-${resetCount}`}
            initialCode={currentCode}
            onChange={handleCodeChange}
            language={selectedLang}
            onLanguageChange={setSelectedLang}
            vimMode={settings.vimMode}
            readOnly={sabotageEffects.frozen}
            extraStyle={{
              filter: sabotageEffects.blurred ? 'blur(3px)' : undefined,
              transition: 'filter 0.2s ease',
            }}
          />

          {/* Permanent status + action bar */}
          <div className="card shrink-0 flex flex-col">
            <div className="px-4 py-3 text-sm max-h-40 overflow-y-auto min-h-[44px]">
              {activeEffectLabels.length > 0 && (
                <div className="text-orange text-xs font-semibold mb-1">
                  Sabotage active: {activeEffectLabels.join(', ')}
                </div>
              )}
              {sabotageEffects.flash && (
                <div key={sabotageEffects.flash.at} className="text-orange text-xs font-semibold mb-1">
                  {sabotageEffects.flash.message}
                </div>
              )}
              {error && <pre className="text-red text-xs whitespace-pre-wrap">{error}</pre>}
              {runSummary && (
                <div className={`font-semibold mb-2 ${testResults?.every(r => r.passed) ? 'text-green' : 'text-orange'}`}>
                  {runSummary}
                </div>
              )}
              {testResults && testResults.map((r, i) => (
                <div key={i} className="flex items-start gap-2 mb-1 text-xs">
                  <span className={r.passed ? 'text-green' : 'text-red'}>{r.passed ? '✓' : '✗'}</span>
                  <span className="text-text-muted">
                    in: <span className="text-text">{r.input}</span>
                    {' → '}expected: <span className="text-text">{r.expected}</span>
                    {' → '}got: <span className={r.passed ? 'text-text' : 'text-red'}>{r.actual || r.error}</span>
                  </span>
                </div>
              ))}
              {!activeEffectLabels.length && !sabotageEffects.flash && !error && !runSummary && !testResults && (
                <div className="text-text-faint text-xs">Ready.</div>
              )}
            </div>
            <div className="flex gap-2 px-3 py-2 border-t border-border shrink-0">
              <button
                onClick={resetCode}
                disabled={!viewedProblem}
                className="py-1.5 px-3 rounded-md border border-border bg-transparent text-text-muted font-semibold text-xs cursor-pointer hover:text-text hover:bg-surface disabled:opacity-50"
              >
                ↺ Reset
              </button>
              <button
                onClick={runTests}
                disabled={!viewedProblem || running}
                className="flex-1 py-1.5 rounded-md border border-border bg-surface text-text font-semibold text-xs cursor-pointer hover:bg-surface-alt disabled:opacity-50"
              >
                {running ? 'Running…' : '▷ Run Tests'}
              </button>
              <button
                onClick={submit}
                disabled={submitting || isSolved || !viewedProblem}
                className="flex-1 py-1.5 rounded-md border-none bg-accent text-white font-semibold text-xs cursor-pointer disabled:opacity-50"
              >
                {isSolved ? '✓ Solved' : submitting ? 'Submitting…' : '↑ Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

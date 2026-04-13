import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { RotateCcw, Play, Send, Flag, Zap } from 'lucide-react';
import { tables, reducers } from '../module_bindings';
import type { GameState, Problem, Room, User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';
import { difficultyColor } from '../utils/difficulty';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useSettings } from '../hooks/useSettings';
import { usePowerupCurrency } from '../hooks/usePowerupCurrency';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { useExecutionState } from '../hooks/useExecutionState';
import type { ExecuteResponse } from '../utils/executor-types';
import Avatar from '../components/ui/Avatar';
import Pill from '../components/ui/Pill';
import CodeEditor, { type CodeEditorHandle } from '../components/problem/CodeEditor';
import StatusBox from '../components/problem/StatusBox';
import { useStatusHistory } from '../components/problem/useStatusHistory';
import TimerBar from '../components/problem/TimerBar';
import { useSabotageHandler } from '../components/powerup/useSabotageHandler';
import { type Language, getBoilerplate, loadSavedLang, saveLang } from '../utils/languages';
import { parseRoomSettings } from '../types/roomSettings';
import { safeParseJson, splitPipe } from '../utils/parseJson';
import PowerupShop from '../components/powerup/PowerupShop';
import type { QuizResult } from '../components/powerup/QuizPanel';

const EXECUTOR_URL = import.meta.env.VITE_EXECUTOR_URL ?? 'http://localhost:8000';
const EXECUTOR_SECRET = import.meta.env.VITE_EXECUTOR_SECRET ?? '';
const DRAFT_DEBOUNCE_MS = 1000;

// ── HP bar with editorial restraint + danger-cardinal ───────────────────
function HPBar({
  hp,
  max,
  align = 'left',
}: {
  hp: number;
  max: number;
  align?: 'left' | 'right';
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  const danger = pct <= 0.25;
  const warning = pct > 0.25 && pct <= 0.5;
  const fillColor = danger
    ? 'var(--color-accent)'
    : warning
      ? 'var(--color-gold-bright)'
      : 'var(--color-text)';

  // Track previous hp to flash on damage
  const [flash, setFlash] = useState(false);
  const lastRef = useRef(hp);
  useEffect(() => {
    if (hp < lastRef.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 380);
      lastRef.current = hp;
      return () => clearTimeout(t);
    }
    lastRef.current = hp;
  }, [hp]);

  return (
    <div
      className={`relative w-full h-1.5 rounded-sm overflow-hidden ${flash ? 'hp-flash' : ''}`}
      style={{ background: 'var(--color-hairline)' }}
    >
      <div
        className="absolute top-0 h-full transition-all duration-300 ease-out"
        style={{
          [align === 'right' ? 'right' : 'left']: 0,
          width: `${pct * 100}%`,
          background: fillColor,
        }}
      />
    </div>
  );
}

export default function ProblemScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctx = useSpacetimeDB();
  const forfeit = useReducer(reducers.forfeit);
  const saveDraft = useReducer(reducers.saveDraft);
  const adminSolveProblem = useReducer(reducers.adminSolveProblem);
  const expireGame = useReducer(reducers.expireGame);
  const [settings] = useSettings();

  const gameId = searchParams.get('game') ?? '';

  const [games]    = useTypedTable<GameState>(tables.game_state);
  const [problems] = useTypedTable<Problem>(tables.problem);
  const [users]    = useTypedTable<User>(tables.user);
  const [rooms]    = useTypedTable<Room>(tables.room);

  const game = games.find(g => g.id === gameId);
  const isP1 = identityEq(game?.player1Identity, ctx.identity);

  const problemIds: string[] = useMemo(() => {
    if (!game) return [];
    return safeParseJson<string[]>(game.problemIds, [], 'problemIds');
  }, [game?.problemIds]);

  const problemCount = problemIds.length;

  const mySolvedIds: Set<string> = useMemo(() => {
    if (!game) return new Set();
    const raw = isP1 ? game.player1SolvedIds : game.player2SolvedIds;
    return new Set(safeParseJson<string[]>(raw ?? '[]', [], 'mySolvedIds'));
  }, [game?.player1SolvedIds, game?.player2SolvedIds, isP1]);

  const oppSolvedIds: Set<string> = useMemo(() => {
    if (!game) return new Set();
    const raw = isP1 ? game.player2SolvedIds : game.player1SolvedIds;
    return new Set(safeParseJson<string[]>(raw ?? '[]', [], 'oppSolvedIds'));
  }, [game?.player1SolvedIds, game?.player2SolvedIds, isP1]);

  const [viewIndex, setViewIndex] = useState(0);
  const [panelTab, setPanelTab] = useState<'problem' | 'powerups'>('problem');

  const viewedProblemId = problemIds[viewIndex] ?? '';
  const viewedProblem: Problem | undefined = useMemo(() => {
    if (!viewedProblemId) return undefined;
    return problems.find(p => p.id === BigInt(viewedProblemId));
  }, [viewedProblemId, problems]);

  const isSolved = mySolvedIds.has(viewedProblemId);

  const [selectedLang, setSelectedLangState] = useState<Language>(loadSavedLang);

  function setSelectedLang(lang: Language) {
    saveLang(lang);
    setSelectedLangState(lang);
  }

  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [resetCount, setResetCount] = useState(0);

  const codeKey = `${viewedProblemId}:${selectedLang}`;

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

  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  const saveDraftDebounced = useDebouncedCallback(
    () => {
      if (!viewedProblemId || !gameId) return;
      saveDraft({ gameId, problemId: BigInt(viewedProblemId), language: selectedLang, code: currentCode });
      setDraftSavedAt(Date.now());
    },
    DRAFT_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (!viewedProblemId || !gameId) return;
    saveDraftDebounced();
  }, [currentCode, viewedProblemId, gameId, selectedLang]);

  function resetCode() {
    if (!viewedProblem) return;
    setCodeMap(prev => ({ ...prev, [codeKey]: getBoilerplate(viewedProblem, selectedLang) }));
    setResetCount(c => c + 1);
    execDispatch({ type: 'CLEAR' });
    setDraftSavedAt(null);
  }

  const oppIdentity = isP1 ? game?.player2Identity : game?.player1Identity;
  const oppUser = oppIdentity
    ? users.find(u => identityEq(u.identity, oppIdentity))
    : undefined;
  const myUser = useCurrentUser();

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

  const { state: execState, dispatch: execDispatch } = useExecutionState();
  const { running, submitting, testResults, runSummary, error, quizResult } = execState;

  const status = useStatusHistory();

  useEffect(() => {
    execDispatch({ type: 'CLEAR' });
    setDraftSavedAt(null);
    status.clear();
  }, [viewedProblemId]);

  useEffect(() => {
    if (error) status.push({ kind: 'error', text: error });
  }, [error]);

  useEffect(() => {
    if (runSummary && testResults) {
      status.push({
        kind: 'run',
        text: runSummary,
        testResults,
        allPassed: testResults.every(r => r.passed),
      });
    }
  }, [runSummary]);

  useEffect(() => {
    if (!quizResult) return;
    status.push({
      kind: 'notice',
      text: quizResult.kind === 'correct'
        ? `Quiz: Correct! +${quizResult.reward} Energy`
        : `Quiz: Wrong — answer was "${quizResult.correctAnswer}"`,
      color: quizResult.kind === 'correct' ? 'text-green' : 'text-red',
    });
  }, [quizResult]);

  useEffect(() => {
    if (!sabotageEffects.flash) return;
    status.push({ kind: 'notice', text: sabotageEffects.flash.message, color: 'text-orange' });
  }, [sabotageEffects.flash]);

  useEffect(() => {
    if (!draftSavedAt) return;
    status.push({ kind: 'notice', text: 'Draft auto-saved', color: 'text-green' });
  }, [draftSavedAt]);

  useEffect(() => {
    if (game?.status === 'finished') {
      navigate(`/results?game=${gameId}`);
    }
  }, [game?.status, gameId, navigate]);

  const solveTimeSec = useMemo(() => {
    if (!game) return 0;
    const startMs = Number(game.startTime.microsSinceUnixEpoch / 1000n);
    return Math.floor((Date.now() - startMs) / 1000);
  }, [game, submitting]);

  async function callExecutor(mode: 'run' | 'submit') {
    if (!viewedProblem || !game) return;
    if (mode === 'run') {
      execDispatch({ type: 'RUN_START' });
    } else {
      execDispatch({ type: 'SUBMIT_START' });
    }
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
        execDispatch({ type: 'ERROR', message: `Too many requests — wait ${retryAfter ?? 'a few'} second(s) before ${verb} again.` });
        return;
      }
      const data: ExecuteResponse = await res.json();
      if (data.compile_error) {
        execDispatch({ type: 'ERROR', message: data.compile_error });
      } else if (data.runtime_error) {
        execDispatch({ type: 'ERROR', message: data.runtime_error });
      } else {
        const summary = `${data.passed} / ${data.total} tests passed`;
        if (mode === 'run') {
          execDispatch({ type: 'RUN_DONE', testResults: data.results, summary });
        } else {
          execDispatch({ type: 'SUBMIT_DONE', testResults: data.results, summary });
        }
      }
    } catch (e) {
      execDispatch({ type: 'ERROR', message: String(e) });
    }
  }

  async function runTests() {
    if (running) return;
    await callExecutor('run');
  }

  async function submit() {
    if (!viewedProblem || !game || submitting || isSolved) return;
    await callExecutor('submit');
  }

  const activeEffectLabels: string[] = [];
  if (sabotageEffects.frozen)   activeEffectLabels.push('Editor frozen');
  if (sabotageEffects.blurred)  activeEffectLabels.push('Editor blurred');
  if (sabotageEffects.fontSize) activeEffectLabels.push('Font size changed');

  const activeEffectNotice = activeEffectLabels.length > 0
    ? [{ kind: 'notice' as const, id: -1, timestamp: Date.now(), text: `Sabotage active: ${activeEffectLabels.join(', ')}`, color: 'text-orange' }]
    : [];

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-130px)]">
      {/* ── Combat bar ──────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 rounded-lg flex items-stretch gap-6"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-hairline-strong)',
        }}
      >
        {/* You */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={myUser?.avatarUrl} username={myUser?.username ?? 'You'} size="md" ring />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-text font-medium truncate">
                {myUser?.username ?? 'You'}
              </span>
              <span className="mono-tabular text-[13px] text-text">
                {playerHp}<span className="text-text-faint">/{startingHp}</span>
              </span>
            </div>
            <HPBar hp={playerHp} max={startingHp} />
            <span className="label-eyebrow" style={{ fontSize: 9 }}>
              {mySolvedIds.size}/{problemCount} solved
            </span>
          </div>
        </div>

        {/* Center: vs + timer */}
        <div className="flex flex-col items-center justify-center gap-1 px-3 shrink-0">
          <span
            className="text-text-faint"
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 14,
            }}
          >
            vs.
          </span>
          {game && (
            <TimerBar
              startTimeMicros={game.startTime.microsSinceUnixEpoch}
              status={game.status}
              onExpire={() => expireGame({ gameId })}
            />
          )}
        </div>

        {/* Opponent */}
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-row-reverse">
          <Avatar src={oppUser?.avatarUrl} username={oppUser?.username ?? '?'} size="md" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0 items-end">
            <div className="flex items-center justify-between gap-2 w-full flex-row-reverse">
              <span className="text-[13px] text-text font-medium truncate">
                {oppUser?.username ?? 'Opponent'}
              </span>
              <span className="mono-tabular text-[13px] text-text">
                {oppHp}<span className="text-text-faint">/{startingHp}</span>
              </span>
            </div>
            <HPBar hp={oppHp} max={startingHp} align="right" />
            <span className="label-eyebrow text-right" style={{ fontSize: 9 }}>
              {oppSolvedIds.size}/{problemCount} solved
            </span>
          </div>
        </div>

        {/* Right: energy + actions */}
        <div
          className="flex items-center gap-3 pl-5 shrink-0"
          style={{ borderLeft: '1px solid var(--color-hairline)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={14} strokeWidth={1.75} className="text-gold-bright" />
            <div className="flex flex-col">
              <span className="label-eyebrow" style={{ fontSize: 9 }}>Energy</span>
              <span className="mono-tabular text-[18px] text-gold-bright leading-none">
                {currency}
              </span>
            </div>
          </div>
          <div className="w-px h-10 bg-[var(--color-hairline)]" />
          {myUser?.isAdmin && viewedProblem && !isSolved && (
            <button
              onClick={() => {
                if (!viewedProblem) return;
                adminSolveProblem({ gameId, problemId: viewedProblem.id });
              }}
              title="Admin: instantly mark this problem solved"
              className="text-[11px] text-accent border bg-transparent rounded-md px-2.5 py-1 cursor-pointer hover:bg-accent/10 mono-tabular uppercase tracking-wider"
              style={{ borderColor: 'var(--color-hairline-cardinal)' }}
            >
              Admin solve
            </button>
          )}
          <button
            onClick={() => { if (gameId) forfeit({ gameId }); }}
            className="flex items-center gap-1.5 text-[11px] text-text-faint hover:text-accent border bg-transparent rounded-md px-2.5 py-1 cursor-pointer mono-tabular uppercase tracking-wider transition-colors"
            style={{ borderColor: 'var(--color-hairline)' }}
          >
            <Flag size={11} strokeWidth={1.75} />
            Forfeit
          </button>
        </div>
      </div>

      {/* ── Main split ──────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: problem panel */}
        <div
          className="flex-[0_0_360px] flex flex-col min-h-0 overflow-hidden rounded-lg"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-hairline-strong)',
          }}
        >
          {/* Problem nav strip */}
          <div
            className="px-4 py-3 flex items-center gap-2 shrink-0"
            style={{ borderBottom: '1px solid var(--color-hairline)' }}
          >
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
              {problemIds.map((pid, idx) => {
                const prob = problems.find(p => p.id === BigInt(pid));
                const solved = mySolvedIds.has(pid);
                const oppSolved = oppSolvedIds.has(pid);
                const active = idx === viewIndex;
                return (
                  <button
                    key={pid}
                    onClick={() => setViewIndex(idx)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] mono-tabular border cursor-pointer transition-all"
                    title={prob?.title ?? `Problem ${idx + 1}`}
                    style={{
                      color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                      borderColor: active
                        ? 'var(--color-hairline-gold)'
                        : 'var(--color-hairline)',
                      background: active ? 'rgba(245,197,24,0.04)' : 'transparent',
                    }}
                  >
                    <span>{String(idx + 1).padStart(2, '0')}</span>
                    {solved && <span style={{ color: 'var(--color-green)' }}>✓</span>}
                    {oppSolved && !solved && (
                      <span style={{ color: 'var(--color-accent)' }}>●</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPanelTab(panelTab === 'problem' ? 'powerups' : 'problem')}
              className="shrink-0 label-eyebrow hover:text-text transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              {panelTab === 'problem' ? 'powerups →' : 'problem →'}
            </button>
          </div>

          {/* Title bar */}
          {panelTab === 'problem' && viewedProblem && (
            <div
              className="px-5 py-3 flex items-center justify-between gap-2 shrink-0"
              style={{ borderBottom: '1px solid var(--color-hairline)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Pill
                  label={viewedProblem.difficulty}
                  color={difficultyColor(viewedProblem.difficulty)}
                  variant="hairline"
                />
                <span
                  className="text-text truncate"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {viewedProblem.title}
                </span>
              </div>
              {isSolved && (
                <span className="label-eyebrow" style={{ color: 'var(--color-green)' }}>
                  ✓ Solved
                </span>
              )}
            </div>
          )}

          <div className="p-5 overflow-y-auto flex-1 min-h-0">
            {panelTab === 'powerups' && game ? (
              <PowerupShop
                game={game}
                myIdentity={ctx.identity ?? undefined}
                currency={currency}
                isP1={isP1}
                onQuizAnswered={(result: QuizResult) => execDispatch({ type: 'QUIZ_RESULT', result })}
              />
            ) : viewedProblem ? (
              <div className="flex flex-col gap-0">
                <div className="text-[14px] text-text leading-[1.7] whitespace-pre-wrap">
                  {viewedProblem.description}
                </div>
                {(() => {
                  const cases = splitPipe(viewedProblem.sampleTestCases);
                  const results = splitPipe(viewedProblem.sampleTestResults);
                  if (cases.length === 0) return null;
                  return (
                    <div className="flex flex-col gap-3 mt-6">
                      {cases.map((input, i) => (
                        <div
                          key={i}
                          className="rounded-md p-3.5"
                          style={{
                            background: 'var(--color-surface-alt)',
                            border: '1px solid var(--color-hairline)',
                          }}
                        >
                          <div className="label-eyebrow mb-2">Example {String(i + 1).padStart(2, '0')}</div>
                          <code className="mono-tabular text-[12px] block leading-relaxed">
                            <span className="text-text-muted">in </span>
                            <span className="text-text">{input}</span>
                            <br />
                            <span className="text-text-muted">out </span>
                            <span className="text-text">{results[i] ?? '?'}</span>
                          </code>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-text-muted text-sm">
                <span className="eyebrow-italic">Loading problem…</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: editor + actions */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
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

          {/* Status + action bar */}
          <div
            className="shrink-0 flex flex-col rounded-lg overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-hairline-strong)',
            }}
          >
            <StatusBox
              entries={[...activeEffectNotice, ...status.entries]}
              className="text-sm h-32 overflow-y-auto"
            />
            <div
              className="flex gap-2 px-3 py-2 shrink-0"
              style={{ borderTop: '1px solid var(--color-hairline)' }}
            >
              <button
                onClick={resetCode}
                disabled={!viewedProblem}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-md bg-transparent text-text-muted text-[12px] cursor-pointer hover:text-text hover:bg-[rgba(240,235,229,0.03)] disabled:opacity-50 transition-colors mono-tabular uppercase tracking-wider"
                style={{ border: '1px solid var(--color-hairline)' }}
              >
                <RotateCcw size={12} strokeWidth={1.75} />
                Reset
              </button>
              <button
                onClick={runTests}
                disabled={!viewedProblem || running}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-text text-[12px] cursor-pointer hover:bg-[rgba(240,235,229,0.03)] disabled:opacity-50 transition-colors mono-tabular uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-hairline-strong)',
                }}
              >
                <Play size={12} strokeWidth={1.75} />
                {running ? 'Running…' : 'Run tests'}
              </button>
              <button
                onClick={submit}
                disabled={submitting || isSolved || !viewedProblem}
                className="flex-1 btn-editorial justify-center text-[12px] mono-tabular uppercase tracking-wider py-1.5 disabled:opacity-50"
              >
                {isSolved ? '✓ Solved' : (
                  <>
                    <Send size={12} strokeWidth={1.75} />
                    {submitting ? 'Submitting…' : 'Submit'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

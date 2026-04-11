import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { GameState, Problem, Room, User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';
import Pill from '../components/ui/Pill';
import ProblemPanel from '../components/problem/ProblemPanel';
import CodeEditor from '../components/problem/CodeEditor';

const EXECUTOR_URL = import.meta.env.VITE_EXECUTOR_URL ?? 'http://localhost:8000';

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

interface ExecuteResponse {
  success: boolean;
  passed: number;
  total: number;
  results: TestResult[];
  compile_error?: string;
  runtime_error?: string;
}

export default function ProblemScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctx = useSpacetimeDB();
  const forfeit = useReducer(reducers.forfeit);

  const gameId = searchParams.get('game') ?? '';

  const [games]    = useTypedTable<GameState>(tables.game_state);
  const [problems] = useTypedTable<Problem>(tables.problem);
  const [users]    = useTypedTable<User>(tables.user);
  const [rooms]    = useTypedTable<Room>(tables.room);

  const game = games.find(g => g.id === gameId);

  const isP1 = identityEq(game?.player1Identity, ctx.identity);

  const problem = useMemo(() => {
    if (!game) return undefined;
    const ids: string[] = (() => { try { return JSON.parse(game.problemIds); } catch { return []; } })();
    const problemIndex = isP1 ? (game.player1ProblemIndex ?? 0) : (game.player2ProblemIndex ?? 0);
    const id = ids[problemIndex] ? BigInt(ids[problemIndex]) : undefined;
    return id !== undefined ? problems.find(p => p.id === id) : undefined;
  }, [game, problems, isP1]);

  const problemCount = useMemo(() => {
    if (!game) return 1;
    try { return JSON.parse(game.problemIds).length; } catch { return 1; }
  }, [game]);

  const playerProblemIndex = isP1 ? (game?.player1ProblemIndex ?? 0) : (game?.player2ProblemIndex ?? 0);

  const oppIdentity = isP1 ? game?.player2Identity : game?.player1Identity;
  const oppUser = oppIdentity
    ? users.find(u => identityEq(u.identity, oppIdentity))
    : undefined;

  const playerHp = isP1 ? (game?.player1Hp ?? 0) : (game?.player2Hp ?? 0);
  const oppHp    = isP1 ? (game?.player2Hp ?? 0) : (game?.player1Hp ?? 0);
  const startingHp = useMemo(() => {
    if (!game) return 100;
    const room = rooms.find(r => r.code === game.roomCode);
    try { return JSON.parse(room?.settings ?? '{}').starting_hp ?? 100; } catch { return 100; }
  }, [game?.roomCode, rooms]);

  // Editor state
  const [code, setCode] = useState('');
  useEffect(() => {
    if (problem?.boilerplatePython) setCode(problem.boilerplatePython);
  }, [problem?.id]);

  // Execution state
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [runSummary, setRunSummary] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const difficultyColor = (d: string): 'green' | 'orange' | 'red' =>
    d === 'easy' ? 'green' : d === 'hard' ? 'red' : 'orange';

  const solveTimeSec = useMemo(() => {
    if (!game) return 0;
    const startMs = Number(game.startTime.microsSinceUnixEpoch / 1000n);
    return Math.floor((Date.now() - startMs) / 1000);
  }, [game, submitting]);

  async function runTests() {
    if (!problem || !game) return;
    setError(null);
    setTestResults(null);
    setRunSummary(null);
    try {
      const res = await fetch(`${EXECUTOR_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_identity: ctx.identity?.toHexString() ?? '',
          code,
          lang: 'python',
          problem_id: Number(problem.id),
          mode: 'run',
          solve_time: solveTimeSec,
        }),
      });
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

  async function submit() {
    if (!problem || !game || submitting) return;
    setError(null);
    setTestResults(null);
    setRunSummary(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${EXECUTOR_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_identity: ctx.identity?.toHexString() ?? '',
          code,
          lang: 'python',
          problem_id: Number(problem.id),
          mode: 'submit',
          solve_time: solveTimeSec,
        }),
      });
      const data: ExecuteResponse = await res.json();
      if (data.compile_error) {
        setError(data.compile_error);
      } else if (data.runtime_error) {
        setError(data.runtime_error);
      } else {
        setTestResults(data.results);
        setRunSummary(`${data.passed} / ${data.total} tests passed`);
        // Navigation is handled by the useEffect watching game.status
      }
    } catch (e) {
      setError(String(e));
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

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-120px)]">
      {/* Top bar */}
      <div className="card px-5 py-3 mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {problem && (
            <>
              <Pill label={problem.difficulty} color={difficultyColor(problem.difficulty)} />
              <span className="font-bold text-[15px] text-text truncate">{problem.title}</span>
              {problemCount > 1 && (
                <span className="text-xs text-text-muted shrink-0">
                  {playerProblemIndex + 1} / {problemCount}
                </span>
              )}
            </>
          )}
          {!problem && <span className="text-text-muted text-sm">Loading…</span>}
        </div>

        {/* HP bars */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col gap-1 w-28">
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>YOU</span>
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
              <span>{oppUser?.username ?? 'OPP'}</span>
              <span>{oppHp} HP</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${hpColor(oppHp, startingHp)}`}
                style={{ width: `${Math.max(0, (oppHp / startingHp) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="text-center">
            <div className="text-[11px] text-text-muted">TIME LEFT</div>
            <div className={`font-extrabold text-lg tracking-tight ${seconds < 300 ? 'text-red' : 'text-text'}`}>
              {timeStr}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
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
        <ProblemPanel problem={problem} />
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <CodeEditor initialCode={code} onChange={setCode} />

          {/* Test results */}
          {(testResults || error || runSummary) && (
            <div className="card px-4 py-3 text-sm shrink-0 max-h-40 overflow-y-auto">
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
            </div>
          )}

          <div className="flex gap-2.5 shrink-0">
            <button
              onClick={runTests}
              className="flex-1 py-[11px] rounded-[10px] border border-border bg-surface text-text font-bold text-sm cursor-pointer hover:bg-surface-alt"
            >
              &#9655; Run Tests
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 py-[11px] rounded-[10px] border-none bg-accent text-white font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : '↑ Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

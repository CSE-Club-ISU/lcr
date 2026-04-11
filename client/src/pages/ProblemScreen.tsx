import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { GameState, Problem, User } from '../module_bindings/types';
import Pill from '../components/ui/Pill';
import ProblemPanel from '../components/problem/ProblemPanel';
import CodeEditor from '../components/problem/CodeEditor';

export default function ProblemScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctx = useSpacetimeDB();
  const forfeit = useReducer(reducers.forfeit);

  const gameId = searchParams.get('game') ?? '';

  const [gameRows]  = useTable(tables.game_state);
  const [probRows]  = useTable(tables.problem);
  const [userRows]  = useTable(tables.user);

  const games    = gameRows as unknown as GameState[];
  const problems = probRows as unknown as Problem[];
  const users    = userRows as unknown as User[];

  const game = games.find(g => g.id === gameId);

  const problem = useMemo(() => {
    if (!game) return undefined;
    const ids: string[] = (() => { try { return JSON.parse(game.problemIds); } catch { return []; } })();
    const id = ids[0] ? BigInt(ids[0]) : undefined;
    return id !== undefined ? problems.find(p => p.id === id) : undefined;
  }, [game, problems]);

  const myHex = ctx.identity?.toHexString();
  const isP1 = game?.player1Identity.toHexString() === myHex;
  const oppIdentity = isP1 ? game?.player2Identity : game?.player1Identity;
  const oppUser = oppIdentity
    ? users.find(u => u.identity.toHexString() === oppIdentity.toHexString())
    : undefined;

  // Timer based on game start time
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

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-120px)]">
      {/* Top bar */}
      <div className="card px-5 py-3 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {problem && (
            <>
              <Pill label={problem.difficulty} color={difficultyColor(problem.difficulty)} />
              <span className="font-bold text-[15px] text-text">{problem.title}</span>
            </>
          )}
          {!problem && <span className="text-text-muted text-sm">Loading…</span>}
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="text-[11px] text-text-muted">TIME LEFT</div>
            <div className={`font-extrabold text-lg tracking-tight ${seconds < 300 ? 'text-red' : 'text-text'}`}>
              {timeStr}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <div className="text-[11px] text-text-muted mb-1">OPPONENT</div>
            <div className="text-[13px] text-text font-semibold">
              {oppUser?.username ?? '…'}
            </div>
          </div>
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
        <div className="flex-1 flex flex-col gap-3">
          <CodeEditor />
          <div className="flex gap-2.5">
            <button className="flex-1 py-[11px] rounded-[10px] border border-border bg-surface text-text font-bold text-sm cursor-pointer">
              &#9655; Run Tests
            </button>
            <button
              onClick={() => navigate(`/results?game=${gameId}`)}
              className="flex-1 py-[11px] rounded-[10px] border-none bg-accent text-white font-bold text-sm cursor-pointer"
            >
              &uarr; Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

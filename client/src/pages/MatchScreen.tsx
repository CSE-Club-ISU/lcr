import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReducer, useSpacetimeDB } from "spacetimedb/react";
import { ArrowRight, Plus, X } from "lucide-react";
import { reducers, tables } from "../module_bindings";
import { useTypedTable } from "../utils/useTypedTable";
import { identityEq } from "../utils/identity";
import type { Queue, GameState } from "../module_bindings/types";

const DIFFICULTIES = [
  { value: "easy",   label: "Easy",   color: "var(--color-green)" },
  { value: "medium", label: "Medium", color: "var(--color-yellow)" },
  { value: "hard",   label: "Hard",   color: "var(--color-accent)" },
] as const;

const PROBLEM_COUNTS = [1, 2, 3] as const;

export default function MatchScreen() {
  const navigate = useNavigate();
  const ctx = useSpacetimeDB();

  const joinQueue  = useReducer(reducers.joinQueue);
  const leaveQueue = useReducer(reducers.leaveQueue);

  const [queueRows] = useTypedTable<Queue>(tables.queue);
  const [games]     = useTypedTable<GameState>(tables.game_state);

  const [problemCount, setProblemCount] = useState<1 | 2 | 3>(1);
  const [joinCode, setJoinCode] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const myQueueEntry = ctx.identity
    ? queueRows.find(q => identityEq(q.identity, ctx.identity))
    : undefined;

  // Elapsed-time ticker for the queue state
  useEffect(() => {
    if (!myQueueEntry) { setElapsed(0); return; }
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(t);
  }, [myQueueEntry]);

  useEffect(() => {
    if (!ctx.identity) return;
    const myGame = games.find(
      g =>
        g.status === "in_progress" &&
        (identityEq(g.player1Identity, ctx.identity) ||
          identityEq(g.player2Identity, ctx.identity))
    );
    if (myGame) {
      navigate(`/play/match?game=${myGame.id}`);
    }
  }, [games, ctx.identity, navigate]);

  const handleQueue = (difficulty: string) => {
    joinQueue({ difficulty, problemCount });
  };

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  // ── Queue state: full-hero anticipation moment ──────────────────────────
  if (myQueueEntry) {
    return (
      <div className="flex flex-col items-center justify-center py-24 enter-fade">
        <div className="w-full max-w-[560px] flex flex-col items-center gap-10 text-center">
          <span className="label-eyebrow">Matchmaking</span>

          <h1
            className="m-0 text-text"
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 56,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              fontVariationSettings: '"opsz" 144',
            }}
          >
            Scouting an <span className="text-accent">opponent</span>…
          </h1>

          <div className="queue-sweep w-full" />

          <div className="flex items-center gap-10 mono-tabular text-text">
            <div className="flex flex-col items-center gap-1">
              <span className="label-eyebrow">Elapsed</span>
              <span className="text-[28px] tracking-tight">{formatElapsed(elapsed)}</span>
            </div>
            <span className="w-px h-10 bg-[var(--color-hairline)]" />
            <div className="flex flex-col items-center gap-1">
              <span className="label-eyebrow">Difficulty</span>
              <span
                className="text-[15px] capitalize font-medium tracking-wide"
                style={{
                  color:
                    myQueueEntry.difficulty === 'easy'   ? 'var(--color-green)'   :
                    myQueueEntry.difficulty === 'medium' ? 'var(--color-yellow)'  :
                    'var(--color-accent)',
                }}
              >
                {myQueueEntry.difficulty}
              </span>
            </div>
            <span className="w-px h-10 bg-[var(--color-hairline)]" />
            <div className="flex flex-col items-center gap-1">
              <span className="label-eyebrow">Problems</span>
              <span className="text-[28px] tracking-tight">{myQueueEntry.problemCount}</span>
            </div>
          </div>

          <button
            onClick={() => leaveQueue()}
            className="btn-ghost text-[13px]"
          >
            <X size={14} strokeWidth={1.75} />
            Cancel search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-14">
      {/* Page title */}
      <div>
        <h1
          className="m-0 text-text"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: 48,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Find a <span className="text-accent">match</span>.
        </h1>
        <p className="text-sm text-text-muted mt-3 m-0 max-w-[520px]">
          Drop into the queue for a quick duel, or spin up a custom room for a friend.
        </p>
      </div>

      {/* Quick Play */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <span className="eyebrow-italic">Quick play</span>
          <span className="label-eyebrow">auto-match</span>
        </div>
        <hr className="rule-hairline mb-6" />

        <div className="flex flex-col gap-6">
          {/* Problem count */}
          <div className="flex items-center gap-4">
            <span className="label-eyebrow">Problems</span>
            <div className="flex items-center gap-2">
              {PROBLEM_COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setProblemCount(n)}
                  className="relative px-4 py-1.5 text-[13px] mono-tabular border rounded-md cursor-pointer transition-all"
                  style={{
                    color: problemCount === n ? 'var(--color-text)' : 'var(--color-text-muted)',
                    borderColor:
                      problemCount === n
                        ? 'var(--color-hairline-gold)'
                        : 'var(--color-hairline)',
                    background:
                      problemCount === n ? 'rgba(245, 197, 24, 0.04)' : 'transparent',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty buttons */}
          <div className="flex flex-col gap-2">
            <span className="label-eyebrow">Difficulty</span>
            <div className="grid grid-cols-3 gap-3 max-w-[600px]">
              {DIFFICULTIES.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => handleQueue(value)}
                  className="relative group text-left px-5 py-5 bg-transparent border rounded-lg cursor-pointer transition-all hover:-translate-y-px"
                  style={{ borderColor: 'var(--color-hairline-strong)' }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-medium text-[16px]"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    <ArrowRight
                      size={14}
                      strokeWidth={1.75}
                      className="text-text-faint transition-all duration-200 group-hover:text-text group-hover:translate-x-1"
                    />
                  </div>
                  <span className="text-[11px] text-text-faint mt-1 block mono-tabular uppercase tracking-wider">
                    queue
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Friend room */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <span className="eyebrow-italic">Play with a friend</span>
          <span className="label-eyebrow">custom room</span>
        </div>
        <hr className="rule-hairline mb-6" />

        <div className="grid grid-cols-2 gap-12 max-w-[640px]">
          <div className="flex flex-col gap-3">
            <span className="label-eyebrow">Host</span>
            <p className="text-[13px] text-text-muted m-0 leading-relaxed">
              Pick problems, tune HP and time, then share the room code.
            </p>
            <button
              className="btn-editorial self-start mt-2 group"
              onClick={() => navigate('/play/custom/new')}
            >
              <Plus size={14} strokeWidth={2} />
              <span>Set up room</span>
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!joinCode.trim()) return;
              navigate(`/play/room/${joinCode.trim().toUpperCase()}`);
            }}
            className="flex flex-col gap-3"
          >
            <span className="label-eyebrow">Join</span>
            <p className="text-[13px] text-text-muted m-0 leading-relaxed">
              Enter the code your host shared.
            </p>
            <div className="flex gap-2 mt-2">
              <input
                className="input-field flex-1 mono-tabular tracking-widest uppercase"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={8}
              />
              <button className="btn-ghost" type="submit">
                Join
                <ArrowRight size={14} strokeWidth={1.75} />
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

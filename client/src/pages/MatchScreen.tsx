import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReducer, useSpacetimeDB } from "spacetimedb/react";
import { reducers, tables } from "../module_bindings";
import { useTypedTable } from "../utils/useTypedTable";
import { identityEq } from "../utils/identity";
import type { Queue, GameState } from "../module_bindings/types";

const DIFFICULTIES = [
  { value: "easy",   label: "Easy",   color: "text-green" },
  { value: "medium", label: "Medium", color: "text-yellow" },
  { value: "hard",   label: "Hard",   color: "text-red" },
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
  const [joinCode,    setJoinCode]    = useState("");

  // Which difficulty queue this player is currently in (undefined = not queued)
  const myQueueEntry = ctx.identity
    ? queueRows.find(q => identityEq(q.identity, ctx.identity))
    : undefined;

  // Navigate to game as soon as a match is found
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

  const handleCreateFriendRoom = () => {
    navigate("/play/custom/new");
  };

  const handleJoinFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/play/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Play */}
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-1">Quick Play</div>
        <div className="text-xs text-text-muted mb-4">
          Choose a difficulty and get matched with another player instantly.
        </div>

        {/* Problem count selector */}
        {!myQueueEntry && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-text-muted">Problems:</span>
            {PROBLEM_COUNTS.map(n => (
              <button
                key={n}
                onClick={() => setProblemCount(n)}
                className={[
                  'px-3 py-1 rounded-lg text-sm font-semibold border transition-all cursor-pointer',
                  problemCount === n
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-transparent text-text-muted hover:text-text',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {myQueueEntry ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-sm text-text">
                Searching for a{" "}
                <span
                  className={
                    myQueueEntry.difficulty === "easy"
                      ? "text-green font-semibold"
                      : myQueueEntry.difficulty === "medium"
                        ? "text-orange font-semibold"
                        : "text-red font-semibold"
                  }
                >
                  {myQueueEntry.difficulty}
                </span>{" "}
                match ({myQueueEntry.problemCount} problem{myQueueEntry.problemCount !== 1 ? "s" : ""})…
              </span>
            </div>
            <button
              className="btn-secondary px-3 py-1 text-sm"
              onClick={() => leaveQueue()}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            {DIFFICULTIES.map(({ value, label, color }) => (
              <button
                key={value}
                className={`btn-secondary px-5 py-2 text-sm font-semibold ${color}`}
                onClick={() => handleQueue(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Play with a Friend */}
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-4">
          Play with a Friend
        </div>
        <div className="flex gap-6">
          {/* Create room */}
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-xs text-text-muted">Create a room</label>
            <div className="flex gap-2">
              <button
                className="btn-primary px-4 py-2 text-sm"
                onClick={handleCreateFriendRoom}
              >
                Set up game
              </button>
            </div>
            <p className="text-[11px] text-text-faint m-0">
              Choose problems, order, and settings before inviting a friend.
            </p>
          </div>

          {/* Join room */}
          <form
            onSubmit={handleJoinFriend}
            className="flex flex-col gap-2 flex-1"
          >
            <label className="text-xs text-text-muted">Join a room</label>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                maxLength={8}
              />
              <button className="btn-secondary px-4 py-2 text-sm" type="submit">
                Join
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

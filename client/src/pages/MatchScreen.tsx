import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReducer, useSpacetimeDB } from "spacetimedb/react";
import { reducers, tables } from "../module_bindings";
import { useTypedTable } from "../utils/useTypedTable";
import { identityEq } from "../utils/identity";
import type { Queue, GameState } from "../module_bindings/types";

function randomCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

const DIFFICULTIES = [
  { value: "easy",   label: "Easy",   color: "text-green" },
  { value: "medium", label: "Medium", color: "text-orange" },
  { value: "hard",   label: "Hard",   color: "text-red" },
] as const;

export default function MatchScreen() {
  const navigate = useNavigate();
  const ctx = useSpacetimeDB();

  const joinQueue  = useReducer(reducers.joinQueue);
  const leaveQueue = useReducer(reducers.leaveQueue);
  const createRoom = useReducer(reducers.createRoom);

  const [queueRows] = useTypedTable<Queue>(tables.queue);
  const [games]     = useTypedTable<GameState>(tables.game_state);

  const [friendCode,  setFriendCode]  = useState("");
  const [joinCode,    setJoinCode]    = useState("");
  const [friendError, setFriendError] = useState("");

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
    joinQueue({ difficulty });
  };

  const handleCreateFriendRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setFriendError("");
    const code = friendCode.trim() || randomCode();
    if (!/^[A-Z0-9]{4,8}$/i.test(code)) {
      setFriendError("Code must be 4-8 alphanumeric characters");
      return;
    }
    const settings = JSON.stringify({
      difficulty: "easy",
      problem_count: 1,
      starting_hp: 100,
    });
    createRoom({ code: code.toUpperCase(), settings });
    navigate(`/play/room/${code.toUpperCase()}`);
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
                match…
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
          <form
            onSubmit={handleCreateFriendRoom}
            className="flex flex-col gap-2 flex-1"
          >
            <label className="text-xs text-text-muted">Create a room</label>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="Code (auto)"
                maxLength={8}
              />
              <button className="btn-primary px-4 py-2 text-sm" type="submit">
                Create
              </button>
            </div>
            {friendError && (
              <p className="m-0 text-red text-[13px]">{friendError}</p>
            )}
          </form>

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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReducer } from "spacetimedb/react";
import { reducers } from "../module_bindings";

function randomCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

export default function MatchScreen() {
  const navigate = useNavigate();
  const createRoom = useReducer(reducers.createRoom);

  const [friendCode, setFriendCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [friendError, setFriendError] = useState("");

  const handleCreateFriendRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setFriendError("");
    const code = friendCode.trim() || randomCode();
    if (!/^[A-Z0-9]{4,8}$/i.test(code)) {
      setFriendError("Code must be 4-8 alphanumeric characters");
      return;
    }
    const settings = JSON.stringify({
      difficulty: "medium",
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

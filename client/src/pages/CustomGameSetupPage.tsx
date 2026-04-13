import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReducer } from "spacetimedb/react";
import { reducers } from "../module_bindings";
import {
  defaultCustomSettings,
  serializeRoomSettings,
  type RoomSettings,
} from "../types/roomSettings";
import CustomGameSettingsForm from "../components/CustomGameSettingsForm";

// `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost); the
// club deploy is plain HTTP on a public IP, so it's unavailable there. A join
// code just needs to be a short random alphanumeric string — Math.random is fine.
function randomCode(): string {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export default function CustomGameSetupPage() {
  const navigate = useNavigate();
  const createRoom = useReducer(reducers.createRoom);

  const [settings, setSettings] = useState<RoomSettings>(defaultCustomSettings);
  const [customCode, setCustomCode] = useState("");
  const [error, setError] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const ps = settings.problemSelection;
    if (ps.kind === "explicit" && ps.problemIds.length === 0) {
      setError("Please add at least one problem.");
      return;
    }

    const code = customCode.trim() || randomCode();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) {
      setError("Room code must be 4–8 alphanumeric characters.");
      return;
    }

    createRoom({ code, settings: serializeRoomSettings(settings) });
    navigate(`/play/room/${code}`);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-base font-bold text-text mb-1">Custom Game</h1>
        <p className="text-sm text-text-muted">
          Choose which problems to play and in what order. Share the room code
          with a friend to start.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-6">
        {/* Settings */}
        <div className="card p-6">
          <CustomGameSettingsForm settings={settings} onChange={setSettings} />
        </div>

        {/* Room code */}
        <div className="card p-6 flex flex-col gap-3">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Room Code{" "}
            <span className="font-normal normal-case">(optional — leave blank to auto-generate)</span>
          </label>
          <input
            className="input-field w-40"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            maxLength={8}
          />
        </div>

        {error && <p className="text-red text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary px-6 py-2 text-sm">
            Create Room
          </button>
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() => navigate("/play")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

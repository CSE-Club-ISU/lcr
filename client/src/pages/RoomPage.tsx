import { useEffect, useRef, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { Room, User, Problem } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq, resolveUser } from '../utils/identity';
import PlayerSlot from '../components/room/PlayerSlot';
import CustomGameSettingsForm from '../components/CustomGameSettingsForm';
import {
  parseRoomSettings,
  serializeRoomSettings,
  type RoomSettings,
} from '../types/roomSettings';

export default function RoomPage() {
  const { code }    = useParams<{ code: string }>();
  const navigate    = useNavigate();
  const ctx         = useSpacetimeDB();
  const [rooms]     = useTypedTable<Room>(tables.room);
  const [users]     = useTypedTable<User>(tables.user);
  const [problems]  = useTypedTable<Problem>(tables.problem);
  const joinRoom           = useReducer(reducers.joinRoom);
  const leaveRoom          = useReducer(reducers.leaveRoom);
  const setReady           = useReducer(reducers.setReady);
  const startGame          = useReducer(reducers.startGame);
  const updateRoomSettings = useReducer(reducers.updateRoomSettings);

  const [editingSettings, setEditingSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState<RoomSettings | null>(null);

  const myIdentity = ctx.identity;
  const room = rooms.find(r => r.code === code);

  const isHost  = !!myIdentity && !!room && identityEq(room.hostIdentity, myIdentity);
  const isGuest = !!myIdentity && !!room && !!room.guestIdentity && identityEq(room.guestIdentity, myIdentity);
  const inRoom  = isHost || isGuest;

  const joinAttempted = useRef(false);

  // Join the room once we confirm we're NOT the host (guest or unknown)
  useEffect(() => {
    if (!ctx.isActive || !myIdentity || !code || joinAttempted.current) return;
    if (isHost) { joinAttempted.current = true; return; }
    if (isGuest) { joinAttempted.current = true; return; }
    if (room && !inRoom) {
      joinAttempted.current = true;
      joinRoom({ code });
      return;
    }
  }, [ctx.isActive, myIdentity?.toHexString(), code, room, isHost, isGuest, inRoom, joinRoom]);

  const host  = resolveUser(users, room?.hostIdentity);
  const guest = resolveUser(users, room?.guestIdentity);

  const myReady   = isHost ? room?.hostReady : isGuest ? room?.guestReady : false;
  const bothReady = room?.hostReady && room?.guestReady && !!room?.guestIdentity;

  // Host triggers game start when both are ready
  useEffect(() => {
    if (bothReady && isHost && code) {
      startGame({ code });
    }
  }, [bothReady, isHost, code]);

  // All players navigate when game starts
  useEffect(() => {
    if (room?.status === 'in_game') {
      navigate(`/play/match?game=${room.code}`);
    }
  }, [room?.status, room?.code, navigate]);

  const parsedSettings = useMemo(
    () => parseRoomSettings(room?.settings ?? '{}'),
    [room?.settings]
  );

  const problemMap = useMemo(() => {
    const m = new Map<string, Problem>();
    for (const p of problems) m.set(String(p.id), p);
    return m;
  }, [problems]);

  const handleLeave = () => {
    if (code) leaveRoom({ code });
    navigate('/play');
  };

  const handleToggleReady = () => {
    if (code) setReady({ code, ready: !myReady });
  };

  const handleEditSettings = () => {
    setDraftSettings(parsedSettings);
    setEditingSettings(true);
  };

  const handleSaveSettings = () => {
    if (!code || !draftSettings) return;
    updateRoomSettings({ code, settings: serializeRoomSettings(draftSettings) });
    setEditingSettings(false);
    setDraftSettings(null);
  };

  const handleCancelEdit = () => {
    setEditingSettings(false);
    setDraftSettings(null);
  };

  if (!room) {
    return (
      <div>
        <p className="text-text-muted text-center mt-20">Joining room...</p>
        <div className="text-center mt-4">
          <button className="btn-secondary" onClick={() => navigate('/play')}>Back to Play</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-center justify-between w-full max-w-[640px]">
        <span className="text-[13px] text-text-muted font-mono">Room: {code}</span>
        <button className="btn-secondary" onClick={handleLeave}>Leave</button>
      </div>

      <div className="max-w-[640px] w-full flex flex-col items-center gap-8">
        {/* Settings panel */}
        {editingSettings && draftSettings ? (
          <div className="w-full card p-6 flex flex-col gap-4">
            <div className="text-sm font-semibold text-text">Edit Game Settings</div>
            <CustomGameSettingsForm
              settings={draftSettings}
              onChange={setDraftSettings}
            />
            <div className="flex gap-2 pt-2">
              <button className="btn-primary px-4 py-1.5 text-sm" onClick={handleSaveSettings}>
                Save
              </button>
              <button className="btn-secondary px-4 py-1.5 text-sm" onClick={handleCancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <SettingsSummary
            settings={parsedSettings}
            problemMap={problemMap}
            canEdit={isHost && room.status === 'waiting'}
            onEdit={handleEditSettings}
          />
        )}

        <div className="flex items-center gap-8 w-full justify-center">
          <PlayerSlot user={host}  label="Host"  isReady={room.hostReady} />
          <div className="text-2xl font-bold text-text-muted">VS</div>
          <PlayerSlot user={guest} label="Guest" isReady={room.guestReady} />
        </div>

        {bothReady && (
          <div className="py-3 px-6 rounded-lg bg-blue text-white font-semibold text-center">
            Both players ready — game starting…
          </div>
        )}

        {(isHost || isGuest) && !bothReady && !editingSettings && (
          <button
            className={myReady ? 'btn-secondary px-8 py-3 text-[15px] font-semibold' : 'btn-primary'}
            onClick={handleToggleReady}
          >
            {myReady ? 'Unready' : 'Ready up'}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings summary — shown in lobby when not editing
// ---------------------------------------------------------------------------

function difficultyColor(d: string) {
  return d === 'easy' ? 'text-green' : d === 'hard' ? 'text-red' : 'text-yellow';
}

function difficultyLabel(d: string) {
  return d[0].toUpperCase() + d.slice(1);
}

interface SettingsSummaryProps {
  settings: RoomSettings;
  problemMap: Map<string, Problem>;
  canEdit: boolean;
  onEdit: () => void;
}

function SettingsSummary({ settings, problemMap, canEdit, onEdit }: SettingsSummaryProps) {
  const ps = settings.problemSelection;

  return (
    <div className="w-full card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Game Settings
        </span>
        {canEdit && (
          <button
            className="text-xs text-accent hover:text-accent/80 cursor-pointer transition-colors"
            onClick={onEdit}
          >
            Edit
          </button>
        )}
      </div>

      {/* Problem list */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-text-faint">
          {ps.kind === 'explicit'
            ? `${ps.problemIds.length} problem${ps.problemIds.length !== 1 ? 's' : ''}`
            : `${ps.count} problem${ps.count !== 1 ? 's' : ''} · ${difficultyLabel(ps.difficulty)} pool`}
        </span>

        {ps.kind === 'explicit' && ps.problemIds.length > 0 && (
          <ol className="flex flex-col gap-0.5">
            {ps.problemIds.map((id, idx) => {
              const p = problemMap.get(id);
              return (
                <li key={id} className="flex items-center gap-2 text-[13px]">
                  <span className="text-[10px] text-text-faint w-4 text-right shrink-0 select-none">
                    {idx + 1}.
                  </span>
                  {p ? (
                    <>
                      <span className={`text-[10px] font-bold w-4 shrink-0 ${difficultyColor(p.difficulty)}`}>
                        {p.difficulty[0].toUpperCase()}
                      </span>
                      <span className="text-text">{p.title}</span>
                    </>
                  ) : (
                    <span className="text-text-muted">Unknown problem</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {ps.kind === 'explicit' && ps.problemIds.length === 0 && (
          <span className="text-[13px] text-red">No problems selected yet.</span>
        )}
      </div>

      {/* HP */}
      <div className="flex items-center gap-2 text-[12px] text-text-muted">
        <span className="text-red font-semibold">♥</span>
        <span>Starting HP: {settings.startingHp}</span>
      </div>
    </div>
  );
}

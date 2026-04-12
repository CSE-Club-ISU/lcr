import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { Room, User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq, resolveUser } from '../utils/identity';
import PlayerSlot from '../components/room/PlayerSlot';

export default function RoomPage() {
  const { code }    = useParams<{ code: string }>();
  const navigate    = useNavigate();
  const ctx         = useSpacetimeDB();
  const [rooms]     = useTypedTable<Room>(tables.room);
  const [users]     = useTypedTable<User>(tables.user);
  const joinRoom    = useReducer(reducers.joinRoom);
  const leaveRoom   = useReducer(reducers.leaveRoom);
  const setReady    = useReducer(reducers.setReady);
  const startGame   = useReducer(reducers.startGame);

  const myIdentity = ctx.identity;
  const room = rooms.find(r => r.code === code);

  const isHost  = !!myIdentity && !!room && identityEq(room.hostIdentity, myIdentity);
  const isGuest = !!myIdentity && !!room && !!room.guestIdentity && identityEq(room.guestIdentity, myIdentity);
  const inRoom  = isHost || isGuest;

  const joinAttempted = useRef(false);

  // Join the room once we confirm we're NOT the host (guest or unknown)
  useEffect(() => {
    if (!ctx.isActive || !myIdentity || !code || joinAttempted.current) return;
    // If room data loaded and we're the host, no need to join
    if (isHost) {
      joinAttempted.current = true;
      return;
    }
    // If room loaded and we're already guest, no need to join
    if (isGuest) {
      joinAttempted.current = true;
      return;
    }
    // If room loaded but we're neither host nor guest, join now
    if (room && !inRoom) {
      joinAttempted.current = true;
      joinRoom({ code });
      return;
    }
    // Room hasn't loaded yet — wait for it. Once it loads, this effect
    // re-runs and one of the branches above will fire.
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

  const settings = (() => {
    try { return JSON.parse(room?.settings ?? '{}') as Record<string, string>; } catch { return {}; }
  })();

  const handleLeave = () => {
    if (code) leaveRoom({ code });
    navigate('/play');
  };

  const handleToggleReady = () => {
    if (code) setReady({ code, ready: !myReady });
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
        <div className="flex gap-2 flex-wrap justify-center">
          {settings.difficulty    && <Chip label={`Difficulty: ${settings.difficulty}`} />}
          {settings.problem_count && <Chip label={`Problems: ${settings.problem_count}`} />}
          {settings.starting_hp  && <Chip label={`HP: ${settings.starting_hp}`} />}
        </div>

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

        {(isHost || isGuest) && !bothReady && (
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

function Chip({ label }: { label: string }) {
  return <span className="chip">{label}</span>;
}

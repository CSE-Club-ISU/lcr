import { useParams, useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { Room, User } from '../module_bindings/types';
import PlayerSlot from '../components/room/PlayerSlot';

export default function RoomPage() {
  const { code }  = useParams<{ code: string }>();
  const navigate  = useNavigate();
  const ctx       = useSpacetimeDB();
  const [roomRows] = useTable(tables.room);
  const [userRows] = useTable(tables.user);
  const leaveRoom  = useReducer(reducers.leaveRoom);
  const setReady   = useReducer(reducers.setReady);

  const rooms = roomRows as unknown as Room[];
  const users = userRows as unknown as User[];

  const myIdentity = ctx.identity;
  const room = rooms.find(r => r.code === code);

  const resolve = (id: { toHexString(): string } | null | undefined): User | undefined =>
    id ? users.find(u => u.identity.toHexString() === id.toHexString()) : undefined;

  const host  = resolve(room?.hostIdentity);
  const guest = resolve(room?.guestIdentity);

  const isHost  = myIdentity && room?.hostIdentity.toHexString() === myIdentity.toHexString();
  const isGuest = myIdentity && room?.guestIdentity?.toHexString() === myIdentity.toHexString();

  const myReady   = isHost ? room?.hostReady : isGuest ? room?.guestReady : false;
  const bothReady = room?.hostReady && room?.guestReady && !!room?.guestIdentity;

  const settings = (() => {
    try { return JSON.parse(room?.settings ?? '{}') as Record<string, string>; } catch { return {}; }
  })();

  const handleLeave = () => {
    if (code) leaveRoom({ code });
    navigate('/lobby');
  };

  const handleToggleReady = () => {
    if (code) setReady({ code, ready: !myReady });
  };

  if (!room) {
    return (
      <div className="min-h-screen">
        <p className="text-gh-muted text-center mt-20">Room not found.</p>
        <div className="text-center">
          <button className="btn-secondary" onClick={() => navigate('/lobby')}>Back to lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 h-14 border-b border-gh-border bg-gh-card">
        <span className="font-bold text-xl">LCR</span>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-gh-muted font-mono">Room: {code}</span>
          <button className="btn-secondary" onClick={handleLeave}>Leave</button>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto py-10 px-6 flex flex-col items-center gap-8">
        <div className="flex gap-2 flex-wrap justify-center">
          {settings.difficulty    && <Chip label={`Difficulty: ${settings.difficulty}`} />}
          {settings.problem_count && <Chip label={`Problems: ${settings.problem_count}`} />}
          {settings.starting_hp  && <Chip label={`HP: ${settings.starting_hp}`} />}
        </div>

        <div className="flex items-center gap-8 w-full justify-center">
          <PlayerSlot user={host}  label="Host"  isReady={room.hostReady} />
          <div className="text-2xl font-bold text-gh-muted">VS</div>
          <PlayerSlot user={guest} label="Guest" isReady={room.guestReady} />
        </div>

        {bothReady && (
          <div className="py-3 px-6 rounded-lg bg-gh-blue text-white font-semibold text-center">
            Both players ready — game starting soon!
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
      </main>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="chip">{label}</span>;
}

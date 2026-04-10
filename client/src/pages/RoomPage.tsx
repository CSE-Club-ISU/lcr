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
      <div style={styles.container}>
        <p style={{ color: '#8b949e', textAlign: 'center', marginTop: '80px' }}>Room not found.</p>
        <div style={{ textAlign: 'center' }}>
          <button style={styles.btnSecondary} onClick={() => navigate('/lobby')}>Back to lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={styles.brand}>LCR</span>
        <div style={styles.headerRight}>
          <span style={styles.code}>Room: {code}</span>
          <button style={styles.btnSecondary} onClick={handleLeave}>Leave</button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.settings}>
          {settings.difficulty    && <Chip label={`Difficulty: ${settings.difficulty}`} />}
          {settings.problem_count && <Chip label={`Problems: ${settings.problem_count}`} />}
          {settings.starting_hp  && <Chip label={`HP: ${settings.starting_hp}`} />}
        </div>

        <div style={styles.players}>
          <PlayerSlot user={host}  label="Host"  isReady={room.hostReady} />
          <div style={styles.vs}>VS</div>
          <PlayerSlot user={guest} label="Guest" isReady={room.guestReady} />
        </div>

        {bothReady && (
          <div style={styles.readyBanner}>
            Both players ready — game starting soon!
          </div>
        )}

        {(isHost || isGuest) && !bothReady && (
          <button
            style={myReady ? styles.btnUnready : styles.btnReady}
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
  return (
    <span style={{ padding: '4px 10px', background: '#21262d', borderRadius: '20px', fontSize: '13px', color: '#8b949e' }}>
      {label}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#0d1117', color: '#f0f6fc' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: '56px',
    borderBottom: '1px solid #30363d', backgroundColor: '#161b22',
  },
  brand:       { fontWeight: 700, fontSize: '20px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  code:        { fontSize: '13px', color: '#8b949e', fontFamily: 'monospace' },
  main: {
    maxWidth: '640px', margin: '0 auto', padding: '40px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px',
  },
  settings:    { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' },
  players: {
    display: 'flex', alignItems: 'center', gap: '32px', width: '100%', justifyContent: 'center',
  },
  vs: { fontSize: '24px', fontWeight: 700, color: '#8b949e' },
  readyBanner: {
    padding: '12px 24px', borderRadius: '8px',
    backgroundColor: '#1f6feb', color: '#fff', fontWeight: 600, textAlign: 'center',
  },
  btnReady: {
    padding: '12px 32px', fontWeight: 600, fontSize: '15px',
    color: '#fff', backgroundColor: '#238636', border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
  btnUnready: {
    padding: '12px 32px', fontWeight: 600, fontSize: '15px',
    color: '#f0f6fc', backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer',
  },
  btnSecondary: {
    padding: '8px 16px', fontSize: '14px',
    color: '#f0f6fc', backgroundColor: '#21262d', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer',
  },
};

import { useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers, type Room, type User } from '../module_bindings';
import RoomCard       from '../components/room/RoomCard';
import CreateRoomForm from '../components/room/CreateRoomForm';

export default function LobbyPage() {
  const navigate  = useNavigate();
  const ctx       = useSpacetimeDB();
  const [roomRows] = useTable(tables.room);
  const [userRows] = useTable(tables.user);
  const joinRoom  = useReducer(reducers.joinRoom);

  const rooms = roomRows as unknown as Room[];
  const users = userRows as unknown as User[];

  const myIdentity    = ctx.identity;
  const waitingRooms  = rooms.filter(r => r.status === 'waiting');

  const myUser = myIdentity
    ? users.find(u => u.identity.toHexString() === myIdentity.toHexString())
    : undefined;

  const handleJoin = (code: string) => {
    joinRoom({ code });
    navigate(`/room/${code}`);
  };

  const handleCreated = (code: string) => {
    navigate(`/room/${code}`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={styles.brand}>LCR</span>
        <span style={styles.user}>{myUser?.username ?? '…'}</span>
      </header>

      <main style={styles.main}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Create a room</h2>
          <CreateRoomForm onCreated={handleCreated} />
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Open rooms</h2>
          {waitingRooms.length === 0 ? (
            <p style={styles.empty}>No open rooms yet — create one above!</p>
          ) : (
            <div style={styles.roomList}>
              {waitingRooms.map(room => (
                <RoomCard
                  key={room.code}
                  room={room}
                  users={users}
                  myIdentity={myIdentity}
                  onJoin={handleJoin}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#0d1117', color: '#f0f6fc' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: '56px',
    borderBottom: '1px solid #30363d', backgroundColor: '#161b22',
  },
  brand: { fontWeight: 700, fontSize: '20px', letterSpacing: '-0.5px' },
  user:  { fontSize: '14px', color: '#8b949e' },
  main:  { maxWidth: '800px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '40px' },
  section: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionTitle: { margin: 0, fontSize: '16px', fontWeight: 600, color: '#f0f6fc' },
  empty: { margin: 0, color: '#8b949e', fontSize: '14px' },
  roomList: { display: 'flex', flexDirection: 'column', gap: '8px' },
};

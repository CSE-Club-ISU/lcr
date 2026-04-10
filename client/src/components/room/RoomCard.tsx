import type { Identity } from 'spacetimedb';
import type { Room, User } from '../../module_bindings/types';

interface Props {
  room:       Room;
  users:      User[];
  myIdentity: Identity | undefined;
  onJoin:     (code: string) => void;
}

export default function RoomCard({ room, users, myIdentity, onJoin }: Props) {
  const host  = users.find(u => u.identity.toHexString() === room.hostIdentity.toHexString());
  const isMine = myIdentity && room.hostIdentity.toHexString() === myIdentity.toHexString();
  const isFull = !!room.guestIdentity;

  const settings = (() => {
    try { return JSON.parse(room.settings); } catch { return {}; }
  })();

  return (
    <div style={styles.card}>
      <div style={styles.left}>
        <span style={styles.code}>{room.code}</span>
        <span style={styles.host}>{host?.username ?? 'unknown'}</span>
        {settings.difficulty && <span style={styles.tag}>{settings.difficulty}</span>}
      </div>
      <div style={styles.right}>
        <span style={styles.slots}>{isFull ? '2/2' : '1/2'}</span>
        {!isMine && !isFull && (
          <button style={styles.button} onClick={() => onJoin(room.code)}>
            Join
          </button>
        )}
        {isMine && (
          <span style={styles.myLabel}>Your room</span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px',
    backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px',
  },
  left:  { display: 'flex', alignItems: 'center', gap: '12px' },
  code:  { fontFamily: 'monospace', fontWeight: 700, fontSize: '15px', color: '#f0f6fc' },
  host:  { fontSize: '13px', color: '#8b949e' },
  tag: {
    padding: '2px 8px', backgroundColor: '#21262d',
    borderRadius: '12px', fontSize: '12px', color: '#8b949e',
  },
  right:   { display: 'flex', alignItems: 'center', gap: '12px' },
  slots:   { fontSize: '13px', color: '#8b949e' },
  myLabel: { fontSize: '13px', color: '#58a6ff' },
  button: {
    padding: '6px 16px', fontSize: '13px', fontWeight: 600,
    color: '#fff', backgroundColor: '#238636',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
};

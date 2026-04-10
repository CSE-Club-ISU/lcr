import type { User } from '../../module_bindings/types';

interface Props {
  user:    User | undefined;
  label:   string;
  isReady: boolean;
}

export default function PlayerSlot({ user, label, isReady }: Props) {
  return (
    <div style={styles.slot}>
      <span style={styles.roleLabel}>{label}</span>
      {user ? (
        <>
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.username}
              style={styles.avatar}
            />
          )}
          <span style={styles.username}>{user.username || '—'}</span>
          {(user.firstName || user.lastName) && (
            <span style={styles.name}>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</span>
          )}
          <span style={isReady ? styles.readyBadge : styles.waitingBadge}>
            {isReady ? '✓ Ready' : 'Not ready'}
          </span>
        </>
      ) : (
        <span style={styles.empty}>Waiting…</span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  slot: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    padding: '24px', minWidth: '180px',
    backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '10px',
  },
  roleLabel: { fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px' },
  avatar: { width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' },
  username: { fontWeight: 600, fontSize: '16px', color: '#f0f6fc' },
  name:     { fontSize: '13px', color: '#8b949e' },
  empty:    { fontSize: '14px', color: '#484f58', fontStyle: 'italic' },
  readyBadge: {
    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
    backgroundColor: '#1a4731', color: '#3fb950',
  },
  waitingBadge: {
    padding: '3px 10px', borderRadius: '12px', fontSize: '12px',
    backgroundColor: '#21262d', color: '#8b949e',
  },
};

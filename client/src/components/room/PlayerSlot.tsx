import type { User } from '../../module_bindings/types';

interface Props {
  user:    User | undefined;
  label:   string;
  isReady: boolean;
}

export default function PlayerSlot({ user, label, isReady }: Props) {
  return (
    <div className="card flex flex-col items-center gap-2 p-6 min-w-[180px]">
      <span className="text-[11px] text-text-muted uppercase tracking-[1px]">{label}</span>
      {user ? (
        <>
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <span className="font-semibold text-base text-text">{user.username || '—'}</span>
          {(user.firstName || user.lastName) && (
            <span className="text-[13px] text-text-muted">{[user.firstName, user.lastName].filter(Boolean).join(' ')}</span>
          )}
          <span className={`px-[10px] py-[3px] rounded-xl text-xs font-semibold ${isReady ? 'bg-green-soft text-green' : 'bg-surface-alt text-text-muted'}`}>
            {isReady ? '✓ Ready' : 'Not ready'}
          </span>
        </>
      ) : (
        <span className="text-sm text-text-faint italic">Waiting…</span>
      )}
    </div>
  );
}

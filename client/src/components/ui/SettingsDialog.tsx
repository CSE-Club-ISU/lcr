import { useState, useEffect } from 'react';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../../module_bindings';
import type { User } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';
import { identityEq } from '../../utils/identity';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: Props) {
  const ctx = useSpacetimeDB();
  const [users] = useTypedTable<User>(tables.user);
  const setProfile = useReducer(reducers.setProfile);
  const [settings, updateSettings] = useSettings();

  const myUser = ctx.identity
    ? users.find(u => identityEq(u.identity, ctx.identity))
    : undefined;

  const [draftUsername, setDraftUsername] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);

  useEffect(() => {
    if (myUser?.username) setDraftUsername(myUser.username);
  }, [myUser?.username]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const saveUsername = () => {
    const val = draftUsername.trim();
    if (!val || !myUser) return;
    setProfile({
      username: val,
      firstName: myUser.firstName,
      lastName: myUser.lastName,
      githubId: myUser.githubId,
      avatarUrl: myUser.avatarUrl,
    });
    setUsernameSaved(true);
    setTimeout(() => setUsernameSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="card w-[420px] p-8 flex flex-col gap-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-base text-text">Settings</span>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-text-faint text-lg leading-none px-1 hover:text-text"
          >
            ✕
          </button>
        </div>

        {/* Editor section */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] uppercase tracking-widest text-text-faint font-semibold">Editor</div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text">Vim mode</span>
            <button
              role="switch"
              aria-checked={settings.vimMode}
              onClick={() => updateSettings({ vimMode: !settings.vimMode })}
              className={`relative w-10 h-5 rounded-full border-none cursor-pointer transition-colors duration-150 ${
                settings.vimMode ? 'bg-accent' : 'bg-surface-alt'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-150 ${
                  settings.vimMode ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Profile section */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] uppercase tracking-widest text-text-faint font-semibold">Profile</div>
          <div className="flex items-center justify-between py-2 border-b border-border gap-3">
            <span className="text-sm text-text shrink-0">Username</span>
            <div className="flex items-center gap-2 min-w-0">
              <input
                className="input-field text-sm py-1 px-2 w-36"
                value={draftUsername}
                onChange={e => { setDraftUsername(e.target.value); setUsernameSaved(false); }}
                onKeyDown={e => { if (e.key === 'Enter') saveUsername(); }}
                placeholder="username"
              />
              <button
                onClick={saveUsername}
                disabled={!draftUsername.trim() || draftUsername.trim() === myUser?.username}
                className="btn-primary px-3 py-1 text-xs disabled:opacity-40"
              >
                {usernameSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { User } from '../module_bindings/types';

export default function ProfilePage() {
  const navigate   = useNavigate();
  const ctx        = useSpacetimeDB();
  const [rows]     = useTable(tables.user);
  const setProfile = useReducer(reducers.setProfile);

  const users    = rows as unknown as User[];
  const myUser   = ctx.identity
    ? users.find(u => u.identity.toHexString() === ctx.identity!.toHexString())
    : undefined;

  const githubProfile = (() => {
    try { return JSON.parse(localStorage.getItem('lcr_github_profile') ?? '{}'); } catch { return {}; }
  })();

  const [username,  setUsername]  = useState(githubProfile.username  ?? '');
  const [firstName, setFirstName] = useState(githubProfile.name?.split(' ')[0] ?? '');
  const [lastName,  setLastName]  = useState(githubProfile.name?.split(' ').slice(1).join(' ') ?? '');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Pre-fill from existing user row (overrides GitHub profile if already set)
  useEffect(() => {
    if (myUser) {
      if (myUser.username)   setUsername(myUser.username);
      if (myUser.firstName)  setFirstName(myUser.firstName);
      if (myUser.lastName)   setLastName(myUser.lastName);
    }
  }, [myUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Username is required'); return; }
    setSaving(true);
    setProfile({
      username:   username.trim(),
      firstName:  firstName.trim(),
      lastName:   lastName.trim(),
      githubId:   githubProfile.githubId  ?? '',
      avatarUrl:  githubProfile.avatarUrl ?? '',
    });
  };

  // Navigate to lobby once the user row is updated
  useEffect(() => {
    if (saving && myUser?.username) {
      navigate('/lobby');
    }
  }, [saving, myUser, navigate]);

  if (!localStorage.getItem('lcr_auth_token')) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="card p-10 w-[360px]">
        <h2 className="m-0 mb-6 text-gh-bright font-semibold text-xl">Set up your profile</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-gh-text text-sm">
            Username
            <input
              className="input-field"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="github-login"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-gh-text text-sm">
            First name
            <input
              className="input-field"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-gh-text text-sm">
            Last name
            <input
              className="input-field"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Optional"
            />
          </label>

          {error && <p className="m-0 text-gh-red text-[13px]">{error}</p>}

          <button className="btn-primary px-4 py-2.5 text-sm" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

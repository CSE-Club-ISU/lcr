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
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Set up your profile</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="github-login"
              required
            />
          </label>

          <label style={styles.label}>
            First name
            <input
              style={styles.input}
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <label style={styles.label}>
            Last name
            <input
              style={styles.input}
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Optional"
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', backgroundColor: '#0d1117',
  },
  card: {
    padding: '40px', width: '360px',
    backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px',
  },
  heading: { margin: '0 0 24px', color: '#f0f6fc', fontWeight: 600, fontSize: '20px' },
  form:    { display: 'flex', flexDirection: 'column', gap: '16px' },
  label:   { display: 'flex', flexDirection: 'column', gap: '6px', color: '#c9d1d9', fontSize: '14px' },
  input: {
    padding: '8px 12px', fontSize: '14px',
    backgroundColor: '#0d1117', color: '#f0f6fc',
    border: '1px solid #30363d', borderRadius: '6px', outline: 'none',
  },
  error:  { margin: 0, color: '#f85149', fontSize: '13px' },
  button: {
    padding: '10px', fontWeight: 600, fontSize: '14px',
    color: '#ffffff', backgroundColor: '#238636',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
};

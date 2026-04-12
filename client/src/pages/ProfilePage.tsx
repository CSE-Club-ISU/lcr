import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { User, MatchHistory } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';
import { formatTime } from '../utils/formatTime';
import Avatar from '../components/ui/Avatar';
import StatCard from '../components/ui/StatCard';
import ActivityHeatmap from '../components/ui/ActivityHeatmap';

// ── Setup form (first-time users) ────────────────────────────────────────
function SetupForm({ onSaved }: { onSaved: () => void }) {
  const ctx = useSpacetimeDB();
  const [users] = useTypedTable<User>(tables.user);
  const setProfile = useReducer(reducers.setProfile);

  const myUser = ctx.identity
    ? users.find(u => identityEq(u.identity, ctx.identity))
    : undefined;

  const githubProfile = (() => {
    try { return JSON.parse(localStorage.getItem('lcr_github_profile') ?? '{}'); } catch { return {}; }
  })();

  const [username, setUsername] = useState(githubProfile.username ?? '');
  const [firstName, setFirstName] = useState(githubProfile.name?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(githubProfile.name?.split(' ').slice(1).join(' ') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (myUser) {
      if (myUser.username) setUsername(myUser.username);
      if (myUser.firstName) setFirstName(myUser.firstName);
      if (myUser.lastName) setLastName(myUser.lastName);
    }
  }, [myUser]);

  useEffect(() => {
    if (saving && myUser?.username) {
      localStorage.removeItem('lcr_github_profile');
      onSaved();
    }
  }, [saving, myUser, onSaved]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Username is required'); return; }
    setSaving(true);
    setProfile({
      username: username.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      githubId: githubProfile.githubId ?? '',
      avatarUrl: githubProfile.avatarUrl ?? '',
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card p-10 w-[360px]">
        <h2 className="m-0 mb-6 text-text font-semibold text-xl">Set up your profile</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-text text-sm">
            Username
            <input className="input-field" value={username} onChange={e => setUsername(e.target.value)} placeholder="github-login" required />
          </label>
          <label className="flex flex-col gap-1.5 text-text text-sm">
            First name
            <input className="input-field" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Optional" />
          </label>
          <label className="flex flex-col gap-1.5 text-text text-sm">
            Last name
            <input className="input-field" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Optional" />
          </label>
          {error && <p className="m-0 text-red text-[13px]">{error}</p>}
          <button className="btn-primary px-4 py-2.5 text-sm" type="submit" disabled={saving}>
            {saving ? 'Saving\u2026' : 'Save & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard (returning users) ──────────────────────────────────────────
function Dashboard({ user, allUsers }: { user: User; allUsers: User[] }) {
  const navigate = useNavigate();
  const setProfile = useReducer(reducers.setProfile);
  const claimFirstAdmin = useReducer(reducers.claimFirstAdmin);
  const [historyRows] = useTypedTable<MatchHistory>(tables.match_history);

  const myMatches = useMemo(() => {
    return historyRows
      .filter(
        m =>
          identityEq(m.player1Identity, user.identity) ||
          identityEq(m.player2Identity, user.identity),
      )
      .sort((a, b) => {
        const ta = Number(a.playedAt.microsSinceUnixEpoch / 1000n);
        const tb = Number(b.playedAt.microsSinceUnixEpoch / 1000n);
        return tb - ta;
      });
  }, [historyRows, user.identity]);

  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of myMatches) {
      const date = new Date(Number(m.playedAt.microsSinceUnixEpoch / 1000n));
      const key = date.toISOString().slice(0, 10);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [myMatches]);

  const winRate =
    user.totalMatches > 0
      ? Math.round((user.totalWins / user.totalMatches) * 100)
      : 0;

  const isGuest = localStorage.getItem('lcr_guest_mode') === 'true';

  const handleSignOut = () => {
    localStorage.removeItem('lcr_auth_token');
    localStorage.removeItem('lcr_github_profile');
    localStorage.removeItem('lcr_guest_mode');
    navigate('/login');
  };

  const [editingUsername, setEditingUsername] = useState(false);
  const [draftUsername, setDraftUsername] = useState(user.username);

  const saveUsername = () => {
    const val = draftUsername.trim() || user.username;
    setProfile({
      username: val,
      firstName: user.firstName,
      lastName: user.lastName,
      githubId: user.githubId,
      avatarUrl: user.avatarUrl,
    });
    setEditingUsername(false);
  };

  const resolveUser = (id: { toHexString(): string }) =>
    allUsers.find(u => identityEq(u.identity, id));

  return (
    <div className="flex flex-col gap-6">
      {/* Hero row */}
      <div className="flex gap-4 items-stretch">
        {/* Profile card */}
        <div className="card p-6 flex flex-col gap-4 w-[260px] shrink-0">
          <div className="flex items-center gap-3.5">
            <Avatar src={user.avatarUrl} username={user.username} size="lg" />
            <div className="min-w-0">
              {editingUsername ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={draftUsername}
                    onChange={e => setDraftUsername(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveUsername();
                      if (e.key === 'Escape') { setDraftUsername(user.username); setEditingUsername(false); }
                    }}
                    className="bg-surface-alt border-[1.5px] border-gold-bright rounded-md px-2 py-0.5 text-[15px] font-bold text-text w-[120px] outline-none"
                  />
                  <button onClick={saveUsername} className="bg-gold-bright border-none rounded-[5px] px-2 py-0.5 text-xs font-bold text-charcoal cursor-pointer">
                    &#10003;
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-text">{user.username}</span>
                  <button
                    onClick={() => { setDraftUsername(user.username); setEditingUsername(true); }}
                    className="bg-transparent border-none cursor-pointer text-text-faint text-[13px] px-0.5 leading-none"
                    title="Edit username"
                  >
                    &#9998;
                  </button>
                </div>
              )}
              <div className="text-[11px] text-text-faint mt-0.5">
                {[user.firstName, user.lastName].filter(Boolean).join(' ')} &middot; ISU CSE Club
              </div>
            </div>
          </div>

          <button onClick={() => navigate('/play')} className="btn-primary py-[11px] text-sm">
            &#9654; Play
          </button>
          {isGuest ? (
            <button onClick={handleSignOut} className="btn-secondary py-2 text-xs text-text-muted">
              Sign in with GitHub
            </button>
          ) : (
            <button onClick={handleSignOut} className="btn-secondary py-2 text-xs text-text-muted">
              Sign out
            </button>
          )}
          {!allUsers.some(u => u.isAdmin) && !user.isAdmin && (
            <button
              onClick={() => claimFirstAdmin()}
              className="btn-secondary py-2 text-xs text-gold-bright border-gold-bright/40"
              title="Only works if no admin exists yet"
            >
              Claim admin
            </button>
          )}
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          <StatCard label="Wins" value={String(user.totalWins)} sub="Total" accent="#22C55E" />
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${user.totalMatches} matches`} accent="#3B82F6" />
          <StatCard label="Streak" value={`${user.currentStreak}d`} sub="Current streak" accent="#D4A017" />
          <StatCard label="Matches" value={String(user.totalMatches)} sub="All time" />
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-4">Activity — Last 16 Weeks</div>
        <ActivityHeatmap activityMap={activityMap} />
      </div>

      {/* Recent matches */}
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-4">Recent Matches</div>
        {myMatches.length === 0 ? (
          <div className="text-sm text-text-muted">No matches yet. <button className="text-accent bg-transparent border-none cursor-pointer p-0 font-semibold" onClick={() => navigate('/play')}>Play your first game!</button></div>
        ) : (
          <div className="flex flex-col">
            {myMatches.slice(0, 10).map((m, i) => {
              const isP1 = identityEq(m.player1Identity, user.identity);
              const won = identityEq(m.winnerIdentity, user.identity);
              const oppUser = resolveUser(isP1 ? m.player2Identity : m.player1Identity);
              const oppName = oppUser?.username ?? 'Unknown';
              const myTime = isP1 ? m.player1SolveTime : m.player2SolveTime;

              return (
                <div
                  key={String(m.id)}
                  className={`flex items-center justify-between py-3 ${i < Math.min(myMatches.length, 10) - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: won ? '#22C55E' : '#EF4444' }}
                    />
                    <div>
                      <span className="font-semibold text-sm text-text">vs {oppName}</span>
                      <span className="text-xs text-text-muted ml-2">{JSON.parse(m.problemTitles)[0] ?? ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-text-faint capitalize">{JSON.parse(m.difficulties)[0] ?? ''}</span>
                    <span className="text-xs text-text-faint">{formatTime(myTime)}</span>
                    <span
                      className="text-[13px] font-bold w-12 text-right"
                      style={{ color: won ? '#22C55E' : '#EF4444' }}
                    >
                      {won ? 'Win' : 'Loss'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page wrapper ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();
  const ctx = useSpacetimeDB();
  const [users] = useTypedTable<User>(tables.user);
  const setProfile = useReducer(reducers.setProfile);

  const myUser = ctx.identity
    ? users.find(u => identityEq(u.identity, ctx.identity))
    : undefined;

  // Auto-populate profile from GitHub data on first login so the user
  // doesn't have to fill in a form they already completed before.
  useEffect(() => {
    if (!ctx.isActive || !myUser || myUser.username) return;

    const raw = localStorage.getItem('lcr_github_profile');
    if (!raw) return;
    try {
      const gh = JSON.parse(raw) as Record<string, string>;
      if (!gh.username) return;
      setProfile({
        username:  gh.username,
        firstName: gh.name?.split(' ')[0] ?? '',
        lastName:  gh.name?.split(' ').slice(1).join(' ') ?? '',
        githubId:  gh.githubId ?? '',
        avatarUrl: gh.avatarUrl ?? '',
      });
    } catch { /* ignore */ }
  }, [ctx.isActive, myUser]);

  // Clear GitHub profile from localStorage once it's been saved to SpacetimeDB
  useEffect(() => {
    if (myUser?.username) {
      localStorage.removeItem('lcr_github_profile');
    }
  }, [myUser?.username]);

  const isGuest = localStorage.getItem('lcr_guest_mode') === 'true';
  if (!localStorage.getItem('lcr_auth_token') && !isGuest) return null;

  // Still connecting — don't flash the setup form
  if (!ctx.isActive || !myUser) {
    return <div className="flex items-center justify-center min-h-screen text-text-muted">Loading…</div>;
  }

  if (!myUser.username) {
    return <SetupForm onSaved={() => navigate('/profile')} />;
  }

  return <Dashboard user={myUser} allUsers={users} />;
}

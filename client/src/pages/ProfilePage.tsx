import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { User } from '../module_bindings/types';
import Avatar from '../components/ui/Avatar';
import RankBadge from '../components/ui/RankBadge';
import StatCard from '../components/ui/StatCard';
import ProgressBar from '../components/ui/ProgressBar';
import ActivityHeatmap from '../components/ui/ActivityHeatmap';

// ── Mock data (backend lacks ELO / stats / match history) ────────────────
const MOCK_ELO = 1482;
const MOCK_RANK = 'Gold' as const;
const MOCK_RECENT = [
  { opp: 'alex_c', result: 'win' as const, problem: 'Two Sum', rating: '+18', time: '4m 32s' },
  { opp: 'priya_m', result: 'loss' as const, problem: 'Valid Parentheses', rating: '-12', time: '7m 01s' },
  { opp: 'jordan_k', result: 'win' as const, problem: 'Merge Intervals', rating: '+21', time: '9m 14s' },
  { opp: 'wei_l', result: 'win' as const, problem: 'Binary Search', rating: '+15', time: '3m 48s' },
];

// ── Setup form (first-time users) ────────────────────────────────────────
function SetupForm({ onSaved }: { onSaved: () => void }) {
  const ctx = useSpacetimeDB();
  const [rows] = useTable(tables.user);
  const setProfile = useReducer(reducers.setProfile);

  const users = rows as unknown as User[];
  const myUser = ctx.identity
    ? users.find(u => u.identity.toHexString() === ctx.identity!.toHexString())
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
    if (saving && myUser?.username) onSaved();
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
function Dashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const setProfile = useReducer(reducers.setProfile);

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
                    onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') { setDraftUsername(user.username); setEditingUsername(false); } }}
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

          <div className="flex items-center gap-3">
            <RankBadge tier={MOCK_RANK} size="lg" />
            <div>
              <div className="font-extrabold text-[22px] text-text tracking-tight">{MOCK_ELO.toLocaleString()}</div>
              <div className="text-xs text-text-muted">ELO Rating</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">To Platinum</span>
              <span className="text-text font-semibold">{MOCK_ELO.toLocaleString()} / 1,600</span>
            </div>
            <ProgressBar value={MOCK_ELO} max={1600} height={7} />
          </div>

          <button onClick={() => navigate('/play')} className="btn-primary py-[11px] text-sm">
            &#9654; Find Match
          </button>
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          <StatCard label="Wins" value="47" sub="This season" accent="#22C55E" />
          <StatCard label="Win Rate" value="68%" sub="Last 30 days" accent="#3B82F6" />
          <StatCard label="Solved" value="124" sub="Problems total" />
          <StatCard label="Streak" value="7d" sub="Current streak" accent="#D4A017" />
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-4">Activity — Last 16 Weeks</div>
        <ActivityHeatmap />
      </div>

      {/* Recent matches */}
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-4">Recent Matches</div>
        <div className="flex flex-col">
          {MOCK_RECENT.map((m, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-3 ${i < MOCK_RECENT.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: m.result === 'win' ? '#22C55E' : '#EF4444' }}
                />
                <div>
                  <span className="font-semibold text-sm text-text">vs {m.opp}</span>
                  <span className="text-xs text-text-muted ml-2">{m.problem}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-text-faint">{m.time}</span>
                <span
                  className="text-[13px] font-bold w-9 text-right"
                  style={{ color: m.result === 'win' ? '#22C55E' : '#EF4444' }}
                >
                  {m.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page wrapper ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();
  const ctx = useSpacetimeDB();
  const [rows] = useTable(tables.user);

  const users = rows as unknown as User[];
  const myUser = ctx.identity
    ? users.find(u => u.identity.toHexString() === ctx.identity!.toHexString())
    : undefined;

  if (!localStorage.getItem('lcr_auth_token')) return null;

  // Show setup form if no username
  if (!myUser?.username) {
    return <SetupForm onSaved={() => navigate('/profile')} />;
  }

  return <Dashboard user={myUser} />;
}

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { Pencil, Check, Swords, LogOut, ShieldPlus } from 'lucide-react';
import { tables, reducers } from '../module_bindings';
import type { User, MatchHistory } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq, resolveUser } from '../utils/identity';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { formatTime } from '../utils/formatTime';
import Avatar from '../components/ui/Avatar';
import StatCard from '../components/ui/StatCard';
import ActivityHeatmap from '../components/ui/ActivityHeatmap';
import { safeParseJson } from '../utils/parseJson';

// ── Setup form (first-time users) ────────────────────────────────────────
function SetupForm({ onSaved }: { onSaved: () => void }) {
  const setProfile = useReducer(reducers.setProfile);
  const myUser = useCurrentUser();

  const githubProfile = safeParseJson<Record<string, string>>(
    localStorage.getItem('lcr_github_profile'), {}, 'github profile'
  );

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
    <div className="flex items-center justify-center min-h-[60vh] enter-fade">
      <div className="w-[400px] px-8 py-10">
        <span className="label-eyebrow">Initialization</span>
        <h2
          className="m-0 mt-2 mb-8 text-text"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 32,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          Set up your <span className="text-accent">profile</span>.
        </h2>
        <hr className="rule-gold mb-8" />
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-text text-[13px]">
            <span className="label-eyebrow">Username</span>
            <input
              className="input-field"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="github-login"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-text text-[13px]">
            <span className="label-eyebrow">First name</span>
            <input
              className="input-field"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="flex flex-col gap-2 text-text text-[13px]">
            <span className="label-eyebrow">Last name</span>
            <input
              className="input-field"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Optional"
            />
          </label>
          {error && <p className="m-0 text-red text-[12px] mono-tabular">{error}</p>}
          <button className="btn-editorial w-full justify-center mt-2" type="submit" disabled={saving}>
            {saving ? 'Saving\u2026' : 'Save & enter'}
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

  // Placeholder rating (no ELO table yet) — deterministic but editorial-looking
  const rating = 1200 + user.totalWins * 17 - (user.totalMatches - user.totalWins) * 9;

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

  const resolveUserById = (id: { toHexString(): string } | null | undefined) =>
    resolveUser(allUsers, id);

  return (
    <div className="flex flex-col gap-16">
      {/* Editorial hero */}
      <section className="flex flex-col gap-8">
        <div className="flex items-end justify-between gap-10 flex-wrap">
          {/* Left: identity */}
          <div className="flex items-center gap-5 min-w-0">
            <Avatar src={user.avatarUrl} username={user.username} size="hero" ring />
            <div className="min-w-0">
              <span className="label-eyebrow">Operative</span>
              {editingUsername ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    autoFocus
                    value={draftUsername}
                    onChange={e => setDraftUsername(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveUsername();
                      if (e.key === 'Escape') {
                        setDraftUsername(user.username);
                        setEditingUsername(false);
                      }
                    }}
                    className="bg-transparent border-b-[1.5px] border-gold-bright px-0 py-1 text-text w-[240px] outline-none"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontWeight: 400,
                      fontSize: 34,
                      letterSpacing: '-0.02em',
                    }}
                  />
                  <button
                    onClick={saveUsername}
                    className="flex items-center justify-center w-7 h-7 rounded-md bg-gold-bright text-charcoal border-none cursor-pointer"
                    title="Save"
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-1 group">
                  <h1
                    className="m-0 text-text"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontWeight: 400,
                      fontSize: 44,
                      letterSpacing: '-0.025em',
                      lineHeight: 1.05,
                      fontVariationSettings: '"opsz" 144',
                    }}
                  >
                    {user.username}
                  </h1>
                  <button
                    onClick={() => {
                      setDraftUsername(user.username);
                      setEditingUsername(true);
                    }}
                    className="bg-transparent border-none cursor-pointer text-text-faint hover:text-text transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit username"
                  >
                    <Pencil size={14} strokeWidth={1.75} />
                  </button>
                </div>
              )}
              <div className="text-[12px] text-text-muted mt-2 flex items-center gap-2">
                <span>
                  {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                </span>
                <span className="text-text-faint">·</span>
                <span>ISU CSE Club</span>
              </div>
            </div>
          </div>

          {/* Right: rating display */}
          <div className="flex flex-col items-end">
            <span className="label-eyebrow">Rating</span>
            <span
              className="display-numeral text-text mt-1"
              style={{ fontSize: 96 }}
            >
              {rating.toLocaleString()}
            </span>
            <span className="text-[11px] text-text-faint mono-tabular mt-1">
              est. based on W/L
            </span>
          </div>
        </div>

        <hr className="rule-gold" />

        {/* Stat plaques */}
        <div className="grid grid-cols-4 gap-10">
          <StatCard label="Wins" value={String(user.totalWins)} sub="Total" accent="var(--color-green)" />
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${user.totalMatches} matches`} />
          <StatCard label="Streak" value={`${user.currentStreak}d`} sub="Current" accent="var(--color-gold-bright)" />
          <StatCard label="Matches" value={String(user.totalMatches)} sub="All time" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => navigate('/play')}
            className="btn-editorial group"
          >
            <Swords size={15} strokeWidth={1.75} />
            <span>Play now</span>
          </button>
          <button onClick={handleSignOut} className="btn-ghost">
            <LogOut size={14} strokeWidth={1.75} />
            {isGuest ? 'Sign in with GitHub' : 'Sign out'}
          </button>
          {!allUsers.some(u => u.isAdmin) && !user.isAdmin && (
            <button
              onClick={() => claimFirstAdmin()}
              className="btn-ghost"
              style={{ color: 'var(--color-gold-bright)', borderColor: 'var(--color-hairline-gold)' }}
              title="Only works if no admin exists yet"
            >
              <ShieldPlus size={14} strokeWidth={1.75} />
              Claim admin
            </button>
          )}
        </div>
      </section>

      {/* Activity */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <span className="eyebrow-italic">Activity — last 16 weeks</span>
          <span className="label-eyebrow">{myMatches.length} matches</span>
        </div>
        <hr className="rule-hairline mb-6" />
        <ActivityHeatmap activityMap={activityMap} />
      </section>

      {/* Recent matches */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <span className="eyebrow-italic">Recent matches</span>
          {myMatches.length > 10 && (
            <span className="label-eyebrow">showing 10 of {myMatches.length}</span>
          )}
        </div>
        <hr className="rule-hairline mb-2" />
        {myMatches.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-text-muted m-0">No matches yet.</p>
            <button
              className="text-accent bg-transparent border-none cursor-pointer p-0 font-medium text-[13px] mt-3 hover:underline"
              onClick={() => navigate('/play')}
            >
              Play your first game →
            </button>
          </div>
        ) : (
          <div>
            {myMatches.slice(0, 10).map((m) => {
              const isP1 = identityEq(m.player1Identity, user.identity);
              const isDraw = !m.winnerIdentity;
              const won = !isDraw && identityEq(m.winnerIdentity, user.identity);
              const oppUser = resolveUserById(isP1 ? m.player2Identity : m.player1Identity);
              const oppName = oppUser?.username ?? 'Unknown';
              const myTime = isP1 ? m.player1SolveTime : m.player2SolveTime;
              const dotColor = isDraw ? '#71717A' : won ? '#22C55E' : '#EF4444';
              const label = isDraw ? 'Draw' : won ? 'Win' : 'Loss';
              const problemTitle = safeParseJson<string[]>(m.problemTitles, [], 'problemTitles')[0] ?? '';
              const difficulty = safeParseJson<string[]>(m.difficulties, [], 'difficulties')[0] ?? '';

              return (
                <div
                  key={String(m.id)}
                  className="row-editorial"
                  style={{ gridTemplateColumns: '16px 1fr auto auto 80px' }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: dotColor }}
                  />
                  <div className="min-w-0">
                    <span className="font-medium text-[14px] text-text">vs {oppName}</span>
                    <span className="text-[12px] text-text-muted ml-3 truncate">
                      {problemTitle}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-faint capitalize tracking-wide">
                    {difficulty}
                  </span>
                  <span className="text-[12px] text-text-faint mono-tabular w-16 text-right">
                    {formatTime(myTime)}
                  </span>
                  <span
                    className="text-[12px] font-medium w-16 text-right mono-tabular uppercase tracking-wider"
                    style={{ color: dotColor }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Page wrapper ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();
  const ctx = useSpacetimeDB();
  const [users] = useTypedTable<User>(tables.user);
  const setProfile = useReducer(reducers.setProfile);
  const myUser = useCurrentUser();

  useEffect(() => {
    if (!ctx.isActive || !myUser || myUser.username) return;

    const raw = localStorage.getItem('lcr_github_profile');
    if (!raw) return;
    const gh = safeParseJson<Record<string, string>>(raw, {}, 'github profile (auto-populate)');
    if (!gh.username) return;
    setProfile({
      username:  gh.username,
      firstName: gh.name?.split(' ')[0] ?? '',
      lastName:  gh.name?.split(' ').slice(1).join(' ') ?? '',
      githubId:  gh.githubId ?? '',
      avatarUrl: gh.avatarUrl ?? '',
    });
  }, [ctx.isActive, myUser]);

  useEffect(() => {
    if (myUser?.username) {
      localStorage.removeItem('lcr_github_profile');
    }
  }, [myUser?.username]);

  const isGuest = localStorage.getItem('lcr_guest_mode') === 'true';
  if (!localStorage.getItem('lcr_auth_token') && !isGuest) return null;

  if (!ctx.isActive || !myUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-text-muted">
        <span className="eyebrow-italic">Connecting…</span>
      </div>
    );
  }

  if (!myUser.username) {
    return <SetupForm onSaved={() => navigate('/profile')} />;
  }

  return <Dashboard user={myUser} allUsers={users} />;
}

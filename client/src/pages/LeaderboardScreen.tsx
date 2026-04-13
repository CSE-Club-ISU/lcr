import { useMemo } from 'react';
import { useSpacetimeDB } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { User, MatchHistory } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';
import { eloToTier, TIER_ORDER, type Tier } from '../utils/tier';
import RankBadge from '../components/ui/RankBadge';

interface Row {
  rank: number;
  user: User;
  tier: Tier;
  winRate: number;
  delta: number;       // sum of last-5 match outcomes (+1 win, -1 loss)
  recent: ('W' | 'L' | 'D')[]; // last 5, oldest → newest
  isMe: boolean;
}

/**
 * Editorial leaderboard.
 * - Live `user` table sorted by elo
 * - Tier sections in Fraunces italic small caps with hairline rules
 * - #1 row gets gold hairline + Fraunces gold rating numeral
 * - Delta column reads recent match_history outcomes
 */
export default function LeaderboardScreen() {
  const ctx = useSpacetimeDB();
  const [users] = useTypedTable<User>(tables.user);
  const [history] = useTypedTable<MatchHistory>(tables.match_history);

  // Latest matches first; useful for both delta + activity timestamp
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) =>
      Number(b.playedAt.microsSinceUnixEpoch - a.playedAt.microsSinceUnixEpoch)),
    [history],
  );

  const rows: Row[] = useMemo(() => {
    const ranked = [...users]
      .filter(u => u.username) // hide unconfigured accounts
      .sort((a, b) => b.eloRating - a.eloRating);

    return ranked.map((u, i) => {
      const matches = sortedHistory.filter(m =>
        identityEq(m.player1Identity, u.identity) ||
        identityEq(m.player2Identity, u.identity)
      );
      const recent: ('W' | 'L' | 'D')[] = matches.slice(0, 5).map(m => {
        if (!m.winnerIdentity) return 'D';
        return identityEq(m.winnerIdentity, u.identity) ? 'W' : 'L';
      }).reverse();
      const delta = recent.reduce((sum, r) => sum + (r === 'W' ? 1 : r === 'L' ? -1 : 0), 0);
      const winRate = u.totalMatches > 0 ? Math.round((u.totalWins / u.totalMatches) * 100) : 0;
      return {
        rank: i + 1,
        user: u,
        tier: eloToTier(u.eloRating),
        winRate,
        delta,
        recent,
        isMe: !!ctx.identity && identityEq(u.identity, ctx.identity),
      };
    });
  }, [users, sortedHistory, ctx.identity]);

  const grouped: Record<Tier, Row[]> = useMemo(() => {
    const g: Record<Tier, Row[]> = { Diamond: [], Platinum: [], Gold: [], Silver: [], Bronze: [] };
    rows.forEach(r => g[r.tier].push(r));
    return g;
  }, [rows]);

  const myRow = rows.find(r => r.isMe);
  const totalActive = rows.length;

  return (
    <div className="enter-fade flex flex-col gap-12">
      {/* Editorial header */}
      <header className="flex items-end justify-between gap-8 pb-6" style={{ borderBottom: '1px solid var(--color-hairline-gold)' }}>
        <div>
          <div className="label-eyebrow mb-2">Season 03 &middot; Standings</div>
          <h1 className="display-title" style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}>
            Iowa State<span className="text-text-muted not-italic" style={{ fontStyle: 'normal', fontFamily: 'var(--font-serif)', fontWeight: 300 }}> CSE Club</span>
          </h1>
        </div>
        <div className="flex items-end gap-10 text-right">
          <div>
            <div className="label-eyebrow">Active</div>
            <div className="display-numeral" style={{ fontSize: 32 }}>{totalActive}</div>
          </div>
          {myRow && (
            <div>
              <div className="label-eyebrow">Your rank</div>
              <div className="display-numeral" style={{ fontSize: 32, color: 'var(--color-gold-bright)' }}>
                #{myRow.rank}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Tier sections */}
      <div className="flex flex-col gap-12">
        {TIER_ORDER.map(tier => {
          const tierRows = grouped[tier];
          if (tierRows.length === 0) return null;
          return <TierSection key={tier} tier={tier} rows={tierRows} />;
        })}
      </div>

      {rows.length === 0 && (
        <div className="py-24 text-center">
          <div className="eyebrow-italic mb-2">No competitors yet.</div>
          <div className="label-eyebrow">Be the first to queue.</div>
        </div>
      )}
    </div>
  );
}

// ── Tier section ────────────────────────────────────────────────────────────
function TierSection({ tier, rows }: { tier: Tier; rows: Row[] }) {
  return (
    <section>
      <div className="flex items-baseline gap-4 mb-4">
        <RankBadge tier={tier} />
        <div className="flex-1 flex items-baseline gap-3">
          <h2 className="eyebrow-italic" style={{ fontSize: 18, color: 'var(--color-text)' }}>{tier}</h2>
          <span className="label-eyebrow">{rows.length} {rows.length === 1 ? 'player' : 'players'}</span>
          <hr className="rule-hairline flex-1 ml-2" />
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid items-center px-5 py-2 label-eyebrow"
        style={{ gridTemplateColumns: '40px 1fr 110px 80px 90px 110px', borderBottom: '1px solid var(--color-hairline)' }}
      >
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Rating</span>
        <span className="text-right">Wins</span>
        <span className="text-right">Win%</span>
        <span className="text-right">Last 5</span>
      </div>

      <ul className="list-none p-0 m-0">
        {rows.map(r => <LeaderRow key={r.user.identity.toHexString()} row={r} />)}
      </ul>
    </section>
  );
}

// ── Single row ──────────────────────────────────────────────────────────────
function LeaderRow({ row }: { row: Row }) {
  const isFirst = row.rank === 1;
  const ratingColor = isFirst ? 'var(--color-gold-bright)' : 'var(--color-text)';
  const ratingFamily = isFirst ? 'var(--font-serif)' : 'var(--font-mono)';
  const ratingSize = isFirst ? 32 : 18;

  return (
    <li
      className="grid items-center px-5"
      style={{
        gridTemplateColumns: '40px 1fr 110px 80px 90px 110px',
        padding: isFirst ? '20px 20px' : '14px 20px',
        borderTop: isFirst ? '1px solid var(--color-hairline-gold)' : undefined,
        borderBottom: '1px solid var(--color-hairline)',
        background: row.isMe ? 'rgba(192, 39, 45, 0.04)' : 'transparent',
        position: 'relative',
      }}
    >
      {row.isMe && (
        <span
          className="absolute left-0 top-0 bottom-0"
          style={{ width: 2, background: 'var(--color-accent)' }}
          aria-hidden
        />
      )}
      <span className="mono-tabular text-text-muted" style={{ fontSize: 13 }}>
        {String(row.rank).padStart(2, '0')}
      </span>
      <div className="flex items-baseline gap-2">
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: isFirst ? 22 : 16,
          color: row.isMe ? 'var(--color-text)' : 'var(--color-text)',
          letterSpacing: '-0.01em',
          fontVariationSettings: '"opsz" 144',
        }}>
          {row.user.username || '—'}
        </span>
        {row.isMe && (
          <span className="label-eyebrow" style={{ color: 'var(--color-accent)', fontSize: 9 }}>You</span>
        )}
      </div>
      <span
        className="text-right"
        style={{
          fontFamily: ratingFamily,
          fontSize: ratingSize,
          color: ratingColor,
          letterSpacing: '-0.02em',
          fontFeatureSettings: '"tnum","zero"',
          fontVariationSettings: isFirst ? '"opsz" 144' : undefined,
        }}
      >
        {row.user.eloRating}
      </span>
      <span className="mono-tabular text-text-muted text-right" style={{ fontSize: 13 }}>
        {row.user.totalWins}
      </span>
      <span className="mono-tabular text-text-muted text-right" style={{ fontSize: 13 }}>
        {row.user.totalMatches > 0 ? `${row.winRate}%` : '—'}
      </span>
      <RecentStrip recent={row.recent} delta={row.delta} />
    </li>
  );
}

// ── Last-5 strip + numeric delta ────────────────────────────────────────────
function RecentStrip({ recent, delta }: { recent: ('W' | 'L' | 'D')[]; delta: number }) {
  const dotColor = (r: 'W' | 'L' | 'D') =>
    r === 'W' ? 'var(--color-green)' :
    r === 'L' ? 'var(--color-accent)' :
                'var(--color-text-faint)';

  const deltaColor =
    delta > 0 ? 'var(--color-green)' :
    delta < 0 ? 'var(--color-accent)' :
                'var(--color-text-faint)';

  const deltaStr = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '·';

  if (recent.length === 0) {
    return (
      <span className="mono-tabular text-text-faint text-right" style={{ fontSize: 13 }}>—</span>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="flex items-center gap-[3px]">
        {recent.map((r, i) => (
          <span
            key={i}
            className="block w-1 h-3 rounded-[1px]"
            style={{ background: dotColor(r), opacity: 0.55 + (i / recent.length) * 0.45 }}
            title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw'}
          />
        ))}
      </div>
      <span className="mono-tabular" style={{ fontSize: 12, color: deltaColor, minWidth: 24 }}>
        {deltaStr}
      </span>
    </div>
  );
}

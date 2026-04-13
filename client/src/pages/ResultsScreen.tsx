import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpacetimeDB } from 'spacetimedb/react';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { tables } from '../module_bindings';
import type { MatchHistory, User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq, resolveUser } from '../utils/identity';
import { formatTime } from '../utils/formatTime';
import Avatar from '../components/ui/Avatar';
import { safeParseJson } from '../utils/parseJson';

export default function ResultsScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctx = useSpacetimeDB();
  const [timedOut, setTimedOut] = useState(false);

  const gameId = searchParams.get('game') ?? '';

  const [allHistory] = useTypedTable<MatchHistory>(tables.match_history);
  const [users]      = useTypedTable<User>(tables.user);

  const match = allHistory
    .filter(m => m.roomCode === gameId)
    .sort((a, b) => Number(b.playedAt.microsSinceUnixEpoch - a.playedAt.microsSinceUnixEpoch))[0];

  useEffect(() => {
    if (match) return;
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [match]);

  const resolveUserById = (id: { toHexString(): string } | undefined) =>
    resolveUser(users, id);

  if (!match) {
    return (
      <div className="flex flex-col items-center gap-6 mt-24">
        <span className="eyebrow-italic">
          {timedOut ? 'Match data unavailable.' : 'Loading results…'}
        </span>
        <button className="btn-ghost" onClick={() => navigate('/profile')}>
          <ArrowLeft size={14} strokeWidth={1.75} />
          Back to dashboard
        </button>
      </div>
    );
  }

  const p1 = resolveUserById(match.player1Identity);
  const p2 = resolveUserById(match.player2Identity);
  const isDraw = !match.winnerIdentity;
  const winner = match.winnerIdentity ? resolveUserById(match.winnerIdentity) : undefined;

  const iWon = !isDraw && !!match.winnerIdentity && identityEq(match.winnerIdentity, ctx.identity);
  const myIsP1 = identityEq(match.player1Identity, ctx.identity);

  const myTime   = myIsP1 ? match.player1SolveTime : match.player2SolveTime;
  const oppTime  = myIsP1 ? match.player2SolveTime : match.player1SolveTime;

  const timeDelta = myTime > 0 && oppTime > 0 ? Math.abs(myTime - oppTime) : null;

  const outcome: 'victory' | 'defeat' | 'draw' = isDraw ? 'draw' : iWon ? 'victory' : 'defeat';
  const outcomeColor =
    outcome === 'victory' ? 'var(--color-accent)' :
    outcome === 'defeat'  ? 'var(--color-text-faint)' :
                            'var(--color-text-muted)';
  const outcomeWord =
    outcome === 'victory' ? 'Victory' :
    outcome === 'defeat'  ? 'Defeat'  :
                            'Draw';

  const players = [
    {
      user: p1,
      accepted: match.player1Accepted,
      solveTime: match.player1SolveTime,
      language: match.player1Language,
      isWinner: !isDraw && !!match.winnerIdentity && identityEq(match.player1Identity, match.winnerIdentity),
    },
    {
      user: p2,
      accepted: match.player2Accepted,
      solveTime: match.player2SolveTime,
      language: match.player2Language,
      isWinner: !isDraw && !!match.winnerIdentity && identityEq(match.player2Identity, match.winnerIdentity),
    },
  ];

  return (
    <div className="flex flex-col gap-14 enter-fade">
      {/* Hero outcome */}
      <section className="pt-4">
        <span className="label-eyebrow">Match result</span>
        <h1
          className="m-0 mt-2"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: outcome === 'victory' ? 'italic' : 'normal',
            fontWeight: 400,
            fontSize: 'clamp(72px, 10vw, 128px)',
            letterSpacing: '-0.03em',
            lineHeight: 0.95,
            color: outcomeColor,
            fontVariationSettings: '"opsz" 144',
          }}
        >
          {outcomeWord}.
        </h1>
        {!isDraw && timeDelta !== null && (
          <p className="text-[14px] text-text-muted mt-4 max-w-[540px]">
            {iWon
              ? `You solved it ${formatTime(timeDelta)} faster than ${resolveUserById(myIsP1 ? match.player2Identity : match.player1Identity)?.username ?? 'your opponent'}.`
              : `${winner?.username ?? 'Your opponent'} finished ${formatTime(timeDelta)} ahead.`}
          </p>
        )}
        {isDraw && (
          <p className="text-[14px] text-text-muted mt-4">Time expired with the match tied.</p>
        )}
        <hr className="rule-gold mt-8" />
      </section>

      {/* Problem + comparison */}
      <section className="flex flex-col gap-8">
        <div>
          <span className="label-eyebrow">Problem</span>
          <div
            className="text-text mt-2"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 28,
              letterSpacing: '-0.01em',
            }}
          >
            {safeParseJson<string[]>(match.problemTitles, [], 'problemTitles').join(' · ') || '—'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10">
          {players.map((p, i) => {
            const isYou = p.user && identityEq(p.user.identity, ctx.identity);
            return (
              <div key={i} className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={p.user?.avatarUrl}
                    username={p.user?.username ?? '?'}
                    size="lg"
                    ring={p.isWinner}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-text"
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontStyle: 'italic',
                          fontSize: 22,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {p.user?.username ?? 'Unknown'}
                      </span>
                      {isYou && <span className="label-eyebrow text-accent">you</span>}
                    </div>
                    <span
                      className="text-[11px] mono-tabular tracking-wider uppercase"
                      style={{
                        color: p.accepted ? 'var(--color-green)' : 'var(--color-text-faint)',
                      }}
                    >
                      {p.accepted ? '● Accepted' : '○ Not solved'}
                    </span>
                  </div>
                </div>

                <hr className="rule-hairline" />

                <dl className="flex flex-col gap-3 m-0">
                  {[
                    ['Solve time', formatTime(p.solveTime)],
                    ['Language', p.language || '—'],
                    ['Difficulty', safeParseJson<string[]>(match.difficulties, [], 'difficulties')[0] ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-baseline">
                      <dt className="label-eyebrow m-0">{k}</dt>
                      <dd className="m-0 mono-tabular text-[13px] text-text capitalize">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      {/* Actions */}
      <section className="flex items-center gap-3 pt-4">
        <button onClick={() => navigate('/play')} className="btn-editorial group">
          <RotateCcw size={14} strokeWidth={1.75} />
          Play again
        </button>
        <button onClick={() => navigate('/profile')} className="btn-ghost">
          <ArrowLeft size={14} strokeWidth={1.75} />
          Dashboard
        </button>
      </section>
    </div>
  );
}

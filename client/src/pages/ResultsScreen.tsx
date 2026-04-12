import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpacetimeDB } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { MatchHistory, User } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq, resolveUser } from '../utils/identity';
import { formatTime } from '../utils/formatTime';
import Pill from '../components/ui/Pill';

export default function ResultsScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctx = useSpacetimeDB();
  const [timedOut, setTimedOut] = useState(false);

  const gameId = searchParams.get('game') ?? '';

  const [allHistory] = useTypedTable<MatchHistory>(tables.match_history);
  const [users]      = useTypedTable<User>(tables.user);

  // Find the match for this game (room_code === gameId)
  const match = allHistory
    .filter(m => m.roomCode === gameId)
    .sort((a, b) => Number(b.playedAt.microsSinceUnixEpoch - a.playedAt.microsSinceUnixEpoch))[0];

  // Timeout fallback if match data never arrives
  useEffect(() => {
    if (match) return;
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [match]);

  const resolveUserById = (id: { toHexString(): string } | undefined) =>
    resolveUser(users, id);

  if (!match) {
    return (
      <div className="flex flex-col items-center gap-6 mt-20">
        {timedOut ? (
          <>
            <div className="text-text-muted">Match data unavailable.</div>
            <button className="btn-secondary" onClick={() => navigate('/profile')}>
              Back to Dashboard
            </button>
          </>
        ) : (
          <>
            <div className="text-text-muted">Loading results…</div>
            <button className="btn-secondary" onClick={() => navigate('/profile')}>
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    );
  }

  const p1 = resolveUserById(match.player1Identity);
  const p2 = resolveUserById(match.player2Identity);
  const winner = resolveUserById(match.winnerIdentity);

  const iWon = identityEq(match.winnerIdentity, ctx.identity);
  const myIsP1 = identityEq(match.player1Identity, ctx.identity);

  const myTime   = myIsP1 ? match.player1SolveTime : match.player2SolveTime;
  const oppTime  = myIsP1 ? match.player2SolveTime : match.player1SolveTime;

  const timeDelta = myTime > 0 && oppTime > 0
    ? Math.abs(myTime - oppTime)
    : null;

  const GRAD_P1 = '#C0272D, #F5C518';
  const GRAD_P2 = '#2563EB, #818CF8';

  const players = [
    {
      user: p1,
      accepted: match.player1Accepted,
      solveTime: match.player1SolveTime,
      language: match.player1Language,
      isWinner: identityEq(match.player1Identity, match.winnerIdentity),
      grad: GRAD_P1,
    },
    {
      user: p2,
      accepted: match.player2Accepted,
      solveTime: match.player2SolveTime,
      language: match.player2Language,
      isWinner: identityEq(match.player2Identity, match.winnerIdentity),
      grad: GRAD_P2,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Result banner */}
      <div
        className="rounded-2xl px-8 py-7 flex items-center justify-between text-white"
        style={{
          background: iWon
            ? 'linear-gradient(135deg, #166534 0%, #0a1a0a 100%)'
            : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        }}
      >
        <div>
          <div className="text-xs font-semibold opacity-80 tracking-widest mb-1">MATCH RESULT</div>
          <div className="text-4xl font-black tracking-tight leading-none">
            {iWon ? 'Victory!' : 'Defeat'}
          </div>
          {timeDelta !== null && (
            <div className="text-sm opacity-80 mt-1.5">
              {iWon
                ? `You solved it ${formatTime(timeDelta)} faster than ${resolveUserById(myIsP1 ? match.player2Identity : match.player1Identity)?.username ?? 'opponent'}`
                : `${winner?.username ?? 'Opponent'} solved it ${formatTime(timeDelta)} faster`}
            </div>
          )}
          <div className="text-sm opacity-60 mt-1">{JSON.parse(match.problemTitles).join(', ')}</div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        {players.map((p, i) => (
          <div key={i} className={`card p-6 ${p.isWinner ? 'border-green' : ''}`}>
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg font-extrabold text-white"
                style={{ background: `linear-gradient(135deg, ${p.grad})` }}
              >
                {(p.user?.username?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-text">
                  {p.user?.username ?? 'Unknown'}
                  {p.user && identityEq(p.user.identity, ctx.identity) && (
                    <span className="text-[11px] text-accent ml-1.5">(you)</span>
                  )}
                </div>
                <Pill label={p.accepted ? 'Accepted' : 'Not solved'} color={p.accepted ? 'green' : 'red'} />
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                ['Solve Time', formatTime(p.solveTime)],
                ['Language', p.language || '—'],
                ['Difficulty', JSON.parse(match.difficulties)[0] ?? ''],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[13px] text-text-muted">{k}</span>
                  <span className="text-[13px] font-semibold text-text capitalize">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="flex-1 py-3 rounded-[10px] border border-border bg-surface font-bold text-sm cursor-pointer text-text"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => navigate('/play')}
          className="flex-1 py-3 rounded-[10px] border-none bg-accent font-bold text-sm cursor-pointer text-white"
        >
          &#9654; Play Again
        </button>
      </div>
    </div>
  );
}

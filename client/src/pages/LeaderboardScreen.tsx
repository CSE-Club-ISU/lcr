import RankBadge from '../components/ui/RankBadge';

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

interface Player {
  rank: number;
  name: string;
  rating: number;
  wins: number;
  winRate: string;
  tier: Tier;
  delta: string;
  isMe?: boolean;
}

const PLAYERS: Player[] = [
  { rank: 1, name: 'wei_l', rating: 1842, wins: 89, winRate: '76%', tier: 'Diamond', delta: '+12' },
  { rank: 2, name: 'sarah_k', rating: 1790, wins: 74, winRate: '71%', tier: 'Diamond', delta: '+8' },
  { rank: 3, name: 'omar_h', rating: 1751, wins: 68, winRate: '69%', tier: 'Platinum', delta: '-3' },
  { rank: 4, name: 'priya_m', rating: 1509, wins: 55, winRate: '62%', tier: 'Gold', delta: '+5' },
  { rank: 5, name: 'jake_dev', rating: 1500, wins: 47, winRate: '68%', tier: 'Gold', delta: '+18', isMe: true },
  { rank: 6, name: 'alex_c', rating: 1441, wins: 40, winRate: '58%', tier: 'Gold', delta: '-11' },
  { rank: 7, name: 'taylor_b', rating: 1388, wins: 33, winRate: '55%', tier: 'Silver', delta: '+2' },
  { rank: 8, name: 'jordan_k', rating: 1312, wins: 28, winRate: '51%', tier: 'Silver', delta: '+0' },
];

export default function LeaderboardScreen() {
  const podiumOrder = [PLAYERS[1], PLAYERS[0], PLAYERS[2]]; // 2nd, 1st, 3rd

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="card p-6">
        <div className="font-extrabold text-xl text-text mb-1">Season 3 Leaderboard</div>
        <div className="text-sm text-text-muted">ISU CSE Club &middot; Resets in 12 days</div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-[1fr_1.1fr_1fr] gap-3 items-end">
        {podiumOrder.map((p, i) => {
          const isFirst = i === 1;
          return (
            <div
              key={p.rank}
              className={`rounded-[14px] px-4 py-5 flex flex-col items-center gap-2.5 ${
                isFirst
                  ? 'bg-charcoal border border-gold-bright pt-7'
                  : 'bg-surface border border-border'
              }`}
            >
              <div className={isFirst ? 'text-[22px]' : 'text-lg'}>
                {isFirst ? '\uD83E\uDD47' : i === 0 ? '\uD83E\uDD48' : '\uD83E\uDD49'}
              </div>
              <div
                className="w-11 h-11 rounded-[11px] flex items-center justify-center text-xl font-extrabold text-white"
                style={{ background: `hsl(${p.rank * 67}, 70%, 55%)` }}
              >
                {p.name[0].toUpperCase()}
              </div>
              <div className={`font-bold text-sm ${isFirst ? 'text-gold-bright' : 'text-text'}`}>
                {p.name}
              </div>
              <div className={`font-black text-xl ${isFirst ? 'text-white' : 'text-text'}`}>
                {p.rating}
              </div>
              <RankBadge tier={p.tier} />
            </div>
          );
        })}
      </div>

      {/* Full table */}
      <div className="card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[40px_1fr_80px_60px_60px_60px] px-5 py-2.5 border-b border-border text-[11px] font-bold text-text-faint tracking-wider">
          <span>#</span>
          <span>PLAYER</span>
          <span>RATING</span>
          <span>WINS</span>
          <span>WIN%</span>
          <span>CHANGE</span>
        </div>
        {PLAYERS.map((p, i) => (
          <div
            key={p.rank}
            className={`grid grid-cols-[40px_1fr_80px_60px_60px_60px] px-5 py-3 items-center ${
              p.isMe ? 'bg-gold-soft' : ''
            } ${i < PLAYERS.length - 1 ? 'border-b border-border' : ''}`}
          >
            <span className={`font-bold text-[13px] ${p.rank <= 3 ? 'text-accent' : 'text-text-muted'}`}>
              {p.rank}
            </span>
            <div className="flex items-center gap-2.5">
              <RankBadge tier={p.tier} />
              <span className={`text-sm text-text ${p.isMe ? 'font-extrabold' : 'font-semibold'}`}>
                {p.name}
                {p.isMe && <span className="text-[11px] text-accent ml-1.5">(you)</span>}
              </span>
            </div>
            <span className="font-bold text-sm text-text">{p.rating}</span>
            <span className="text-[13px] text-text-muted">{p.wins}</span>
            <span className="text-[13px] text-text-muted">{p.winRate}</span>
            <span className={`text-[13px] font-bold ${
              p.delta.startsWith('+') && p.delta !== '+0' ? 'text-green' : p.delta === '+0' ? 'text-text-faint' : 'text-red'
            }`}>
              {p.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

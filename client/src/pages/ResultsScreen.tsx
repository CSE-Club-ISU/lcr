import { useNavigate } from 'react-router-dom';
import Pill from '../components/ui/Pill';
import ProgressBar from '../components/ui/ProgressBar';

const PLAYERS = [
  { name: 'jake_dev (You)', time: '5:46', memory: '14.2 MB', status: 'Accepted', avatar: 'J', grad: '#C0272D, #F5C518' },
  { name: 'priya_m', time: '7:00', memory: '14.8 MB', status: 'Accepted', avatar: 'P', grad: '#2563EB, #818CF8' },
];

export default function ResultsScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-5">
      {/* Win banner */}
      <div
        className="rounded-2xl px-8 py-7 flex items-center justify-between text-white"
        style={{ background: 'linear-gradient(135deg, #C0272D 0%, #1A0A0A 100%)' }}
      >
        <div>
          <div className="text-xs font-semibold opacity-80 tracking-widest mb-1">MATCH RESULT</div>
          <div className="text-4xl font-black tracking-tight leading-none">Victory!</div>
          <div className="text-sm opacity-80 mt-1.5">You solved it 1m 14s faster than priya_m</div>
        </div>
        <div className="text-right">
          <div className="text-[42px] font-black tracking-tighter">+18</div>
          <div className="text-sm opacity-80">ELO gained</div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        {PLAYERS.map((p, i) => (
          <div key={i} className={`card p-6 ${i === 0 ? 'border-green' : ''}`}>
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg font-extrabold text-white"
                style={{ background: `linear-gradient(135deg, ${p.grad})` }}
              >
                {p.avatar}
              </div>
              <div>
                <div className="font-bold text-text">{p.name}</div>
                <Pill label={p.status} color="green" />
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {[['Solve Time', p.time], ['Memory', p.memory], ['Language', 'Python']].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[13px] text-text-muted">{k}</span>
                  <span className="text-[13px] font-semibold text-text">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rating change */}
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-4">Rating Update</div>
        <div className="flex items-center gap-4">
          <div className="text-2xl font-extrabold text-text-muted">1,482</div>
          <div className="text-xl text-text-muted">&rarr;</div>
          <div className="text-[28px] font-black text-green">1,500</div>
          <Pill label="+18" color="green" />
        </div>
        <div className="mt-3.5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-text-muted">Progress to Platinum</span>
            <span className="font-semibold text-text">1,500 / 1,600</span>
          </div>
          <ProgressBar value={1500} max={1600} height={8} />
        </div>
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

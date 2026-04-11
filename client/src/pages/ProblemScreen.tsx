import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Pill from '../components/ui/Pill';
import ProgressBar from '../components/ui/ProgressBar';
import ProblemPanel from '../components/problem/ProblemPanel';
import CodeEditor from '../components/problem/CodeEditor';

export default function ProblemScreen() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(20 * 60); // 20 min
  const [oppProgress, setOppProgress] = useState(30);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Mock opponent progress
  useEffect(() => {
    const t = setInterval(() => setOppProgress(p => Math.min(95, p + Math.random() * 3)), 2000);
    return () => clearInterval(t);
  }, []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const timeStr = `${mins}:${secs}`;

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-120px)]">
      {/* Top bar */}
      <div className="card px-5 py-3 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pill label="Medium" color="orange" />
          <span className="font-bold text-[15px] text-text">Two Sum</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="text-[11px] text-text-muted">TIME LEFT</div>
            <div className={`font-extrabold text-lg tracking-tight ${seconds < 300 ? 'text-red' : 'text-text'}`}>
              {timeStr}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <div className="text-[11px] text-text-muted mb-1">OPPONENT</div>
            <ProgressBar value={oppProgress} max={100} color="#3B82F6" height={5} />
            <div className="text-[11px] text-text-muted mt-0.5">priya_m &middot; typing...</div>
          </div>
        </div>
      </div>

      {/* Main split */}
      <div className="flex gap-3 flex-1 min-h-0">
        <ProblemPanel />
        <div className="flex-1 flex flex-col gap-3">
          <CodeEditor />
          <div className="flex gap-2.5">
            <button className="flex-1 py-[11px] rounded-[10px] border border-border bg-surface text-text font-bold text-sm cursor-pointer">
              &#9655; Run Tests
            </button>
            <button
              onClick={() => navigate('/results')}
              className="flex-1 py-[11px] rounded-[10px] border-none bg-accent text-white font-bold text-sm cursor-pointer"
            >
              &uarr; Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

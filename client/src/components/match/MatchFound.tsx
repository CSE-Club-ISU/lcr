import Avatar from '../ui/Avatar';
import Pill from '../ui/Pill';

interface Props {
  onAccept: () => void;
  difficulty: string;
  category: string;
  timeLimit: string;
}

export default function MatchFound({ onAccept, difficulty, category, timeLimit }: Props) {
  return (
    <div className="card border-2 border-accent p-9 flex flex-col items-center gap-5">
      <div className="text-[13px] font-semibold text-accent tracking-widest uppercase">
        Match Found
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="mx-auto mb-2">
            <Avatar username="jake_dev" size="lg" />
          </div>
          <div className="font-bold text-text">jake_dev</div>
          <div className="text-xs text-text-muted">1,482 ELO</div>
        </div>

        <div className="text-2xl text-text-faint font-extrabold">VS</div>

        <div className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-xl flex items-center justify-center text-[22px] font-extrabold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #818CF8)' }}>
            P
          </div>
          <div className="font-bold text-text">priya_m</div>
          <div className="text-xs text-text-muted">1,509 ELO</div>
        </div>
      </div>

      <div className="flex gap-3">
        <Pill label={difficulty} color="orange" />
        <Pill label={category} color="blue" />
        <Pill label={timeLimit} color="gray" />
      </div>

      <button onClick={onAccept} className="btn-primary px-10 py-3 text-base font-extrabold">
        Accept &rarr;
      </button>
    </div>
  );
}

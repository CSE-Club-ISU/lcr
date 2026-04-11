import { useState, useEffect } from 'react';

interface Props {
  onCancel: () => void;
  onFound: () => void;
}

export default function SearchingState({ onCancel, onFound }: Props) {
  const [dots, setDots] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setDots(d => (d + 1) % 4);
      setElapsed(e => {
        if (e >= 3) { onFound(); clearInterval(t); return e; }
        return e + 1;
      });
    }, 700);
    return () => clearInterval(t);
  }, [onFound]);

  return (
    <div className="card p-12 flex flex-col items-center gap-5">
      <div
        className="w-[72px] h-[72px] rounded-full border-4 border-surface-alt border-t-accent animate-spin"
      />
      <div className="font-bold text-lg text-text">
        Searching{'.'.repeat(dots)}
      </div>
      <div className="text-[13px] text-text-muted">
        Matching near 1,482 ELO &middot; {elapsed}s
      </div>
      <button
        onClick={onCancel}
        className="px-6 py-2 rounded-lg border border-border bg-transparent text-text-muted text-[13px] cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}

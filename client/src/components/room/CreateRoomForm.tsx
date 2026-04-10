import { useState } from 'react';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '../../module_bindings';

interface Props {
  onCreated: (code: string) => void;
}

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

function randomCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

export default function CreateRoomForm({ onCreated }: Props) {
  const createRoom = useReducer(reducers.createRoom);

  const [code,         setCode]         = useState('');
  const [difficulty,   setDifficulty]   = useState<'easy' | 'medium' | 'hard'>('medium');
  const [problemCount, setProblemCount] = useState(3);
  const [startingHp,   setStartingHp]  = useState(100);
  const [error,        setError]        = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const roomCode = code.trim() || randomCode();
    if (!/^[A-Z0-9]{4,8}$/i.test(roomCode)) {
      setError('Room code must be 4–8 alphanumeric characters');
      return;
    }

    const settings = JSON.stringify({ difficulty, problem_count: problemCount, starting_hp: startingHp });
    createRoom({ code: roomCode.toUpperCase(), settings });
    onCreated(roomCode.toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1 text-xs text-gh-muted">
          Room code (optional)
          <input
            className="input-field w-[120px]"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Auto-generated"
            maxLength={8}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-gh-muted">
          Difficulty
          <select
            className="input-field"
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as typeof difficulty)}
          >
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gh-muted">
          Problems
          <input
            className="input-field w-[60px]"
            type="number" min={1} max={10}
            value={problemCount}
            onChange={e => setProblemCount(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-gh-muted">
          Starting HP
          <input
            className="input-field w-[70px]"
            type="number" min={10} max={500} step={10}
            value={startingHp}
            onChange={e => setStartingHp(Number(e.target.value))}
          />
        </label>

        <button className="btn-accent" type="submit">Create</button>
      </div>

      {error && <p className="m-0 text-gh-red text-[13px]">{error}</p>}
    </form>
  );
}

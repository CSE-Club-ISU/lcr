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
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.row}>
        <label style={styles.label}>
          Room code (optional)
          <input
            style={styles.input}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Auto-generated"
            maxLength={8}
          />
        </label>

        <label style={styles.label}>
          Difficulty
          <select
            style={styles.select}
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as typeof difficulty)}
          >
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label style={styles.label}>
          Problems
          <input
            style={{ ...styles.input, width: '60px' }}
            type="number" min={1} max={10}
            value={problemCount}
            onChange={e => setProblemCount(Number(e.target.value))}
          />
        </label>

        <label style={styles.label}>
          Starting HP
          <input
            style={{ ...styles.input, width: '70px' }}
            type="number" min={10} max={500} step={10}
            value={startingHp}
            onChange={e => setStartingHp(Number(e.target.value))}
          />
        </label>

        <button style={styles.button} type="submit">Create</button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form:  { display: 'flex', flexDirection: 'column', gap: '8px' },
  row:   { display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#8b949e' },
  input: {
    padding: '8px 10px', fontSize: '14px', width: '120px',
    backgroundColor: '#0d1117', color: '#f0f6fc',
    border: '1px solid #30363d', borderRadius: '6px', outline: 'none',
  },
  select: {
    padding: '8px 10px', fontSize: '14px',
    backgroundColor: '#0d1117', color: '#f0f6fc',
    border: '1px solid #30363d', borderRadius: '6px', outline: 'none',
  },
  button: {
    padding: '8px 20px', fontWeight: 600, fontSize: '14px',
    color: '#fff', backgroundColor: '#1f6feb',
    border: 'none', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-end',
  },
  error: { margin: 0, color: '#f85149', fontSize: '13px' },
};

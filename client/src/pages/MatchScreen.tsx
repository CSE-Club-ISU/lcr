import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '../module_bindings';
import QueueSettings from '../components/match/QueueSettings';
import SearchingState from '../components/match/SearchingState';
import MatchFound from '../components/match/MatchFound';

function randomCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

export default function MatchScreen() {
  const navigate = useNavigate();
  const createRoom = useReducer(reducers.createRoom);
  const [phase, setPhase] = useState<'queue' | 'searching' | 'found'>('queue');
  const [difficulty, setDifficulty] = useState('Medium');
  const [category, setCategory] = useState('Any');
  const [timeLimit, setTimeLimit] = useState('20 min');

  // Play with Friend state
  const [friendCode, setFriendCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [friendError, setFriendError] = useState('');

  const handleCreateFriendRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setFriendError('');
    const code = friendCode.trim() || randomCode();
    if (!/^[A-Z0-9]{4,8}$/i.test(code)) {
      setFriendError('Code must be 4-8 alphanumeric characters');
      return;
    }
    const settings = JSON.stringify({
      difficulty: difficulty.toLowerCase(),
      problem_count: 3,
      starting_hp: 100,
    });
    createRoom({ code: code.toUpperCase(), settings });
    navigate(`/play/room/${code.toUpperCase()}`);
  };

  const handleJoinFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/play/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Queue header */}
      <div className="card p-6">
        <div className="font-extrabold text-xl text-text mb-1">Ranked Queue</div>
        <div className="text-sm text-text-muted">
          Compete 1v1 on a shared problem. First correct submission wins.
        </div>
      </div>

      {/* Queue settings */}
      {phase === 'queue' && (
        <>
          <QueueSettings
            difficulty={difficulty} setDifficulty={setDifficulty}
            category={category} setCategory={setCategory}
            timeLimit={timeLimit} setTimeLimit={setTimeLimit}
          />
          <div className="flex justify-center">
            <button
              onClick={() => setPhase('searching')}
              className="bg-accent text-white border-none rounded-xl px-12 py-4 font-extrabold text-lg cursor-pointer transition-colors duration-150 hover:bg-accent-hover"
            >
              &#9654; Find Match
            </button>
          </div>
        </>
      )}

      {/* Searching */}
      {phase === 'searching' && (
        <SearchingState
          onCancel={() => setPhase('queue')}
          onFound={() => setPhase('found')}
        />
      )}

      {/* Match found */}
      {phase === 'found' && (
        <MatchFound
          onAccept={() => navigate('/play/match')}
          difficulty={difficulty}
          category={category}
          timeLimit={timeLimit}
        />
      )}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-faint font-semibold tracking-wider uppercase">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Play with Friend */}
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-4">Play with a Friend</div>
        <div className="flex gap-6">
          {/* Create room */}
          <form onSubmit={handleCreateFriendRoom} className="flex flex-col gap-2 flex-1">
            <label className="text-xs text-text-muted">Create a room</label>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={friendCode}
                onChange={e => setFriendCode(e.target.value.toUpperCase())}
                placeholder="Code (auto)"
                maxLength={8}
              />
              <button className="btn-primary px-4 py-2 text-sm" type="submit">Create</button>
            </div>
            {friendError && <p className="m-0 text-red text-[13px]">{friendError}</p>}
          </form>

          {/* Join room */}
          <form onSubmit={handleJoinFriend} className="flex flex-col gap-2 flex-1">
            <label className="text-xs text-text-muted">Join a room</label>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                maxLength={8}
              />
              <button className="btn-secondary px-4 py-2 text-sm" type="submit">Join</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

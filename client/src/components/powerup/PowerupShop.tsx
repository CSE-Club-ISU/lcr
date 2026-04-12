import { useMemo, useState } from 'react';
import { useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../../module_bindings';
import type { Powerup, PowerupLoadout, GameState } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';
import { identityEq } from '../../utils/identity';
import type { Identity } from 'spacetimedb';
import QuizPanel, { type QuizResult } from './QuizPanel';

const KIND_COLOR: Record<string, string> = {
  damage:   'text-red',
  defense:  'text-green',
  sabotage: 'text-orange',
};

interface Props {
  game: GameState;
  myIdentity: Identity | undefined;
  currency: number;
  isP1: boolean;
  onQuizAnswered: (result: QuizResult) => void;
}

export default function PowerupShop({ game, myIdentity, currency, isP1, onQuizAnswered }: Props) {
  const [powerups]  = useTypedTable<Powerup>(tables.powerup);
  const [loadouts]  = useTypedTable<PowerupLoadout>(tables.powerup_loadout);
  const usePowerup  = useReducer(reducers.usePowerup);
  const [showQuiz, setShowQuiz] = useState(false);

  const myLoadout = useMemo(() => {
    if (!myIdentity) return undefined;
    return loadouts.find(l => l.gameId === game.id && identityEq(l.playerIdentity, myIdentity));
  }, [loadouts, game.id, myIdentity]);

  const loadoutIds: Set<string> = useMemo(() => {
    if (!myLoadout) return new Set();
    try { return new Set(JSON.parse(myLoadout.powerupIds) as string[]); }
    catch { return new Set(); }
  }, [myLoadout?.powerupIds]);

  const available = useMemo(
    () => powerups.filter(p => loadoutIds.has(p.id.toString()))
                  .sort((a, b) => a.cost - b.cost),
    [powerups, loadoutIds]
  );

  if (showQuiz) {
    return (
      <QuizPanel
        game={game}
        isP1={isP1}
        onAnswered={result => {
          onQuizAnswered(result);
          setShowQuiz(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setShowQuiz(true)}
        className="group flex items-center gap-3 px-3 py-3 mb-2 rounded-lg text-left border border-border hover:bg-bg transition-all cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-bg border border-border flex items-center justify-center text-text-muted font-black text-sm shrink-0">
          ?
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-extrabold text-text">Bonus Question</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Bonus energy</span>
        </div>
        <span className="text-xs font-bold text-accent shrink-0">+10 →</span>
      </button>

      <div className="text-[10px] font-bold text-text-faint uppercase tracking-wider px-2 mb-1">Powerups</div>

      {available.length === 0 ? (
        <div className="text-xs text-text-muted mt-2">
          No powerups in loadout. <span className="text-text-faint">Select some on the Loadout page before your next match.</span>
        </div>
      ) : available.map(p => {
        const canAfford = currency >= p.cost;
        return (
          <button
            key={p.id.toString()}
            disabled={!canAfford}
            onClick={() => usePowerup({ gameId: game.id, powerupId: p.id })}
            title={p.description}
            className={[
              'flex items-center justify-between gap-2 px-2 py-2 rounded-md text-left transition-all',
              canAfford ? 'hover:bg-bg cursor-pointer' : 'opacity-40 cursor-not-allowed',
            ].join(' ')}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-text truncate">{p.name}</span>
              <span className={`text-[10px] ${KIND_COLOR[p.kind] ?? 'text-text-muted'}`}>{p.kind}</span>
            </div>
            <span className="text-xs font-bold text-accent shrink-0 ml-2">{p.cost}</span>
          </button>
        );
      })}
    </div>
  );
}

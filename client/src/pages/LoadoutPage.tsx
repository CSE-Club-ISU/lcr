import { useMemo, useState, useEffect } from 'react';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import type { Powerup, PlayerLoadoutPref } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';
import { safeParseJson } from '../utils/parseJson';

const MAX_LOADOUT = 5;

const KIND_STYLES: Record<string, { label: string; color: string }> = {
  damage:   { label: 'Damage',   color: 'text-red border-red/40 bg-red/10' },
  defense:  { label: 'Defense',  color: 'text-green border-green/40 bg-green/10' },
  sabotage: { label: 'Sabotage', color: 'text-orange border-orange/40 bg-orange/10' },
};

export default function LoadoutPage() {
  const ctx = useSpacetimeDB();
  const [powerups] = useTypedTable<Powerup>(tables.powerup);
  const [prefs] = useTypedTable<PlayerLoadoutPref>(tables.player_loadout_pref);
  const setLoadoutPref = useReducer(reducers.setLoadoutPref);

  const myPref = useMemo(
    () => ctx.identity ? prefs.find(p => identityEq(p.identity, ctx.identity)) : undefined,
    [prefs, ctx.identity]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!myPref) return;
    setSelected(new Set(safeParseJson<string[]>(myPref.powerupIds, [], 'loadout powerupIds')));
  }, [myPref?.powerupIds]);

  const toggle = (id: string) => {
    setSaved(false);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_LOADOUT) next.add(id);
      return next;
    });
  };

  const save = () => {
    setLoadoutPref({ powerupIds: JSON.stringify([...selected]) });
    setSaved(true);
  };

  const sorted = useMemo(
    () => [...powerups].sort((a, b) => a.kind.localeCompare(b.kind) || a.cost - b.cost),
    [powerups]
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="card p-6">
        <div className="font-bold text-sm text-text mb-1">Powerup Loadout</div>
        <div className="text-xs text-text-muted mb-5">
          Choose up to {MAX_LOADOUT} powerups you'll have the option to buy during matches.
          Currency accrues passively (+1 every 3 seconds).
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {sorted.map(p => {
            const id = p.id.toString();
            const isSelected = selected.has(id);
            const kind = KIND_STYLES[p.kind] ?? { label: p.kind, color: 'text-text-muted border-border bg-surface' };
            const disabled = !isSelected && selected.size >= MAX_LOADOUT;
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                disabled={disabled}
                className={[
                  'text-left p-4 rounded-lg border-2 transition-all cursor-pointer',
                  isSelected
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-transparent hover:border-text-muted',
                  disabled ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-text">{p.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${kind.color}`}>{kind.label}</span>
                </div>
                <div className="text-xs text-text-muted mb-2">{p.description}</div>
                <div className="text-xs font-semibold text-accent">Cost: {p.cost} energy</div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">
            Selected: <span className="font-semibold text-text">{selected.size} / {MAX_LOADOUT}</span>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-green">Saved</span>}
            <button
              onClick={save}
              disabled={selected.size === 0}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Loadout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

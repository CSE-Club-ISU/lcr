import { useMemo, useState, useEffect } from 'react';
import { useSpacetimeDB, useReducer } from 'spacetimedb/react';
import { Sword, Shield, Zap, Check } from 'lucide-react';
import { tables, reducers } from '../module_bindings';
import type { Powerup, PlayerLoadoutPref } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';
import { identityEq } from '../utils/identity';
import { safeParseJson } from '../utils/parseJson';

const MAX_LOADOUT = 5;

const KIND_META: Record<string, { label: string; color: string; Icon: typeof Sword }> = {
  damage:   { label: 'Damage',   color: 'var(--color-accent)',     Icon: Sword },
  defense:  { label: 'Defense',  color: 'var(--color-green)',      Icon: Shield },
  sabotage: { label: 'Sabotage', color: 'var(--color-gold-bright)', Icon: Zap },
};

/**
 * Editorial loadout page.
 * - Hero header with picked count as oversized Fraunces numeral
 * - Powerups listed by kind in italic-eyebrow sections
 * - Selected = gold hairline ring + check; unselected = quiet hairline
 * - Cost as a gold mono chip
 */
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

  // group by kind
  const byKind = useMemo(() => {
    const groups: Record<string, Powerup[]> = {};
    powerups.forEach(p => {
      (groups[p.kind] ??= []).push(p);
    });
    Object.values(groups).forEach(g => g.sort((a, b) => a.cost - b.cost));
    return groups;
  }, [powerups]);

  const orderedKinds = ['damage', 'defense', 'sabotage'].filter(k => byKind[k]?.length);

  return (
    <div className="enter-fade flex flex-col gap-12">
      {/* Hero header */}
      <header className="flex items-end justify-between gap-8 pb-6" style={{ borderBottom: '1px solid var(--color-hairline-gold)' }}>
        <div>
          <div className="label-eyebrow mb-2">Loadout</div>
          <h1 className="display-title" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Choose your <em>arsenal.</em>
          </h1>
          <p className="text-text-muted text-[13px] mt-3 max-w-md leading-relaxed">
            Up to {MAX_LOADOUT} abilities you'll have the option to buy mid-match.
            Energy accrues passively at one point every three seconds.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="label-eyebrow">Selected</div>
          <div className="display-numeral" style={{
            fontSize: 64,
            color: selected.size === MAX_LOADOUT ? 'var(--color-gold-bright)' : 'var(--color-text)',
          }}>
            {selected.size}<span className="text-text-faint">/{MAX_LOADOUT}</span>
          </div>
        </div>
      </header>

      {/* Powerup sections */}
      <div className="flex flex-col gap-12">
        {orderedKinds.map(kind => {
          const meta = KIND_META[kind] ?? { label: kind, color: 'var(--color-text-muted)', Icon: Sword };
          const Icon = meta.Icon;
          return (
            <section key={kind}>
              <div className="flex items-baseline gap-3 mb-4">
                <Icon size={14} style={{ color: meta.color }} />
                <h2 className="eyebrow-italic" style={{ fontSize: 18, color: 'var(--color-text)' }}>
                  {meta.label}
                </h2>
                <span className="label-eyebrow">{byKind[kind].length}</span>
                <hr className="rule-hairline flex-1 ml-2" />
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0 m-0">
                {byKind[kind].map(p => {
                  const id = p.id.toString();
                  const isSelected = selected.has(id);
                  const disabled = !isSelected && selected.size >= MAX_LOADOUT;
                  return (
                    <li key={id}>
                      <button
                        onClick={() => toggle(id)}
                        disabled={disabled}
                        className="text-left w-full px-5 py-4 rounded-md cursor-pointer transition-all"
                        style={{
                          background: isSelected ? 'rgba(245, 197, 24, 0.04)' : 'transparent',
                          border: isSelected
                            ? '1px solid var(--color-hairline-gold)'
                            : '1px solid var(--color-hairline)',
                          opacity: disabled ? 0.35 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span style={{
                            fontFamily: 'var(--font-serif)',
                            fontStyle: 'italic',
                            fontSize: 17,
                            color: 'var(--color-text)',
                            letterSpacing: '-0.005em',
                          }}>
                            {p.name}
                          </span>
                          {isSelected && (
                            <span
                              className="inline-flex items-center justify-center rounded-full shrink-0"
                              style={{
                                width: 18, height: 18,
                                border: '1px solid var(--color-gold-bright)',
                                color: 'var(--color-gold-bright)',
                              }}
                            >
                              <Check size={11} strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <p className="text-[12.5px] text-text-muted leading-relaxed mb-3">
                          {p.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span
                            className="mono-tabular inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px]"
                            style={{
                              color: 'var(--color-gold-bright)',
                              border: '1px solid var(--color-hairline-gold)',
                              background: 'transparent',
                            }}
                          >
                            <Zap size={9} />
                            {p.cost}
                          </span>
                          <span className="label-eyebrow" style={{ fontSize: 9, color: meta.color, opacity: 0.7 }}>
                            {meta.label}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Save bar */}
      <footer className="sticky bottom-6 mt-4">
        <div
          className="flex items-center justify-between px-5 py-4 rounded-md"
          style={{
            background: 'rgba(15, 13, 13, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-hairline-strong)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="label-eyebrow">Loadout</span>
            <span className="mono-tabular text-[14px]" style={{
              color: selected.size === MAX_LOADOUT ? 'var(--color-gold-bright)' : 'var(--color-text)',
            }}>
              {selected.size}/{MAX_LOADOUT}
            </span>
            {saved && (
              <span className="label-eyebrow inline-flex items-center gap-1" style={{ color: 'var(--color-green)' }}>
                <Check size={10} /> Saved
              </span>
            )}
          </div>
          <button
            onClick={save}
            disabled={selected.size === 0}
            className="btn-editorial"
            style={{ opacity: selected.size === 0 ? 0.4 : 1, cursor: selected.size === 0 ? 'not-allowed' : 'pointer' }}
          >
            Save loadout
          </button>
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../../module_bindings';
import type { SabotageEvent } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';
import { identityEq } from '../../utils/identity';
import type { Identity } from 'spacetimedb';

export interface SabotageEffectState {
  frozen: boolean;         // editor readonly
  fontSize: number;        // px override; 0 = default (unused visually, kept for notification)
  blurred: boolean;        // visual blur on editor
  flash: { message: string; at: number } | null;  // one-shot notice (e.g. "a line was deleted")
}

export const DEFAULT_SABOTAGE_STATE: SabotageEffectState = {
  frozen: false,
  fontSize: 0,
  blurred: false,
  flash: null,
};

export interface SabotageHandlerApi {
  effects: SabotageEffectState;
}

/**
 * Subscribes to sabotage_event rows targeting `myIdentity` for the given game,
 * applies each effect (calling `onDeleteLine` for delete_line, updating returned
 * `effects` for visual/freeze effects), then clears the row.
 */
export function useSabotageHandler(
  gameId: string,
  myIdentity: Identity | undefined,
  onDeleteLine: () => void,
): SabotageEffectState {
  const [events] = useTypedTable<SabotageEvent>(tables.sabotage_event);
  const clearEvent = useReducer(reducers.clearSabotageEvent);

  const [effects, setEffects] = useState<SabotageEffectState>(DEFAULT_SABOTAGE_STATE);
  const seen = useRef<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!myIdentity) return;
    for (const ev of events) {
      if (ev.gameId !== gameId) continue;
      if (!identityEq(ev.targetIdentity, myIdentity)) continue;
      const key = ev.id.toString();
      if (seen.current.has(key)) continue;
      seen.current.add(key);

      let durationMs = 0;
      try {
        const data = JSON.parse(ev.effectData ?? '{}');
        durationMs = Number(data.duration_ms ?? 0);
      } catch { /* ignore */ }

      switch (ev.effectType) {
        case 'delete_line':
          onDeleteLine();
          setEffects(s => ({ ...s, flash: { message: 'A line of your code was deleted!', at: Date.now() } }));
          break;
        case 'font_size_up':
          setEffects(s => ({ ...s, fontSize: 28 }));
          timers.current.set(key, setTimeout(() => {
            setEffects(s => ({ ...s, fontSize: 0 }));
          }, durationMs || 5000));
          break;
        case 'font_blur':
          setEffects(s => ({ ...s, blurred: true }));
          timers.current.set(key, setTimeout(() => {
            setEffects(s => ({ ...s, blurred: false }));
          }, durationMs || 3000));
          break;
        case 'cursor_freeze':
          setEffects(s => ({ ...s, frozen: true }));
          timers.current.set(key, setTimeout(() => {
            setEffects(s => ({ ...s, frozen: false }));
          }, durationMs || 2000));
          break;
      }

      // Clear the row so it doesn't apply again on reconnect
      clearEvent({ eventId: ev.id });
    }
  }, [events, gameId, myIdentity, onDeleteLine, clearEvent]);

  // Clean timers on unmount
  useEffect(() => () => {
    for (const t of timers.current.values()) clearTimeout(t);
    timers.current.clear();
  }, []);

  return effects;
}

import { tables } from '../module_bindings';
import type { GameState } from '../module_bindings/types';
import { useTypedTable } from '../utils/useTypedTable';

/**
 * Returns the game_state row for a given game ID, or undefined if not found.
 *
 * Teaching note: wrapping `useTypedTable + find` into a named hook makes
 * the component code read as "what" (useMyGame) rather than "how" (table lookup).
 */
export function useMyGame(gameId: string): GameState | undefined {
  const [games] = useTypedTable<GameState>(tables.game_state);
  return games.find(g => g.id === gameId);
}

import { useEffect, useState } from 'react';
import type { GameState } from '../module_bindings/types';

export const POWERUP_TICK_SEC = 3;

/**
 * Compute a player's available powerup currency from elapsed game time,
 * quiz bonus, and amount already spent. Ticks every 500ms for smooth UI.
 */
export function usePowerupCurrency(game: GameState | undefined, isP1: boolean): number {
  const [currency, setCurrency] = useState(0);

  useEffect(() => {
    if (!game) {
      setCurrency(0);
      return;
    }
    const startMs = Number(game.startTime.microsSinceUnixEpoch / 1000n);
    const tick = () => {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const passive = Math.floor(elapsedSec / POWERUP_TICK_SEC);
      const bonus = isP1 ? game.player1QuizBonus : game.player2QuizBonus;
      const spent = isP1 ? game.player1Spent : game.player2Spent;
      setCurrency(Math.max(0, passive + bonus - spent));
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [game?.startTime, game?.player1QuizBonus, game?.player2QuizBonus, game?.player1Spent, game?.player2Spent, isP1]);

  return currency;
}

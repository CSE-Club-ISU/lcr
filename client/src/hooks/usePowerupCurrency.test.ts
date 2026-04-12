import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePowerupCurrency } from './usePowerupCurrency';
import type { GameState } from '../module_bindings/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal GameState mock.
 * startOffsetMs: how many milliseconds ago the game started.
 *
 * Note on time: makeGame() calls Date.now() on the real clock to set startTime,
 * then vi.useFakeTimers() takes over for the hook's internal Date.now() calls.
 * This works because fake timers freeze at the moment they're installed, so
 * the hook sees the same "now" that makeGame used — elapsed stays consistent.
 * Intentional: mixing real clock for setup and fake clock for hook execution.
 */
function makeGame(
  startOffsetMs: number,
  opts?: {
    p1QuizBonus?: number;
    p2QuizBonus?: number;
    p1Spent?: number;
    p2Spent?: number;
  },
): GameState {
  const startMs = Date.now() - startOffsetMs;
  return {
    id: 'test-game',
    roomCode: 'TEST',
    player1Identity: {} as GameState['player1Identity'],
    player2Identity: {} as GameState['player2Identity'],
    player1Hp: 100,
    player2Hp: 100,
    player1Sp: 0,
    player2Sp: 0,
    player1Mp: 0,
    player2Mp: 0,
    player1SolvedIds: '',
    player2SolvedIds: '',
    player1Abilities: '',
    player2Abilities: '',
    problemIds: '',
    status: 'active',
    startTime: { microsSinceUnixEpoch: BigInt(startMs) * 1000n },
    winnerIdentity: undefined,
    player1Spent: opts?.p1Spent ?? 0,
    player2Spent: opts?.p2Spent ?? 0,
    player1QuizBonus: opts?.p1QuizBonus ?? 0,
    player2QuizBonus: opts?.p2QuizBonus ?? 0,
    player1LastQuizAt: { microsSinceUnixEpoch: 0n },
    player2LastQuizAt: { microsSinceUnixEpoch: 0n },
    player1Shield: 0,
    player2Shield: 0,
    player1DmgBonus: 0,
    player2DmgBonus: 0,
    player1DmgMultPct: 100,
    player2DmgMultPct: 100,
  } as unknown as GameState;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePowerupCurrency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when game is undefined', () => {
    const { result } = renderHook(() => usePowerupCurrency(undefined, true));
    expect(result.current).toBe(0);
  });

  it('returns 0 when game just started (0 ms elapsed)', () => {
    // startOffsetMs = 0: game started right now, so elapsed = 0 s
    const game = makeGame(0);
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    // tick runs on mount
    act(() => {});
    expect(result.current).toBe(0);
  });

  it('returns floor(elapsedSec / POWERUP_TICK_SEC) for p1 at 9 s', () => {
    // 9 seconds have elapsed → floor(9/3) = 3
    const game = makeGame(9_000);
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    act(() => {});
    expect(result.current).toBe(3);
  });

  it('returns floor(elapsedSec / POWERUP_TICK_SEC) for p1 at 10 s', () => {
    // 10 s → floor(10/3) = 3
    const game = makeGame(10_000);
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    act(() => {});
    expect(result.current).toBe(3);
  });

  it('returns floor(elapsedSec / POWERUP_TICK_SEC) for p1 at 12 s', () => {
    // 12 s → floor(12/3) = 4
    const game = makeGame(12_000);
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    act(() => {});
    expect(result.current).toBe(4);
  });

  it('adds p1 quiz bonus to currency', () => {
    // 9 s elapsed → passive = 3, bonus = 2 → total = 5
    const game = makeGame(9_000, { p1QuizBonus: 2 });
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    act(() => {});
    expect(result.current).toBe(5);
  });

  it('adds p2 quiz bonus when isP1 is false', () => {
    const game = makeGame(9_000, { p2QuizBonus: 3 });
    const { result } = renderHook(() => usePowerupCurrency(game, false));
    act(() => {});
    expect(result.current).toBe(6); // floor(9/3)=3 + bonus=3
  });

  it('deducts p1 spent from currency', () => {
    // 9 s elapsed → passive = 3, spent = 2 → total = 1
    const game = makeGame(9_000, { p1Spent: 2 });
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    act(() => {});
    expect(result.current).toBe(1);
  });

  it('currency never goes below 0', () => {
    // 0 s elapsed → passive = 0, spent = 5 → would be -5 but clamped to 0
    const game = makeGame(0, { p1Spent: 5 });
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    act(() => {});
    expect(result.current).toBe(0);
  });

  it('does not use p2 bonus/spent for p1 player', () => {
    // p2QuizBonus and p2Spent should have no effect when isP1=true
    const game = makeGame(9_000, { p2QuizBonus: 10, p2Spent: 10 });
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    act(() => {});
    expect(result.current).toBe(3); // only passive
  });

  it('updates currency after interval tick', () => {
    // Start 9 s in (currency=3), then advance 3 more seconds to reach 12 s (currency=4).
    const game = makeGame(9_000);
    const { result } = renderHook(() => usePowerupCurrency(game, true));
    act(() => {});
    expect(result.current).toBe(3);

    // Advance fake timer by 3 s (6 ticks of 500 ms each) + real clock
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(result.current).toBe(4);
  });
});

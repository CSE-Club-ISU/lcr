/**
 * Shared difficulty color mapping.
 *
 * Returns a color token from the design system (used as the `color` prop on <Pill>).
 * Centralizing this prevents divergence across pages.
 *
 * Teaching note: color-to-data mappings like this are a common source of
 * copy-paste bugs. A single source of truth means a designer can change
 * "easy = green" to "easy = teal" in one place.
 */
export function difficultyColor(difficulty: string): 'green' | 'yellow' | 'red' {
  if (difficulty === 'easy') return 'green';
  if (difficulty === 'hard') return 'red';
  return 'yellow';
}

/**
 * Returns a Tailwind background class for an HP bar based on current/max HP.
 *
 * Teaching note: this is a "derived value" — it's entirely determined by
 * its inputs and has no side effects. Pure functions like this are trivial
 * to test (see the test suite PR).
 */
export function hpColor(hp: number, max: number): string {
  const pct = max > 0 ? hp / max : 0;
  if (pct > 0.5) return 'bg-green';
  if (pct > 0.25) return 'bg-orange';
  return 'bg-red';
}

/**
 * Safely parse a JSON string, returning `fallback` on any error.
 * Logs a warning with context so failures are visible in the console.
 *
 * Teaching note: JSON.parse throws SyntaxError on bad input. In a real app
 * you'd add Zod/io-ts for schema validation; here we just guard the crash.
 */
export function safeParseJson<T>(raw: string | undefined | null, fallback: T, context?: string): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    if (context) console.warn(`[safeParseJson] Failed to parse ${context}:`, e);
    return fallback;
  }
}

/**
 * Split a pipe-delimited string into parts. Used for test case lists stored
 * as "case1|case2|case3" in the database.
 *
 * Teaching note: pipes were chosen to avoid escaping JSON brackets inside
 * individual test case strings. An alternative would be JSON arrays of JSON
 * strings, which is strictly safer but more verbose.
 */
export function splitPipe(s: string | undefined | null): string[] {
  if (!s) return [];
  return s.split('|').filter(Boolean);
}

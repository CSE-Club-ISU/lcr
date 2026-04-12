/**
 * Persistent store backed by a JSON file.
 * Loaded once into memory at startup; all mutations write through to disk.
 * This prevents load-modify-save races where one write clobbers another.
 *
 * - githubId → stdbToken  (stable, never expires)
 * - pendingCode → PendingAuth (one-time auth codes, expire after 60s)
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';

const STORE_FILE = process.env.STORE_FILE ?? './token-store.json';

export interface PendingAuth {
  token:     string;
  githubId:  string;
  username:  string;
  name:      string;
  avatarUrl: string;
  email:     string;
  expiresAt: number;
}

interface Store {
  tokens: Record<string, string>;
  codes:  Record<string, PendingAuth>;
}

function loadFromDisk(): Store {
  if (!existsSync(STORE_FILE)) return { tokens: {}, codes: {} };
  try {
    const raw = JSON.parse(readFileSync(STORE_FILE, 'utf-8'));
    const store: Store = !raw.tokens ? { tokens: raw, codes: {} } : raw;
    // Prune expired codes on startup so stale entries don't accumulate
    const now = Date.now();
    for (const [k, v] of Object.entries(store.codes)) {
      if (now > v.expiresAt) delete store.codes[k];
    }
    return store;
  } catch {
    return { tokens: {}, codes: {} };
  }
}

// Single in-memory instance — loaded once, written through on every mutation
const store: Store = loadFromDisk();

function persist(): void {
  try {
    writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('[store] failed to persist:', err);
  }
}

export function getToken(githubId: string): string | undefined {
  return store.tokens[githubId];
}

export function setToken(githubId: string, token: string): void {
  store.tokens[githubId] = token;
  persist();
}

export function createCode(data: Omit<PendingAuth, 'expiresAt'>): string {
  // Prune expired codes
  const now = Date.now();
  for (const [k, v] of Object.entries(store.codes)) {
    if (now > v.expiresAt) delete store.codes[k];
  }
  const code = crypto.randomUUID();
  store.codes[code] = { ...data, expiresAt: now + 60_000 };
  persist();
  return code;
}

export function redeemCode(code: string): Omit<PendingAuth, 'expiresAt'> | undefined {
  const entry = store.codes[code];
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    delete store.codes[code];
    persist();
    return undefined;
  }
  delete store.codes[code];
  persist();
  const { expiresAt: _unused, ...payload } = entry;
  return payload;
}

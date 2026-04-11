/**
 * Persistent mapping of GitHub user ID → SpacetimeDB token.
 * Stored as a simple JSON file so tokens survive auth server restarts.
 * The SpacetimeDB token is stable per identity — using the same token
 * always reconnects as the same SpacetimeDB Identity.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';

const STORE_FILE = process.env.STORE_FILE ?? './token-store.json';

type Store = Record<string, string>; // githubId → stdbToken

function load(): Store {
  if (!existsSync(STORE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STORE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function save(store: Store): void {
  try {
    writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('[store] failed to persist:', err);
  }
}

export function getToken(githubId: string): string | undefined {
  return load()[githubId];
}

export function setToken(githubId: string, token: string): void {
  const store = load();
  store[githubId] = token;
  save(store);
}

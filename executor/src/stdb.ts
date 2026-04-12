// SpacetimeDB connection manager for the executor.
// Connects and fetches problem data.

import { DbConnection } from './module_bindings/index.js';
import type { Problem } from './module_bindings/types.js';

const SPACETIMEDB_URI = process.env.SPACETIMEDB_URI || 'ws://localhost:3000';
const MODULE_NAME = 'lcr';

// Prefer explicit env var; fall back to file written by init.sh into the shared volume.
const SPACETIMEDB_TOKEN = await (async () => {
  if (process.env.SPACETIMEDB_TOKEN) return process.env.SPACETIMEDB_TOKEN;
  const file = process.env.SPACETIMEDB_TOKEN_FILE;
  if (file) {
    try { return await Bun.file(file).text(); } catch { /* not ready */ }
  }
  return undefined;
})();

let connection: DbConnection | null = null;
let problemMap: Map<bigint, Problem> = new Map();

export async function initStdb(): Promise<void> {
  console.log(`[STDB] Connecting to ${SPACETIMEDB_URI}/${MODULE_NAME}`);

  const builder = DbConnection.builder()
    .withUri(SPACETIMEDB_URI)
    .withDatabaseName(MODULE_NAME);

  if (SPACETIMEDB_TOKEN) {
    builder.withToken(SPACETIMEDB_TOKEN);
  }

  connection = builder.build();

  // Subscribe and wait for the initial data to arrive
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timed out waiting for SpacetimeDB subscription (10s)'));
    }, 10000);

    try {
      connection!.subscriptionBuilder()
        .onApplied(() => {
          clearTimeout(timer);
          rebuildProblemMap();
          wireLiveUpdates();
          // Register this executor's identity so submit_result accepts our calls
          connection!.reducers.setExecutorIdentity({});
          console.log(`[STDB] Ready — ${problemMap.size} problems loaded`);
          resolve();
        })
        .subscribe(['SELECT * FROM problem']);
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

function rebuildProblemMap() {
  if (!connection) return;
  problemMap.clear();
  for (const problem of (connection.db as any).problem) {
    const p = problem as Problem;
    problemMap.set(p.id, p);
  }
}

// Keep problemMap in sync with live table changes so admin edits take effect
// without restarting the executor.
function wireLiveUpdates() {
  if (!connection) return;
  const table = (connection.db as any).problem;
  table.onInsert?.((_ctx: unknown, row: Problem) => { problemMap.set(row.id, row); });
  table.onUpdate?.((_ctx: unknown, _old: Problem, row: Problem) => { problemMap.set(row.id, row); });
  table.onDelete?.((_ctx: unknown, row: Problem) => { problemMap.delete(row.id); });
}

export function getProblem(id: bigint): Problem | undefined {
  return problemMap.get(id);
}

export function getConnection(): DbConnection | null {
  return connection;
}

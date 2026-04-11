// SpacetimeDB connection manager for the executor.
// Connects and fetches problem data.

import { DbConnection, tables } from './module_bindings/index.js';
import type { Problem } from './module_bindings/types.js';

const SPACETIMEDB_URI = process.env.SPACETIMEDB_URI || 'ws://localhost:3000';
const SPACETIMEDB_TOKEN = process.env.SPACETIMEDB_TOKEN;
const MODULE_NAME = 'lcr';

let problemMap: Map<bigint, Problem> = new Map();

export async function initStdb(): Promise<void> {
  console.log(`[STDB] Connecting to ${SPACETIMEDB_URI}/${MODULE_NAME}`);

  const builder = DbConnection.builder()
    .withUri(SPACETIMEDB_URI)
    .withDatabaseName(MODULE_NAME);

  if (SPACETIMEDB_TOKEN) {
    builder.withToken(SPACETIMEDB_TOKEN);
  }

  // Build connection and subscribe
  const connection = builder.build();

  // Subscribe to all problems
  await connection.subscriptionBuilder().subscribe(['SELECT * FROM problem']);

  // Wait for subscription to apply and populate the problems
  console.log(`[STDB] Subscription requested, waiting for problems...`);

  // Give subscription time to apply
  await new Promise(r => setTimeout(r, 500));

  rebuildProblemMap();
  console.log(`[STDB] Ready — ${problemMap.size} problems loaded`);
}

function rebuildProblemMap() {
  problemMap.clear();
  // tables.problem should be iterable since it acts as a view of problem rows
  try {
    const problems = Array.from(tables.problem as any);
    for (const problem of problems) {
      const p = problem as Problem;
      problemMap.set(p.id, p);
    }
  } catch (e) {
    console.warn('[STDB] Could not iterate problems:', e);
  }
}

export function getProblem(id: bigint): Problem | undefined {
  return problemMap.get(id);
}

import { executeCode } from './runner.js';
import { initStdb } from './stdb.js';
import type { ExecuteRequest } from './types.js';

const PORT = parseInt(process.env.EXECUTOR_PORT ?? '8000');

// S5: Rate limiting — max 1 in-flight execution per game_id, with a cooldown
// after completion. Prevents a single game from spamming Docker containers.
const COOLDOWN_MS = parseInt(process.env.RATE_LIMIT_COOLDOWN_MS ?? '5000');

// game_id → timestamp when it becomes eligible for the next submission
const rateLimitMap = new Map<string, number>();

function checkRateLimit(gameId: string): { allowed: boolean; retryAfterMs: number } {
  const eligible = rateLimitMap.get(gameId) ?? 0;
  const now = Date.now();
  if (now < eligible) return { allowed: false, retryAfterMs: eligible - now };
  rateLimitMap.set(gameId, now + COOLDOWN_MS);
  return { allowed: true, retryAfterMs: 0 };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, init?: ResponseInit): Response {
  const status = (init as { status?: number } | undefined)?.status ?? 200;
  const extraHeaders = (init as { headers?: Record<string, string> } | undefined)?.headers ?? {};
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method === 'POST' && url.pathname === '/execute') {
      let body: Record<string, unknown>;
      try {
        body = await req.json() as Record<string, unknown>;
      } catch {
        return json({ error: 'invalid JSON' }, { status: 400 });
      }

      const gameId = typeof body.game_id === 'string' ? body.game_id : '';
      if (!gameId) {
        return json({ error: 'game_id is required' }, { status: 400 });
      }

      const { allowed, retryAfterMs } = checkRateLimit(gameId);
      if (!allowed) {
        return json(
          { error: 'rate limit: one submission per game per 5 seconds' },
          {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
          }
        );
      }

      try {
        const req = body as unknown as ExecuteRequest;

        // Fetch problem data from SpacetimeDB
        const problem = (await import('./stdb.js')).getProblem(BigInt(req.problem_id));
        if (!problem) {
          return json(
            { error: `Problem ${req.problem_id} not found` },
            { status: 400 }
          );
        }

        // Test cases are pipe-delimited JSON strings, e.g. "[1,2]|[3,4]"
        const splitPipe = (s: string) => s ? s.split('|') : [];
        const sampleCases = splitPipe(problem.sampleTestCases);
        const sampleResults = splitPipe(problem.sampleTestResults);
        const hiddenCases = splitPipe(problem.hiddenTestCases);
        const hiddenResults = splitPipe(problem.hiddenTestResults);

        const testCases = req.mode === 'run' ? sampleCases : hiddenCases;
        const testResults = req.mode === 'run' ? sampleResults : hiddenResults;
        const compareFuncKey = req.lang === 'python' ? 'compareFuncPython' :
                               req.lang === 'java' ? 'compareFuncJava' : 'compareFuncCpp';
        const compareFunc = ((problem as any)[compareFuncKey] || 'def compare(a, b): return a == b') as string;

        const problemData = {
          method_name: problem.methodName,
          test_cases: testCases,
          test_results: testResults,
          compare_func: compareFunc,
        };

        const result = await executeCode(req, problemData);

        // Note: The client will call submit_result reducer if mode==='submit' and result.success
        // (The executor is not authorized to call reducers — only the client with proper identity can)

        return json(result);
      } catch (err) {
        // On error, release the rate limit immediately so the player can retry
        rateLimitMap.delete(gameId);
        console.error('Execution error:', err);
        return json({ error: String(err) }, { status: 500 });
      }
    }

    if (url.pathname === '/health') {
      return json({ status: 'ok' });
    }

    return new Response('Not found', { status: 404 });
  },
});

// Initialize SpacetimeDB connection on startup
console.log('Executor starting up...');
await initStdb();
console.log(`Executor listening on port ${server.port}`);

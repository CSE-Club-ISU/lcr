import { executeCode } from './runner.js';
import { initStdb, getConnection, getProblem } from './stdb.js';
import type { ExecuteRequest } from './types.js';

const PORT = parseInt(process.env.EXECUTOR_PORT ?? '8000');

// Restrict CORS to the known client origin
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

// Shared secret that the client must include in every /execute request.
// Set EXECUTOR_SECRET in the environment; requests missing it are rejected.
const EXECUTOR_SECRET = process.env.EXECUTOR_SECRET ?? '';

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
  'Access-Control-Allow-Origin': CLIENT_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': `Content-Type, X-Executor-Secret`,
};

function json(body: unknown, init?: { status?: number; headers?: Record<string, string> }): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

const VALID_LANGS = new Set(['python', 'java', 'cpp']);
const VALID_MODES = new Set(['run', 'submit']);
const MAX_CODE_BYTES = 64 * 1024; // 64 KB

function validateRequest(body: Record<string, unknown>): { req: ExecuteRequest } | { error: string } {
  const { lang, mode, problem_id, code, player_identity, game_id, solve_time } = body;
  if (!VALID_LANGS.has(lang as string))
    return { error: `lang must be one of: ${[...VALID_LANGS].join(', ')}` };
  if (!VALID_MODES.has(mode as string))
    return { error: `mode must be one of: ${[...VALID_MODES].join(', ')}` };
  if (typeof code !== 'string' || code.length === 0)
    return { error: 'code must be a non-empty string' };
  if (new TextEncoder().encode(code).length > MAX_CODE_BYTES)
    return { error: 'code exceeds 64 KB limit' };
  if (typeof problem_id !== 'number' || !Number.isInteger(problem_id) || problem_id < 0)
    return { error: 'problem_id must be a non-negative integer' };
  if (mode === 'submit' && typeof player_identity !== 'string')
    return { error: 'player_identity is required for submit mode' };
  return { req: body as unknown as ExecuteRequest };
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
      // Verify shared secret when one is configured
      if (EXECUTOR_SECRET && req.headers.get('X-Executor-Secret') !== EXECUTOR_SECRET) {
        return json({ error: 'Forbidden' }, { status: 403 });
      }

      let body: Record<string, unknown>;
      try {
        body = await req.json() as Record<string, unknown>;
      } catch {
        return json({ error: 'invalid JSON' }, { status: 400 });
      }

      const validation = validateRequest(body);
      if ('error' in validation) {
        return json({ error: validation.error }, { status: 400 });
      }
      const execReq = validation.req;

      // Java and C++ runners are not yet implemented
      if (execReq.lang === 'java' || execReq.lang === 'cpp') {
        return json({ error: `${execReq.lang} is not yet supported` }, { status: 400 });
      }

      const gameId = execReq.game_id ?? '';

      // Practice mode sends an empty game_id — skip rate limiting in that case
      if (gameId) {
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
      }

      try {
        const problem = getProblem(BigInt(execReq.problem_id));
        if (!problem) {
          return json({ error: `Problem ${execReq.problem_id} not found` }, { status: 400 });
        }

        if (!problem.isApproved) {
          return json({ error: `Problem ${execReq.problem_id} is not approved` }, { status: 400 });
        }

        // Validate method_name to prevent code injection
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(problem.methodName)) {
          console.error(`Problem ${execReq.problem_id} has invalid method_name: ${problem.methodName}`);
          return json({ error: 'Problem has invalid method_name' }, { status: 500 });
        }

        // Test cases are pipe-delimited JSON strings, e.g. "[1,2]|[3,4]"
        const splitPipe = (s: string) => s ? s.split('|') : [];
        const sampleCases = splitPipe(problem.sampleTestCases);
        const sampleResults = splitPipe(problem.sampleTestResults);
        const hiddenCases = splitPipe(problem.hiddenTestCases);
        const hiddenResults = splitPipe(problem.hiddenTestResults);

        const testCases = execReq.mode === 'run' ? sampleCases : hiddenCases;
        const testResults = execReq.mode === 'run' ? sampleResults : hiddenResults;

        const problemData = {
          kind: ((problem as any).problemKind || 'algorithm') as 'algorithm' | 'data_structure',
          method_name: problem.methodName,
          test_cases: testCases,
          test_results: testResults,
        };

        const result = await executeCode(execReq, problemData);

        // For submit mode with a game, call submit_result on behalf of the player.
        // The executor's SpacetimeDB identity (set via set_executor_identity) is the
        // only identity authorized to call this reducer.
        if (execReq.mode === 'submit' && gameId && execReq.player_identity) {
          const conn = getConnection();
          if (conn) {
            conn.reducers.submitResult({
              gameId,
              playerIdentity: execReq.player_identity,
              problemId: BigInt(execReq.problem_id),
              passed: result.passed,
              total: result.total,
              solveTime: execReq.solve_time ?? 0,
              language: execReq.lang,
            });
          } else {
            console.warn('[executor] No SpacetimeDB connection — submit_result not called');
          }
        }

        return json(result);
      } catch (err) {
        // On error, release the rate limit immediately so the player can retry
        if (gameId) rateLimitMap.delete(gameId);
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

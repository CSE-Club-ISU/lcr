import { schema, table, t, SenderError } from 'spacetimedb/server';

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const user = table(
  { name: 'user', public: true },
  {
    identity:        t.identity().primaryKey(),
    username:        t.string(),
    first_name:      t.string(),
    last_name:       t.string(),
    github_id:       t.string(),
    avatar_url:      t.string(),
    is_admin:        t.bool(),
    // Hidden stats — ELO is never shown in UI, tracked internally only
    elo_rating:      t.i32(),
    total_wins:      t.u32(),
    total_matches:   t.u32(),
    current_streak:  t.u32(),
  }
);

const problem = table(
  { name: 'problem', public: true },
  {
    id:                   t.u64().primaryKey().autoInc(),
    title:                t.string(),
    description:          t.string(),
    difficulty:           t.string(),   // "easy" | "medium" | "hard"
    method_name:          t.string(),
    sample_test_cases:    t.string(),   // JSON string
    sample_test_results:  t.string(),   // JSON string
    hidden_test_cases:    t.string(),   // JSON string — executor only
    hidden_test_results:  t.string(),   // JSON string — executor only
    boilerplate_python:   t.string(),
    boilerplate_java:     t.string(),
    boilerplate_cpp:      t.string(),
    compare_func_python:  t.string(),
    compare_func_java:    t.string(),
    compare_func_cpp:     t.string(),
    created_by:           t.identity(),
    is_approved:          t.bool(),
    problem_kind:         t.string(),   // "algorithm" | "data_structure"
  }
);

const room = table(
  { name: 'room', public: true },
  {
    code:             t.string().primaryKey(),
    host_identity:    t.identity(),
    guest_identity:   t.identity().optional(),
    host_ready:       t.bool(),
    guest_ready:      t.bool(),
    status:           t.string(),   // "waiting" | "in_game"
    settings:         t.string(),   // JSON: { problem_count, starting_hp, difficulty }
  }
);

const game_state = table(
  { name: 'game_state', public: true },
  {
    id:                     t.string().primaryKey(),
    room_code:              t.string(),
    player1_identity:       t.identity(),
    player2_identity:       t.identity(),
    player1_hp:             t.i32(),
    player2_hp:             t.i32(),
    player1_sp:             t.i32(),
    player2_sp:             t.i32(),
    player1_mp:             t.i32(),
    player2_mp:             t.i32(),
    player1_problem_index:  t.u32(),
    player2_problem_index:  t.u32(),
    player1_abilities:      t.string(),   // JSON array of ability ids
    player2_abilities:      t.string(),
    problem_ids:            t.string(),   // JSON array of problem ids (as strings)
    status:                 t.string(),   // "in_progress" | "finished"
    start_time:             t.timestamp(),
    winner_identity:        t.identity().optional(),
  }
);

// Stores the executor service's SpacetimeDB identity so submit_result can
// verify the caller is actually the executor, not a malicious client (S3 fix).
const executor_config = table(
  { name: 'executor_config', public: false },
  {
    id:                t.u32().primaryKey(),   // singleton row — always id=0
    executor_identity: t.identity(),
  }
);

const chat_message = table(
  { name: 'chat_message', public: true },
  {
    id:              t.u64().primaryKey().autoInc(),
    game_id:         t.string(),
    sender_identity: t.identity(),
    text:            t.string(),
    sent:            t.timestamp(),
  }
);

const match_history = table(
  {
    name: 'match_history',
    public: true,
    indexes: [
      { accessor: 'match_history_p1', algorithm: 'btree', columns: ['player1_identity'] },
      { accessor: 'match_history_p2', algorithm: 'btree', columns: ['player2_identity'] },
    ],
  },
  {
    id:                  t.u64().primaryKey().autoInc(),
    room_code:           t.string(),
    player1_identity:    t.identity(),
    player2_identity:    t.identity(),
    winner_identity:     t.identity(),
    problem_ids:         t.string(),   // JSON array of problem id strings
    problem_titles:      t.string(),   // JSON array of titles (denormalized)
    difficulties:        t.string(),   // JSON array of difficulty strings
    player1_solve_time:  t.u32(),      // seconds; 0 = did not solve
    player2_solve_time:  t.u32(),
    player1_language:    t.string(),
    player2_language:    t.string(),
    player1_accepted:    t.bool(),
    player2_accepted:    t.bool(),
    played_at:           t.timestamp(),
  }
);

// Records every code submission attempt (pass or fail) during a game.
const submission = table(
  {
    name: 'submission',
    public: true,
    indexes: [
      { accessor: 'submission_game_id', algorithm: 'btree', columns: ['game_id'] },
    ],
  },
  {
    id:              t.u64().primaryKey().autoInc(),
    game_id:         t.string(),
    player_identity: t.identity(),
    problem_id:      t.u64(),
    passed:          t.u32(),
    total:           t.u32(),
    solve_time:      t.u32(),      // seconds
    language:        t.string(),
    submitted_at:    t.timestamp(),
  }
);

// Queue for difficulty-based matchmaking
const queue = table(
  {
    name: 'queue',
    public: true,
    indexes: [
      { accessor: 'queue_difficulty', algorithm: 'btree', columns: ['difficulty'] },
    ],
  },
  {
    identity:   t.identity().primaryKey(),
    difficulty: t.string(),   // "easy" | "medium" | "hard"
    queued_at:  t.timestamp(),
  }
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const spacetimedb = schema({ user, problem, room, game_state, chat_message, match_history, executor_config, submission, queue });
export default spacetimedb;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const onConnect = spacetimedb.clientConnected(ctx => {
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (!existing) {
    ctx.db.user.insert({
      identity:       ctx.sender,
      username:       '',
      first_name:     '',
      last_name:      '',
      github_id:      '',
      avatar_url:     '',
      is_admin:       false,
      elo_rating:     1200,
      total_wins:     0,
      total_matches:  0,
      current_streak: 0,
    });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  // Remove from queue if queued
  const entry = ctx.db.queue.identity.find(ctx.sender);
  if (entry) ctx.db.queue.identity.delete(ctx.sender);
});

// ---------------------------------------------------------------------------
// User reducers
// ---------------------------------------------------------------------------

export const set_profile = spacetimedb.reducer(
  { username: t.string(), first_name: t.string(), last_name: t.string(), github_id: t.string(), avatar_url: t.string() },
  (ctx, { username, first_name, last_name, github_id, avatar_url }) => {
    const user = ctx.db.user.identity.find(ctx.sender);
    if (!user) throw new SenderError('User not found');
    ctx.db.user.identity.update({ ...user, username, first_name, last_name, github_id, avatar_url });
  }
);

// ---------------------------------------------------------------------------
// Shared game helpers
// ---------------------------------------------------------------------------

type DbCtx = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];
type ProblemRow = NonNullable<ReturnType<DbCtx['db']['problem']['id']['find']>>;

/** Select `count` distinct approved problems from `pool` using a numeric seed. */
function selectProblems(pool: ProblemRow[], seed: number, count: number): ProblemRow[] {
  const selected: ProblemRow[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; selected.length < count; i++) {
    const idx = (seed + i * 7) % pool.length;
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      selected.push(pool[idx]);
    }
    if (i >= pool.length * 2) break; // safety — shouldn't happen given count ≤ pool.length
  }
  return selected;
}

/** Insert a game_state row and update the room to 'in_game'. */
function startGameState(
  ctx: DbCtx,
  roomCode: string,
  p1Identity: ProblemRow['id'] extends bigint ? any : any,   // IdentityLike
  p2Identity: typeof p1Identity,
  selectedProblems: ProblemRow[],
  startingHp: number,
): void {
  ctx.db.game_state.insert({
    id:                    roomCode,
    room_code:             roomCode,
    player1_identity:      p1Identity,
    player2_identity:      p2Identity,
    player1_hp:            startingHp,
    player2_hp:            startingHp,
    player1_sp:            0,
    player2_sp:            0,
    player1_mp:            0,
    player2_mp:            0,
    player1_problem_index: 0,
    player2_problem_index: 0,
    player1_abilities:     '[]',
    player2_abilities:     '[]',
    problem_ids:           JSON.stringify(selectedProblems.map(p => p.id.toString())),
    status:                'in_progress',
    start_time:            ctx.timestamp,
    winner_identity:       undefined,
  });
}

// ---------------------------------------------------------------------------
// Room reducers
// ---------------------------------------------------------------------------

export const create_room = spacetimedb.reducer(
  { code: t.string(), settings: t.string() },
  (ctx, { code, settings }) => {
    ctx.db.room.insert({
      code,
      host_identity:  ctx.sender,
      guest_identity: undefined,
      host_ready:     false,
      guest_ready:    false,
      status:         'waiting',
      settings,
    });
  }
);

export const join_room = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    // Already the host — no-op (host navigated to their own room page)
    if (ctx.sender.toHexString() === room.host_identity.toHexString()) return;
    // Already the guest — no-op (duplicate join)
    if (room.guest_identity && ctx.sender.toHexString() === room.guest_identity.toHexString()) return;
    if (room.status !== 'waiting') throw new SenderError('Room is not open');
    if (room.guest_identity) throw new SenderError('Room is full');
    ctx.db.room.code.update({ ...room, guest_identity: ctx.sender });
  }
);

export const leave_room = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    if (ctx.sender.toHexString() === room.host_identity.toHexString()) {
      if (room.guest_identity) {
        ctx.db.room.code.update({ ...room, host_identity: room.guest_identity, guest_identity: undefined, host_ready: false, guest_ready: false });
      } else {
        ctx.db.room.code.delete(code);
      }
    } else if (room.guest_identity && ctx.sender.toHexString() === room.guest_identity.toHexString()) {
      ctx.db.room.code.update({ ...room, guest_identity: undefined, guest_ready: false });
    }
  }
);

export const set_ready = spacetimedb.reducer(
  { code: t.string(), ready: t.bool() },
  (ctx, { code, ready }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    if (ctx.sender.toHexString() === room.host_identity.toHexString()) {
      ctx.db.room.code.update({ ...room, host_ready: ready });
    } else if (room.guest_identity && ctx.sender.toHexString() === room.guest_identity.toHexString()) {
      ctx.db.room.code.update({ ...room, guest_ready: ready });
    }
  }
);

// ---------------------------------------------------------------------------
// Game reducers
// ---------------------------------------------------------------------------

// Called by the host when both players are ready. Picks N problems, creates game state.
export const start_game = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    if (ctx.sender.toHexString() !== room.host_identity.toHexString()) throw new SenderError('Only the host can start the game');
    if (!room.host_ready || !room.guest_ready) throw new SenderError('Not both ready');
    if (!room.guest_identity) throw new SenderError('No guest in room');
    if (room.status === 'in_game') return; // already started

    const settings = JSON.parse(room.settings) as Record<string, unknown>;
    const difficulty = (settings.difficulty as string) ?? 'medium';

    // Pick approved problems matching difficulty
    const approved = [...ctx.db.problem.iter()].filter(
      p => p.is_approved && p.difficulty === difficulty
    );
    if (approved.length === 0) throw new SenderError('No approved problems for this difficulty');

    // Use ctx.timestamp for entropy so the same room code gets different problems each game.
    // Reducers must be deterministic, but ctx.timestamp varies per call — sufficient for a club tool.
    const seed = room.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      + Number(ctx.timestamp.microsSinceUnixEpoch % 1_000_000n);

    const problemCount = Math.min(
      Math.max(1, Number(settings.problem_count ?? 1)),
      approved.length
    );

    const selected = selectProblems(approved, seed, problemCount);
    const starting_hp = Number(settings.starting_hp ?? 100);

    startGameState(ctx, room.code, room.host_identity, room.guest_identity, selected, starting_hp);
    ctx.db.room.code.update({ ...room, status: 'in_game' });
  }
);

export const send_chat = spacetimedb.reducer(
  { game_id: t.string(), text: t.string() },
  (ctx, { game_id, text }) => {
    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') throw new SenderError('Game not found or not in progress');
    const senderHex = ctx.sender.toHexString();
    if (senderHex !== game.player1_identity.toHexString() && senderHex !== game.player2_identity.toHexString()) {
      throw new SenderError('Not a participant in this game');
    }
    ctx.db.chat_message.insert({
      id:              0n,
      game_id,
      sender_identity: ctx.sender,
      text,
      sent:            ctx.timestamp,
    });
  }
);

// ---------------------------------------------------------------------------
// endGame helper — called by submit_result and forfeit
// ---------------------------------------------------------------------------

type GameStateRow = NonNullable<ReturnType<DbCtx['db']['game_state']['id']['find']>>;
type IdentityLike = { toHexString(): string };

function endGame(ctx: DbCtx, game: GameStateRow, winnerIdentity: IdentityLike) {
  const loserIdentity = winnerIdentity.toHexString() === game.player1_identity.toHexString()
    ? game.player2_identity
    : game.player1_identity;

  // Mark game finished
  ctx.db.game_state.id.update({ ...game, status: 'finished', winner_identity: winnerIdentity as typeof game.player1_identity });

  // Aggregate submission rows for this game
  const subs = [...ctx.db.submission.submission_game_id.filter(game.id)];
  const p1Subs = subs.filter(s => s.player_identity.toHexString() === game.player1_identity.toHexString());
  const p2Subs = subs.filter(s => s.player_identity.toHexString() === game.player2_identity.toHexString());

  const p1Accepted = p1Subs.some(s => s.passed === s.total && s.total > 0);
  const p2Accepted = p2Subs.some(s => s.passed === s.total && s.total > 0);

  // Best (fastest) accepted solve time per player, 0 if never solved
  const bestTime = (playerSubs: typeof subs) => {
    const accepted = playerSubs.filter(s => s.passed === s.total && s.total > 0);
    if (accepted.length === 0) return 0;
    return accepted.reduce((min, s) => s.solve_time < min ? s.solve_time : min, accepted[0].solve_time);
  };

  const p1SolveTime = bestTime(p1Subs);
  const p2SolveTime = bestTime(p2Subs);

  // Language used by each player (last accepted submission, or any)
  const playerLang = (playerSubs: typeof subs) => {
    const accepted = playerSubs.filter(s => s.passed === s.total && s.total > 0);
    return (accepted.length > 0 ? accepted[accepted.length - 1] : playerSubs[playerSubs.length - 1])?.language ?? '';
  };

  // Collect problem metadata from the problem_ids array
  const problemIdStrings = JSON.parse(game.problem_ids) as string[];
  const problemTitles: string[] = [];
  const difficulties: string[] = [];
  for (const pidStr of problemIdStrings) {
    const prob = ctx.db.problem.id.find(BigInt(pidStr));
    problemTitles.push(prob?.title ?? '');
    difficulties.push(prob?.difficulty ?? '');
  }

  ctx.db.match_history.insert({
    id:                  0n,
    room_code:           game.room_code,
    player1_identity:    game.player1_identity,
    player2_identity:    game.player2_identity,
    winner_identity:     winnerIdentity as typeof game.player1_identity,
    problem_ids:         JSON.stringify(problemIdStrings),
    problem_titles:      JSON.stringify(problemTitles),
    difficulties:        JSON.stringify(difficulties),
    player1_solve_time:  p1SolveTime,
    player2_solve_time:  p2SolveTime,
    player1_language:    playerLang(p1Subs),
    player2_language:    playerLang(p2Subs),
    player1_accepted:    p1Accepted,
    player2_accepted:    p2Accepted,
    played_at:           ctx.timestamp,
  });

  // Hidden ELO calculation (K=20)
  const winner = ctx.db.user.identity.find(winnerIdentity as typeof game.player1_identity);
  const loser  = ctx.db.user.identity.find(loserIdentity);
  if (winner && loser) {
    const expected = 1 / (1 + Math.pow(10, (loser.elo_rating - winner.elo_rating) / 400));
    const delta = Math.round(20 * (1 - expected));
    ctx.db.user.identity.update({
      ...winner,
      elo_rating:     winner.elo_rating + delta,
      total_wins:     winner.total_wins + 1,
      total_matches:  winner.total_matches + 1,
      current_streak: winner.current_streak + 1,
    });
    ctx.db.user.identity.update({
      ...loser,
      elo_rating:     Math.max(0, loser.elo_rating - delta),
      total_matches:  loser.total_matches + 1,
      current_streak: 0,
    });
  }
}

export const forfeit = spacetimedb.reducer(
  { game_id: t.string() },
  (ctx, { game_id }) => {
    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') return;

    const isP1 = game.player1_identity.toHexString() === ctx.sender.toHexString();
    const winner_identity = isP1 ? game.player2_identity : game.player1_identity;

    endGame(ctx, game, winner_identity);
  }
);

// Called by the executor service after running submitted code
export const submit_result = spacetimedb.reducer(
  {
    game_id:         t.string(),
    player_identity: t.string(),   // hex identity of the player who submitted
    passed:          t.u32(),
    total:           t.u32(),
    solve_time:      t.u32(),    // seconds
    language:        t.string(),
  },
  (ctx, { game_id, player_identity: playerIdentityHex, passed, total, solve_time, language }) => {
    // Only the registered executor service may submit results — never a player client
    const executorConfig = ctx.db.executor_config.id.find(0);
    if (!executorConfig) throw new SenderError('Executor not configured');
    if (ctx.sender.toHexString() !== executorConfig.executor_identity.toHexString()) {
      throw new SenderError('Only the executor may submit results');
    }

    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') return;

    // Validate that the supplied player_identity is actually a participant
    const isP1 = game.player1_identity.toHexString() === playerIdentityHex;
    const isP2 = game.player2_identity.toHexString() === playerIdentityHex;
    if (!isP1 && !isP2) throw new SenderError('player_identity is not a participant in this game');

    const player_identity = isP1 ? game.player1_identity : game.player2_identity;
    const accepted = passed === total && total > 0;

    // Determine current problem for this player
    const problemIds = JSON.parse(game.problem_ids) as string[];
    const problemCount = problemIds.length;
    const problemIndex = isP1 ? game.player1_problem_index : game.player2_problem_index;
    const problemId = BigInt(problemIds[problemIndex] ?? '0');

    // Always record the submission attempt
    ctx.db.submission.insert({
      id:              0n,
      game_id,
      player_identity,
      problem_id:      problemId,
      passed,
      total,
      solve_time,
      language,
      submitted_at:    ctx.timestamp,
    });

    if (!accepted) return; // player can retry

    // Proportional HP damage: each problem is worth startingHp / problemCount HP
    const room = ctx.db.room.code.find(game.room_code);
    const settings = room ? JSON.parse(room.settings) as Record<string, unknown> : {};
    const startingHp = Number(settings.starting_hp ?? 100);
    const damage = Math.ceil(startingHp / problemCount);

    let updated = { ...game };
    if (isP1) {
      updated.player2_hp = Math.max(0, game.player2_hp - damage);
      updated.player1_problem_index = game.player1_problem_index + 1;
    } else {
      updated.player1_hp = Math.max(0, game.player1_hp - damage);
      updated.player2_problem_index = game.player2_problem_index + 1;
    }

    const opponentHp = isP1 ? updated.player2_hp : updated.player1_hp;
    const newProblemIndex = isP1 ? updated.player1_problem_index : updated.player2_problem_index;
    const winner_identity = isP1 ? game.player1_identity : game.player2_identity;

    if (opponentHp <= 0 || newProblemIndex >= problemCount) {
      // Game over — use the updated HP/index before calling endGame
      ctx.db.game_state.id.update(updated);
      // Re-fetch to pass the latest row to endGame
      const updatedGame = ctx.db.game_state.id.find(game_id)!;
      endGame(ctx, updatedGame, winner_identity);
    } else {
      // Game continues — update state and let players keep going
      ctx.db.game_state.id.update(updated);
    }
  }
);

// ---------------------------------------------------------------------------
// Executor config (S3 fix)
// ---------------------------------------------------------------------------

// Called once by an admin to register the executor's SpacetimeDB identity.
// After this, submit_result will only accept calls from that identity.
export const set_executor_identity = spacetimedb.reducer(
  {},
  (ctx) => {
    const existing = ctx.db.executor_config.id.find(0);
    // Allow first-time registration freely; require admin to overwrite
    if (existing) {
      const user = ctx.db.user.identity.find(ctx.sender);
      if (!user?.is_admin) throw new SenderError('Unauthorized');
      ctx.db.executor_config.id.update({ ...existing, executor_identity: ctx.sender });
    } else {
      ctx.db.executor_config.insert({ id: 0, executor_identity: ctx.sender });
    }
  }
);

// ---------------------------------------------------------------------------
// Ability reducers (stubs — Phase 3)
// ---------------------------------------------------------------------------

export const buy_ability = spacetimedb.reducer(
  { game_id: t.string(), ability: t.string() },
  (_ctx, _args) => {
    // TODO Phase 3
  }
);

export const use_ability = spacetimedb.reducer(
  { game_id: t.string(), ability: t.string() },
  (_ctx, _args) => {
    // TODO Phase 3
  }
);

// ---------------------------------------------------------------------------
// Queue reducers
// ---------------------------------------------------------------------------

export const join_queue = spacetimedb.reducer(
  { difficulty: t.string() },
  (ctx, { difficulty }) => {
    if (!['easy', 'medium', 'hard'].includes(difficulty))
      throw new SenderError('Invalid difficulty');

    // Prevent queuing while already in an active game
    for (const g of ctx.db.game_state.iter()) {
      if (g.status === 'in_progress' &&
          (g.player1_identity.toHexString() === ctx.sender.toHexString() ||
           g.player2_identity.toHexString() === ctx.sender.toHexString()))
        throw new SenderError('Already in a game');
    }

    // Upsert queue entry
    const existing = ctx.db.queue.identity.find(ctx.sender);
    if (existing) {
      ctx.db.queue.identity.update({ ...existing, difficulty, queued_at: ctx.timestamp });
    } else {
      ctx.db.queue.insert({ identity: ctx.sender, difficulty, queued_at: ctx.timestamp });
    }

    // Find another player queued for the same difficulty
    const candidates = [...ctx.db.queue.queue_difficulty.filter(difficulty)]
      .filter(q => q.identity.toHexString() !== ctx.sender.toHexString());

    if (candidates.length === 0) return; // nobody to match yet

    // FIFO: pick the earliest queued player
    candidates.sort((a, b) =>
      Number(a.queued_at.microsSinceUnixEpoch - b.queued_at.microsSinceUnixEpoch));
    const opponent = candidates[0];

    // Remove both from queue
    ctx.db.queue.identity.delete(ctx.sender);
    ctx.db.queue.identity.delete(opponent.identity);

    // Generate a deterministic room code unique to this reducer call
    const code = 'Q' + ctx.timestamp.microsSinceUnixEpoch.toString(16).slice(-5).toUpperCase();

    const settings = JSON.stringify({ difficulty, problem_count: 1, starting_hp: 100 });
    ctx.db.room.insert({
      code,
      host_identity:  opponent.identity,   // earlier queuer is host
      guest_identity: ctx.sender,
      host_ready:     true,
      guest_ready:    true,
      status:         'waiting',
      settings,
    });

    // Note: don't call start_game — just start immediately via helper logic.
    // This avoids readiness checks since both are auto-ready in queue matches.
    const approvedProblems = [...ctx.db.problem.iter()].filter(
      p => p.is_approved && p.difficulty === difficulty
    );
    if (approvedProblems.length === 0) throw new SenderError('No approved problems for this difficulty');

    const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      + Number(ctx.timestamp.microsSinceUnixEpoch % 1_000_000n);
    const selected = selectProblems(approvedProblems, seed, 1);

    startGameState(ctx, code, opponent.identity, ctx.sender, selected, 100);
    const room = ctx.db.room.code.find(code)!;
    ctx.db.room.code.update({ ...room, status: 'in_game' });
  }
);

export const leave_queue = spacetimedb.reducer(
  {},
  (ctx) => {
    const entry = ctx.db.queue.identity.find(ctx.sender);
    if (entry) ctx.db.queue.identity.delete(ctx.sender);
  }
);

// ---------------------------------------------------------------------------
// Admin reducers
// ---------------------------------------------------------------------------

export const promote_to_admin = spacetimedb.reducer(
  { target: t.identity() },
  (ctx, { target }) => {
    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new SenderError('Unauthorized');
    const user = ctx.db.user.identity.find(target);
    if (!user) throw new SenderError('User not found');
    ctx.db.user.identity.update({ ...user, is_admin: true });
  }
);

// Bootstrap: callable by anyone, but only works if NO admin exists yet.
// Run once after first login to make yourself admin; becomes a no-op after that.
export const claim_first_admin = spacetimedb.reducer(
  {},
  (ctx) => {
    const admins = [...ctx.db.user.iter()].filter(u => u.is_admin);
    if (admins.length > 0) throw new SenderError('An admin already exists');
    const user = ctx.db.user.identity.find(ctx.sender);
    if (!user) throw new SenderError('User not found — connect first');
    ctx.db.user.identity.update({ ...user, is_admin: true });
  }
);

// ---------------------------------------------------------------------------
// Problem reducers
// ---------------------------------------------------------------------------

export const delete_problem = spacetimedb.reducer(
  { id: t.u64() },
  (ctx, { id }) => {
    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new SenderError('Unauthorized');
    const prob = ctx.db.problem.id.find(id);
    if (!prob) throw new SenderError('Problem not found');
    ctx.db.problem.id.delete(id);
  }
);

const PROBLEM_ARGS = {
  title:               t.string(),
  description:         t.string(),
  difficulty:          t.string(),
  method_name:         t.string(),
  sample_test_cases:   t.string(),
  sample_test_results: t.string(),
  hidden_test_cases:   t.string(),
  hidden_test_results: t.string(),
  boilerplate_python:  t.string(),
  boilerplate_java:    t.string(),
  boilerplate_cpp:     t.string(),
  compare_func_python: t.string(),
  compare_func_java:   t.string(),
  compare_func_cpp:    t.string(),
  problem_kind:        t.string(),
};

function validateAndInsertProblem(ctx: any, args: any) {
  if (args.problem_kind !== 'algorithm' && args.problem_kind !== 'data_structure') {
    throw new SenderError('Invalid problem_kind: must be "algorithm" or "data_structure"');
  }
  ctx.db.problem.insert({
    id:                   0n,
    title:                args.title,
    description:          args.description,
    difficulty:           args.difficulty,
    method_name:          args.method_name,
    sample_test_cases:    args.sample_test_cases,
    sample_test_results:  args.sample_test_results,
    hidden_test_cases:    args.hidden_test_cases,
    hidden_test_results:  args.hidden_test_results,
    boilerplate_python:   args.boilerplate_python,
    boilerplate_java:     args.boilerplate_java,
    boilerplate_cpp:      args.boilerplate_cpp,
    compare_func_python:  args.compare_func_python,
    compare_func_java:    args.compare_func_java,
    compare_func_cpp:     args.compare_func_cpp,
    created_by:           ctx.sender,
    is_approved:          true,
    problem_kind:         args.problem_kind,
  });
}

// Called from the admin UI — requires admin user row.
export const insert_problem = spacetimedb.reducer(PROBLEM_ARGS, (ctx, args) => {
  const caller = ctx.db.user.identity.find(ctx.sender);
  if (!caller?.is_admin) throw new SenderError('Unauthorized');
  validateAndInsertProblem(ctx, args);
});

// Called from seed-problems.mjs at deploy time via the server CLI token.
// No auth check — access is controlled at the infrastructure level (only
// init.sh has the token; the token is never exposed to clients).
export const seed_problem = spacetimedb.reducer(PROBLEM_ARGS, (ctx, args) => {
  validateAndInsertProblem(ctx, args);
});

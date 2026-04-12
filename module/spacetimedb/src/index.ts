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
    created_by:           t.identity(),
    is_approved:          t.bool(),
    problem_kind:         t.string(),   // "algorithm" | "data_structure"
    param_types:          t.string(),   // algo: JSON array e.g. '["int[]","int"]'; empty = generic
    return_type:          t.string(),   // algo: e.g. "int[]", "void"; empty = generic
    method_signatures:    t.string(),   // data_structure: JSON object of method→{params,return}; empty = generic
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
    player1_solved_ids:     t.string(),   // JSON array of solved problem id strings
    player2_solved_ids:     t.string(),
    player1_abilities:      t.string(),   // JSON array of ability ids
    player2_abilities:      t.string(),
    problem_ids:            t.string(),   // JSON array of problem ids (as strings), sorted easy→hard
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

// Persists a player's in-progress code draft for a specific problem in a game.
// Non-public so only the owning player's subscription sees it.
const draft_code = table(
  {
    name: 'draft_code',
    public: false,
  },
  {
    id:              t.u64().primaryKey().autoInc(),
    game_id:         t.string(),
    player_identity: t.identity(),
    problem_id:      t.u64(),
    language:        t.string(),
    code:            t.string(),
    updated_at:      t.timestamp(),
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
    identity:      t.identity().primaryKey(),
    difficulty:    t.string(),   // "easy" | "medium" | "hard"
    problem_count: t.u32(),      // 1 | 2 | 3
    queued_at:     t.timestamp(),
  }
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const spacetimedb = schema({ user, problem, room, game_state, chat_message, match_history, executor_config, submission, queue, draft_code });
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
type IdentityLike = ProblemRow['created_by'];
type DraftCodeRow = NonNullable<ReturnType<DbCtx['db']['draft_code']['id']['find']>>;

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/** Select `count` distinct problems from `pool` using a numeric seed, then sort easy→hard. */
function selectProblems(pool: ProblemRow[], seed: number, count: number): ProblemRow[] {
  const selected: ProblemRow[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; selected.length < count; i++) {
    const idx = (seed + i * 7) % pool.length;
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      selected.push(pool[idx]);
    }
  }
  // Sort easy → hard; within same difficulty preserve selection order (stable-ish)
  selected.sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0));
  return selected;
}

/** Shared logic for picking the problem set for a new game. */
function pickGameProblems(ctx: DbCtx, difficulty: string, count: number, seed: number): ProblemRow[] {
  // Difficulty ceiling: easy → [easy], medium → [easy,medium], hard → [easy,medium,hard]
  const allowedDifficulties = difficulty === 'easy'
    ? ['easy']
    : difficulty === 'medium'
      ? ['easy', 'medium']
      : ['easy', 'medium', 'hard'];

  const approved = [...ctx.db.problem.iter()].filter(
    p => p.is_approved && allowedDifficulties.includes(p.difficulty)
  );
  if (approved.length === 0) throw new SenderError('No approved problems for this difficulty');

  return selectProblems(approved, seed, Math.min(count, approved.length));
}

/** Insert a game_state row and update the room to 'in_game'. */
function startGameState(
  ctx: DbCtx,
  roomCode: string,
  p1Identity: IdentityLike,
  p2Identity: IdentityLike,
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
    player1_solved_ids:    '[]',
    player2_solved_ids:    '[]',
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

    // ctx.timestamp varies per call — sufficient entropy for a club tool.
    const seed = room.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      + Number(ctx.timestamp.microsSinceUnixEpoch % 1_000_000n);

    const problemCount = Math.max(1, Number(settings.problem_count ?? 1));
    const selected = pickGameProblems(ctx, difficulty, problemCount, seed);
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
    problem_id:      t.u64(),      // which problem was submitted
    passed:          t.u32(),
    total:           t.u32(),
    solve_time:      t.u32(),    // seconds
    language:        t.string(),
  },
  (ctx, { game_id, player_identity: playerIdentityHex, problem_id, passed, total, solve_time, language }) => {
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

    // Validate problem_id is part of this game
    const problemIds = JSON.parse(game.problem_ids) as string[];
    const problemCount = problemIds.length;
    const problemIdStr = problem_id.toString();
    if (!problemIds.includes(problemIdStr)) throw new SenderError('problem_id is not part of this game');

    // Always record the submission attempt
    ctx.db.submission.insert({
      id:              0n,
      game_id,
      player_identity,
      problem_id,
      passed,
      total,
      solve_time,
      language,
      submitted_at:    ctx.timestamp,
    });

    if (!accepted) return; // player can retry

    // Check if this problem was already solved — ignore duplicate solves
    const solvedIds: string[] = JSON.parse(isP1 ? game.player1_solved_ids : game.player2_solved_ids);
    if (solvedIds.includes(problemIdStr)) return; // already counted

    // Record the solve
    const newSolvedIds = [...solvedIds, problemIdStr];

    // Proportional HP damage: each problem is worth startingHp / problemCount HP
    const room = ctx.db.room.code.find(game.room_code);
    const settings = room ? JSON.parse(room.settings) as Record<string, unknown> : {};
    const startingHp = Number(settings.starting_hp ?? 100);
    const damage = Math.ceil(startingHp / problemCount);

    let updated = { ...game };
    if (isP1) {
      updated.player1_solved_ids = JSON.stringify(newSolvedIds);
      updated.player2_hp = Math.max(0, game.player2_hp - damage);
    } else {
      updated.player2_solved_ids = JSON.stringify(newSolvedIds);
      updated.player1_hp = Math.max(0, game.player1_hp - damage);
    }

    const opponentHp = isP1 ? updated.player2_hp : updated.player1_hp;
    const winner_identity = isP1 ? game.player1_identity : game.player2_identity;

    ctx.db.game_state.id.update(updated);

    // Win condition: solved all problems, OR opponent HP hits 0
    if (newSolvedIds.length >= problemCount || opponentHp <= 0) {
      endGame(ctx, updated, winner_identity);
    }
  }
);

// ---------------------------------------------------------------------------
// Executor config (S3 fix)
// ---------------------------------------------------------------------------

// Called by the executor at startup to register its SpacetimeDB identity.
// Auth rules, in order:
//   1. No config yet + no admin yet → deploy-time bootstrap, allow.
//   2. Caller matches the stored executor identity → idempotent self-register on restart.
//   3. Caller is admin → allow override (e.g. rotating the executor).
// Otherwise reject. Prevents a malicious client from racing the executor on
// boot and hijacking submit_result authority.
export const set_executor_identity = spacetimedb.reducer(
  {},
  (ctx) => {
    const existing = ctx.db.executor_config.id.find(0);
    const senderHex = ctx.sender.toHexString();

    if (!existing) {
      const adminExists = [...ctx.db.user.iter()].some(u => u.is_admin);
      if (adminExists) {
        const caller = ctx.db.user.identity.find(ctx.sender);
        if (!caller?.is_admin) throw new SenderError('Unauthorized');
      }
      ctx.db.executor_config.insert({ id: 0, executor_identity: ctx.sender });
      return;
    }

    if (existing.executor_identity.toHexString() === senderHex) return; // idempotent

    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new SenderError('Unauthorized');
    ctx.db.executor_config.id.update({ ...existing, executor_identity: ctx.sender });
  }
);

// ---------------------------------------------------------------------------
// Draft code reducer
// ---------------------------------------------------------------------------

const MAX_DRAFT_CODE_BYTES = 64 * 1024;

export const save_draft = spacetimedb.reducer(
  { game_id: t.string(), problem_id: t.u64(), language: t.string(), code: t.string() },
  (ctx, { game_id, problem_id, language, code }) => {
    if (code.length > MAX_DRAFT_CODE_BYTES) throw new SenderError('Draft code too large');

    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') throw new SenderError('Game not found or not in progress');

    const senderHex = ctx.sender.toHexString();
    if (senderHex !== game.player1_identity.toHexString() && senderHex !== game.player2_identity.toHexString()) {
      throw new SenderError('Not a participant in this game');
    }

    // Upsert: find existing draft for this player+game+problem+language (small table — iter is fine)
    let found: DraftCodeRow | undefined;
    for (const row of ctx.db.draft_code.iter()) {
      if (row.game_id === game_id &&
          row.player_identity.toHexString() === senderHex &&
          row.problem_id === problem_id &&
          row.language === language) {
        found = row;
        break;
      }
    }

    if (found) {
      ctx.db.draft_code.id.update({ ...found, code, updated_at: ctx.timestamp });
    } else {
      ctx.db.draft_code.insert({
        id:              0n,
        game_id,
        player_identity: ctx.sender,
        problem_id,
        language,
        code,
        updated_at:      ctx.timestamp,
      });
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
  { difficulty: t.string(), problem_count: t.u32() },
  (ctx, { difficulty, problem_count }) => {
    if (!['easy', 'medium', 'hard'].includes(difficulty))
      throw new SenderError('Invalid difficulty');
    if (![1, 2, 3].includes(problem_count))
      throw new SenderError('problem_count must be 1, 2, or 3');

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
      ctx.db.queue.identity.update({ ...existing, difficulty, problem_count, queued_at: ctx.timestamp });
    } else {
      ctx.db.queue.insert({ identity: ctx.sender, difficulty, problem_count, queued_at: ctx.timestamp });
    }

    // Strict match: same difficulty AND same problem_count
    const candidates = [...ctx.db.queue.queue_difficulty.filter(difficulty)]
      .filter(q =>
        q.identity.toHexString() !== ctx.sender.toHexString() &&
        q.problem_count === problem_count
      );

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

    const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      + Number(ctx.timestamp.microsSinceUnixEpoch % 1_000_000n);
    const selected = pickGameProblems(ctx, difficulty, problem_count, seed);

    const settings = JSON.stringify({ difficulty, problem_count, starting_hp: 100 });
    ctx.db.room.insert({
      code,
      host_identity:  opponent.identity,   // earlier queuer is host
      guest_identity: ctx.sender,
      host_ready:     true,
      guest_ready:    true,
      status:         'in_game',
      settings,
    });

    startGameState(ctx, code, opponent.identity, ctx.sender, selected, 100);
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
  problem_kind:        t.string(),
  param_types:         t.string(),
  return_type:         t.string(),
  method_signatures:   t.string(),
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
    created_by:           ctx.sender,
    is_approved:          true,
    problem_kind:         args.problem_kind,
    param_types:          args.param_types,
    return_type:          args.return_type,
    method_signatures:    args.method_signatures,
  });
}

// Called from the admin UI — requires admin user row.
export const insert_problem = spacetimedb.reducer(PROBLEM_ARGS, (ctx, args) => {
  const caller = ctx.db.user.identity.find(ctx.sender);
  if (!caller?.is_admin) throw new SenderError('Unauthorized');
  validateAndInsertProblem(ctx, args);
});

// Update an existing problem — admin only.
export const update_problem = spacetimedb.reducer(
  { id: t.u64(), ...PROBLEM_ARGS },
  (ctx, { id, ...args }) => {
    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new SenderError('Unauthorized');
    const prob = ctx.db.problem.id.find(id);
    if (!prob) throw new SenderError('Problem not found');
    if (args.problem_kind !== 'algorithm' && args.problem_kind !== 'data_structure') {
      throw new SenderError('Invalid problem_kind');
    }
    ctx.db.problem.id.update({
      ...prob,
      title:               args.title,
      description:         args.description,
      difficulty:          args.difficulty,
      method_name:         args.method_name,
      sample_test_cases:   args.sample_test_cases,
      sample_test_results: args.sample_test_results,
      hidden_test_cases:   args.hidden_test_cases,
      hidden_test_results: args.hidden_test_results,
      boilerplate_python:  args.boilerplate_python,
      boilerplate_java:    args.boilerplate_java,
      boilerplate_cpp:     args.boilerplate_cpp,
      problem_kind:        args.problem_kind,
      param_types:         args.param_types,
      return_type:         args.return_type,
      method_signatures:   args.method_signatures,
    });
  }
);

// Called from seed-problems.mjs at deploy time via the server CLI token.
// Auth: admin OR no admin exists yet (deploy-time bootstrap window, matching
// claim_first_admin). init.sh always runs before any user logs in, so it hits
// the no-admin branch. After that, only admins can reseed.
export const seed_problem = spacetimedb.reducer(PROBLEM_ARGS, (ctx, args) => {
  const caller = ctx.db.user.identity.find(ctx.sender);
  if (!caller?.is_admin) {
    const adminExists = [...ctx.db.user.iter()].some(u => u.is_admin);
    if (adminExists) throw new SenderError('Unauthorized');
  }
  validateAndInsertProblem(ctx, args);
});

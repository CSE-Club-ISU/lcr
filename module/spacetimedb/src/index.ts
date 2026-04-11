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
    problem_id:          t.u64(),
    problem_title:       t.string(),   // denormalized for quick display
    difficulty:          t.string(),
    player1_solve_time:  t.u32(),      // seconds; 0 = did not solve
    player2_solve_time:  t.u32(),
    player1_language:    t.string(),
    player2_language:    t.string(),
    player1_accepted:    t.bool(),
    player2_accepted:    t.bool(),
    played_at:           t.timestamp(),
  }
);

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
    difficulty:  t.string(),   // "easy" | "medium" | "hard"
    queued_at:   t.timestamp(),
  }
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const spacetimedb = schema({ user, problem, room, game_state, chat_message, match_history, executor_config, queue });
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
  const entry = ctx.db.queue.identity.find(ctx.sender);
  if (entry) ctx.db.queue.identity.delete(ctx.sender);
});

// Seed some test problems on first database init
export const seed = spacetimedb.reducer(
  {},
  (ctx) => {
    const existing = [...ctx.db.problem.iter()];
    if (existing.length > 0) return; // already seeded

    const testProblems = [
      {
        title: "Two Sum",
        description: "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.",
        difficulty: "easy",
        method_name: "twoSum",
        sample_test_cases: JSON.stringify([[2,7,11,15], [3,2,4]]),
        sample_test_results: JSON.stringify([[0,1], [1,2]]),
        hidden_test_cases: JSON.stringify([[1,3,5,7], [0,-1,1]]),
        hidden_test_results: JSON.stringify([[0,3], [0,2]]),
        boilerplate_python: "def twoSum(nums, target):\n    pass",
        boilerplate_java: "public int[] twoSum(int[] nums, int target) { }",
        boilerplate_cpp: "vector<int> twoSum(vector<int>& nums, int target) { }",
        is_approved: true,
      },
      {
        title: "Longest Substring Without Repeating Characters",
        description: "Given a string s, find the length of the longest substring without repeating characters.",
        difficulty: "medium",
        method_name: "lengthOfLongestSubstring",
        sample_test_cases: JSON.stringify(["abcabcbb", "bbbbb", "pwwkew"]),
        sample_test_results: JSON.stringify([3, 1, 3]),
        hidden_test_cases: JSON.stringify(["au", "dvdf", ""]),
        hidden_test_results: JSON.stringify([2, 3, 0]),
        boilerplate_python: "def lengthOfLongestSubstring(s):\n    pass",
        boilerplate_java: "public int lengthOfLongestSubstring(String s) { }",
        boilerplate_cpp: "int lengthOfLongestSubstring(string s) { }",
        is_approved: true,
      },
      {
        title: "Median of Two Sorted Arrays",
        description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
        difficulty: "hard",
        method_name: "findMedianSortedArrays",
        sample_test_cases: JSON.stringify([[[1,3],[2]], [[1,2],[3,4]]]),
        sample_test_results: JSON.stringify([2.0, 2.5]),
        hidden_test_cases: JSON.stringify([[[],[1]], [[0,0],[0,0]]]),
        hidden_test_results: JSON.stringify([1.0, 0.0]),
        boilerplate_python: "def findMedianSortedArrays(nums1, nums2):\n    pass",
        boilerplate_java: "public double findMedianSortedArrays(int[] nums1, int[] nums2) { }",
        boilerplate_cpp: "double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) { }",
        is_approved: true,
      },
    ];

    for (const prob of testProblems) {
      ctx.db.problem.insert({
        id: 0n,
        title: prob.title,
        description: prob.description,
        difficulty: prob.difficulty,
        method_name: prob.method_name,
        sample_test_cases: prob.sample_test_cases,
        sample_test_results: prob.sample_test_results,
        hidden_test_cases: prob.hidden_test_cases,
        hidden_test_results: prob.hidden_test_results,
        boilerplate_python: prob.boilerplate_python,
        boilerplate_java: prob.boilerplate_java,
        boilerplate_cpp: prob.boilerplate_cpp,
        created_by: ctx.sender,
        is_approved: prob.is_approved,
      });
    }
  }
);

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
// Room reducers
// ---------------------------------------------------------------------------

const sid = (id: { toHexString(): string }) => id.toHexString().slice(0, 8);

export const create_room = spacetimedb.reducer(
  { code: t.string(), settings: t.string() },
  (ctx, { code, settings }) => {
    console.log(`[CREATE_ROOM] sender=${sid(ctx.sender)} code=${code}`);
    ctx.db.room.insert({
      code,
      host_identity:  ctx.sender,
      guest_identity: undefined,
      host_ready:     false,
      guest_ready:    false,
      status:         'waiting',
      settings,
    });
    console.log(`[CREATE_ROOM] ✓ room ${code} created by ${sid(ctx.sender)}`);
  }
);

export const join_room = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    console.log(`[JOIN_ROOM] sender=${sid(ctx.sender)} code=${code}`);
    const room = ctx.db.room.code.find(code);
    if (!room) {
      console.log(`[JOIN_ROOM] ✗ room ${code} not found — existing rooms: ${[...ctx.db.room.iter()].map(r => r.code).join(',') || '(none)'}`);
      throw new SenderError('Room not found');
    }
    console.log(`[JOIN_ROOM] room found: host=${sid(room.host_identity)} guest=${room.guest_identity ? sid(room.guest_identity) : 'none'} status=${room.status}`);
    // Already the host — no-op (host navigated to their own room page)
    if (ctx.sender.toHexString() === room.host_identity.toHexString()) {
      console.log(`[JOIN_ROOM] sender is already host, skipping`);
      return;
    }
    // Already the guest — no-op (duplicate join)
    if (room.guest_identity && ctx.sender.toHexString() === room.guest_identity.toHexString()) {
      console.log(`[JOIN_ROOM] sender is already guest, skipping`);
      return;
    }
    if (room.status !== 'waiting') throw new SenderError('Room is not open');
    if (room.guest_identity) {
      console.log(`[JOIN_ROOM] ✗ room full, guest is ${sid(room.guest_identity)}`);
      throw new SenderError('Room is full');
    }
    ctx.db.room.code.update({ ...room, guest_identity: ctx.sender });
    console.log(`[JOIN_ROOM] ✓ ${sid(ctx.sender)} joined room ${code}`);
  }
);

export const leave_room = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    console.log(`[LEAVE_ROOM] sender=${sid(ctx.sender)} code=${code}`);
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    if (ctx.sender.toHexString() === room.host_identity.toHexString()) {
      if (room.guest_identity) {
        console.log(`[LEAVE_ROOM] host left, promoting guest ${sid(room.guest_identity)} to host`);
        ctx.db.room.code.update({ ...room, host_identity: room.guest_identity, guest_identity: undefined, host_ready: false, guest_ready: false });
      } else {
        console.log(`[LEAVE_ROOM] last player left, deleting room ${code}`);
        ctx.db.room.code.delete(code);
      }
    } else if (room.guest_identity && ctx.sender.toHexString() === room.guest_identity.toHexString()) {
      console.log(`[LEAVE_ROOM] guest ${sid(ctx.sender)} left room ${code}`);
      ctx.db.room.code.update({ ...room, guest_identity: undefined, guest_ready: false });
    } else {
      console.log(`[LEAVE_ROOM] sender ${sid(ctx.sender)} is neither host nor guest, ignoring`);
    }
  }
);

export const set_ready = spacetimedb.reducer(
  { code: t.string(), ready: t.bool() },
  (ctx, { code, ready }) => {
    console.log(`[SET_READY] sender=${sid(ctx.sender)} code=${code} ready=${ready}`);
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    if (ctx.sender.toHexString() === room.host_identity.toHexString()) {
      ctx.db.room.code.update({ ...room, host_ready: ready });
      console.log(`[SET_READY] ✓ host ready=${ready}`);
    } else if (room.guest_identity && ctx.sender.toHexString() === room.guest_identity.toHexString()) {
      ctx.db.room.code.update({ ...room, guest_ready: ready });
      console.log(`[SET_READY] ✓ guest ready=${ready}`);
    } else {
      console.log(`[SET_READY] ✗ sender ${sid(ctx.sender)} is neither host nor guest`);
    }
  }
);

// ---------------------------------------------------------------------------
// Game reducers
// ---------------------------------------------------------------------------

type DbCtx = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];
type RoomRow = NonNullable<ReturnType<DbCtx['db']['room']['code']['find']>>;

// Shared helper: pick problems and create game_state for a room. Both players
// must already be set on the room row before calling this.
function startGameForRoom(ctx: DbCtx, room: RoomRow): void {
  const settings = JSON.parse(room.settings) as Record<string, unknown>;
  const difficulty = (settings.difficulty as string) ?? 'medium';

  const approved = [...ctx.db.problem.iter()].filter(
    p => p.is_approved && p.difficulty === difficulty
  );
  if (approved.length === 0) throw new SenderError('No approved problems for this difficulty');

  // Use timestamp for entropy so the same room code gets different problems each game.
  const seed = room.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    + Number(ctx.timestamp.microsSinceUnixEpoch % 1_000_000n);

  const problemCount = Math.min(
    Math.max(1, Number(settings.problem_count ?? 1)),
    approved.length
  );

  const selected: typeof approved = [];
  for (let i = 0; i < problemCount; i++) {
    selected.push(approved[(seed + i * 7) % approved.length]);
  }

  const starting_hp = Number(settings.starting_hp ?? 100);

  ctx.db.game_state.insert({
    id:                    room.code,
    room_code:             room.code,
    player1_identity:      room.host_identity,
    player2_identity:      room.guest_identity!,
    player1_hp:            starting_hp,
    player2_hp:            starting_hp,
    player1_sp:            0,
    player2_sp:            0,
    player1_mp:            0,
    player2_mp:            0,
    player1_problem_index: 0,
    player2_problem_index: 0,
    player1_abilities:     '[]',
    player2_abilities:     '[]',
    problem_ids:           JSON.stringify(selected.map(p => p.id.toString())),
    status:                'in_progress',
    start_time:            ctx.timestamp,
    winner_identity:       undefined,
  });

  ctx.db.room.code.update({ ...room, status: 'in_game' });
}

// Called by the host when both players are ready.
export const start_game = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    if (!room.host_ready || !room.guest_ready) throw new SenderError('Not both ready');
    if (!room.guest_identity) throw new SenderError('No guest in room');
    if (room.status === 'in_game') return; // already started
    startGameForRoom(ctx, room);
  }
);

export const send_chat = spacetimedb.reducer(
  { game_id: t.string(), text: t.string() },
  (ctx, { game_id, text }) => {
    ctx.db.chat_message.insert({
      id:              0n,
      game_id,
      sender_identity: ctx.sender,
      text,
      sent:            ctx.timestamp,
    });
  }
);

export const forfeit = spacetimedb.reducer(
  { game_id: t.string() },
  (ctx, { game_id }) => {
    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') return;

    const isP1 = game.player1_identity.toHexString() === ctx.sender.toHexString();
    const winner_identity = isP1 ? game.player2_identity : game.player1_identity;
    const loser_identity  = isP1 ? game.player1_identity : game.player2_identity;

    ctx.db.game_state.id.update({ ...game, status: 'finished', winner_identity });

    const winner = ctx.db.user.identity.find(winner_identity);
    const loser  = ctx.db.user.identity.find(loser_identity);
    if (winner) {
      ctx.db.user.identity.update({
        ...winner,
        total_wins:     winner.total_wins + 1,
        total_matches:  winner.total_matches + 1,
        current_streak: winner.current_streak + 1,
      });
    }
    if (loser) {
      ctx.db.user.identity.update({
        ...loser,
        total_matches:  loser.total_matches + 1,
        current_streak: 0,
      });
    }
  }
);

// Called by the executor service after running submitted code
export const submit_result = spacetimedb.reducer(
  {
    game_id:         t.string(),
    player_identity: t.identity(),
    passed:          t.u32(),
    total:           t.u32(),
    solve_time:      t.u32(),    // seconds
    language:        t.string(),
  },
  (ctx, { game_id, player_identity, passed, total, solve_time, language }) => {
    // S3: Only the registered executor identity may submit results
    const cfg = ctx.db.executor_config.id.find(0);
    if (!cfg || cfg.executor_identity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('Unauthorized: only the executor may call submit_result');
    }

    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') return;

    const accepted = passed === total && total > 0;
    const isP1 = game.player1_identity.toHexString() === player_identity.toHexString();

    if (!accepted) return;

    let updated = { ...game };
    if (isP1) {
      updated.player2_hp = Math.max(0, game.player2_hp - 100);
    } else {
      updated.player1_hp = Math.max(0, game.player1_hp - 100);
    }

    const winner_identity = isP1 ? game.player1_identity : game.player2_identity;
    const loser_identity  = isP1 ? game.player2_identity : game.player1_identity;

    const problemIds = JSON.parse(game.problem_ids) as string[];
    const problemId  = BigInt(problemIds[0] ?? '0');
    const prob = ctx.db.problem.id.find(problemId);

    ctx.db.match_history.insert({
      id:                 0n,
      room_code:          game.room_code,
      player1_identity:   game.player1_identity,
      player2_identity:   game.player2_identity,
      winner_identity,
      problem_id:         problemId,
      problem_title:      prob?.title ?? '',
      difficulty:         prob?.difficulty ?? '',
      player1_solve_time: isP1 ? solve_time : 0,
      player2_solve_time: isP1 ? 0 : solve_time,
      player1_language:   isP1 ? language : '',
      player2_language:   isP1 ? '' : language,
      player1_accepted:   isP1,
      player2_accepted:   !isP1,
      played_at:          ctx.timestamp,
    });

    // Hidden ELO calculation (K=20)
    const winner = ctx.db.user.identity.find(winner_identity);
    const loser  = ctx.db.user.identity.find(loser_identity);
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

    updated.status          = 'finished';
    updated.winner_identity = winner_identity;
    ctx.db.game_state.id.update(updated);
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

    const room = ctx.db.room.code.find(code)!;
    startGameForRoom(ctx, room);
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
// Problem reducers
// ---------------------------------------------------------------------------

export const insert_problem = spacetimedb.reducer(
  {
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
    is_approved:         t.bool(),
  },
  (ctx, args) => {
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
      is_approved:          args.is_approved,
    });
  }
);

export const approve_problem = spacetimedb.reducer(
  { id: t.u64() },
  (ctx, { id }) => {
    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new SenderError('Unauthorized');
    const prob = ctx.db.problem.id.find(id);
    if (!prob) throw new SenderError('Problem not found');
    ctx.db.problem.id.update({ ...prob, is_approved: true });
  }
);

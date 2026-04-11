import { schema, table, t } from 'spacetimedb/server';

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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const spacetimedb = schema({ user, problem, room, game_state, chat_message, match_history });
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

export const onDisconnect = spacetimedb.clientDisconnected(_ctx => {
  // Future: track online status
});

// ---------------------------------------------------------------------------
// User reducers
// ---------------------------------------------------------------------------

export const set_profile = spacetimedb.reducer(
  { username: t.string(), first_name: t.string(), last_name: t.string(), github_id: t.string(), avatar_url: t.string() },
  (ctx, { username, first_name, last_name, github_id, avatar_url }) => {
    const user = ctx.db.user.identity.find(ctx.sender);
    if (!user) throw new Error('User not found');
    ctx.db.user.identity.update({ ...user, username, first_name, last_name, github_id, avatar_url });
  }
);

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
    if (!room) throw new Error('Room not found');
    if (room.status !== 'waiting') throw new Error('Room is not open');
    if (room.guest_identity) throw new Error('Room is full');
    ctx.db.room.code.update({ ...room, guest_identity: ctx.sender });
  }
);

export const leave_room = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new Error('Room not found');
    if (ctx.sender === room.host_identity) {
      if (room.guest_identity) {
        ctx.db.room.code.update({ ...room, host_identity: room.guest_identity, guest_identity: undefined, host_ready: false, guest_ready: false });
      } else {
        ctx.db.room.code.delete(code);
      }
    } else if (ctx.sender === room.guest_identity) {
      ctx.db.room.code.update({ ...room, guest_identity: undefined, guest_ready: false });
    }
  }
);

export const set_ready = spacetimedb.reducer(
  { code: t.string(), ready: t.bool() },
  (ctx, { code, ready }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new Error('Room not found');
    if (ctx.sender === room.host_identity) {
      ctx.db.room.code.update({ ...room, host_ready: ready });
    } else if (ctx.sender === room.guest_identity) {
      ctx.db.room.code.update({ ...room, guest_ready: ready });
    }
  }
);

// ---------------------------------------------------------------------------
// Game reducers
// ---------------------------------------------------------------------------

// Called by the host when both players are ready. Picks a problem, creates game state.
export const start_game = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new Error('Room not found');
    if (!room.host_ready || !room.guest_ready) throw new Error('Not both ready');
    if (!room.guest_identity) throw new Error('No guest in room');
    if (room.status === 'in_game') return; // already started

    const settings = JSON.parse(room.settings) as Record<string, unknown>;
    const difficulty = (settings.difficulty as string) ?? 'medium';

    // Pick approved problems matching difficulty
    const approved = [...ctx.db.problem.iter()].filter(
      p => p.is_approved && p.difficulty === difficulty
    );
    if (approved.length === 0) throw new Error('No approved problems for this difficulty');

    // Deterministic selection — hash room code to pick index
    const idx = room.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % approved.length;
    const problem = approved[idx];

    const starting_hp = Number(settings.starting_hp ?? 100);

    ctx.db.game_state.insert({
      id:                    room.code,
      room_code:             room.code,
      player1_identity:      room.host_identity,
      player2_identity:      room.guest_identity,
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
      problem_ids:           JSON.stringify([problem.id.toString()]),
      status:                'in_progress',
      start_time:            ctx.timestamp,
      winner_identity:       undefined,
    });

    ctx.db.room.code.update({ ...room, status: 'in_game' });
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

export const approve_problem = spacetimedb.reducer(
  { id: t.u64() },
  (ctx, { id }) => {
    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new Error('Unauthorized');
    const prob = ctx.db.problem.id.find(id);
    if (!prob) throw new Error('Problem not found');
    ctx.db.problem.id.update({ ...prob, is_approved: true });
  }
);

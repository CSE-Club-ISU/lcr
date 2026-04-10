import { schema, table, t } from 'spacetimedb/server';

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const user = table(
  { name: 'user', public: true },
  {
    identity:     t.identity().primaryKey(),
    username:     t.string(),
    first_name:   t.string(),
    last_name:    t.string(),
    github_id:    t.string(),
    avatar_url:   t.string(),
    is_admin:     t.bool(),
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
    settings:         t.string(),   // JSON: { problem_count, starting_hp, difficulty, ... }
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
    problem_ids:            t.string(),   // JSON array of problem ids
    status:                 t.string(),   // "waiting" | "in_progress" | "finished"
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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const spacetimedb = schema({ user, problem, room, game_state, chat_message });
export default spacetimedb;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const onConnect = spacetimedb.clientConnected(ctx => {
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (!existing) {
    ctx.db.user.insert({
      identity:   ctx.sender,
      username:   '',
      first_name: '',
      last_name:  '',
      github_id:  '',
      avatar_url: '',
      is_admin:   false,
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
  { username: t.string(), first_name: t.string(), last_name: t.string() },
  (ctx, { username, first_name, last_name }) => {
    const user = ctx.db.user.identity.find(ctx.sender);
    if (!user) throw new Error('User not found');
    ctx.db.user.identity.update({ ...user, username, first_name, last_name });
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
      // Host leaves: promote guest or delete room
      if (room.guest_identity) {
        ctx.db.room.code.update({ ...room, host_identity: room.guest_identity, guest_identity: undefined, host_ready: false, guest_ready: false });
      } else {
        ctx.db.room.code.delete(room);
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
// Game reducers (stubs — logic added in Phase 2)
// ---------------------------------------------------------------------------

export const send_chat = spacetimedb.reducer(
  { game_id: t.string(), text: t.string() },
  (ctx, { game_id, text }) => {
    ctx.db.chat_message.insert({
      game_id,
      sender_identity: ctx.sender,
      text,
      sent: ctx.timestamp,
    });
  }
);

export const forfeit = spacetimedb.reducer(
  { game_id: t.string() },
  (_ctx, { game_id: _game_id }) => {
    // TODO Phase 2: set winner to opponent, status to finished
  }
);

// Called by the executor service after running submitted code
export const submit_result = spacetimedb.reducer(
  { game_id: t.string(), player_identity: t.identity(), passed: t.u32(), total: t.u32() },
  (_ctx, _args) => {
    // TODO Phase 2: HP deduction, problem advance, win condition check
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
// Problem reducers (stubs — Phase 4)
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

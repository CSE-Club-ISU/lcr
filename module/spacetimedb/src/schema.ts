import { schema, table, t } from 'spacetimedb/server';

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const user = table(
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

export const problem = table(
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

export const room = table(
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

export const game_state = table(
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
    // Powerup state
    // Currency model: available = floor((now - start_time) / POWERUP_TICK_SEC) + quiz_bonus - spent
    player1_spent:          t.u32(),   // currency already spent on powerups
    player2_spent:          t.u32(),
    player1_quiz_bonus:     t.u32(),   // currency earned from quizzes (added to passive accrual)
    player2_quiz_bonus:     t.u32(),
    player1_last_quiz_at:   t.timestamp(),   // rate limit cooldown
    player2_last_quiz_at:   t.timestamp(),
    player1_shield:         t.i32(),   // pending damage reduction (flat)
    player2_shield:         t.i32(),
    player1_dmg_bonus:      t.i32(),   // pending flat bonus damage on next solve
    player2_dmg_bonus:      t.i32(),
    player1_dmg_mult_pct:   t.i32(),   // pending pct multiplier on next solve (100 = +100%)
    player2_dmg_mult_pct:   t.i32(),
  }
);

// Powerup catalog (seeded once)
export const powerup = table(
  { name: 'powerup', public: true },
  {
    id:           t.u64().primaryKey().autoInc(),
    name:         t.string(),
    description:  t.string(),
    kind:         t.string(),   // "damage" | "defense" | "sabotage"
    target:       t.string(),   // "self" | "opponent"
    cost:         t.u32(),
    effect_data:  t.string(),   // JSON effect config, e.g. { amount: 20 } or { type: "delete_line" }
  }
);

// Quiz questions (seeded)
export const quiz_question = table(
  { name: 'quiz_question', public: true },
  {
    id:             t.u64().primaryKey().autoInc(),
    question_type:  t.string(),   // "mcq" | "tf" | "code_fill"
    prompt:         t.string(),
    options:        t.string(),   // JSON array for MCQ, "[]" otherwise
    answer:         t.string(),   // canonical correct answer
  }
);

// Per-game loadout: which powerups the player may buy mid-match
export const powerup_loadout = table(
  {
    name: 'powerup_loadout',
    public: true,
    indexes: [
      { accessor: 'loadout_game_id', algorithm: 'btree', columns: ['game_id'] },
    ],
  },
  {
    id:              t.u64().primaryKey().autoInc(),
    game_id:         t.string(),
    player_identity: t.identity(),
    powerup_ids:     t.string(),   // JSON array of powerup id strings
  }
);

// Ephemeral sabotage effects — client picks up and applies, then calls clear_sabotage_event
export const sabotage_event = table(
  {
    name: 'sabotage_event',
    public: true,
    indexes: [
      { accessor: 'sabotage_target', algorithm: 'btree', columns: ['target_identity'] },
    ],
  },
  {
    id:               t.u64().primaryKey().autoInc(),
    game_id:          t.string(),
    target_identity:  t.identity(),
    effect_type:      t.string(),   // "delete_line" | "font_size_up" | "font_blur" | "cursor_freeze"
    effect_data:      t.string(),   // JSON, e.g. { duration_ms: 3000 }
    created_at:       t.timestamp(),
  }
);

// Pre-match loadout selection (persists across matches for UX convenience)
export const player_loadout_pref = table(
  { name: 'player_loadout_pref', public: true },
  {
    identity:    t.identity().primaryKey(),
    powerup_ids: t.string(),   // JSON array
  }
);

// Stores the executor service's SpacetimeDB identity so submit_result can
// verify the caller is actually the executor, not a malicious client (S3 fix).
export const executor_config = table(
  { name: 'executor_config', public: false },
  {
    id:                t.u32().primaryKey(),   // singleton row — always id=0
    executor_identity: t.identity(),
  }
);

export const chat_message = table(
  { name: 'chat_message', public: true },
  {
    id:              t.u64().primaryKey().autoInc(),
    game_id:         t.string(),
    sender_identity: t.identity(),
    text:            t.string(),
    sent:            t.timestamp(),
  }
);

export const match_history = table(
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
    winner_identity:     t.identity().optional(),
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
export const submission = table(
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
export const draft_code = table(
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
export const queue = table(
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

const spacetimedb = schema({ user, problem, room, game_state, chat_message, match_history, executor_config, submission, queue, draft_code, powerup, quiz_question, powerup_loadout, sabotage_event, player_loadout_pref });
export default spacetimedb;

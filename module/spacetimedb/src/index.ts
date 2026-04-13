import spacetimedb from './schema';
import { t, SenderError } from 'spacetimedb/server';
export default spacetimedb;

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

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
type GameStateRow = NonNullable<ReturnType<DbCtx['db']['game_state']['id']['find']>>;

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

// Powerup currency: +1 every 3 seconds of active game
const POWERUP_TICK_SEC = 3;

/** Compute currency available to a player based on elapsed time, quiz bonus, and amount spent. */
function availableCurrency(game: GameStateRow, isP1: boolean, nowMicros: bigint): number {
  const elapsedMicros = nowMicros - game.start_time.microsSinceUnixEpoch;
  const elapsedSec = Number(elapsedMicros / 1_000_000n);
  const passive = Math.max(0, Math.floor(elapsedSec / POWERUP_TICK_SEC));
  const bonus = isP1 ? game.player1_quiz_bonus : game.player2_quiz_bonus;
  const spent = isP1 ? game.player1_spent : game.player2_spent;
  return passive + bonus - spent;
}

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

  // NOTE: problem table is intentionally small (admin-curated). Full scan is acceptable;
  // if the problem set grows large, add an index on (is_approved, difficulty).
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
    player1_spent:          0,
    player2_spent:          0,
    player1_quiz_bonus:     0,
    player2_quiz_bonus:     0,
    player1_last_quiz_at:   ctx.timestamp,
    player2_last_quiz_at:   ctx.timestamp,
    player1_shield:         0,
    player2_shield:         0,
    player1_dmg_bonus:      0,
    player2_dmg_bonus:      0,
    player1_dmg_mult_pct:   0,
    player2_dmg_mult_pct:   0,
  });

  // Copy per-player loadout from player_loadout_pref into powerup_loadout for this game.
  for (const [identity, _isP1] of [[p1Identity, true], [p2Identity, false]] as const) {
    const pref = ctx.db.player_loadout_pref.identity.find(identity as IdentityLike);
    const powerupIds = pref ? pref.powerup_ids : '[]';
    ctx.db.powerup_loadout.insert({
      id:              0n,
      game_id:         roomCode,
      player_identity: identity as IdentityLike,
      powerup_ids:     powerupIds,
    });
  }
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

type RoomSettingsV1 = {
  version?: number;
  mode?: string;
  startingHp?: number;
  starting_hp?: number; // legacy
  problemSelection?: { kind: string; problemIds?: string[]; difficulty?: string; count?: number };
  // legacy flat fields
  difficulty?: string;
  problem_count?: number;
};

/**
 * Resolve the problem list for a game from the room settings JSON.
 * Supports both the new v1 format (problemSelection.kind) and the legacy
 * flat format ({ difficulty, problem_count }) used by old matchmaking rooms.
 */
function resolveProblemsForStart(ctx: DbCtx, rawSettings: RoomSettingsV1, seed: number): ProblemRow[] {
  const ps = rawSettings.problemSelection;

  if (ps?.kind === 'explicit') {
    // Host chose specific problems in a specific order — honour exactly.
    const ids = ps.problemIds ?? [];
    if (ids.length === 0) throw new SenderError('No problems selected');
    const problems: ProblemRow[] = [];
    for (const idStr of ids) {
      const id = BigInt(idStr);
      const p = ctx.db.problem.id.find(id);
      if (!p) throw new SenderError(`Problem ${idStr} not found`);
      if (!p.is_approved) throw new SenderError(`Problem ${idStr} is not approved`);
      problems.push(p);
    }
    return problems; // preserve host-defined order, no sort
  }

  // 'random' or legacy flat format
  const difficulty = ps?.difficulty ?? rawSettings.difficulty ?? 'medium';
  const count = Math.max(1, ps?.count ?? Number(rawSettings.problem_count ?? 1));
  return pickGameProblems(ctx, difficulty, count, seed);
}

// Called by the host when both players are ready. Picks/resolves problems, creates game state.
export const start_game = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    if (ctx.sender.toHexString() !== room.host_identity.toHexString()) throw new SenderError('Only the host can start the game');
    if (!room.host_ready || !room.guest_ready) throw new SenderError('Not both ready');
    if (!room.guest_identity) throw new SenderError('No guest in room');
    if (room.status === 'in_game') return; // already started

    const rawSettings = JSON.parse(room.settings) as RoomSettingsV1;
    const starting_hp = Number(rawSettings.startingHp ?? rawSettings.starting_hp ?? 100);

    // ctx.timestamp varies per call — sufficient entropy for a club tool.
    const seed = room.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      + Number(ctx.timestamp.microsSinceUnixEpoch % 1_000_000n);

    const selected = resolveProblemsForStart(ctx, rawSettings, seed);

    startGameState(ctx, room.code, room.host_identity, room.guest_identity, selected, starting_hp);
    ctx.db.room.code.update({ ...room, status: 'in_game' });
  }
);

// Host can update settings while the room is still in 'waiting' state.
// Resets both ready flags so players must re-confirm the new settings.
export const update_room_settings = spacetimedb.reducer(
  { code: t.string(), settings: t.string() },
  (ctx, { code, settings }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) throw new SenderError('Room not found');
    if (ctx.sender.toHexString() !== room.host_identity.toHexString()) throw new SenderError('Only the host can update settings');
    if (room.status !== 'waiting') throw new SenderError('Cannot change settings after game has started');
    ctx.db.room.code.update({ ...room, settings, host_ready: false, guest_ready: false });
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

function endGame(ctx: DbCtx, game: GameStateRow, winnerIdentity: IdentityLike | undefined) {
  const loserIdentity = winnerIdentity === undefined
    ? undefined
    : (winnerIdentity.toHexString() === game.player1_identity.toHexString()
        ? game.player2_identity
        : game.player1_identity);

  // Mark game finished
  ctx.db.game_state.id.update({
    ...game,
    status: 'finished',
    winner_identity: winnerIdentity as (typeof game.player1_identity) | undefined,
  });

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
    winner_identity:     winnerIdentity as (typeof game.player1_identity) | undefined,
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

  // Hidden ELO calculation (K=20). Draws: both players get +0 ELO and a match counted.
  if (winnerIdentity === undefined || loserIdentity === undefined) {
    const p1 = ctx.db.user.identity.find(game.player1_identity);
    const p2 = ctx.db.user.identity.find(game.player2_identity);
    if (p1) ctx.db.user.identity.update({ ...p1, total_matches: p1.total_matches + 1, current_streak: 0 });
    if (p2) ctx.db.user.identity.update({ ...p2, total_matches: p2.total_matches + 1, current_streak: 0 });
    return;
  }
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

// Time-out resolution: callable by either participant once the 20-minute clock
// has elapsed. Winner is whoever has more solves; ties fall back to HP, and a
// true tie ends the game as a draw (winner_identity = undefined).
const MATCH_DURATION_SEC = 20 * 60;

export const expire_game = spacetimedb.reducer(
  { game_id: t.string() },
  (ctx, { game_id }) => {
    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') return;

    const isParticipant =
      game.player1_identity.toHexString() === ctx.sender.toHexString() ||
      game.player2_identity.toHexString() === ctx.sender.toHexString();
    if (!isParticipant) throw new SenderError('Not a participant in this game');

    const elapsedSec = Number((ctx.timestamp.microsSinceUnixEpoch - game.start_time.microsSinceUnixEpoch) / 1_000_000n);
    if (elapsedSec < MATCH_DURATION_SEC) return; // not yet expired — ignore

    const p1Solved = (JSON.parse(game.player1_solved_ids) as string[]).length;
    const p2Solved = (JSON.parse(game.player2_solved_ids) as string[]).length;

    let winner: IdentityLike | undefined;
    if (p1Solved > p2Solved)       winner = game.player1_identity;
    else if (p2Solved > p1Solved)  winner = game.player2_identity;
    else if (game.player1_hp > game.player2_hp) winner = game.player1_identity;
    else if (game.player2_hp > game.player1_hp) winner = game.player2_identity;
    else                           winner = undefined; // draw

    endGame(ctx, game, winner);
  }
);

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
    const baseDamage = Math.ceil(startingHp / problemCount);

    // Apply attacker's pending damage buffs and defender's pending shield,
    // then consume them.
    const attackerMultPct = isP1 ? game.player1_dmg_mult_pct : game.player2_dmg_mult_pct;
    const attackerFlat    = isP1 ? game.player1_dmg_bonus    : game.player2_dmg_bonus;
    const defenderShield  = isP1 ? game.player2_shield       : game.player1_shield;

    const boostedDamage = Math.floor(baseDamage * (100 + attackerMultPct) / 100) + attackerFlat;
    const damage = Math.max(0, boostedDamage - defenderShield);

    let updated = { ...game };
    if (isP1) {
      updated.player1_solved_ids = JSON.stringify(newSolvedIds);
      updated.player2_hp = Math.max(0, game.player2_hp - damage);
      updated.player1_dmg_mult_pct = 0;
      updated.player1_dmg_bonus    = 0;
      updated.player2_shield       = 0;
    } else {
      updated.player2_solved_ids = JSON.stringify(newSolvedIds);
      updated.player1_hp = Math.max(0, game.player1_hp - damage);
      updated.player2_dmg_mult_pct = 0;
      updated.player2_dmg_bonus    = 0;
      updated.player1_shield       = 0;
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
      // Bootstrap check: runs once at deploy time — infrequent, not a hot path.
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

    // Upsert: use game_id index to narrow search, then filter by player+problem+language.
    let found: DraftCodeRow | undefined;
    for (const row of ctx.db.draft_code.draft_code_game_id.filter(game_id)) {
      if (row.player_identity.toHexString() === senderHex &&
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
// Powerup catalog + quiz seeding (admin / bootstrap)
// ---------------------------------------------------------------------------

// Seed the powerup catalog. Safe to re-run: clears and re-inserts.
// Auth: admin OR no admin exists yet (bootstrap window).
export const seed_powerups = spacetimedb.reducer({}, (ctx) => {
  const caller = ctx.db.user.identity.find(ctx.sender);
  if (!caller?.is_admin) {
    // Bootstrap check: runs once at deploy time — infrequent, not a hot path.
    const adminExists = [...ctx.db.user.iter()].some(u => u.is_admin);
    if (adminExists) throw new SenderError('Unauthorized');
  }
  // Clear existing
  for (const p of [...ctx.db.powerup.iter()]) ctx.db.powerup.id.delete(p.id);

  const entries: Array<{ name: string; description: string; kind: string; target: string; cost: number; effect_data: string }> = [
    { name: 'Firestrike',   description: '+50% damage on your next solve',                    kind: 'damage',   target: 'self',     cost: 20, effect_data: '{"mult_pct":50}' },
    { name: 'Overload',     description: '+100% damage on your next solve',                    kind: 'damage',   target: 'self',     cost: 35, effect_data: '{"mult_pct":100}' },
    { name: 'Firewall',     description: 'Block 20 incoming damage',                           kind: 'defense',  target: 'self',     cost: 20, effect_data: '{"shield":20}' },
    { name: 'Shield Wall',  description: 'Block 40 incoming damage',                           kind: 'defense',  target: 'self',     cost: 35, effect_data: '{"shield":40}' },
    { name: 'Line Shredder', description: 'Delete a random line in opponent\'s editor',         kind: 'sabotage', target: 'opponent', cost: 15, effect_data: '{"type":"delete_line"}' },
    { name: 'Font Chaos',   description: 'Opponent\'s editor font size jumps for 5s',           kind: 'sabotage', target: 'opponent', cost: 10, effect_data: '{"type":"font_size_up","duration_ms":5000}' },
    { name: 'Fog',          description: 'Blur opponent\'s editor for 3s',                      kind: 'sabotage', target: 'opponent', cost: 15, effect_data: '{"type":"font_blur","duration_ms":3000}' },
    { name: 'Brain Freeze', description: 'Opponent\'s editor becomes read-only for 2s',         kind: 'sabotage', target: 'opponent', cost: 25, effect_data: '{"type":"cursor_freeze","duration_ms":2000}' },
  ];
  for (const e of entries) {
    ctx.db.powerup.insert({ id: 0n, name: e.name, description: e.description, kind: e.kind, target: e.target, cost: e.cost, effect_data: e.effect_data });
  }
});

// Seed ~20 quiz questions. Same auth as seed_powerups.
export const seed_quiz_questions = spacetimedb.reducer({}, (ctx) => {
  const caller = ctx.db.user.identity.find(ctx.sender);
  if (!caller?.is_admin) {
    // Bootstrap check: runs once at deploy time — infrequent, not a hot path.
    const adminExists = [...ctx.db.user.iter()].some(u => u.is_admin);
    if (adminExists) throw new SenderError('Unauthorized');
  }
  for (const q of [...ctx.db.quiz_question.iter()]) ctx.db.quiz_question.id.delete(q.id);

  type Q = { question_type: string; prompt: string; options: string; answer: string; explanation: string };
  const questions: Q[] = [
    // MCQ
    { question_type: 'mcq', prompt: 'Which data structure uses LIFO (last in, first out)?', options: '["Queue","Stack","Heap","Tree"]', answer: 'Stack', explanation: 'A Stack operates LIFO: the last item pushed is the first popped. A Queue is FIFO. Heaps and Trees are non-linear structures with different semantics.' },
    { question_type: 'mcq', prompt: 'Big-O of binary search on a sorted array?',              options: '["O(1)","O(log n)","O(n)","O(n log n)"]', answer: 'O(log n)', explanation: 'Binary search halves the search space at each step, giving O(log n) time. It requires the array to be sorted.' },
    { question_type: 'mcq', prompt: 'Which sort is NOT comparison-based?',                     options: '["Quicksort","Merge sort","Radix sort","Heapsort"]', answer: 'Radix sort', explanation: 'Radix sort distributes elements into buckets by digit/character — no element comparisons needed. Quicksort, Merge sort, and Heapsort all compare elements.' },
    { question_type: 'mcq', prompt: 'Average case complexity of hash table lookup?',           options: '["O(1)","O(log n)","O(n)","O(n^2)"]', answer: 'O(1)', explanation: 'A hash table computes the bucket index directly from the key, giving O(1) average-case lookup. Worst case (all collisions) is O(n).' },
    { question_type: 'mcq', prompt: 'Which traversal visits root, left, right?',               options: '["Pre-order","In-order","Post-order","Level-order"]', answer: 'Pre-order', explanation: 'Pre-order visits: root → left → right. In-order is left → root → right (gives sorted output for BST). Post-order is left → right → root.' },
    { question_type: 'mcq', prompt: 'Worst-case time of quicksort?',                           options: '["O(n)","O(n log n)","O(n^2)","O(2^n)"]', answer: 'O(n^2)', explanation: "Quicksort's worst case occurs when the pivot is always the min or max (e.g., a sorted array with a naive first-element pivot). Average case is O(n log n)." },
    { question_type: 'mcq', prompt: 'Which data structure best implements BFS?',               options: '["Stack","Queue","Heap","Set"]', answer: 'Queue', explanation: "BFS explores nodes level-by-level. A Queue's FIFO property ensures nodes are processed in the order they were discovered." },
    { question_type: 'mcq', prompt: 'What does DFS typically use?',                            options: '["Queue","Stack","Heap","Array"]', answer: 'Stack', explanation: 'DFS uses a Stack (or recursion, which uses the call stack implicitly). LIFO lets you backtrack to the previous path when you hit a dead end.' },

    // True/False
    { question_type: 'tf', prompt: 'A linked list supports O(1) random access.',              options: '[]', answer: 'false', explanation: 'A linked list requires traversing from the head to reach an element, giving O(n) access. Only arrays support O(1) random access by index.' },
    { question_type: 'tf', prompt: "A min-heap's root is the smallest element.",              options: '[]', answer: 'true',  explanation: 'By definition, every parent in a min-heap is ≤ its children, so the root is always the minimum element.' },
    { question_type: 'tf', prompt: "Dijkstra's algorithm works with negative edge weights.",  options: '[]', answer: 'false', explanation: "Dijkstra's requires non-negative edge weights. With negative weights it can give wrong answers. Use Bellman-Ford for graphs with negative edges." },
    { question_type: 'tf', prompt: 'Merge sort is a stable sort.',                            options: '[]', answer: 'true',  explanation: 'Merge sort preserves the relative order of equal elements during the merge step. Quicksort and Heapsort are generally not stable.' },
    { question_type: 'tf', prompt: 'Every binary tree is a binary search tree.',              options: '[]', answer: 'false', explanation: 'A BST requires left < node < right for all nodes. A plain binary tree only requires at most two children — no ordering constraint.' },
    { question_type: 'tf', prompt: 'Hash collisions can never be fully avoided.',             options: '[]', answer: 'true',  explanation: 'By the pigeonhole principle, if more keys exist than buckets, at least one collision must occur. Good hash functions minimize but cannot eliminate collisions.' },

    // Code fill-in — answer is the single token/value the user must type
    { question_type: 'code_fill', prompt: 'In Python, the method to add to the end of a list: my_list.___(x)', options: '[]', answer: 'append', explanation: 'list.append(x) adds x to the end in O(1) amortized time. It is the idiomatic way to build a list; list.insert(len(list), x) works too but is slower.' },
    { question_type: 'code_fill', prompt: 'In Java, keyword to declare a constant: ___ int MAX = 10;',           options: '[]', answer: 'final',  explanation: 'The final keyword in Java makes a variable a constant — it can only be assigned once. The C++ equivalent is const.' },
    { question_type: 'code_fill', prompt: 'In C++, STL container for a double-ended queue: std::___',             options: '[]', answer: 'deque',  explanation: 'std::deque (double-ended queue) supports O(1) push/pop at both ends. More flexible than std::queue but uses more memory than std::vector.' },
    { question_type: 'code_fill', prompt: 'In Python, the built-in for the length of a list:',                    options: '[]', answer: 'len',    explanation: 'len() is a Python built-in that returns the number of items in any sequence or collection: list, string, tuple, dict, set, etc.' },
    { question_type: 'code_fill', prompt: 'Big-O of searching an unsorted array of n elements (in the form O(?)) answer just the ?:', options: '[]', answer: 'n', explanation: 'Searching an unsorted array requires checking each element in the worst case, giving O(n). Sorting first would allow O(log n) binary search.' },
    { question_type: 'code_fill', prompt: 'The data structure with FIFO ordering:',                              options: '[]', answer: 'queue',  explanation: 'A queue enforces FIFO: the first element added is the first removed. It is used in BFS, task scheduling, and stream buffering.' },

    // Additional 50 MCQ
    { question_type: 'mcq', prompt: 'In insertion sort, best-case time complexity is?', options: '["O(n)","O(n log n)","O(n^2)","O(2^n)"]', answer: 'O(n)', explanation: 'When the array is already sorted, insertion sort only needs to compare each element once, making a single pass through the array: O(n).' },
    { question_type: 'mcq', prompt: 'What is the time to access an element by key in a well-formed hash table?', options: '["O(log n)","O(1) average","O(n) worst","O(n log n)"]', answer: 'O(1) average', explanation: 'Hash tables provide O(1) average-case access if the hash function distributes keys evenly. Worst case is O(n) if all keys hash to the same bucket.' },
    { question_type: 'mcq', prompt: 'Which approach is used to resolve hash collisions via chaining?', options: '["Open addressing","Linked lists","Separate chaining","Cuckoo hashing"]', answer: 'Linked lists', explanation: 'Chaining resolves collisions by storing colliding keys in a linked list at each bucket. Open addressing tries to find another empty slot.' },
    { question_type: 'mcq', prompt: 'In a balanced binary search tree, max height for n nodes is?', options: '["n","log n","n^2","sqrt(n)"]', answer: 'log n', explanation: 'A balanced BST (like AVL or Red-Black tree) maintains height O(log n) for n nodes, enabling O(log n) search, insert, and delete.' },
    { question_type: 'mcq', prompt: 'Which sorting algorithm is NOT stable?', options: '["Bubble sort","Insertion sort","Quicksort","Merge sort"]', answer: 'Quicksort', explanation: 'Quicksort and Heapsort are generally unstable (equal elements may change order). Bubble, insertion, and merge sorts are stable.' },
    { question_type: 'mcq', prompt: 'What is the space complexity of merge sort?', options: '["O(1)","O(log n)","O(n)","O(n log n)"]', answer: 'O(n)', explanation: 'Merge sort uses O(n) auxiliary space for the temporary arrays during the merge step, even though the algorithm runs in O(n log n) time.' },
    { question_type: 'mcq', prompt: 'A graph is acyclic if and only if?', options: '["It is directed","It has a topological sort","It is a tree","It is complete"]', answer: 'It has a topological sort', explanation: 'A DAG (Directed Acyclic Graph) admits a topological ordering — a linear ordering of vertices such that every edge goes left → right.' },
    { question_type: 'mcq', prompt: 'Depth-first search uses which data structure?', options: '["Queue","Stack","Priority queue","Deque"]', answer: 'Stack', explanation: 'DFS uses a stack (or recursion, which is the call stack) to explore as far as possible along each branch before backtracking.' },
    { question_type: 'mcq', prompt: 'What does Bellman-Ford solve that Dijkstra cannot?', options: '["Shortest path on directed graphs","Shortest path with negative weights","Shortest path on undirected graphs","Minimum spanning tree"]', answer: 'Shortest path with negative weights', explanation: 'Bellman-Ford handles negative edge weights (but not negative cycles). Dijkstra requires non-negative weights.' },
    { question_type: 'mcq', prompt: 'In a min-heap, inserting a new element takes O(?) time?', options: '["O(1)","O(log n)","O(n)","O(n log n)"]', answer: 'O(log n)', explanation: 'Insert a new element at the end and bubble-up: at most log(n) swaps needed. Extracting the min also takes O(log n) due to bubble-down.' },
    { question_type: 'mcq', prompt: 'Which of these is an example of a greedy algorithm?', options: '["Dijkstra\'s shortest path","Merge sort","Quicksort","Dynamic programming"]', answer: 'Dijkstra\'s shortest path', explanation: 'Dijkstra\'s greedily selects the nearest unvisited node. DP and recursive algorithms make optimal subproblem decisions; greedy makes one-off local choices.' },
    { question_type: 'mcq', prompt: 'A strongly connected component (SCC) of a directed graph is?', options: '["A connected subgraph","A subgraph where every node reaches every other","A tree","A bipartite subgraph"]', answer: 'A subgraph where every node reaches every other', explanation: 'An SCC is a maximal set of vertices where every vertex can reach every other. Finding SCCs is done via Kosaraju\'s or Tarjan\'s algorithm.' },
    { question_type: 'mcq', prompt: 'Which statement about a complete binary tree is true?', options: '["All leaves are at the same level","All levels are completely filled except possibly the last","Every node has a right sibling","It is always a BST"]', answer: 'All levels are completely filled except possibly the last', explanation: 'A complete binary tree fills all levels except possibly the last, where nodes are left-justified. A perfect tree is completely filled at all levels.' },
    { question_type: 'mcq', prompt: 'Hashing a key to find its bucket in a hash table is O(?) on average?', options: '["O(1)","O(log n)","O(n)","O(n^2)"]', answer: 'O(1)', explanation: 'A good hash function computes the bucket index in O(1) time. The subsequent probe (chain traversal or open addressing) depends on collision handling.' },
    { question_type: 'mcq', prompt: 'What is in-order traversal of a BST?', options: '["Depth-first left-first","Left → Node → Right, yielding sorted order","Right → Node → Left","Breadth-first level-by-level"]', answer: 'Left → Node → Right, yielding sorted order', explanation: 'In-order traversal of a BST visits nodes in ascending order: process left subtree, then node, then right subtree.' },
    { question_type: 'mcq', prompt: 'Which sorting algorithm has best-case O(n) but worst-case O(n^2)?', options: '["Bubble sort","Selection sort","Quicksort","Merge sort"]', answer: 'Quicksort', explanation: 'Quicksort\'s best and average cases are O(n log n), but worst case (pivot always smallest/largest) is O(n^2). Bubble sort is O(n) best, O(n^2) worst.' },
    { question_type: 'mcq', prompt: 'The trie data structure is optimal for?', options: '["Storing integers","Prefix search and autocomplete","Sorting strings","Finding shortest path"]', answer: 'Prefix search and autocomplete', explanation: 'A trie stores strings with shared prefixes efficiently. Prefix search, autocomplete, and spell checking are ideal uses.' },
    { question_type: 'mcq', prompt: 'A segment tree is useful for?', options: '["Range minimum/sum queries","Sorting","Graph traversal","Compression"]', answer: 'Range minimum/sum queries', explanation: 'Segment trees enable O(log n) range queries and updates (e.g., "sum of elements [i..j]") on arrays.' },
    { question_type: 'mcq', prompt: 'What is union-find (disjoint set union) used for?', options: '["Sorting items","Detecting cycles in graphs and connectivity queries","Balancing trees","String matching"]', answer: 'Detecting cycles in graphs and connectivity queries', explanation: 'Union-Find with path compression and union by rank provides near-O(1) operations for connectivity and cycle detection in Kruskal\'s algorithm.' },
    { question_type: 'mcq', prompt: 'In the longest increasing subsequence (LIS) problem, DP approach is O(?) time with O(?) space?', options: '["O(n) time, O(n) space","O(n log n) time, O(n) space","O(n^2) time, O(n) space","O(2^n) time, O(n) space"]', answer: 'O(n^2) time, O(n) space', explanation: 'Classic DP LIS is O(n^2) time, O(n) space. Using binary search on the smallest tail can optimize to O(n log n) time.' },
    { question_type: 'mcq', prompt: 'Kruskal\'s MST algorithm sorts edges by weight and uses which data structure?', options: '["Priority queue","Union-Find","Stack","Hash map"]', answer: 'Union-Find', explanation: 'Kruskal sorts edges by weight, then iterates: if two vertices are unconnected, union them and add the edge to the MST.' },
    { question_type: 'mcq', prompt: 'A topological sort of a DAG can be computed via?', options: '["DFS post-order","BFS level-order","Quicksort","Merge sort"]', answer: 'DFS post-order', explanation: 'DFS post-order (finishing times in reverse) gives a topological sort. Kahn\'s algorithm (BFS-based, using in-degree) also works.' },
    { question_type: 'mcq', prompt: 'The knapsack problem (0/1) can be solved optimally via?', options: '["Greedy algorithm","Recursion with memoization (DP)","Quicksort","BFS"]', answer: 'Recursion with memoization (DP)', explanation: '0/1 knapsack has optimal substructure: DP table[i][w] = max value using first i items with capacity w.' },
    { question_type: 'mcq', prompt: 'What is the recurrence for the number of permutations of n items?', options: '["P(n) = n * P(n-1)","P(n) = 2 * P(n-1)","P(n) = P(n-1) + P(n-2)","P(n) = C(n,2)"]', answer: 'P(n) = n * P(n-1)', explanation: 'n! = n × (n-1)!. For example, 5! = 5 × 4! = 5 × 24 = 120.' },
    { question_type: 'mcq', prompt: 'What is the recurrence for combinations C(n,k)?', options: '["C(n,k) = C(n-1,k-1) + C(n-1,k)","C(n,k) = C(n-1,k-1)","C(n,k) = n * C(n-1,k)","C(n,k) = C(n,k-1) * n"]', answer: 'C(n,k) = C(n-1,k-1) + C(n-1,k)', explanation: 'Pascal\'s identity: choose n,k is the sum of (choose n-1,k-1) + (choose n-1,k). This forms Pascal\'s triangle.' },
    { question_type: 'mcq', prompt: 'The Catalan number C(n) counts?', options: '["Permutations","Valid parentheses strings of length 2n","Binary trees with n nodes","Prime numbers up to n"]', answer: 'Valid parentheses strings of length 2n', explanation: 'C(n) = (2n)! / ((n+1)! n!). C(n) counts balanced parentheses, BST shapes, etc. C(0)=1, C(1)=1, C(2)=2, C(3)=5.' },
    { question_type: 'mcq', prompt: 'In bitwise operations, XOR has what property?', options: '["a XOR a = 1","a XOR a = 0","a XOR b = b XOR a","a XOR 0 = 1"]', answer: 'a XOR a = 0', explanation: 'XOR is commutative (a XOR b = b XOR a). a XOR a = 0 (self-cancellation). a XOR 0 = a (identity). These make XOR useful for finding single numbers in arrays.' },
    { question_type: 'mcq', prompt: 'The prefix sum technique computes?', options: '["Prime numbers","Cumulative sums in O(n) preprocessing for O(1) range sum queries","Factorials","Fibonacci numbers"]', answer: 'Cumulative sums in O(n) preprocessing for O(1) range sum queries', explanation: 'Precompute prefix[i] = sum(arr[0..i]). Then sum(arr[l..r]) = prefix[r] - prefix[l-1] in O(1).' },
    { question_type: 'mcq', prompt: 'Euler\'s theorem for paths: a connected graph has an Eulerian path iff it has?', options: '["All vertices of even degree","Exactly 0 or 2 vertices of odd degree","A Hamiltonian cycle","All vertices of odd degree"]', answer: 'Exactly 0 or 2 vertices of odd degree', explanation: 'Eulerian path (uses every edge exactly once): 0 odd-degree vertices (Eulerian circuit) or exactly 2 (Eulerian path between them).' },
    { question_type: 'mcq', prompt: 'A Hamiltonian path visits?', options: '["Every edge exactly once","Every vertex exactly once","Every vertex at least once","Some vertices multiple times"]', answer: 'Every vertex exactly once', explanation: 'Hamiltonian path ≠ Eulerian path. Finding Hamiltonian paths is NP-complete. Eulerian paths are about edges.' },
    { question_type: 'mcq', prompt: 'The Chinese Remainder Theorem is useful for??', options: '["Sorting arrays","Solving modular equations","Graph coloring","Encryption only"]', answer: 'Solving modular equations', explanation: 'CRT solves systems of congruences: find x such that x ≡ a₁ (mod m₁), x ≡ a₂ (mod m₂), etc., given coprime moduli.' },
    { question_type: 'mcq', prompt: 'What is a fenwick tree (binary indexed tree) optimized for?', options: '["Sorting large arrays","Prefix sums and range queries in O(log n)","DFS traversal","Topological sorting"]', answer: 'Prefix sums and range queries in O(log n)', explanation: 'Fenwick trees enable O(log n) point updates and prefix sum queries using a clever binary indexing scheme.' },
    { question_type: 'mcq', prompt: 'In convex hull algorithms, which is a classic approach?', options: '["Quicksort","Graham\'s scan (counterclockwise sort)","DFS","BFS"]', answer: 'Graham\'s scan (counterclockwise sort)', explanation: 'Graham\'s scan sorts points by polar angle, then uses a stack to maintain the hull. Andrew\'s algorithm (monotone chain) is another classic approach.' },
    { question_type: 'mcq', prompt: 'The suffix array of a string enables??', options: '["Sorting the string","Pattern matching and LCP (longest common prefix) queries in O(log n)","Graph traversal","Compression only"]', answer: 'Pattern matching and LCP (longest common prefix) queries in O(log n)', explanation: 'A suffix array sorts all suffixes lexicographically. With an LCP array, it supports efficient substring queries.' },
    { question_type: 'mcq', prompt: 'In the stable roommate problem, a solution always exists if??', options: '["All preferences are symmetric","The rotation condition is satisfied","Preferences are acyclic","There is an even number of people"]', answer: 'The rotation condition is satisfied', explanation: 'Unlike stable matching (marriage) which always has a solution, stable roommate is NP-hard; a stable assignment may not exist.' },
    { question_type: 'mcq', prompt: 'Morris inorder traversal of a BST avoids recursion and stack via??', options: '["Pointers to parent nodes","Threaded binary trees (temporal pointers)","XOR linking","Hash maps"]', answer: 'Threaded binary trees (temporal pointers)', explanation: 'Morris traversal uses "threads" (extra pointers) to link nodes. Setup is O(1) space but more code-heavy.' },
    { question_type: 'mcq', prompt: 'The Ackermann function is known for??', options: '["Sorting","Growing faster than any primitive recursive function","Path compression","Hashing"]', answer: 'Growing faster than any primitive recursive function', explanation: 'Ackermann(m,n) grows extraordinarily fast, used to show limits of primitive recursion. A(4,4) is incomprehensibly large.' },
    { question_type: 'mcq', prompt: 'A skip list is a probabilistic data structure for??', options: '["Sorting","O(log n) search/insert/delete without tree balancing","Hashing","Compression"]', answer: 'O(log n) search/insert/delete without tree balancing', explanation: 'Skip lists use multiple levels of linked lists with random promotion. Easier to code than AVL but same O(log n) expected time.' },
    { question_type: 'mcq', prompt: 'The Rabin-Karp algorithm for string matching uses??', options: '["Suffix arrays","Rolling hash to enable O(n+m) search with O(1) hash comparisons","KMP failure function","Trie structure"]', answer: 'Rolling hash to enable O(n+m) search with O(1) hash comparisons', explanation: 'Rabin-Karp updates a polynomial hash in O(1) as the window slides, enabling fast pattern matching with low constant factors.' },
    { question_type: 'mcq', prompt: 'The KMP (Knuth-Morris-Pratt) string matching algorithm builds??', options: '["Suffix array","Failure function (pi array) in O(m) to skip redundant comparisons","Trie","Hash map"]', answer: 'Failure function (pi array) in O(m) to skip redundant comparisons', explanation: 'KMP precomputes a failure function that tells how far to backtrack on a mismatch, enabling O(n+m) search.' },
    { question_type: 'mcq', prompt: 'Suffix trees can be constructed in O(?) time using Ukkonen\'s algorithm?', options: '["O(n^2)","O(n log n)","O(n)","O(n^3)"]', answer: 'O(n)', explanation: 'Ukkonen\'s algorithm builds a suffix tree in linear time using active point techniques and suffix links.' },
    { question_type: 'mcq', prompt: 'A bipartite graph is one where??', options: '["All vertices have the same degree","Vertices can be 2-colored (2 independent sets with edges only between them)","It has an Eulerian path","All edges have weight 2"]', answer: 'Vertices can be 2-colored (2 independent sets with edges only between them)', explanation: 'A graph is bipartite iff it is 2-colorable iff it contains no odd-length cycles. Perfect matching in bipartite graphs can be found via Hungarian algorithm.' },
    { question_type: 'mcq', prompt: 'A planar graph satisfies Euler\'s formula??', options: '["V - E + F = 1","V - E + F = 2","V + E + F = 2","V - E - F = 0"]', answer: 'V - E + F = 2', explanation: 'For a connected planar graph: V (vertices) - E (edges) + F (faces, including outer face) = 2. Helps prove planarity bounds.' },
    { question_type: 'mcq', prompt: 'The maximum flow problem can be solved by??', options: '["Topological sort","Ford-Fulkerson (or Dinic\'s, Push-Relabel) in polynomial time","DFS only","Greedy algorithm"]', answer: 'Ford-Fulkerson (or Dinic\'s, Push-Relabel) in polynomial time', explanation: 'Ford-Fulkerson augments along paths until no more flow fits. Dinic and Push-Relabel are faster variants.' },
    { question_type: 'mcq', prompt: 'In the assignment problem, the Hungarian algorithm solves for??', options: '["Minimum cost perfect matching in a bipartite graph","Graph diameter","Longest path","Cycle detection"]', answer: 'Minimum cost perfect matching in a bipartite graph', explanation: 'Hungarian algorithm finds the optimal assignment of n workers to n jobs to minimize total cost in O(n^3).' },
    { question_type: 'mcq', prompt: 'A vertex cover of a graph is??', options: '["A set of vertices covering all edges (every edge has at least one endpoint)","A path visiting all vertices","An independent set","A spanning tree"]', answer: 'A set of vertices covering all edges (every edge has at least one endpoint)', explanation: 'Vertex cover is NP-hard in general graphs. In bipartite graphs, König\'s theorem relates it to maximum matching.' },
    { question_type: 'mcq', prompt: 'The independent set problem seeks??', options: '["Edges with no shared vertices","A maximum set of vertices with no edges between them","A minimum spanning tree","A topological ordering"]', answer: 'A maximum set of vertices with no edges between them', explanation: 'Maximum independent set is NP-hard. In bipartite graphs, it equals |V| - (max matching size).' },

    // Additional 25 True/False
    { question_type: 'tf', prompt: 'Breadth-first search guarantees the shortest path in unweighted graphs.', options: '[]', answer: 'true', explanation: 'BFS explores by levels, so it finds the minimum number of edges to reach each node. In weighted graphs, use Dijkstra.' },
    { question_type: 'tf', prompt: 'A red-black tree can have any color as the root.', options: '[]', answer: 'false', explanation: 'Red-black trees enforce strict color rules: root must be BLACK, and no red node can have a red child.' },
    { question_type: 'tf', prompt: 'An AVL tree rebalances after every insertion.', options: '[]', answer: 'true', explanation: 'AVL trees maintain balance factor ≤ 1 at all nodes. After insert/delete, rotations are performed to restore balance.' },
    { question_type: 'tf', prompt: 'Prim\'s algorithm for MST requires a connected graph.', options: '[]', answer: 'true', explanation: 'Prim grows a single tree. Kruskal works on forests. For disconnected graphs, apply MST algorithm to each component.' },
    { question_type: 'tf', prompt: 'A complete graph on n vertices has n(n-1)/2 edges.', options: '[]', answer: 'true', explanation: 'In a complete undirected graph K_n, every pair of vertices is connected: C(n,2) = n(n-1)/2 edges.' },
    { question_type: 'tf', prompt: 'Breadth-first search is optimal for finding shortest paths in weighted graphs.', options: '[]', answer: 'false', explanation: 'BFS only guarantees shortest paths (by edge count) in unweighted graphs. For weighted graphs, use Dijkstra or Bellman-Ford.' },
    { question_type: 'tf', prompt: 'A self-loop contributes 2 to the degree of a vertex in an undirected graph.', options: '[]', answer: 'true', explanation: 'By convention, a self-loop (vertex to itself) counts as 2 toward the vertex\'s degree in undirected graphs.' },
    { question_type: 'tf', prompt: 'The time complexity of heap sort is O(n log n) in all cases.', options: '[]', answer: 'true', explanation: 'Heapsort builds a heap in O(n), then extracts min n times in O(log n) per extraction. Always O(n log n).' },
    { question_type: 'tf', prompt: 'Linear search on a sorted array can be faster than binary search.', options: '[]', answer: 'false', explanation: 'Linear search is O(n), binary search is O(log n). Binary search is always ≤ linear for sorted arrays of n > 1 element.' },
    { question_type: 'tf', prompt: 'The traveling salesman problem (TSP) can be solved optimally in polynomial time.', options: '[]', answer: 'false', explanation: 'TSP is NP-hard. No known polynomial-time exact algorithm exists unless P=NP. Approximations and heuristics (2-opt, LKH) are used.' },
    { question_type: 'tf', prompt: 'A minimum spanning tree is unique for any graph.', options: '[]', answer: 'false', explanation: 'If edge weights are not all distinct, multiple MSTs can exist with the same total weight.' },
    { question_type: 'tf', prompt: 'The longest common subsequence (LCS) problem can be solved in O(n*m) time via DP.', options: '[]', answer: 'true', explanation: 'DP table[i][j] = LCS length of first i chars of string1 and first j chars of string2. O(n*m) time and space.' },
    { question_type: 'tf', prompt: 'Bubble sort is stable and requires O(n) space.', options: '[]', answer: 'false', explanation: 'Bubble sort IS stable but requires O(1) space (in-place). The statement is half-right.' },
    { question_type: 'tf', prompt: 'Every tree with n vertices has exactly n-1 edges.', options: '[]', answer: 'true', explanation: 'By definition, a tree is a connected acyclic graph. n vertices ⟹ exactly n-1 edges.' },
    { question_type: 'tf', prompt: 'A directed acyclic graph (DAG) always has at least one source vertex (in-degree 0).', options: '[]', answer: 'true', explanation: 'In a DAG with no cycles, there must exist at least one vertex with no incoming edges (else a cycle forms).' },
    { question_type: 'tf', prompt: 'The edit distance between two identical strings is 0.', options: '[]', answer: 'true', explanation: 'Edit distance (Levenshtein distance) between identical strings is 0 — no operations needed.' },
    { question_type: 'tf', prompt: 'A suffix array requires more space than a suffix tree.', options: '[]', answer: 'true', explanation: 'Suffix array is O(n) space; suffix tree is typically O(n) for alphabet size σ but often larger constants in practice.' },
    { question_type: 'tf', prompt: 'The harmonic series 1 + 1/2 + 1/3 + ... + 1/n sums to approximately log(n).', options: '[]', answer: 'true', explanation: 'The harmonic series H_n ≈ ln(n) + γ (Euler-Mascheroni constant ≈ 0.577), so O(log n).' },
    { question_type: 'tf', prompt: 'Counting sort runs in O(n+k) time where n is array size and k is max value.', options: '[]', answer: 'true', explanation: 'Counting sort iterates n items and k buckets: O(n+k). It is linear and not comparison-based.' },
    { question_type: 'tf', prompt: 'The pigeonhole principle guarantees that n+1 items placed in n bins has at least one bin with ≥2 items.', options: '[]', answer: 'true', explanation: 'If n+1 items → n bins, by pigeonhole at least one bin must have ≥ (n+1)/n = 2 items (at n+1).' },
    { question_type: 'tf', prompt: 'Time complexity O(n^2) is better than O(2^n).', options: '[]', answer: 'true', explanation: 'For large n, O(2^n) grows exponentially while O(n^2) grows polynomially. 2^n will always exceed n^2 eventually.' },
    { question_type: 'tf', prompt: 'The space complexity of quicksort is O(log n) due to the recursion stack depth.', options: '[]', answer: 'true', explanation: 'Quicksort\'s recursion depth is typically O(log n) for balanced pivots (or worst O(n) for bad pivots), affecting stack space.' },
    { question_type: 'tf', prompt: 'Two graphs are isomorphic if they have the same number of vertices and edges.', options: '[]', answer: 'false', explanation: 'Graph isomorphism requires the same structure (vertex and edge correspondence), not just counts. Two non-isomorphic graphs can have the same counts.' },
    { question_type: 'tf', prompt: 'A queue is an appropriate choice for implementing DFS.', options: '[]', answer: 'false', explanation: 'DFS uses a stack (LIFO) to explore deeply. A queue (FIFO) implements BFS instead.' },

    // Additional 25 Code-fill
    { question_type: 'code_fill', prompt: 'In Python, to sort a list in-place in descending order: my_list.sort(reverse=___)', options: '[]', answer: 'True', explanation: 'list.sort(reverse=True) sorts in descending order. list.sort(key=...) can also specify a custom sort key.' },
    { question_type: 'code_fill', prompt: 'In Java, the class for dynamic arrays: java.util.___', options: '[]', answer: 'ArrayList', explanation: 'ArrayList<T> is the standard resizable array class in Java. It supports O(1) amortized append.' },
    { question_type: 'code_fill', prompt: 'In C++, the STL set is implemented as a _____ tree for O(log n) operations.', options: '[]', answer: 'balanced', explanation: 'std::set is typically a Red-Black tree, providing O(log n) insert/search/delete. Order is maintained.' },
    { question_type: 'code_fill', prompt: 'Big-O of inserting at the end of a Python list (answer just the expression e.g. "log n")', options: '[]', answer: '1', explanation: 'list.append() is O(1) amortized due to dynamic resizing. Inserting at the beginning is O(n).' },
    { question_type: 'code_fill', prompt: 'Big-O of binary search on a sorted array (answer as "log n" or similar):', options: '[]', answer: 'log n', explanation: 'Binary search halves the search space at each step: O(log n). Requires a sorted array.' },
    { question_type: 'code_fill', prompt: 'In Python, method to remove and return the last element: my_list.___() ', options: '[]', answer: 'pop', explanation: 'list.pop() removes and returns the last element in O(1). list.pop(0) removes the first in O(n).' },
    { question_type: 'code_fill', prompt: 'In Java, method to get the size of a HashMap: map.___() ', options: '[]', answer: 'size', explanation: 'map.size() returns the number of key-value pairs. HashMap.containsKey(key) checks membership.' },
    { question_type: 'code_fill', prompt: 'In C++, to create a vector of integers initialized with size 10: vector<int> v(___);', options: '[]', answer: '10', explanation: 'vector<int> v(10) creates a vector of 10 default-initialized integers (all 0). v = {1,2,3} initializes with values.' },
    { question_type: 'code_fill', prompt: 'The data structure that implements a priority queue in many libraries: _____ ', options: '[]', answer: 'heap', explanation: 'Priority queues are typically implemented as heaps (binary, min-heap, or max-heap) for O(log n) insert/extract.' },
    { question_type: 'code_fill', prompt: 'In Python, the method to insert at a specific index: my_list.___(index, item)', options: '[]', answer: 'insert', explanation: 'list.insert(i, x) inserts x at position i, shifting later elements. O(n) in the worst case.' },
    { question_type: 'code_fill', prompt: 'In C++, the function to reverse a range: std::_____', options: '[]', answer: 'reverse', explanation: 'std::reverse(first, last) reverses the elements in-place. Complexity O(n) for a range of n elements.' },
    { question_type: 'code_fill', prompt: 'Big-O of removing the first element from a linked list (answer as "1" or "n"):', options: '[]', answer: '1', explanation: 'Removing the first node of a linked list is O(1) (update head pointer). Removing from the middle is O(n) if you need to find it.' },
    { question_type: 'code_fill', prompt: 'In Java, the method to check if a Collection contains an element: c.___(element)', options: '[]', answer: 'contains', explanation: 'collection.contains(element) returns true if the element is present. Complexity depends on the collection type.' },
    { question_type: 'code_fill', prompt: 'In Python, to create a set from a list: s = ___(my_list)', options: '[]', answer: 'set', explanation: 'set(list) converts a list to a set, removing duplicates. set() creates an empty set; {} creates a dict.' },
    { question_type: 'code_fill', prompt: 'The maximum branching factor in a binary tree: ___ children per node', options: '[]', answer: '2', explanation: 'By definition, a binary tree has at most 2 children per node. n-ary trees generalize to n children.' },
    { question_type: 'code_fill', prompt: 'In C++, the unordered_map uses which method for hashing: _____ ', options: '[]', answer: 'hash', explanation: 'unordered_map uses a hash table with std::hash<Key> functor. O(1) average, O(n) worst case.' },
    { question_type: 'code_fill', prompt: 'In Python, the method to return keys of a dictionary: d.___() ', options: '[]', answer: 'keys', explanation: 'dict.keys() returns a view of the keys. dict.values() returns values; dict.items() returns (key, value) tuples.' },
    { question_type: 'code_fill', prompt: 'Big-O of finding an element in a binary search tree (balanced case):', options: '[]', answer: 'log n', explanation: 'In a balanced BST, search is O(log n). Worst case (linear chain) is O(n).' },
    { question_type: 'code_fill', prompt: 'In Java, to convert an int to a String: String s = String.___(num);', options: '[]', answer: 'valueOf', explanation: 'String.valueOf(num) converts primitive types to String. Integer.toString(num) also works.' },
    { question_type: 'code_fill', prompt: 'In C++, the algorithm to find the maximum element: std::_____', options: '[]', answer: 'max_element', explanation: 'std::max_element(first, last) returns an iterator to the largest element in the range [first, last).' },
    { question_type: 'code_fill', prompt: 'The amortized time complexity of appending n items to a dynamic array: O(?) ', options: '[]', answer: 'n', explanation: 'n append operations on a dynamic array cost O(n) amortized (some resize costs are spread across operations).' },
    { question_type: 'code_fill', prompt: 'In Python, method to get the maximum of a list: max(___) ', options: '[]', answer: 'my_list', explanation: 'max(iterable) returns the largest item. min(iterable) returns the smallest. Works on lists, tuples, sets, etc.' },
    { question_type: 'code_fill', prompt: 'In Java, the interface for a key-value store: java.util.___', options: '[]', answer: 'Map', explanation: 'Map<K,V> is the interface. HashMap, TreeMap, LinkedHashMap are common implementations.' },
    { question_type: 'code_fill', prompt: 'The compound operation in linked lists: insert at front is ___ but insert at end (no tail pointer) is ___ ', options: '[]', answer: '1 O(n)', explanation: 'Insert at front (head) is O(1). Insert at end without a tail pointer requires traversing the list: O(n).' },
  ];
  for (const q of questions) {
    ctx.db.quiz_question.insert({ id: 0n, question_type: q.question_type, prompt: q.prompt, options: q.options, answer: q.answer, explanation: q.explanation });
  }
});

const QUIZ_QUESTION_ARGS = {
  question_type: t.string(),   // "mcq" | "tf" | "code_fill"
  prompt:        t.string(),
  options:       t.string(),   // JSON array string; "[]" for non-MCQ
  answer:        t.string(),
  explanation:   t.string(),
};

const MAX_QUIZ_PROMPT_BYTES      = 1000;
const MAX_QUIZ_OPTIONS_BYTES     = 1000;
const MAX_QUIZ_ANSWER_FIELD_BYTES = 500;
const MAX_QUIZ_EXPLANATION_BYTES = 1500;

function validateQuizQuestion(args: {
  question_type: string; prompt: string; options: string; answer: string; explanation: string;
}) {
  if (args.question_type !== 'mcq' && args.question_type !== 'tf' && args.question_type !== 'code_fill') {
    throw new SenderError('question_type must be "mcq", "tf", or "code_fill"');
  }
  if (!args.prompt.trim())  throw new SenderError('prompt is required');
  if (!args.answer.trim())  throw new SenderError('answer is required');
  if (args.prompt.length      > MAX_QUIZ_PROMPT_BYTES)       throw new SenderError('prompt too long');
  if (args.options.length     > MAX_QUIZ_OPTIONS_BYTES)      throw new SenderError('options too long');
  if (args.answer.length      > MAX_QUIZ_ANSWER_FIELD_BYTES) throw new SenderError('answer too long');
  if (args.explanation.length > MAX_QUIZ_EXPLANATION_BYTES)  throw new SenderError('explanation too long');
  if (args.question_type === 'mcq') {
    try {
      const opts = JSON.parse(args.options);
      if (!Array.isArray(opts) || opts.length < 2) throw new Error('need array of ≥2 options');
      if (!opts.includes(args.answer)) throw new SenderError('answer must be one of the options');
    } catch (e) {
      if (e instanceof SenderError) throw e;
      throw new SenderError('options must be a JSON array of strings for MCQ');
    }
  }
}

// Create a new quiz question — admin only.
export const insert_quiz_question = spacetimedb.reducer(QUIZ_QUESTION_ARGS, (ctx, args) => {
  const caller = ctx.db.user.identity.find(ctx.sender);
  if (!caller?.is_admin) throw new SenderError('Unauthorized');
  validateQuizQuestion(args);
  ctx.db.quiz_question.insert({
    id:            0n,
    question_type: args.question_type,
    prompt:        args.prompt,
    options:       args.options,
    answer:        args.answer,
    explanation:   args.explanation,
  });
});

// Update an existing quiz question — admin only.
export const update_quiz_question = spacetimedb.reducer(
  { id: t.u64(), ...QUIZ_QUESTION_ARGS },
  (ctx, { id, ...args }) => {
    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new SenderError('Unauthorized');
    const q = ctx.db.quiz_question.id.find(id);
    if (!q) throw new SenderError('Question not found');
    validateQuizQuestion(args);
    ctx.db.quiz_question.id.update({ ...q, ...args });
  }
);

// Delete a quiz question — admin only.
export const delete_quiz_question = spacetimedb.reducer(
  { id: t.u64() },
  (ctx, { id }) => {
    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new SenderError('Unauthorized');
    const q = ctx.db.quiz_question.id.find(id);
    if (!q) throw new SenderError('Question not found');
    ctx.db.quiz_question.id.delete(id);
  }
);

// ---------------------------------------------------------------------------
// Quiz mini-game
// ---------------------------------------------------------------------------

const QUIZ_COOLDOWN_SEC = 30;
const QUIZ_REWARD = 10;
const MAX_QUIZ_ANSWER_BYTES = 200;

export const answer_quiz = spacetimedb.reducer(
  { game_id: t.string(), question_id: t.u64(), answer: t.string() },
  (ctx, { game_id, question_id, answer }) => {
    if (answer.length > MAX_QUIZ_ANSWER_BYTES) throw new SenderError('Answer too large');

    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') throw new SenderError('Game not in progress');

    const isP1 = game.player1_identity.toHexString() === ctx.sender.toHexString();
    const isP2 = game.player2_identity.toHexString() === ctx.sender.toHexString();
    if (!isP1 && !isP2) throw new SenderError('Not a participant in this game');

    const lastAt = isP1 ? game.player1_last_quiz_at : game.player2_last_quiz_at;
    const elapsedSec = Number((ctx.timestamp.microsSinceUnixEpoch - lastAt.microsSinceUnixEpoch) / 1_000_000n);
    if (elapsedSec < QUIZ_COOLDOWN_SEC) throw new SenderError(`Quiz cooling down (${QUIZ_COOLDOWN_SEC - elapsedSec}s)`);

    const q = ctx.db.quiz_question.id.find(question_id);
    if (!q) throw new SenderError('Question not found');

    const correct = q.answer.trim().toLowerCase() === answer.trim().toLowerCase();
    const updated = { ...game };
    if (isP1) {
      updated.player1_last_quiz_at = ctx.timestamp;
      if (correct) updated.player1_quiz_bonus = game.player1_quiz_bonus + QUIZ_REWARD;
    } else {
      updated.player2_last_quiz_at = ctx.timestamp;
      if (correct) updated.player2_quiz_bonus = game.player2_quiz_bonus + QUIZ_REWARD;
    }
    ctx.db.game_state.id.update(updated);
  }
);

// ---------------------------------------------------------------------------
// Powerup loadout preferences
// ---------------------------------------------------------------------------

export const set_loadout_pref = spacetimedb.reducer(
  { powerup_ids: t.string() },
  (ctx, { powerup_ids }) => {
    // Validate JSON array of id strings
    let ids: string[];
    try {
      ids = JSON.parse(powerup_ids);
    } catch {
      throw new SenderError('powerup_ids must be a JSON array');
    }
    if (!Array.isArray(ids)) throw new SenderError('powerup_ids must be a JSON array');
    if (ids.length > 8) throw new SenderError('Loadout too large (max 8)');
    for (const idStr of ids) {
      const p = ctx.db.powerup.id.find(BigInt(idStr));
      if (!p) throw new SenderError(`Unknown powerup id ${idStr}`);
    }

    const existing = ctx.db.player_loadout_pref.identity.find(ctx.sender);
    if (existing) {
      ctx.db.player_loadout_pref.identity.update({ ...existing, powerup_ids });
    } else {
      ctx.db.player_loadout_pref.insert({ identity: ctx.sender, powerup_ids });
    }
  }
);

// ---------------------------------------------------------------------------
// Powerup usage
// ---------------------------------------------------------------------------

type PowerupRow = NonNullable<ReturnType<DbCtx['db']['powerup']['id']['find']>>;

function getLoadoutIds(ctx: DbCtx, gameId: string, identity: IdentityLike): string[] {
  const loadouts = [...ctx.db.powerup_loadout.loadout_game_id.filter(gameId)]
    .filter(l => l.player_identity.toHexString() === identity.toHexString());
  if (loadouts.length === 0) return [];
  try { return JSON.parse(loadouts[0].powerup_ids); }
  catch { return []; }
}

export const use_powerup = spacetimedb.reducer(
  { game_id: t.string(), powerup_id: t.u64() },
  (ctx, { game_id, powerup_id }) => {
    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') throw new SenderError('Game not active');

    const senderHex = ctx.sender.toHexString();
    const isP1 = game.player1_identity.toHexString() === senderHex;
    const isP2 = game.player2_identity.toHexString() === senderHex;
    if (!isP1 && !isP2) throw new SenderError('Not a participant');

    const powerup = ctx.db.powerup.id.find(powerup_id);
    if (!powerup) throw new SenderError('Unknown powerup');

    // Loadout gate — must be in the player's selected loadout
    const loadoutIds = getLoadoutIds(ctx, game_id, isP1 ? game.player1_identity : game.player2_identity);
    if (!loadoutIds.includes(powerup_id.toString())) throw new SenderError('Powerup not in your loadout');

    // Currency check
    const nowMicros = ctx.timestamp.microsSinceUnixEpoch;
    const available = availableCurrency(game, isP1, nowMicros);
    if (available < powerup.cost) throw new SenderError('Not enough energy');

    // Parse effect
    let effect: Record<string, unknown> = {};
    try { effect = JSON.parse(powerup.effect_data); } catch { /* ignore */ }

    const updated = { ...game };
    if (isP1) updated.player1_spent = game.player1_spent + powerup.cost;
    else      updated.player2_spent = game.player2_spent + powerup.cost;

    if (powerup.kind === 'damage') {
      const multPct = Number(effect.mult_pct ?? 0);
      const flat    = Number(effect.amount   ?? 0);
      if (isP1) {
        updated.player1_dmg_mult_pct = Math.max(updated.player1_dmg_mult_pct, multPct);
        updated.player1_dmg_bonus    = updated.player1_dmg_bonus + flat;
      } else {
        updated.player2_dmg_mult_pct = Math.max(updated.player2_dmg_mult_pct, multPct);
        updated.player2_dmg_bonus    = updated.player2_dmg_bonus + flat;
      }
      ctx.db.game_state.id.update(updated);
    } else if (powerup.kind === 'defense') {
      const shield = Number(effect.shield ?? 0);
      if (isP1) updated.player1_shield = updated.player1_shield + shield;
      else      updated.player2_shield = updated.player2_shield + shield;
      ctx.db.game_state.id.update(updated);
    } else if (powerup.kind === 'sabotage') {
      ctx.db.game_state.id.update(updated);
      const opponentIdentity = isP1 ? game.player2_identity : game.player1_identity;
      const effectType = typeof effect.type === 'string' ? effect.type : 'unknown';
      ctx.db.sabotage_event.insert({
        id:               0n,
        game_id,
        target_identity:  opponentIdentity,
        effect_type:      effectType,
        effect_data:      powerup.effect_data,
        created_at:       ctx.timestamp,
      });
    } else {
      throw new SenderError(`Unknown powerup kind: ${powerup.kind}`);
    }
  }
);

// Target client calls this after consuming a sabotage effect to free the row.
export const clear_sabotage_event = spacetimedb.reducer(
  { event_id: t.u64() },
  (ctx, { event_id }) => {
    const row = ctx.db.sabotage_event.id.find(event_id);
    if (!row) return;
    if (row.target_identity.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('Not your sabotage event');
    }
    ctx.db.sabotage_event.id.delete(event_id);
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

    const settings = JSON.stringify({
      version: 1,
      mode: 'matchmaking',
      startingHp: 100,
      problemSelection: { kind: 'random', difficulty, count: problem_count },
    });
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

// Admin cheat: instantly mark the current problem solved for the caller in
// the given game. Mirrors submit_result's solve path but skips executor auth
// and powerup buffs.
export const admin_solve_problem = spacetimedb.reducer(
  { game_id: t.string(), problem_id: t.u64() },
  (ctx, { game_id, problem_id }) => {
    const caller = ctx.db.user.identity.find(ctx.sender);
    if (!caller?.is_admin) throw new SenderError('Unauthorized');

    const game = ctx.db.game_state.id.find(game_id);
    if (!game || game.status !== 'in_progress') throw new SenderError('Game not in progress');

    const isP1 = game.player1_identity.toHexString() === ctx.sender.toHexString();
    const isP2 = game.player2_identity.toHexString() === ctx.sender.toHexString();
    if (!isP1 && !isP2) throw new SenderError('Not a participant in this game');

    const problemIds = JSON.parse(game.problem_ids) as string[];
    const problemCount = problemIds.length;
    const problemIdStr = problem_id.toString();
    if (!problemIds.includes(problemIdStr)) throw new SenderError('problem_id is not part of this game');

    const solvedIds: string[] = JSON.parse(isP1 ? game.player1_solved_ids : game.player2_solved_ids);
    if (solvedIds.includes(problemIdStr)) return;

    ctx.db.submission.insert({
      id:              0n,
      game_id,
      player_identity: isP1 ? game.player1_identity : game.player2_identity,
      problem_id,
      passed:          1,
      total:           1,
      solve_time:      0,
      language:        'admin',
      submitted_at:    ctx.timestamp,
    });

    const newSolvedIds = [...solvedIds, problemIdStr];
    const room = ctx.db.room.code.find(game.room_code);
    const settings = room ? JSON.parse(room.settings) as Record<string, unknown> : {};
    const startingHp = Number(settings.starting_hp ?? 100);
    const damage = Math.ceil(startingHp / problemCount);

    const updated = { ...game };
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

    if (newSolvedIds.length >= problemCount || opponentHp <= 0) {
      endGame(ctx, updated, winner_identity);
    }
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

/** Typed args for problem insert/update — mirrors the fields in PROBLEM_ARGS above. */
type ProblemArgsType = {
  title:               string;
  description:         string;
  difficulty:          string;
  method_name:         string;
  sample_test_cases:   string;
  sample_test_results: string;
  hidden_test_cases:   string;
  hidden_test_results: string;
  boilerplate_python:  string;
  boilerplate_java:    string;
  boilerplate_cpp:     string;
  problem_kind:        string;
  param_types:         string;
  return_type:         string;
  method_signatures:   string;
};

function validateAndInsertProblem(ctx: DbCtx, args: ProblemArgsType) {
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

# Game Loop Implementation Plan

**Branch:** `gameloop`
**Scope:** Core loop only — room → game start → write code → submit → HP damage → next problem or game over. Abilities (Phase 3) are out of scope.

---

## 1. Current State

### What works
- Room lifecycle: create → join → ready → start game
- SpacetimeDB tables and subscriptions
- Auth flow (GitHub OAuth + guest mode)
- Executor can run Python code in Docker and return results
- ProblemScreen shows problem, timer, opponent

### What's broken
| Issue | ID | Description |
|-------|----|-------------|
| Instant-kill HP | L1 | `submit_result` deals 100 damage (game ends on first accepted submission regardless of starting HP) |
| Deterministic problem selection | L2 | Same room code always picks the same problem |
| Only one problem per game | L3 | `problem_count` setting is parsed but ignored; `problem_ids` always has 1 entry |
| Premature match history | L4 | `match_history` row created inside `submit_result` with loser data always `false/0/''` |
| Duplicate end-game logic | L5 | `forfeit` and `submit_result` both update stats independently; risk of double-counting |
| No executor→SpacetimeDB callback | A3 | Executor returns HTTP response but never calls `submit_result` reducer |
| CodeEditor is static | Q6 | Renders hardcoded Python snippet; no CodeMirror, no editing |
| Submit/Run Tests do nothing | Q7 | Submit navigates to results; Run Tests has no handler |

### What's missing
- No HP bars in the game UI
- No per-problem progress indicator
- No `submission` table to track attempts before game ends
- No way for the executor to fetch problem data from SpacetimeDB (currently expects client to send everything)
- Forfeit doesn't create a `match_history` row → results screen hangs on "Loading results…"

---

## 2. Target State

### End-to-end flow

```
1. Both players ready → host calls start_game
   → SpacetimeDB creates game_state with N problems, starting HP
   → Both clients navigate to ProblemScreen

2. Player sees problem + CodeMirror editor + HP bars + opponent info
   → Edits code in CodeMirror (pre-filled with boilerplate)
   → Clicks "Run Tests" → client POSTs to executor with sample tests
   → Executor runs code in Docker, returns sample test results
   → Player sees which sample tests pass/fail

3. Player clicks "Submit"
   → Client sends code + game_id + player_identity to executor
   → Executor fetches hidden test data from SpacetimeDB
   → Executor runs code against hidden tests in Docker
   → Executor calls submit_result reducer on SpacetimeDB with (passed, total)
   → SpacetimeDB: if accepted → opponent takes HP damage proportional to tests passed
   → SpacetimeDB: if HP ≤ 0 → game ends, winner declared
   → SpacetimeDB: if HP > 0 → advance submitting player to next problem
   → SpacetimeDB: if no more problems for submitting player → game ends
   → Both clients receive live game_state updates via subscription

4. Game ends (HP=0, all problems solved, or forfeit)
   → end_game helper: set status=finished, winner, create match_history, update stats
   → Both clients navigate to ResultsScreen
   → ResultsScreen shows match_history row
```

### Data flow

```
┌────────────┐  subscribe   ┌─────────────┐
│  Client A  │◄────────────►│             │
└──────┬─────┘              │             │
       │                    │ SpacetimeDB │
       │ POST /execute      │  (module)   │
       ├───────────────────►│             │
       │                    │             │
┌──────┴─────┐  subscribe   │             │
│  Client B  │◄────────────►│             │
└────────────┘              └──────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │  Executor   │
                            │             │
                            │ 1. POST /execute
                            │ 2. Fetch problem from SpacetimeDB
                            │ 3. Run Docker
                            │ 4. Call submit_result reducer
                            └─────────────┘
```

---

## 3. Implementation Steps

### Step 1: Add `submission` table + refactor `submit_result` (module)

**Why:** The current `submit_result` conflates "process one submission" with "end the game and record history." A `submission` table decouples them and lets the game continue after accepted submissions.

**Changes to `module/spacetimedb/src/index.ts`:**

1. Add a `submission` table:
```typescript
const submission = table(
  { name: 'submission', public: true },
  {
    id:                 t.u64().primaryKey().autoInc(),
    game_id:            t.string(),
    player_identity:    t.identity(),
    problem_id:         t.u64(),
    passed:             t.u32(),
    total:              t.u32(),
    solve_time:         t.u32(),       // seconds
    language:           t.string(),
    submitted_at:       t.timestamp(),
  }
);
```

2. Refactor `submit_result` to:
   - Insert a `submission` row (always, whether accepted or not)
   - If `accepted` (passed === total): deal proportional HP damage to opponent
   - If opponent HP ≤ 0: call `end_game` helper
   - If submitting player has more problems: advance their `problem_index`
   - If submitting player solved all problems: call `end_game` helper
   - If not accepted: no HP change, player can resubmit

3. Create shared `end_game` helper (fixes L5):
```typescript
function endGame(ctx, game, winnerIdentity) {
  // Set game status + winner
  // Create match_history row (aggregated from submissions)
  // Update ELO + stats for winner and loser
}
```

4. HP damage formula (replaces hardcoded -100):
```
damage = Math.ceil(startingHp / problemCount) * (passed / total)
```
This ensures that solving all tests on all problems will deplete the opponent's HP exactly. Partial solutions deal proportional damage.

5. Update `forfeit` to call `end_game` helper instead of duplicating stat updates.

**Acceptance criteria:**
- `submit_result` with partial tests passed deals proportional damage, game continues
- `submit_result` with all tests passed deals full damage for that problem, advances player
- Game ends only when HP ≤ 0 or all problems solved
- `forfeit` and `submit_result` both use `end_game` (no duplicate logic)
- `submission` rows are created for every attempt

---

### Step 2: Fix problem selection + multi-problem support (module)

**Why:** L2 (deterministic selection) and L3 (single problem) prevent the HP system from working.

**Changes to `module/spacetimedb/src/index.ts`:**

1. Replace deterministic selection in `start_game`:
```typescript
// Before (L2):
const idx = room.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % approved.length;

// After: use ctx.timestamp for entropy
const hash = (room.code + ctx.timestamp.microsSinceUnixEpoch.toString())
  .split('').reduce((a, c) => a + c.charCodeAt(0), 0);
const selected = [];
for (let i = 0; i < problemCount; i++) {
  selected.push(approved[(hash + i * 7) % approved.length]);
}
```
Note: SpacetimeDB reducers must be deterministic, but `ctx.timestamp` varies per call, providing sufficient entropy for a club tool.

2. Use `problem_count` from settings:
```typescript
const problemCount = Math.min(
  Number(settings.problem_count ?? 1),
  approved.length
);
```

3. Store all selected problem IDs in `problem_ids`:
```typescript
problem_ids: JSON.stringify(selected.map(p => p.id.toString())),
```

4. Set `player1_problem_index: 0` and `player2_problem_index: 0` (already done, just now meaningful).

**Acceptance criteria:**
- Same room code played at different times gets different problems
- `problem_count` setting controls how many problems are selected
- `problem_ids` has the correct number of entries

---

### Step 3: Wire executor to SpacetimeDB (executor)

**Why:** A3 — the executor must call `submit_result` after running code, and should fetch problem data from SpacetimeDB rather than trusting the client.

**Changes to `executor/`:**

1. Add `spacetimedb` dependency to `executor/package.json`

2. Create `executor/src/stdb.ts` — SpacetimeDB client connection:
```typescript
// Connect to SpacetimeDB using the module bindings
// Register executor identity on startup (call set_executor_identity)
// Export: getConnection(), getProblem(problemId)
```

3. Modify `executor/src/index.ts`:
   - On startup: connect to SpacetimeDB, call `set_executor_identity` reducer
   - In `POST /execute`: after running code, call `submit_result` reducer
   - New request body schema (simplified — client no longer sends test data):
```typescript
interface ExecuteRequest {
  game_id: string;
  player_identity: string;
  code: string;
  lang: Language;
  problem_id: number;   // executor fetches problem from SpacetimeDB
}
```

4. Modify `executor/src/runner.ts`:
   - `executeCode` fetches the problem from SpacetimeDB using `problem_id`
   - Uses `hidden_test_cases`, `hidden_test_results`, `compare_func`, `method_name` from the fetched problem
   - After execution, calls `submit_result` reducer

5. Update `executor/src/types.ts`:
   - Simplify `ExecuteRequest` to remove fields the executor now fetches itself
   - Add `SpacetimeDBConfig` type

**Acceptance criteria:**
- Executor connects to SpacetimeDB on startup
- Executor calls `set_executor_identity` on connect
- `POST /execute` fetches problem data from SpacetimeDB, not from the request body
- After Docker execution, executor calls `submit_result` reducer
- Client can remove all problem-data fields from the execute request

---

### Step 4: Replace CodeEditor with CodeMirror (client)

**Why:** Q6 — the current CodeEditor is a static display. Players need to actually write code.

**Changes:**

1. Install dependencies:
```bash
cd client && npm add @uiw/react-codemirror @codemirror/lang-python @codemirror/theme-one-dark
```

2. Create `client/src/components/problem/editorTheme.ts` — custom dark theme matching the project design system:
   | Token | Color |
   |-------|-------|
   | Editor background | `#1A1614` |
   | Gutter background | `#0F0D0D` |
   | Text | `#F0EBE5` |
   | Comments | `#8A7F78` |
   | Keywords | `#C0272D` |
   | Strings | `#22C55E` |
   | Numbers | `#D4A017` |
   | Selection | `#2A1214` |
   | Cursor | `#F0EBE5` |
   | Line numbers | `#4F4744` |
   | Active line | `#221E1C` |

3. Rewrite `client/src/components/problem/CodeEditor.tsx`:
   - Props: `initialCode: string`, `onCodeChange: (code: string) => void`
   - Use `CodeMirror` from `@uiw/react-codemirror`
   - Configure: Python language, custom dark theme, line numbers, bracket matching, auto-closing brackets
   - Controlled mode: `value` + `onChange`
   - "Python" pill remains in top bar

4. Update `client/src/pages/ProblemScreen.tsx`:
   - Add `const [code, setCode] = useState('')`
   - Initialize code from `problem?.boilerplate_python ?? ''` when problem loads
   - Pass `initialCode` and `onCodeChange` to `CodeEditor`

5. Delete `client/src/components/ui/CodeBlock.tsx` (no longer used)

**Acceptance criteria:**
- CodeEditor renders a fully functional CodeMirror instance
- Code is pre-filled with the problem's Python boilerplate
- Player can type, edit, and see syntax highlighting
- Parent component has access to current code via `onCodeChange`

---

### Step 5: Wire Submit + Run Tests to executor (client)

**Why:** Q7 — the buttons currently do nothing. This completes the client side of the game loop.

**Changes to `client/src/pages/ProblemScreen.tsx`:**

1. Add executor URL constant:
```typescript
const EXECUTOR_URL = import.meta.env.VITE_EXECUTOR_URL ?? 'http://localhost:8000';
```

2. "Run Tests" button handler:
```typescript
const handleRunTests = async () => {
  setSubmitting(true);
  const res = await fetch(`${EXECUTOR_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game_id: gameId,
      player_identity: ctx.identity!.toHexString(),
      code,
      lang: 'python',
      problem_id: Number(problem!.id),
    }),
  });
  const data = await res.json();
  // Show test results in UI (new state: sampleTestResults)
  setSubmitting(false);
};
```

3. "Submit" button handler:
```typescript
const handleSubmit = async () => {
  setSubmitting(true);
  const res = await fetch(`${EXECUTOR_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game_id: gameId,
      player_identity: ctx.identity!.toHexString(),
      code,
      lang: 'python',
      problem_id: Number(problem!.id),
    }),
  });
  // Don't navigate away — wait for game_state.status to change via subscription
  // The executor calls submit_result reducer → SpacetimeDB updates game_state
  // → our useEffect watching game.status will navigate to results when finished
  setSubmitting(false);
};
```

4. Remove the old `onClick={() => navigate('/results?game=...')}` from Submit

5. Add loading/disabled states to buttons during submission

6. Show sample test results after "Run Tests" (new `TestResults` component or inline display)

**Acceptance criteria:**
- "Run Tests" sends code to executor, shows sample test results
- "Submit" sends code to executor, waits for game_state update
- Buttons show loading state during submission
- No manual navigation on Submit — game_state subscription drives navigation
- Rate-limited submissions handled gracefully (show error from 429 response)

---

### Step 6: Add HP bars + game progress UI (client)

**Why:** Players need to see HP, problem progress, and submission feedback during the game.

**Changes to `client/src/pages/ProblemScreen.tsx`:**

1. Add HP bars in the top bar area:
   - Two horizontal bars (player HP / opponent HP)
   - Color: green (>50%), yellow (25-50%), red (<25%)
   - Show numeric HP value

2. Add problem progress indicator:
   - "Problem 1 of 3" based on `game.player1_problem_index` / `game.player2_problem_index`
   - Dots or mini progress bar

3. Show submission results inline (after Step 5):
   - Green/red pills for each test case
   - "X of Y tests passed" summary

4. Show opponent's progress (via game_state subscription):
   - Opponent's problem index (which problem they're on)
   - Opponent's HP updates in real-time

**Acceptance criteria:**
- HP bars update in real-time when opponent takes damage
- Problem progress shows which problem each player is on
- Test results are visible after submission
- UI clearly conveys game state at a glance

---

### Step 7: Fix forfeit → results flow + match_history aggregation (module + client)

**Why:** Forfeit currently doesn't create a `match_history` row, so the results screen hangs. The `end_game` helper from Step 1 should fix this, but we need to verify aggregation.

**Changes:**

1. In `end_game` helper (from Step 1): aggregate `submission` rows into `match_history`:
```typescript
// Gather all submissions for this game
const subs = [...ctx.db.submission.iter()].filter(s => s.game_id === game.id);
const p1Subs = subs.filter(s => s.player_identity.toHexString() === game.player1_identity.toHexString());
const p2Subs = subs.filter(s => s.player_identity.toHexString() === game.player2_identity.toHexString());

const p1Accepted = p1Subs.some(s => s.passed === s.total && s.total > 0);
const p2Accepted = p2Subs.some(s => s.passed === s.total && s.total > 0);
const p1SolveTime = p1Subs.filter(s => s.passed === s.total).sort((a, b) => a.solve_time - b.solve_time)[0]?.solve_time ?? 0;
const p2SolveTime = p2Subs.filter(s => s.passed === s.total).sort((a, b) => a.solve_time - b.solve_time)[0]?.solve_time ?? 0;
// ... insert match_history with complete data
```

2. Ensure `forfeit` calls `end_game` which creates the `match_history` row

3. In `ResultsScreen.tsx`: add a timeout/polling fallback if `match_history` hasn't appeared yet (SpacetimeDB subscription delay)

**Acceptance criteria:**
- Forfeit → results screen shows the match (no infinite loading)
- `match_history` has correct data for both players regardless of how the game ended
- Results screen handles the case where history arrives slightly after navigation

---

### Step 8: Fix match_history schema for multi-problem games (module)

**Why:** Current `match_history` has a single `problem_id` / `problem_title` / `difficulty` — insufficient for multi-problem games.

**Changes to `module/spacetimedb/src/index.ts`:**

1. Change `match_history` fields:
   - `problem_id` → `problem_ids: t.string()` (JSON array)
   - `problem_title` → `problem_titles: t.string()` (JSON array)
   - `difficulty` → `difficulties: t.string()` (JSON array)

2. Update all `match_history.insert(...)` calls to use the new fields

3. Regenerate client bindings (`spacetime generate`)

4. Update `ResultsScreen.tsx` to display multiple problem titles/difficulties

**Acceptance criteria:**
- `match_history` stores all problem data for multi-problem games
- Results screen renders correctly for 1-problem and multi-problem games
- Client bindings regenerated and all TypeScript errors resolved

---

## 4. Bug Fixes (from REVIEW.md)

These are addressed as part of the steps above:

| Bug | Fix | Step |
|-----|-----|------|
| L1: Instant-kill HP | Proportional damage formula | Step 1 |
| L2: Deterministic problem selection | Use `ctx.timestamp` for entropy | Step 2 |
| L3: Single problem per game | Use `problem_count` setting | Step 2 |
| L4: Premature match history | Defer to `end_game` helper; aggregate from `submission` table | Step 1 + Step 7 |
| L5: Duplicate end-game logic | Extract `end_game` helper | Step 1 |
| A3: Executor doesn't call SpacetimeDB | Add SpacetimeDB client SDK to executor | Step 3 |
| Q6: Static CodeEditor | Replace with CodeMirror | Step 4 |
| Q7: Submit/Run Tests do nothing | Wire to executor HTTP endpoint | Step 5 |

---

## 5. Out of Scope

- **Abilities** (healio, freezio, etc.) — Phase 3
- **Java/C++ runners** — generators are stubs; Python only for now
- **Language selector** in CodeEditor — Python only
- **Ranked matchmaking / ELO display** — casual rooms only
- **Problem creation UI** — Phase 4
- **Reconnection handling** — Phase 3
- **Hidden test data leak** (A5) — requires SpacetimeDB views, separate task
- **Chat validation** (H2) — separate hardening task

---

## 6. Execution Order

The steps have dependencies. Recommended order:

```
Step 1 (submission table + end_game + HP formula)
  → Step 2 (multi-problem + random selection)
    → Step 8 (match_history schema update, depends on multi-problem)
      → Step 3 (executor→SpacetimeDB wiring, needs stable submit_result API)
        → Step 4 (CodeMirror, independent of backend)
          → Step 5 (wire buttons, needs executor wired + CodeMirror)
            → Step 6 (HP bars + progress UI)
              → Step 7 (forfeit→results fix, needs end_game + match_history working)
```

Steps 4 and 3 can be done in parallel. Everything else is sequential.

---

## 7. Testing Strategy

After each step, verify:

1. **Module changes**: `spacetime publish lcr --clear-database -y --module-path module/spacetimedb` → no errors
2. **Client bindings**: `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path module/spacetimedb`
3. **Build**: `cd client && npm run build` → no TypeScript errors
4. **Manual smoke test**: Start SpacetimeDB + executor + client, create room, join, ready, play through the game loop to completion

End-to-end verification after all steps:
- Create a room with `starting_hp: 200, problem_count: 2`
- Both players ready → game starts with 2 problems
- Player A solves problem 1 → Player B takes ~100 HP damage (200/2 = 100 per problem)
- Player A advances to problem 2
- Player A solves problem 2 → Player B takes ~100 HP damage → HP = 0 → game ends
- Results screen shows correct match history with both problems

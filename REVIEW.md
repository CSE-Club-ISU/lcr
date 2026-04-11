# LCR Codebase Review

**Date:** 2026-04-11
**Scope:** Full codebase review — code quality, maintainability, security, idioms

---

## Executive Summary

The codebase is in a solid early state for a Phase 1/Phase 2 project. The SpacetimeDB module is well-structured, the auth flow works, and the client UI is clean. However, there are **critical security issues** that must be fixed before any deployment (even a club server), several logic bugs in the game module, and a number of areas where the code doesn't yet deliver on the PLANNING.md architecture.

---

## Phase 0 — Critical / Must-Fix Before Any Deploy

### S1. GitHub OAuth credentials in local `.env` (local-only, not pushed)
**File:** `.env:27-28`
The local `.env` file contains real `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` values. Verified: `.env` is in `.gitignore` and never committed to git history, so it's not exposed on GitHub. ✓

**Status:** No immediate action needed — this is safe. The `.env.example` correctly serves as the template.

### S2. Auth callback passes token in URL query string ✅ FIXED
**Files:** `auth/src/index.ts`, `client/src/pages/AuthCallbackPage.tsx`
Replaced token-in-URL with a one-time authorization code pattern. The auth server issues a short-lived UUID code (60s TTL, single-use) and redirects with `?code=...`. The client POSTs `/redeem` to exchange it for the token. Token never appears in URLs, logs, or referrer headers.

### S3. `submit_result` reducer has no caller authentication ✅ FIXED
**Files:** `module/spacetimedb/src/index.ts`
Added `executor_config` table (private, singleton row) and `set_executor_identity` reducer. The executor calls this once on startup to register its identity. `submit_result` now checks `ctx.sender === cfg.executor_identity` and throws if the caller isn't the registered executor.

### S4. Docker sandbox hardening ✅ FIXED
**File:** `executor/src/runner.ts`
Added to Docker run command: `--pids-limit=50` (fork bomb prevention), `--security-opt=no-new-privileges` (blocks privilege escalation), `--memory-swap=0` (hard memory cap, no swap), `--tmpfs=/tmp:size=32m` (caps /tmp). The Docker socket is only mounted on the executor container itself, not inside the sandboxed code containers.

### S5. No rate limiting on executor endpoint ✅ FIXED
**File:** `executor/src/index.ts`
Added per-game-id rate limiting. Each `game_id` gets a 5-second cooldown between submissions (configurable via `RATE_LIMIT_COOLDOWN_MS`). Returns HTTP 429 with `Retry-After` header. Also added `game_id` as a required field with validation, and releases the rate limit on errors so players can retry.

---

## Phase 1 — Logic Bugs & Correctness

### L1. `submit_result` declares winner on first accepted submission
**File:** `module/spacetimedb/src/index.ts:350-404`
When a player passes all tests, the game immediately ends and they win — regardless of HP. The PLANNING.md describes an HP-damage system where passing tests *deals damage* but doesn't necessarily end the game.

**Current behavior:** `accepted → opponent HP = 0 → game over`
**Expected behavior:** `accepted → opponent takes damage proportional to tests passed → game continues until HP ≤ 0`

The hardcoded `-100` damage and immediate `status: 'finished'` bypasses the entire HP system.

### L2. Problem selection is deterministic but not random
**File:** `module/spacetimedb/src/index.ts:255`
```typescript
const idx = room.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % approved.length;
```
This always picks the same problem for the same room code. If a player replays with the same code, they get the same problem. Also, the hash is weak — short uppercase codes have very low entropy.

**Fix:** Use `ctx.timestamp` or a combination of room code + timestamp to increase entropy.

### L3. `start_game` only selects one problem
**File:** `module/spacetimedb/src/index.ts:275`
Room settings support `problem_count` but `start_game` only ever picks one problem. The `problem_ids` array always has exactly one entry.

### L4. Match history records are created prematurely
**File:** `module/spacetimedb/src/index.ts:362-379`
A `match_history` row is inserted inside `submit_result` (on first accepted submission), but both `player1_accepted` and `player2_accepted` are set based on who submitted — meaning the loser's data is always `false` / `0` / `''`. If the game is supposed to continue (HP system), there should be a separate "finalize match" step.

### L5. ELO update happens in `submit_result` AND `forfeit`
**File:** `module/spacetimedb/src/index.ts:306-327, 382-399`
Both `forfeit` and `submit_result` update `total_wins`, `total_matches`, and `current_streak`. If a game ends via `submit_result`, both functions produce correct updates independently. But the data model allows double-counting if both paths run somehow. Extract the "end game + update stats" logic into a shared helper.

### L6. `join_room` doesn't call `join_room` reducer from client
**File:** `client/src/pages/MatchScreen.tsx:35-39`
When joining a room, the client navigates to the room page but **never calls the `joinRoom` reducer**. The user arrives at the room page but isn't registered as the guest.

**Fix:** Call `joinRoom({ code })` before or after navigation, or call it from `RoomPage` on mount when the user is neither host nor guest.

### L7. HomePage always redirects to `/profile`
**File:** `client/src/pages/HomePage.tsx:29-33`
```typescript
if (!myUser.username) {
  navigate('/profile');
} else {
  navigate('/profile');  // same destination regardless
}
```
Both branches go to `/profile`. This makes `/` a loading-screen-that-redirects, never a real landing page.

---

## Phase 2 — Code Quality & Maintainability

### Q1. Pervasive `as unknown as Type[]` casts
**Files:** `RoomPage.tsx:18-19`, `ProblemScreen.tsx:22-24`, `ProfilePage.tsx:265`, etc.
Every usage of `useTable` is followed by `as unknown as SomeType[]`. This defeats TypeScript's type safety.

**Fix:** Create a typed wrapper:
```typescript
function useTypedTable<T>(table: TableHandle<T>): [T[], boolean] {
  const [rows, loading] = useTable(table);
  return [rows as T[], loading];
}
```
Or investigate whether the generated `module_bindings/types` already has proper typing that can be used directly.

### Q2. Identity comparison boilerplate
**Files:** Nearly every page
The pattern `u.identity.toHexString() === ctx.identity!.toHexString()` is repeated 20+ times across the codebase.

**Fix:** Extract a utility:
```typescript
const identityEq = (a: Identity, b: Identity) => a.toHexString() === b.toHexString();
```

### Q3. `formatTime` is duplicated
**Files:** `ProfilePage.tsx:140-145`, `ResultsScreen.tsx:51-56`
Identical `formatTime` helper in two files.

### Q4. JSON parsing wrapped in try/catch everywhere
**Files:** `ProblemScreen.tsx:30`, `RoomPage.tsx:50-52`, `ProblemPanel.tsx:11-16`, `ProfilePage.tsx:21-22`
The same `(() => { try { return JSON.parse(...); } catch { return ...; } })()` IIFE pattern appears in many places.

**Fix:** Create a `safeJsonParse<T>(str: string, fallback: T): T` utility.

### Q5. Leaderboard uses hardcoded mock data
**File:** `client/src/pages/LeaderboardScreen.tsx:16-25`
The leaderboard is entirely static with fake data. This is fine as a UI prototype but should be called out — it doesn't read from SpacetimeDB at all.

### Q6. CodeEditor is a static display, not an editor
**File:** `client/src/components/problem/CodeEditor.tsx`
Despite the name, this component just renders a hardcoded Python snippet. There's no CodeMirror integration, no language selection, no way to edit code or submit it.

### Q7. "Run Tests" and "Submit" buttons do nothing
**File:** `client/src/pages/ProblemScreen.tsx:113-121`
"Run Tests" has no onClick handler. "Submit" navigates to results without actually submitting code to the executor.

### Q8. `keys.ts` is dead code
**File:** `auth/src/keys.ts`
The entire key management module (JWKS generation, import/export) is never imported by `auth/src/index.ts`. The auth server uses SpacetimeDB's anonymous identity system, not JWTs. This module should be removed.

### Q9. No auth guard on protected routes
**File:** `client/src/App.tsx:22-29`
The `AppLayout` routes have no authentication check. Any user can navigate directly to `/play`, `/profile`, etc. without being logged in. The only guard is `HomePage` checking localStorage, which is easily bypassed.

**Fix:** Add a route guard component that checks for the auth token and redirects to `/login` if missing.

---

## Phase 3 — Security Hardening

### H1. Token stored in localStorage is XSS-vulnerable
**File:** `client/src/pages/AuthCallbackPage.tsx:24`
The SpacetimeDB token in `localStorage` can be stolen by any XSS payload. For a club tool this is low-risk, but worth noting.

### H2. `send_chat` has no validation
**File:** `module/spacetimedb/src/index.ts:285-296`
No length limit on chat messages, no check that the sender is actually in the game, no rate limiting. A client could flood the chat table.

**Fix:** Add: (1) max message length (e.g., 500 chars), (2) verify `ctx.sender` is a player in the game, (3) optionally limit messages per minute.

### H3. `create_room` has no duplicate-code check
**File:** `module/spacetimedb/src/index.ts:175-188`
If two users create rooms with the same code simultaneously, `insert` might fail or silently overwrite. Check if the code already exists first.

### H4. Room code is client-generated
**File:** `client/src/pages/MatchScreen.tsx:6-8`
Room codes are generated client-side with `crypto.randomUUID()`. A user could create rooms with offensive or collision-prone codes.

**Fix:** Generate room codes server-side in the `create_room` reducer, or validate the code format strictly in the reducer.

### H5. `approve_problem` is the only admin-gated reducer
**File:** `module/spacetimedb/src/index.ts:430-439`
There's no `create_problem` reducer at all — it's listed in PLANNING.md but not implemented. When it's added, ensure it also has proper authorization.

---

## Phase 4 — Architectural Gaps vs. PLANNING.md

### A1. No `create_problem` reducer
PLANNING.md Phase 4 calls for custom problem creation. No reducer exists yet.

### A2. Ability system is entirely stubbed
**File:** `module/spacetimedb/src/index.ts:412-424`
`buy_ability` and `use_ability` are empty stubs. The SP/MP fields exist on `game_state` but are never modified.

### A3. Executor doesn't call back to SpacetimeDB
**File:** `executor/src/index.ts`
The executor runs code and returns results via HTTP response, but never calls the `submit_result` reducer. The PLANNING.md architecture shows: `executor → calls submit_result reducer`. Currently the executor is disconnected from the game loop.

### A4. Java and C++ runners are placeholders
**File:** `executor/src/generators/index.ts:72-83`
Both return empty results. Only Python works.

### A5. `subscribeToAllTables()` leaks hidden test data
**File:** `client/src/main.tsx:22`
The client subscribes to ALL public tables. The `problem` table has `hidden_test_cases` and `hidden_test_results` marked as "executor only" in the schema comments, but they're in a `public: true` table. Any connected client can read all hidden test data.

**Fix:** Either: (a) move hidden test data to a private table that only the executor identity can read, (b) use SpacetimeDB views to expose a filtered version of `problem` without hidden fields, or (c) store hidden data separately.

### A6. No reconnection handling
PLANNING.md mentions reconnection (Phase 3) but there's no `onDisconnect` retry logic in the client.

---

## Summary Priority Matrix

| Priority | Count | Examples |
|----------|-------|---------|
| **Critical (security)** | 5 | S1-S5: credential leak, token in URL, no executor auth, code injection risk, no rate limit |
| **Logic bugs** | 7 | L1-L7: HP system not working, join_room never called, homepage always redirects |
| **Code quality** | 9 | Q1-Q9: type casts, duplication, dead code, missing auth guards |
| **Hardening** | 5 | H1-H5: XSS, chat flooding, room code collisions |
| **Architecture gaps** | 6 | A1-A6: missing reducers, executor not wired up, hidden data leaked |

### Suggested Implementation Order

1. **Now:** Fix S1 (rotate OAuth creds), S3 (executor auth), S5 (rate limit), A5 (hidden test data)
2. **Before first club session:** Fix L1 (HP system), L6 (join_room), Q6/Q7 (working editor + submit), A3 (executor→STDB callback)
3. **Before wider use:** Fix S2 (token in URL), S4 (Docker hardening), H2-H4 (validation), Q9 (auth guards)
4. **Quality of life:** Fix Q1-Q4 (utilities), L7 (homepage), Q5 (live leaderboard), Q8 (remove dead code)
5. **Feature completion:** A1 (create_problem), A2 (abilities), A4 (Java/C++ runners), A6 (reconnection)

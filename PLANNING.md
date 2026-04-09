# LCR (BeatCode Fork) — Planning Document

## What Is BeatCode?

BeatCode is a **1v1 competitive coding platform** where two players race to solve algorithmic problems. Key mechanics:

- **HP system**: solving test cases deals HP damage to the opponent; first player to drain the other's HP (or solve all problems) wins
- **Abilities**: players earn Skill Points (SP) and Mana Points (MP) by solving problems; abilities include `healio`, `freezio`, `deletio`, `rickrollio`, etc.
- **Match types**: ranked (ELO rating), unranked (random queue), custom rooms (configurable settings), and practice (vs bot)
- **Code execution**: Docker-sandboxed runners for Python, Java, and C++
- **Problems**: stored in Postgres with hidden/sample test cases, per-language boilerplate, and a custom comparison function per language

### Original Tech Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit 5 + TypeScript + Tailwind + CodeMirror |
| Backend | FastAPI (Python) + SQLAlchemy + PostgreSQL |
| Real-time | WebSockets (FastAPI native) |
| Code Execution | Docker (per-language images) |
| Auth | JWT (email/password) + Google OAuth |
| Email | Resend API |
| AI | OpenAI (runtime complexity analysis) |

---

## Our Goals

This is a **CS club activity tool**, not a production service. Priorities:

1. Live multiplayer (the core experience)
2. Custom problem creation (club-curated problems alongside LeetCode scraping)
3. Self-hostable (run on a club server or a single VM)
4. Low barrier to contribution (club members should be able to add features)

We can drop: ranked ELO, Google OAuth, email verification, analytics (PostHog), OpenAI runtime analysis, Vercel deployment config.

We can keep: all core game mechanics, abilities, room system, code execution via Docker.

---

## Tech Stack

### Frontend: React + TypeScript (Vite)

**Why change from Svelte?**
- React/TS is what most CS students already know or are learning
- Lower onboarding friction for club contributors
- Larger ecosystem for components (shadcn/ui, etc.)

**Keep from original:**
- Vite (same build layer)
- Tailwind CSS
- CodeMirror 6 (framework-agnostic — just swap Svelte bindings for `@uiw/react-codemirror`)
- shadcn/ui (React version, replaces bits-ui)

### Backend: SpacetimeDB (TypeScript module) + thin Executor service

SpacetimeDB v1.6+ ships TypeScript module support (out of beta as of v2.0, Feb 2026). The module language is now **TypeScript**, meaning the entire project except the executor is one language.

**Our stack:**

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind + CodeMirror 6 |
| Real-time / Game State | SpacetimeDB (TypeScript module) |
| Code Execution | Python/FastAPI executor — reused from original |
| Auth | SpacetimeDB built-in Identity (OIDC) |
| Deployment | SpacetimeDB Docker image + executor container + static client |

---

## SpacetimeDB

### What It Is

SpacetimeDB is a database + application server in one. You define **tables** and **reducers** in your module. The client SDK subscribes to tables and receives real-time updates automatically — no WebSocket management code needed on either side.

```
Client SDK ↔ SpacetimeDB (tables + reducers)
```

### Why It Fits

The hardest part of the original BeatCode server is ~600+ lines of manual WebSocket broadcast management across `game/websockets.py`, `room/websockets.py`, and the state models. SpacetimeDB eliminates this entirely — when a reducer mutates a table row, every subscribed client gets the update automatically.

| Concern | SpacetimeDB | Original FastAPI |
|---|---|---|
| Real-time state sync | Native — table subscriptions | Manual WebSocket broadcast (complex) |
| Game state persistence | Stored in tables, survives restart | In-memory dicts, lost on restart |
| Self-hosting | Single Docker image | compose file, works fine |
| Module language | **TypeScript** (as of v1.6) | Python |
| Code execution | Cannot shell out — needs external service | FastAPI calls Docker directly |
| Auth | Built-in Identity + OIDC | JWT (custom) |

### The Execution Service Boundary

SpacetimeDB reducers cannot spawn Docker containers. Code execution stays as a separate thin HTTP service. After running the submitted code, it calls a SpacetimeDB reducer with the result:

```
[React Client]
    │
    ├── SpacetimeDB SDK (WebSocket subscriptions)
    │       → room state, game state, HP, chat, abilities, problems
    │
    └── HTTP POST /execute
            → Executor service (Python/FastAPI, thin)
                    → Docker runner (Python/Java/C++)
                    → calls submit_result reducer with (game_id, passed, total)
```

### TypeScript Module Syntax

As of v2.0, the module API looks like this:

```typescript
import { schema, table, t } from 'spacetimedb/server';

// Define tables
const user = table(
  { name: 'user', public: true },
  {
    identity: t.identity().primaryKey(),
    username: t.string(),
    display_name: t.string(),
    is_admin: t.bool(),
  }
);

const spacetimedb = schema({ user, /* ... */ });
export default spacetimedb;

// Define reducers
export const set_username = spacetimedb.reducer(
  { username: t.string(), display_name: t.string() },
  (ctx, { username, display_name }) => {
    const existing = ctx.db.user.identity.find(ctx.sender);
    if (existing) {
      ctx.db.user.identity.update({ ...existing, username, display_name });
    }
  }
);

// Lifecycle hooks
export const onConnect = spacetimedb.clientConnected(ctx => {
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (!existing) {
    ctx.db.user.insert({ identity: ctx.sender, username: '', display_name: '', is_admin: false });
  }
});
```

### Auth

SpacetimeDB's built-in Identity system works as follows:
- Each client gets a stable `Identity` (derived from their OIDC token, or a generated anonymous identity if no token is provided)
- Anonymous identities are persisted in `localStorage` as a token — same device = same identity across sessions
- `ctx.sender` in any reducer gives you the calling user's Identity
- For the club tool, **we use anonymous identities with username registration on first visit** — no email/password needed

This is the same pattern as the chat app tutorial: `onConnect` creates a user row for new identities, and users set their display name via a reducer. Simple and zero-friction.

For admin access (approving problems), we designate specific identities as admins in the DB directly, or add a club invite-code check in the `set_username` reducer.

---

## Proposed Architecture

```
lcr/                          (monorepo)
├── module/                   # SpacetimeDB module (TypeScript)
│   ├── src/
│   │   └── index.ts          # Tables + reducers (all game logic lives here)
│   └── package.json
│
├── executor/                 # Code execution service (Python/FastAPI)
│   ├── main.py               # POST /execute → runs Docker → calls submit_result reducer
│   ├── docker.py             # Docker runner (ported from original, minimal changes)
│   ├── generators/           # Test file generators per language
│   │   ├── python.py
│   │   ├── java.py
│   │   └── cpp.py
│   └── requirements.txt
│
└── client/                   # React + TypeScript (Vite)
    ├── src/
    │   ├── module_bindings/  # Auto-generated by `spacetime generate`
    │   ├── components/
    │   │   ├── game/         # Editor, HP bars, abilities panel, chat
    │   │   ├── room/         # Lobby, settings, ready check
    │   │   ├── problems/     # Problem browser, creation form
    │   │   └── ui/           # shadcn/ui primitives
    │   ├── hooks/            # useGameState, useRoom, useProblems, etc.
    │   ├── pages/            # React Router pages
    │   └── main.tsx          # SpacetimeDB connection setup
    └── package.json
```

---

## SpacetimeDB Data Model

```typescript
import { schema, table, t } from 'spacetimedb/server';

// Registered users (one row per unique identity)
const user = table(
  { name: 'user', public: true },
  {
    identity: t.identity().primaryKey(),
    username: t.string(),
    display_name: t.string(),
    is_admin: t.bool(),
  }
);

// Problems (only approved ones visible to non-admins — enforced in reducer queries)
const problem = table(
  { name: 'problem', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    title: t.string(),
    description: t.string(),         // markdown
    difficulty: t.string(),          // "easy" | "medium" | "hard"
    method_name: t.string(),
    sample_test_cases: t.string(),   // JSON string
    sample_test_results: t.string(), // JSON string
    hidden_test_cases: t.string(),   // JSON string — executor reads this, clients don't
    hidden_test_results: t.string(), // JSON string — executor reads this, clients don't
    boilerplate_python: t.string(),
    boilerplate_java: t.string(),
    boilerplate_cpp: t.string(),
    compare_func_python: t.string(),
    compare_func_java: t.string(),
    compare_func_cpp: t.string(),
    created_by: t.identity(),
    is_approved: t.bool(),
  }
);

// Rooms (lobby before game starts)
const room = table(
  { name: 'room', public: true },
  {
    code: t.string().primaryKey(),
    host_identity: t.identity(),
    guest_identity: t.identity().optional(),
    host_ready: t.bool(),
    guest_ready: t.bool(),
    status: t.string(),   // "waiting" | "in_game"
    settings: t.string(), // JSON: problem_count, starting_hp, difficulty distribution, etc.
  }
);

// Active game state (one row per active match)
const game_state = table(
  { name: 'game_state', public: true },
  {
    id: t.string().primaryKey(),
    room_code: t.string(),
    player1_identity: t.identity(),
    player2_identity: t.identity(),
    player1_hp: t.i32(),
    player2_hp: t.i32(),
    player1_sp: t.i32(),
    player2_sp: t.i32(),
    player1_mp: t.i32(),
    player2_mp: t.i32(),
    player1_problem_index: t.u32(),
    player2_problem_index: t.u32(),
    player1_abilities: t.string(),   // JSON array of ability ids
    player2_abilities: t.string(),
    problem_ids: t.string(),         // JSON array — executor resolves these
    status: t.string(),              // "waiting" | "in_progress" | "finished"
    start_time: t.timestamp(),
    winner_identity: t.identity().optional(),
  }
);

// In-game chat
const chat_message = table(
  { name: 'chat_message', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    game_id: t.string(),
    sender_identity: t.identity(),
    text: t.string(),
    sent: t.timestamp(),
  }
);

export default schema({ user, problem, room, game_state, chat_message });
```

### Key Reducers

```typescript
// Auth / onboarding
export const onConnect = spacetimedb.clientConnected(ctx => { ... });
export const set_profile = spacetimedb.reducer({ username, display_name }, (ctx, args) => { ... });

// Room management
export const create_room = spacetimedb.reducer({ settings: t.string() }, (ctx, { settings }) => { ... });
export const join_room   = spacetimedb.reducer({ code: t.string() }, (ctx, { code }) => { ... });
export const leave_room  = spacetimedb.reducer({ code: t.string() }, (ctx, { code }) => { ... });
export const set_ready   = spacetimedb.reducer({ code: t.string(), ready: t.bool() }, (ctx, args) => { ... });

// Game actions (called by clients)
export const send_chat   = spacetimedb.reducer({ game_id: t.string(), text: t.string() }, (ctx, args) => { ... });
export const buy_ability = spacetimedb.reducer({ game_id: t.string(), ability: t.string() }, (ctx, args) => { ... });
export const use_ability = spacetimedb.reducer({ game_id: t.string(), ability: t.string() }, (ctx, args) => { ... });
export const forfeit     = spacetimedb.reducer({ game_id: t.string() }, (ctx, { game_id }) => { ... });

// Called by executor service after running code
export const submit_result = spacetimedb.reducer(
  { game_id: t.string(), passed: t.u32(), total: t.u32() },
  (ctx, { game_id, passed, total }) => {
    // Validate caller is the executor service identity
    // Apply HP deduction to opponent
    // Advance problem index if solved
    // Check win condition → update status + winner
  }
);

// Problem management (admin only)
export const create_problem  = spacetimedb.reducer({ ...problemFields }, (ctx, args) => { ... });
export const approve_problem = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
  const caller = ctx.db.user.identity.find(ctx.sender);
  if (!caller?.is_admin) throw new Error('Unauthorized');
  // ...
});
```

---

## Features to Keep vs Cut

### Keep
- Room system (create/join with code, configurable settings)
- HP/damage system based on test cases passed
- Abilities (healio, freezio, deletio, lightio, hugio, smallio, rickrollio)
- In-game chat
- Code execution in Docker (Python, Java, C++)
- Problem browser

### Cut (for now)
- Ranked ELO matchmaking — club rooms are enough
- Random matchmaking queue — not needed
- Email verification / password reset — no email auth at all
- Google OAuth
- OpenAI runtime complexity analysis
- PostHog analytics
- Practice vs bot mode — stretch goal

### Add
- Custom problem creation UI (form: title, description, difficulty, test cases, boilerplate per language)
- Admin approval flow for submitted problems
- Identity-based auth with username set on first visit (zero friction)

---

## Answered Questions

**1. SpacetimeDB module language → TypeScript**
SpacetimeDB v1.6 added TypeScript modules, out of beta in v2.0. The entire stack is now TypeScript except the executor. No Rust or C# needed.

**2. Auth → Anonymous Identity + username on first visit**
SpacetimeDB's built-in Identity system gives each client a stable identity persisted in localStorage. On first connect, `onConnect` creates a user row. User calls `set_profile` to pick a username/display name. No passwords, no email — perfect for a club tool. Admin status is set manually in the DB or via a club invite code check in the reducer.

**3. Problem format → Keep the original schema**
The original format (hidden test cases + per-language boilerplate + per-language comparison function) is worth keeping. It's what makes the execution service work correctly for non-trivial problems. We just store everything as JSON strings in SpacetimeDB tables instead of Postgres columns. Simplification can happen later if needed.

**4. Execution service language → Keep Python**
The existing Docker runner + test generators are clean and correct. No reason to rewrite them. The executor becomes a thin FastAPI service: `POST /execute` → run Docker → call `submit_result` reducer via the SpacetimeDB HTTP API or TypeScript SDK.

**5. Repo structure → Monorepo**
Single repo with `module/`, `executor/`, `client/` directories. Simpler for club contributors — one clone, one README.

**6. Deployment → Single VM with Docker Compose**
```yaml
services:
  spacetimedb:
    image: clockworklabs/spacetimedb:latest
    ports: ["3000:3000"]

  executor:
    build: ./executor
    ports: ["8000:8000"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # needed to spawn containers

  client:
    build: ./client
    ports: ["80:80"]  # nginx serving static build
```
SpacetimeDB persists its data to a volume. Everything runs on one machine.

---

## Implementation Phases

### Phase 1 — Foundation
- [ ] Init monorepo structure (`module/`, `executor/`, `client/`)
- [ ] SpacetimeDB module: `user`, `room`, `game_state`, `chat_message`, `problem` tables
- [ ] `onConnect`, `set_profile`, `create_room`, `join_room`, `leave_room`, `set_ready` reducers
- [ ] React client: SpacetimeDB connection setup, `SpacetimeDBProvider`, generated bindings
- [ ] Profile setup page (username picker on first visit)
- [ ] Room lobby UI (create/join by code, ready check, settings panel)

### Phase 2 — Core Game Loop
- [ ] Port executor service from original (docker.py + generators, minimal changes)
- [ ] `submit_result` reducer — HP deduction, problem advance, win condition
- [ ] `forfeit` reducer
- [ ] Game start flow: both ready → `start_game` reducer → clients subscribe to game_state
- [ ] In-game UI: problem panel, code editor (CodeMirror), HP bars, submit button
- [ ] In-game chat

### Phase 3 — Abilities + Polish
- [ ] `buy_ability` and `use_ability` reducers with SP/MP logic
- [ ] Client-side ability effects (freezio freeze overlay, deletio line removal, etc.)
- [ ] Game result screen
- [ ] Reconnection handling (SpacetimeDB maintains state — client just re-subscribes)

### Phase 4 — Custom Problems
- [ ] `create_problem` and `approve_problem` reducers
- [ ] Problem creation form (admin/member UI)
- [ ] Problem browser with difficulty filter
- [ ] Admin panel: review queue, approve/reject
- [ ] Seed with a starter problem set ported from original's `combined.json`

---

## Notes on the Original Codebase

- The original's most complex code is WebSocket broadcast management — SpacetimeDB replaces this entirely with table subscriptions.
- `server/app/services/execution/docker.py` and the test generators are the most reusable code — port directly to the executor service.
- `server/app/db/combined.json` contains the existing problem set — good seed data for Phase 4.
- The ability system logic is simple enough to port from Python to TypeScript in an afternoon.
- The original room settings schema (HP, difficulty distribution, SP/MP) is well-designed — keep it, just store as JSON in the room table's `settings` field.

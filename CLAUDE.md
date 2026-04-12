# LCR Project — Agent Instructions

## Post-change automation

After completing any work, automatically run the steps below that apply to what changed. Do not wait for the user to ask.

### 1. SpacetimeDB module changed (`module/spacetimedb/src/index.ts`)

Publish the updated module **and** regenerate client + executor bindings:

```bash
# Publish to the running local SpacetimeDB (inside Docker)
docker compose run --rm init

# Regenerate client bindings
spacetime generate --lang typescript \
  --out-dir client/src/module_bindings \
  --module-path module/spacetimedb

# Regenerate executor bindings
spacetime generate --lang typescript \
  --out-dir executor/src/module_bindings \
  --module-path module/spacetimedb
```

> Note: `docker compose run --rm init` publishes using the container's saved identity, which avoids the identity-mismatch problem that occurs when publishing with the local `spacetime` CLI directly.

### 2. Client bindings regenerated (`client/src/module_bindings/`)

Rebuild and restart the client container so the browser picks up the new bindings:

```bash
docker compose up -d --build client
```

Or, if running Vite dev server outside Docker, just save any file to trigger a hot reload — no restart needed.

### 3. Executor code changed (`executor/src/`)

Rebuild and restart the executor container:

```bash
docker compose up -d --build executor
```

### 4. Auth service changed (`auth/`)

Rebuild and restart the auth container:

```bash
docker compose up -d --build auth
```

### 5. Docker Compose config changed (`docker-compose.yml`, `*.Dockerfile`, `init.sh`)

Full stack restart:

```bash
docker compose down && docker compose up -d
```

---

## Committing

Commit at logical checkpoints — don't wait until the end of a session. A checkpoint is any point where a coherent, self-contained unit of work is complete (e.g. a feature works, a bug is fixed, a refactor is done). Each commit should leave the codebase in a working state.

- Commit frequently: after each feature, fix, or meaningful change
- One logical change per commit — don't bundle unrelated work
- Always commit before switching to a different task
- Regenerated bindings should be committed together with the module change that caused them

---

## Key facts

- The running SpacetimeDB instance is the Docker container (`clockworklabs/spacetime`), always at `http://localhost:3000`.
- **Never** publish the module using the host `spacetime publish` CLI directly — it uses a different identity than the one that owns the database, causing auth errors. Always publish via `docker compose run --rm init`.
- Client bindings and executor bindings are **separate** copies — regenerate both when the module schema changes.
- A schema mismatch between bindings and the live server causes `RangeError: Tried to read N byte(s)` deserialization panics in the browser.

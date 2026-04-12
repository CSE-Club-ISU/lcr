# Executor Security Model

The executor runs untrusted student code inside Docker containers. This document explains the defense layers.

## Threat model

An adversary submits code that tries to:
1. Read host secrets (filesystem, environment variables)
2. Make network calls (exfiltrate data, download payloads)
3. Fork-bomb or exhaust resources (CPU, memory, processes)
4. Escape the container

## Defense layers

| Layer | Mechanism | Config |
|-------|-----------|--------|
| Network isolation | `--network=none` | runner.ts |
| Memory cap | `--memory=128m --memory-swap=0` | runner.ts |
| CPU cap | `--cpus=0.5` (configurable) | `DOCKER_CPU_LIMIT` env |
| Process limit | `--pids-limit=50` | runner.ts |
| Privilege escalation | `--security-opt=no-new-privileges` | runner.ts |
| Disk writes | `--tmpfs=/tmp:size=32m,exec` (tmpfs only) | runner.ts |
| Time limit | Process killed after N ms | `getTimeLimitMs()` in generators |
| Shell injection | `fileName` validated to `[A-Za-z0-9_.]` only | runner.ts `getRunScript()` |

## What this does NOT protect against

- A compromised Docker daemon (the executor has access to `/var/run/docker.sock`)
- Side-channel attacks between containers on the same host
- Sufficiently clever container escapes (stay patched!)

## Docker socket access

The executor mounts `/var/run/docker.sock` to spawn containers. This gives it full Docker control over the host — a deliberate tradeoff for simplicity. In a production deployment, use a restricted socket proxy (e.g. `docker-socket-proxy`) and allow only `POST /containers/create`, `POST /containers/start`, etc.

## Rate limiting

The executor enforces:
- Per-game cooldown (`RATE_LIMIT_COOLDOWN_MS`, default 5s) to prevent a single game from monopolizing container slots
- Per-identity sandbox cooldown (`SANDBOX_RATE_LIMIT_COOLDOWN_MS`, default 5s) to prevent resource abuse in free-code mode

At the default 5 s cooldown, a single user can trigger ~12 containers/minute. With `--cpus=0.5` and `--memory=128m`, each container adds ~1–2 s of startup overhead. This is acceptable for a private classroom deployment; tighten the cooldown (e.g. `SANDBOX_RATE_LIMIT_COOLDOWN_MS=15000`) before exposing the executor to the public internet.

## Sandbox identity trust model (known gap)

The `player_identity` field in sandbox requests is supplied by the client. There is no cryptographic proof that the sender owns that identity — any authenticated user could send another user's identity hex and consume rate-limit quota on their behalf.

**Severity:** low. The worst-case abuse is rate-limit hijacking (causing a victim's sandbox to return 429), not code execution under another identity.

**Future fix:** issue a short-lived signed token from the auth service on login, include it in sandbox requests, and verify it server-side. This binds the request to the session that produced the token.

## Sandbox auth: eventual-consistency window

The sandbox GitHub-auth guard (`!user.githubId → 403`) reads from the executor's in-memory SpacetimeDB subscription. If the executor reconnects, or a user's `User` row hasn't been applied yet when they first hit `/execute`, a legitimate GitHub user can transiently receive a 403. The client should treat a sandbox 403 as retryable (one retry after a short delay). The window is typically milliseconds.

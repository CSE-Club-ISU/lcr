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

The executor enforces a per-game cooldown (`RATE_LIMIT_COOLDOWN_MS`, default 5s) to prevent a single game from monopolizing container slots.

# Install just: https://github.com/casey/just

# Default - show available commands
[private]
default:
    @just --list --unsorted

# =============================================================================
# SpacetimeDB Commands
# =============================================================================

# Start local SpacetimeDB server
spacetime-start:
    spacetime start

# Publish module to local server (requires spacetime server running)
publish:
    cd module && spacetime publish lcr --server local -y

# Publish module to maincloud (production)
publish-prod:
    cd module && spacetime publish lcr -y

# Generate TypeScript client bindings
generate:
    cd module && spacetime generate --lang typescript --out-dir ../client/src/module_bindings

# Full publish + generate cycle for local development
pg: publish generate
    @echo "✓ Published and generated bindings"

# =============================================================================
# Docker Compose Commands
# =============================================================================

# Start all services
up:
    docker compose up -d

# Start all services and build images
up-build:
    docker compose up -d --build

# Stop all services
down:
    docker compose down

# Stop services and remove volumes (⚠️  Destroys data)
down-volumes:
    docker compose down -v

# View logs for all services
logs:
    docker compose logs -f

# View logs for specific service (usage: just logs-spacetime)
logs-spacetime:
    docker compose logs -f spacetimedb

logs-auth:
    docker compose logs -f auth

logs-executor:
    docker compose logs -f executor

logs-client:
    docker compose logs -f client

# Check service status
status:
    docker compose ps

# =============================================================================
# Development Workflow Commands
# =============================================================================

# Full reset: stop everything, wipe data, rebuild and start fresh
reset:
    docker compose down -v
    docker compose up -d --build

# Quick restart: stop and start without rebuilding
restart:
    docker compose restart

# Restart specific service (usage: just restart-service auth)
restart-service service:
    docker compose restart {{service}}

# Build specific service without starting (usage: just build-service client)
build-service service:
    docker compose build {{service}}

# =============================================================================
# Utility Commands
# =============================================================================

# View SpacetimeDB logs from the running container
spacetime-logs:
    docker compose exec spacetimedb spacetime logs lcr

# Open SpacetimeDB REPL
spacetime-repl:
    docker compose exec spacetimedb spacetime repl lcr

# Check if spacetime CLI is installed and show version
spacetime-version:
    spacetime --version

# Install spacetime CLI if not present (macOS/Linux)
spacetime-install:
    curl -sSf https://install.spacetimedb.com | sh

# Clean up dangling Docker images and volumes
docker-clean:
    docker system prune -f
    docker volume prune -f

# =============================================================================
# Client Development
# =============================================================================

# Run client dev server locally (bypassing Docker)
client-dev:
    cd client && bun run dev

# Build client locally
client-build:
    cd client && bun run build

# =============================================================================
# Auth Service Development
# =============================================================================

# Run auth service locally (requires .env)
auth-dev:
    cd auth && bun run dev

# =============================================================================
# Executor Service Development
# =============================================================================

# Run executor service locally
executor-dev:
    cd executor && python -m uvicorn main:app --reload --port 8000

# =============================================================================
# Combined Workflows
# =============================================================================

# Full local dev setup: start docker, publish module, generate bindings
dev: up
    @sleep 2
    just publish
    just generate
    @echo "✓ Development environment ready!"
    @echo "  - SpacetimeDB: http://localhost:3000"
    @echo "  - Auth: http://localhost:4000"
    @echo "  - Client: http://localhost:80"

# Quick update after code changes: rebuild and restart
update: up-build generate
    @echo "✓ Updated and rebuilt"

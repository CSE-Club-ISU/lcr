# Game loop implementation tasks

# Initialize the database: publish module and seed problems
init:
  docker compose run --rm init

# Regenerate SpacetimeDB client bindings
generate-bindings:
  spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path module/spacetimedb
  spacetime generate --lang typescript --out-dir executor/src/module_bindings --module-path module/spacetimedb

# Build the client
build-client:
  cd client && bun run build

# Check for TypeScript errors
check:
  cd client && tsc -b

# Build the cpp-runner image used by the executor sandbox.
# Lives behind a profile in docker-compose so it doesn't get started as a service.
build-cpp-runner:
  docker compose --profile build build cpp-runner

# Start development servers (SpacetimeDB, executor, client)
dev: build-cpp-runner
  docker compose up -d spacetimedb auth executor client
  @echo "Services started. Open http://localhost in your browser."

# Stop development servers
down:
  docker compose down

# View SpacetimeDB logs
logs:
  docker compose logs -f spacetimedb

# Fresh build: clean volumes, rebuild all services, init DB
fresh: build-cpp-runner
  @echo "🗑️  Removing old volumes..."
  docker compose down
  docker volume rm lcr_spacetimedb_data lcr_spacetime_config 2>/dev/null || true
  @echo "🚀 Rebuilding and starting fresh stack..."
  docker compose up -d
  @echo "✓ Fresh build complete — stack is running"
  @echo "   Open http://localhost in your browser to test the PR"

# Production deployment: start backend services only (no client)
prod: build-cpp-runner
  docker compose up -d spacetimedb auth executor
  @echo "✓ Backend services started (spacetimedb, auth, executor)"

# Full workflow: init, generate bindings, build
setup: init generate-bindings build-client
  @echo "✓ Setup complete"

# Quick test: create room with multiple problems
test-multi-problem:
  @echo "Manual test: Create a room with problem_count=2, starting_hp=200"
  @echo "Check spacetime logs to verify problem_ids has 2 entries"

# Run all tests (when tests exist)
test:
  @echo "No tests yet — tests will be added in later phases"

# Show help
help:
  @echo "Game Loop Implementation — Just Tasks"
  @echo ""
  @echo "Setup & Deployment:"
  @echo "  just fresh             🌟 FRESH BUILD: clean volumes, rebuild, init — test PRs here"
  @echo "  just init              Initialize DB: publish module + seed problems"
  @echo "  just setup             Full setup: init + generate bindings + build"
  @echo "  just generate-bindings Regenerate SpacetimeDB TypeScript bindings"
  @echo "  just build-client      Build the React client"
  @echo ""
  @echo "Development:"
  @echo "  just dev               Start all Docker services"
  @echo "  just down              Stop all services"
  @echo "  just logs              Watch SpacetimeDB logs"
  @echo "  just check             Type-check client"
  @echo ""
  @echo "Testing:"
  @echo "  just test              Run tests (when available)"
  @echo "  just test-multi-problem Manual test guide"

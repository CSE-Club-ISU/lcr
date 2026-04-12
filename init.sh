#!/bin/bash
set -e

SERVER=http://spacetimedb:3000
DB_NAME=lcr
CONFIG_DIR=/root/.config/spacetime

echo "Waiting for SpacetimeDB to be ready..."
until bun --eval "await fetch('${SERVER}').then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 1
done

# Copy module source to a temp dir so bun installs Linux binaries,
# not the macOS node_modules from the host volume mount.
echo "Building module..."
cp -r /workspace/module/spacetimedb /tmp/spacetimedb-build
cd /tmp/spacetimedb-build
bun install --frozen-lockfile 2>/dev/null || bun install

# Log in to this SpacetimeDB instance with a persistent identity.
# --server-issued-login gets a token directly from the local server and saves it.
# The spacetime_config volume keeps this stable across restarts so we always
# publish with the same identity that owns the database.
if [ ! -f "${CONFIG_DIR}/cli.toml" ]; then
  echo "No saved identity — logging in to SpacetimeDB..."
  spacetime login --server-issued-login "${SERVER}"
fi

echo "Publishing module to SpacetimeDB..."
spacetime publish "${DB_NAME}" \
  --server "${SERVER}" \
  --module-path /tmp/spacetimedb-build \
  --no-config \
  --delete-data=always \
  -y

echo "Module published successfully!"

# Extract the SpacetimeDB identity token from cli.toml using grep+sed.
# This is fragile: it assumes the token is on its own line as:
#   spacetimedb_token = "..."
# If the TOML format changes or the value contains escaped quotes, this breaks.
# A more robust alternative would use a proper TOML parser or a JSON config.
TOKEN=$(grep -E '^spacetimedb_token\s*=' "${CONFIG_DIR}/cli.toml" 2>/dev/null | head -1 | sed 's/.*= *"//;s/".*//')

if [ -z "${TOKEN}" ]; then
  echo "[init] ERROR: Failed to extract SpacetimeDB token from cli.toml. Executor cannot start." >&2
  exit 1
fi

echo "Token extracted: ${TOKEN:0:8}..."

echo "Seeding problems..."
bun /workspace/seed-problems.mjs "${SERVER}" "${DB_NAME}" "${TOKEN}"

echo "Seeding powerups and quiz questions..."
bun --eval "
const res1 = await fetch('${SERVER}/v1/database/${DB_NAME}/call/seed_powerups', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ${TOKEN}', 'Content-Type': 'application/json' },
  body: '[]',
});
if (!res1.ok) { console.error('seed_powerups failed:', res1.status, await res1.text()); process.exit(1); }
console.log('  ✓ powerups');
const res2 = await fetch('${SERVER}/v1/database/${DB_NAME}/call/seed_quiz_questions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ${TOKEN}', 'Content-Type': 'application/json' },
  body: '[]',
});
if (!res2.ok) { console.error('seed_quiz_questions failed:', res2.status, await res2.text()); process.exit(1); }
console.log('  ✓ quiz questions');
"

# Write the token to the shared config volume so the executor can use it
# as a stable identity across restarts. chmod 600 for defense-in-depth.
echo -n "${TOKEN}" > "${CONFIG_DIR}/executor_token"
chmod 600 "${CONFIG_DIR}/executor_token"

echo "Init complete!"

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

# Request a fresh identity from SpacetimeDB for publishing.
# This avoids cli.toml corruption issues and ensures a valid token
# even when the spacetime_config volume has stale data.
echo "Requesting SpacetimeDB identity for publishing..."
IDENTITY_RESPONSE=$(bun --eval "
  const res = await fetch('${SERVER}/v1/identity', { method: 'POST' });
  const data = await res.json();
  console.log(JSON.stringify(data));
" 2>/dev/null)

PUBLISH_TOKEN=$(echo "$IDENTITY_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$PUBLISH_TOKEN" ]; then
  echo "[init] ERROR: Failed to get identity token from SpacetimeDB. Response: $IDENTITY_RESPONSE" >&2
  exit 1
fi

# Write token to a temporary config so spacetime CLI can use it
TEMP_CONFIG_DIR="/tmp/spacetime-publish-config"
mkdir -p "$TEMP_CONFIG_DIR"
cat > "$TEMP_CONFIG_DIR/cli.toml" << EOF
spacetimedb_token = "${PUBLISH_TOKEN}"
EOF

echo "Publishing module to SpacetimeDB..."
SPACETIME_CONFIG_DIR="$TEMP_CONFIG_DIR" spacetime publish "${DB_NAME}" \
  --server "${SERVER}" \
  --module-path /tmp/spacetimedb-build \
  --delete-data=always \
  -y

echo "Module published successfully!"

# Use the publish token for seeding — no need to extract from cli.toml
TOKEN="${PUBLISH_TOKEN}"
echo "Using token for seeding: ${TOKEN:0:8}..."

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
echo -n "${TOKEN}" > "${CONFIG_DIR}/executor_token"
chmod 600 "${CONFIG_DIR}/executor_token"

echo "Init complete!"

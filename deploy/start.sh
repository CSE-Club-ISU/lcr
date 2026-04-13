#!/usr/bin/env bash
# start.sh — restart a stopped EC2 instance, refresh env + client bundle with
# the new public IP, then bring the stack back online.
# Usage: ./deploy/start.sh
set -euo pipefail

STATE_FILE="$(dirname "$0")/.lcr-state"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "ERROR: No state file found at $STATE_FILE — has deploy.sh been run?"
  exit 1
fi

source "$STATE_FILE"
OLD_IP="$PUBLIC_IP"

echo "[lcr-start] Starting instance $INSTANCE_ID in $REGION..."
aws ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID" --output text >/dev/null
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

NEW_IP=$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

# Update state file
sed -i.bak "s/^PUBLIC_IP=.*/PUBLIC_IP=$NEW_IP/" "$STATE_FILE" && rm -f "${STATE_FILE}.bak"

echo "[lcr-start] Instance running at $NEW_IP"
if [[ "$OLD_IP" != "$NEW_IP" ]]; then
  echo "[lcr-start] IP changed ($OLD_IP → $NEW_IP) — env + client bundle will be refreshed"
fi

# ── Find key file ────────────────────────────────────────────────────────────
KEY_FILE=""
for candidate in \
  "$(dirname "$0")/${KEY_NAME}.pem" \
  "${HOME}/.ssh/${KEY_NAME}.pem" \
  "$(pwd)/${KEY_NAME}.pem" \
  "${HOME}/.ssh/${KEY_NAME}"; do
  if [[ -f "$candidate" ]]; then
    KEY_FILE="$candidate"
    break
  fi
done

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
[[ -n "$KEY_FILE" ]] && SSH_OPTS="-i $KEY_FILE $SSH_OPTS"

echo "[lcr-start] Waiting for SSH..."
for i in $(seq 1 30); do
  if ssh $SSH_OPTS ubuntu@"$NEW_IP" true 2>/dev/null; then
    break
  fi
  sleep 5
  [[ $i -eq 30 ]] && { echo "ERROR: SSH never became available"; exit 1; }
done

# ── Rewrite .env on the instance with the new IP ─────────────────────────────
# Every EC2 restart assigns a new public IP. The auth server, the client build
# args, and the GitHub OAuth redirect all need to reflect it — otherwise the
# login flow will redirect users to a dead IP or fail with "bad_verification_code".
echo "[lcr-start] Updating remote .env with new IP..."
ssh $SSH_OPTS ubuntu@"$NEW_IP" bash <<REMOTE
set -e
cd /home/ubuntu/lcr
# Strip any previously-injected overrides, then append fresh ones.
grep -vE '^(SPACETIMEDB_HOST|SPACETIMEDB_URI|AUTH_SERVER_URL|AUTH_REDIRECT_URI|CLIENT_ORIGIN|VITE_SPACETIMEDB_URI|VITE_AUTH_SERVER_URL|VITE_EXECUTOR_URL|VITE_MODULE_NAME)=' .env > .env.new
cat >> .env.new <<ENV

# Overrides for EC2 deployment
SPACETIMEDB_HOST=http://${NEW_IP}:3000
SPACETIMEDB_URI=ws://spacetimedb:3000
AUTH_SERVER_URL=http://${NEW_IP}:4000
AUTH_REDIRECT_URI=http://${NEW_IP}/auth/callback
CLIENT_ORIGIN=http://${NEW_IP}

# Client build args (baked into the bundle at docker compose build time)
VITE_SPACETIMEDB_URI=ws://${NEW_IP}:3000
VITE_AUTH_SERVER_URL=http://${NEW_IP}:4000
VITE_EXECUTOR_URL=http://${NEW_IP}:8000
VITE_MODULE_NAME=lcr
ENV
mv .env.new .env
REMOTE

# ── Rebuild client + restart services ────────────────────────────────────────
# The client bundle has the old IP baked in by Vite, so we must rebuild it when
# the IP changes. Skipping the init service (--no-deps) avoids the re-publish
# 403 — the database is already owned by the initial identity.
echo "[lcr-start] Rebuilding client and restarting services..."
ssh $SSH_OPTS ubuntu@"$NEW_IP" bash <<'REMOTE'
set -e
cd /home/ubuntu/lcr
sudo docker compose build client
sudo docker compose up -d --no-deps spacetimedb auth executor client
REMOTE

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  LCR is back online!"
echo ""
echo "  App:      http://${NEW_IP}"
echo "  Auth:     http://${NEW_IP}:4000"
echo ""
if [[ "$OLD_IP" != "$NEW_IP" ]]; then
  echo "  ⚠️  IP CHANGED — update your GitHub OAuth app:"
  echo "      Homepage URL:     http://${NEW_IP}"
  echo "      Callback URL:     http://${NEW_IP}:4000/callback"
  echo "      https://github.com/settings/developers"
  echo ""
fi
echo "  SSH:  ssh ${KEY_FILE:+-i $KEY_FILE} ubuntu@${NEW_IP}"
echo "  Logs: ssh ${KEY_FILE:+-i $KEY_FILE} ubuntu@${NEW_IP} 'cd lcr && sudo docker compose logs -f'"
echo "═══════════════════════════════════════════════════════════"

#!/usr/bin/env bash
# stop.sh — stop the EC2 instance (preserves it for later restart)
# Usage: ./deploy/stop.sh
set -euo pipefail

STATE_FILE="$(dirname "$0")/.lcr-state"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "ERROR: No state file found at $STATE_FILE — has deploy.sh been run?"
  exit 1
fi

source "$STATE_FILE"

echo "[lcr-stop] Stopping instance $INSTANCE_ID in $REGION..."
aws ec2 stop-instances --region "$REGION" --instance-ids "$INSTANCE_ID" --output text >/dev/null
aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$INSTANCE_ID"
echo "[lcr-stop] Instance stopped. (IP $PUBLIC_IP is released — it will change on restart)"
echo ""
echo "  To restart:  ./deploy/start.sh"
echo "  To destroy:  ./deploy/teardown.sh"

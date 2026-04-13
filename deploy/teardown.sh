#!/usr/bin/env bash
# teardown.sh — terminate the EC2 instance and delete the security group
# Usage: ./deploy/teardown.sh
set -euo pipefail

STATE_FILE="$(dirname "$0")/.lcr-state"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "ERROR: No state file found at $STATE_FILE — nothing to tear down."
  exit 1
fi

source "$STATE_FILE"

echo "[lcr-teardown] This will PERMANENTLY delete:"
echo "  Instance: $INSTANCE_ID ($PUBLIC_IP)"
echo "  Security group: $SG_ID ($SG_NAME)"
echo ""
read -rp "  Are you sure? (yes/no): " CONFIRM
[[ "$CONFIRM" != "yes" ]] && { echo "Aborted."; exit 0; }

echo "[lcr-teardown] Terminating instance $INSTANCE_ID..."
aws ec2 terminate-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --output text >/dev/null

echo "[lcr-teardown] Waiting for termination..."
aws ec2 wait instance-terminated --region "$REGION" --instance-ids "$INSTANCE_ID"
echo "[lcr-teardown] Instance terminated."

# Security group can only be deleted after all instances using it are gone
echo "[lcr-teardown] Deleting security group $SG_ID..."
if aws ec2 delete-security-group --region "$REGION" --group-id "$SG_ID" 2>/dev/null; then
  echo "[lcr-teardown] Security group deleted."
else
  echo "[lcr-teardown] WARNING: Could not delete security group $SG_ID — it may still be in use."
  echo "  Delete it manually in the AWS console when ready."
fi

rm -f "$STATE_FILE"
echo ""
echo "[lcr-teardown] Done. All resources removed."

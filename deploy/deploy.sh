#!/usr/bin/env bash
# deploy.sh — spin up an EC2 instance and deploy LCR
# Usage: ./deploy/deploy.sh [--key-name <key>] [--region <region>]
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
INSTANCE_TYPE="t4g.large"
AMI_ID=""          # auto-detected below
KEY_NAME=""        # required — set via --key-name or KEY_NAME env var
SG_NAME="lcr-sg"
TAG_NAME="lcr-server"
STATE_FILE="$(dirname "$0")/.lcr-state"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Arg parsing ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --key-name) KEY_NAME="$2"; shift 2 ;;
    --region)   REGION="$2";   shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

KEY_NAME="${KEY_NAME:-${KEY_NAME:-}}"
if [[ -z "$KEY_NAME" ]]; then
  echo "ERROR: --key-name <ec2-key-pair-name> is required"
  echo "  Create one in the AWS console or with:"
  echo "  aws ec2 create-key-pair --key-name lcr --query 'KeyMaterial' --output text > lcr.pem && chmod 600 lcr.pem"
  exit 1
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
info()  { echo "[lcr-deploy] $*"; }
check() { command -v "$1" &>/dev/null || { echo "ERROR: $1 not found"; exit 1; }; }

check aws
check ssh
check scp

# ── Resolve latest Ubuntu 24.04 ARM AMI ──────────────────────────────────────
info "Resolving latest Ubuntu 24.04 AMI in $REGION..."
AMI_ID=$(aws ec2 describe-images \
  --region "$REGION" \
  --owners 099720109477 \
  --filters \
    "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*" \
    "Name=state,Values=available" \
  --query "sort_by(Images, &CreationDate)[-1].ImageId" \
  --output text)
info "Using AMI: $AMI_ID"

# ── Security group ────────────────────────────────────────────────────────────
info "Ensuring security group '$SG_NAME'..."
SG_ID=$(aws ec2 describe-security-groups \
  --region "$REGION" \
  --filters "Name=group-name,Values=$SG_NAME" \
  --query "SecurityGroups[0].GroupId" \
  --output text 2>/dev/null || true)

if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
  SG_ID=$(aws ec2 create-security-group \
    --region "$REGION" \
    --group-name "$SG_NAME" \
    --description "LCR club server" \
    --query GroupId --output text)
  info "Created security group: $SG_ID"

  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" \
    --ip-permissions \
      "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0}]" \
      "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]" \
      "IpProtocol=tcp,FromPort=4000,ToPort=4000,IpRanges=[{CidrIp=0.0.0.0/0}]" \
      "IpProtocol=tcp,FromPort=8000,ToPort=8000,IpRanges=[{CidrIp=0.0.0.0/0}]" \
      "IpProtocol=tcp,FromPort=3000,ToPort=3000,IpRanges=[{CidrIp=0.0.0.0/0}]" \
    >/dev/null
else
  info "Reusing security group: $SG_ID"
fi

# ── Launch instance ───────────────────────────────────────────────────────────
info "Launching $INSTANCE_TYPE instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3,DeleteOnTermination=true}" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$TAG_NAME}]" \
  --query "Instances[0].InstanceId" \
  --output text)
info "Instance launched: $INSTANCE_ID"

# ── Wait for running ──────────────────────────────────────────────────────────
info "Waiting for instance to reach running state..."
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

PUBLIC_IP=$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)
info "Public IP: $PUBLIC_IP"

# Save state for stop/teardown scripts
cat > "$STATE_FILE" <<EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
REGION=$REGION
SG_ID=$SG_ID
SG_NAME=$SG_NAME
KEY_NAME=$KEY_NAME
EOF
info "State saved to $STATE_FILE"

# ── Find SSH key ──────────────────────────────────────────────────────────────
# Look for the PEM file next to the deploy dir or in current dir
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

if [[ -z "$KEY_FILE" ]]; then
  echo ""
  echo "WARNING: Could not find PEM file for key '$KEY_NAME'."
  echo "  Looked in: deploy/${KEY_NAME}.pem, ~/.ssh/${KEY_NAME}.pem, ./${KEY_NAME}.pem"
  echo "  Set KEY_FILE env var or place the PEM file in one of those locations."
  echo ""
  echo "  Once you have the key, run:"
  echo "    KEY_FILE=/path/to/${KEY_NAME}.pem ./deploy/deploy.sh --key-name $KEY_NAME --region $REGION"
  exit 1
fi

SSH_OPTS="-i $KEY_FILE -o StrictHostKeyChecking=no -o ConnectTimeout=10"

# ── Wait for SSH ──────────────────────────────────────────────────────────────
info "Waiting for SSH to become available..."
for i in $(seq 1 30); do
  if ssh $SSH_OPTS ubuntu@"$PUBLIC_IP" true 2>/dev/null; then
    break
  fi
  sleep 5
  [[ $i -eq 30 ]] && { echo "ERROR: SSH never became available"; exit 1; }
done
info "SSH ready."

# ── Install Docker on instance ────────────────────────────────────────────────
info "Installing Docker..."
ssh $SSH_OPTS ubuntu@"$PUBLIC_IP" bash <<'REMOTE'
set -e
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sudo sh /tmp/get-docker.sh
sudo usermod -aG docker ubuntu
# Apply group without re-login by using newgrp in subsequent commands
REMOTE

# ── Build .env for remote ─────────────────────────────────────────────────────
# Strip any lines we override, then append deploy-specific values.
# VITE_* vars are consumed by docker-compose as client build args; the rest
# configure the auth and executor services at runtime.
info "Preparing remote .env..."
REMOTE_ENV=$(mktemp)
grep -vE "^(SPACETIMEDB_HOST|SPACETIMEDB_URI|AUTH_SERVER_URL|AUTH_REDIRECT_URI|CLIENT_ORIGIN|VITE_SPACETIMEDB_URI|VITE_AUTH_SERVER_URL|VITE_EXECUTOR_URL|VITE_MODULE_NAME)=" \
  "$REPO_ROOT/.env" > "$REMOTE_ENV"
cat >> "$REMOTE_ENV" <<EOF

# Overrides for EC2 deployment.
# AUTH_SERVER_URL is the auth server's own base URL (where GitHub sends the user back).
# AUTH_REDIRECT_URI is the CLIENT page to forward the user to after a successful exchange.
# CLIENT_ORIGIN is the origin the executor allows via CORS (client app, port 80).
SPACETIMEDB_HOST=http://${PUBLIC_IP}:3000
SPACETIMEDB_URI=ws://spacetimedb:3000
AUTH_SERVER_URL=http://${PUBLIC_IP}:4000
AUTH_REDIRECT_URI=http://${PUBLIC_IP}/auth/callback
CLIENT_ORIGIN=http://${PUBLIC_IP}

# Client build args (baked into the bundle at docker compose build time)
VITE_SPACETIMEDB_URI=ws://${PUBLIC_IP}:3000
VITE_AUTH_SERVER_URL=http://${PUBLIC_IP}:4000
VITE_EXECUTOR_URL=http://${PUBLIC_IP}:8000
VITE_MODULE_NAME=lcr
EOF

# ── Copy project to instance ──────────────────────────────────────────────────
info "Copying project files to instance (this may take a minute)..."
ssh $SSH_OPTS ubuntu@"$PUBLIC_IP" "mkdir -p /home/ubuntu/lcr"

# Use tar to copy, excluding node_modules, dist, .git — and .env,
# which is written separately below so the EC2 overrides aren't clobbered.
tar -czf /tmp/lcr-deploy.tar.gz \
  -C "$REPO_ROOT" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='*/node_modules' \
  --exclude='client/dist' \
  --exclude='*/dist' \
  --exclude='./.env' \
  .

scp $SSH_OPTS /tmp/lcr-deploy.tar.gz ubuntu@"$PUBLIC_IP":/home/ubuntu/lcr-deploy.tar.gz

ssh $SSH_OPTS ubuntu@"$PUBLIC_IP" bash <<REMOTE
set -e
cd /home/ubuntu/lcr
tar -xzf ../lcr-deploy.tar.gz
rm ../lcr-deploy.tar.gz
REMOTE

# Write the EC2-specific .env AFTER extraction so the repo's .env doesn't win.
scp $SSH_OPTS "$REMOTE_ENV" ubuntu@"$PUBLIC_IP":/home/ubuntu/lcr/.env
rm /tmp/lcr-deploy.tar.gz "$REMOTE_ENV"

# ── Build and start the stack ─────────────────────────────────────────────────
# docker compose reads the remote .env automatically — VITE_* vars flow through
# as build args for the client service (see docker-compose.yml).
info "Building and starting the stack (this will take several minutes)..."
ssh $SSH_OPTS ubuntu@"$PUBLIC_IP" bash <<'REMOTE'
set -e
cd /home/ubuntu/lcr
sudo docker compose build
sudo docker compose --profile build build cpp-runner
sudo docker compose up -d
REMOTE

# ── Print GitHub OAuth reminder ───────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  LCR deployed!"
echo ""
echo "  App:      http://${PUBLIC_IP}"
echo "  Auth:     http://${PUBLIC_IP}:4000"
echo "  SpaceDB:  http://${PUBLIC_IP}:3000"
echo "  Executor: http://${PUBLIC_IP}:8000"
echo ""
echo "  IMPORTANT — Update your GitHub OAuth app:"
echo "    Homepage URL:       http://${PUBLIC_IP}"
echo "    Callback URL:       http://${PUBLIC_IP}:4000/callback"
echo "    https://github.com/settings/developers"
echo ""
echo "  SSH:  ssh -i $KEY_FILE ubuntu@${PUBLIC_IP}"
echo "  Logs: ssh -i $KEY_FILE ubuntu@${PUBLIC_IP} 'cd lcr && sudo docker compose logs -f'"
echo "═══════════════════════════════════════════════════════════"

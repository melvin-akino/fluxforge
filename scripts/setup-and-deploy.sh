#!/usr/bin/env bash
# =============================================================================
# setup-and-deploy.sh — FluxForge one-shot AWS setup + deploy
#
# Steps:
#   1. Creates EC2 key pair + saves .pem file (skips if already exists)
#   2. Launches EC2 t3.micro if EC2_HOST is unset/placeholder (skips if set)
#   3. Creates ECR repos if they don't exist
#   4. ECR login (local Docker)
#   5. Builds Docker images locally
#   6. Pushes images to ECR
#   7. Syncs docker-compose + nginx config to EC2
#   8. Bootstraps EC2 (swap, Docker, AWS CLI — idempotent) + starts stack
#   9. Health-checks the live endpoint
#
# Prerequisites on your LOCAL machine:
#   - AWS CLI v2 configured  (aws configure)
#   - Docker running
#
# Usage:
#   cp .env.aws.example .env.aws    ← fill in once, then:
#   chmod +x scripts/setup-and-deploy.sh
#   ./scripts/setup-and-deploy.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AWS_ENV="$ROOT_DIR/.env.aws"

# ── Use Windows OpenSSH (not Git Bash bundled SSH) ────────────────────────────
SSH="C:/Windows/System32/OpenSSH/ssh.exe"
SCP="C:/Windows/System32/OpenSSH/scp.exe"
if [[ ! -f "$SSH" ]]; then
  echo "❌  Windows OpenSSH not found at $SSH"
  echo "    Enable it via: Settings → Apps → Optional Features → OpenSSH Client"
  exit 1
fi

# Convert key path to Windows format for Windows OpenSSH (e.g. /c/Users/... → C:/Users/...)
win_path() {
  local p="$1"
  # Expand ~ to $HOME first
  p="${p/#\~/$HOME}"
  # Convert /c/foo → C:/foo
  echo "$p" | sed 's|^/\([a-zA-Z]\)/|\1:/|'
}

# ── Load config ───────────────────────────────────────────────────────────────
if [[ ! -f "$AWS_ENV" ]]; then
  echo "❌  .env.aws not found."
  echo "    Run: cp .env.aws.example .env.aws  then fill in your values."
  exit 1
fi
# shellcheck disable=SC1090
source "$AWS_ENV"

for var in AWS_ACCOUNT_ID AWS_REGION ECR_REPO_WEB ECR_REPO_SERVER EC2_USER EC2_KEY_PATH EC2_KEY_NAME; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌  $var is not set in .env.aws"; exit 1
  fi
done

# EC2_HOST may be empty or placeholder at this point — step 2 will populate it
PLACEHOLDER_PATTERN="ec2-xx-xx"
EC2_HOST_RESOLVED="${EC2_HOST:-}"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
TAG="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo 'latest')"
IMG_WEB="${ECR_REGISTRY}/${ECR_REPO_WEB}"
IMG_SRV="${ECR_REGISTRY}/${ECR_REPO_SERVER}"

# ── Banner ────────────────────────────────────────────────────────────────────
echo
echo "╔══════════════════════════════════════════════════════╗"
echo "║        FluxForge — Setup & Deploy to AWS EC2         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  ECR registry : $ECR_REGISTRY"
echo "  Deploy tag   : $TAG"
echo

# ── JWT secret ────────────────────────────────────────────────────────────────
APP_ENV="$ROOT_DIR/.env"
if [[ -f "$APP_ENV" ]]; then
  JWT_SECRET="$(grep '^JWT_SECRET=' "$APP_ENV" | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi
if [[ -z "${JWT_SECRET:-}" ]]; then
  echo "Enter a JWT_SECRET for the server (min 32 chars)."
  echo "Tip: openssl rand -hex 32"
  read -r -s -p "JWT_SECRET: " JWT_SECRET; echo
  if [[ ${#JWT_SECRET} -lt 32 ]]; then
    echo "❌  JWT_SECRET must be at least 32 characters."; exit 1
  fi
fi

# =============================================================================
# STEP 1 — EC2 Key Pair + PEM file
# =============================================================================
echo "━━━  [1/10] EC2 Key Pair"
KEY_DIR="$(dirname "$EC2_KEY_PATH")"
mkdir -p "$KEY_DIR"

KEY_EXISTS_IN_AWS=false
if aws ec2 describe-key-pairs \
     --key-names "$EC2_KEY_NAME" \
     --region "$AWS_REGION" &>/dev/null; then
  KEY_EXISTS_IN_AWS=true
fi

if [[ -f "$EC2_KEY_PATH" && "$KEY_EXISTS_IN_AWS" == "true" ]]; then
  echo "  ✔  Key pair '$EC2_KEY_NAME' exists in AWS and PEM is at $EC2_KEY_PATH — skipping"
else
  if [[ "$KEY_EXISTS_IN_AWS" == "true" ]]; then
    echo "  ⚠  Key pair '$EC2_KEY_NAME' exists in AWS but PEM is missing locally."
    echo "     Deleting and recreating so we can save the private key..."
    aws ec2 delete-key-pair \
      --key-name "$EC2_KEY_NAME" \
      --region "$AWS_REGION"
  fi

  echo "  +  Creating key pair '$EC2_KEY_NAME' in AWS ($AWS_REGION)..."
  aws ec2 create-key-pair \
    --key-name "$EC2_KEY_NAME" \
    --region "$AWS_REGION" \
    --query 'KeyMaterial' \
    --output text > "$EC2_KEY_PATH"
  chmod 600 "$EC2_KEY_PATH"
  echo "  ✔  PEM saved to $EC2_KEY_PATH"
  echo "  ⚠  Keep this file safe — AWS will NOT give you the private key again."
fi
chmod 600 "$EC2_KEY_PATH"
WIN_KEY="$(win_path "$EC2_KEY_PATH")"

# =============================================================================
# STEP 2 — Launch EC2 instance (skip if EC2_HOST already set and not placeholder)
# =============================================================================
echo
echo "━━━  [2/10] EC2 Instance"

if [[ -n "$EC2_HOST_RESOLVED" && "$EC2_HOST_RESOLVED" != *"$PLACEHOLDER_PATTERN"* ]]; then
  echo "  ✔  EC2_HOST already set: $EC2_HOST_RESOLVED — skipping launch"
else
  echo "  +  EC2_HOST not set — launching a new t3.micro instance..."

  # Find latest Amazon Linux 2023 AMI
  echo "  →  Looking up latest Amazon Linux 2023 AMI..."
  AMI_ID="$(aws ec2 describe-images \
    --owners amazon \
    --filters \
      'Name=name,Values=al2023-ami-2023*-x86_64' \
      'Name=state,Values=available' \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text \
    --region "$AWS_REGION")"
  echo "  →  AMI: $AMI_ID"

  # Create IAM role + instance profile for ECR pull (idempotent)
  ROLE_NAME="fluxforge-ec2-role"
  PROFILE_NAME="fluxforge-ec2-profile"

  if ! aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo "  +  Creating IAM role '$ROLE_NAME'..."
    aws iam create-role \
      --role-name "$ROLE_NAME" \
      --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
      --output text > /dev/null
    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
    echo "  ✔  IAM role created"
  else
    echo "  ✔  IAM role already exists"
  fi

  if ! aws iam get-instance-profile --instance-profile-name "$PROFILE_NAME" &>/dev/null; then
    echo "  +  Creating instance profile '$PROFILE_NAME'..."
    aws iam create-instance-profile \
      --instance-profile-name "$PROFILE_NAME" --output text > /dev/null
    aws iam add-role-to-instance-profile \
      --instance-profile-name "$PROFILE_NAME" \
      --role-name "$ROLE_NAME"
    echo "  ✔  Instance profile created"
    sleep 10  # IAM propagation delay
  else
    echo "  ✔  Instance profile already exists"
  fi

  # Create security group (idempotent)
  SG_NAME="fluxforge-sg"
  SG_ID="$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SG_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo '')"

  if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
    echo "  +  Creating security group '$SG_NAME'..."
    SG_ID="$(aws ec2 create-security-group \
      --group-name "$SG_NAME" \
      --description "FluxForge EC2 security group" \
      --region "$AWS_REGION" \
      --query 'GroupId' \
      --output text)"

    aws ec2 authorize-security-group-ingress \
      --group-id "$SG_ID" \
      --region "$AWS_REGION" \
      --ip-permissions \
        'IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0}]' \
        'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]' \
        'IpProtocol=tcp,FromPort=8081,ToPort=8081,IpRanges=[{CidrIp=0.0.0.0/0}]' \
      > /dev/null
    echo "  ✔  Security group created: $SG_ID"
  else
    echo "  ✔  Security group already exists: $SG_ID"
  fi

  # Launch instance
  echo "  +  Launching t3.micro..."
  INSTANCE_ID="$(MSYS_NO_PATHCONV=1 aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type t3.micro \
    --key-name "$EC2_KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --iam-instance-profile "Name=$PROFILE_NAME" \
    --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp3}' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=fluxforge}]' \
    --region "$AWS_REGION" \
    --query 'Instances[0].InstanceId' \
    --output text)"
  echo "  →  Instance ID: $INSTANCE_ID"

  # Wait for running state
  echo "  →  Waiting for instance to reach running state..."
  aws ec2 wait instance-running \
    --instance-ids "$INSTANCE_ID" \
    --region "$AWS_REGION"

  # Get public DNS
  EC2_HOST_RESOLVED="$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicDnsName' \
    --output text \
    --region "$AWS_REGION")"
  echo "  ✔  Instance running: $EC2_HOST_RESOLVED"

  # Persist back to .env.aws so next run skips this step
  if grep -q '^EC2_HOST=' "$AWS_ENV"; then
    sed -i "s|^EC2_HOST=.*|EC2_HOST=${EC2_HOST_RESOLVED}|" "$AWS_ENV"
  else
    echo "EC2_HOST=${EC2_HOST_RESOLVED}" >> "$AWS_ENV"
  fi
  if grep -q '^APP_URL=' "$AWS_ENV"; then
    sed -i "s|^APP_URL=.*|APP_URL=http://${EC2_HOST_RESOLVED}|" "$AWS_ENV"
  else
    echo "APP_URL=http://${EC2_HOST_RESOLVED}" >> "$AWS_ENV"
  fi
  echo "  ✔  EC2_HOST written to .env.aws"

  # Give SSH daemon a moment to start
  echo "  →  Waiting 20s for SSH to become available..."
  sleep 20
fi

REMOTE_DIR="${REMOTE_APP_DIR:-/home/${EC2_USER}/fluxforge}"
APP_URL="${APP_URL:-http://${EC2_HOST_RESOLVED}}"

echo "  EC2 host : ${EC2_USER}@${EC2_HOST_RESOLVED}"
echo "  App URL  : $APP_URL"

# =============================================================================
# STEP 3 — ECR repositories
# =============================================================================
echo
echo "━━━  [3/10] ECR Repositories"
for REPO in "$ECR_REPO_WEB" "$ECR_REPO_SERVER"; do
  if aws ecr describe-repositories \
       --repository-names "$REPO" \
       --region "$AWS_REGION" &>/dev/null; then
    echo "  ✔  $REPO already exists"
  else
    echo "  +  Creating repository: $REPO"
    aws ecr create-repository \
      --repository-name "$REPO" \
      --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true \
      --output table > /dev/null
    echo "  ✔  Created $REPO"
  fi
done

# =============================================================================
# STEP 4 — ECR login (local Docker)
# =============================================================================
echo
echo "━━━  [4/10] ECR Login"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
echo "  ✔  Docker authenticated to ECR"

# =============================================================================
# STEP 5 — Build images
# =============================================================================
echo
echo "━━━  [5/10] Docker Build"
echo "  Building web..."
docker build -f "$ROOT_DIR/Dockerfile.web" \
  -t "${IMG_WEB}:${TAG}" \
  -t "${IMG_WEB}:latest" \
  "$ROOT_DIR"

echo "  Building server..."
docker build -f "$ROOT_DIR/Dockerfile.server" \
  -t "${IMG_SRV}:${TAG}" \
  -t "${IMG_SRV}:latest" \
  "$ROOT_DIR"
echo "  ✔  Images built (tag: $TAG)"

# =============================================================================
# STEP 6 — Push to ECR
# =============================================================================
echo
echo "━━━  [6/10] Push to ECR"
docker push "${IMG_WEB}:${TAG}"
docker push "${IMG_WEB}:latest"
docker push "${IMG_SRV}:${TAG}"
docker push "${IMG_SRV}:latest"
echo "  ✔  Images pushed"

# =============================================================================
# STEP 7 — Upload compose + config files to EC2
# =============================================================================
echo
echo "━━━  [7/10] Sync Files to EC2"

# Wait for SSH to be ready (retry up to 10 times)
echo "  →  Checking SSH connectivity..."
for i in {1..10}; do
  MSYS_NO_PATHCONV=1 "$SSH" -i "$WIN_KEY" \
      -o StrictHostKeyChecking=no \
      -o ConnectTimeout=10 \
      -o PasswordAuthentication=no \
      "${EC2_USER}@${EC2_HOST_RESOLVED}" "exit 0"
  SSH_RC=$?
  if [[ "$SSH_RC" == "0" ]]; then
    echo "  ✔  SSH ready"
    break
  fi
  echo "  [${i}/10] SSH not ready yet (exit $SSH_RC), retrying in 10s..."
  sleep 10
  if [[ "$i" == "10" ]]; then
    echo "❌  SSH timed out after 100s. Check security group port 22 is open."; exit 1
  fi
done

MSYS_NO_PATHCONV=1 "$SSH" -i "$WIN_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=20 \
  "${EC2_USER}@${EC2_HOST_RESOLVED}" "mkdir -p ${REMOTE_DIR}/nginx"

WIN_ROOT="$(win_path "$ROOT_DIR")"
MSYS_NO_PATHCONV=1 "$SCP" -i "$WIN_KEY" -o StrictHostKeyChecking=no \
  "${WIN_ROOT}/docker-compose.yml" \
  "${WIN_ROOT}/docker-compose.prod.yml" \
  "${EC2_USER}@${EC2_HOST_RESOLVED}:${REMOTE_DIR}/"

if [[ -d "$ROOT_DIR/nginx" ]]; then
  MSYS_NO_PATHCONV=1 "$SCP" -i "$WIN_KEY" -o StrictHostKeyChecking=no \
    "${WIN_ROOT}/nginx/"* \
    "${EC2_USER}@${EC2_HOST_RESOLVED}:${REMOTE_DIR}/nginx/"
fi
echo "  ✔  Files synced"

# =============================================================================
# STEP 8 — Bootstrap EC2 (idempotent) + deploy stack
# =============================================================================
echo
echo "━━━  [8/10] Bootstrap + Deploy on EC2"
echo "  Connecting to ${EC2_HOST_RESOLVED}..."

MSYS_NO_PATHCONV=1 "$SSH" -i "$WIN_KEY" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=20 \
  -o ServerAliveInterval=30 \
  "${EC2_USER}@${EC2_HOST_RESOLVED}" \
  REMOTE_DIR="$REMOTE_DIR" \
  JWT_SECRET="$JWT_SECRET" \
  ECR_REGISTRY="$ECR_REGISTRY" \
  IMG_WEB="${IMG_WEB}:latest" \
  IMG_SRV="${IMG_SRV}:latest" \
  AWS_REGION="$AWS_REGION" \
  bash -s << 'REMOTE'
set -euo pipefail

ok()  { echo "  ✔  $*"; }
run() { echo "  →  $*"; }

# ── Swap ──────────────────────────────────────────────────────────────────────
run "Checking swap..."
if swapon --show | grep -q '/swapfile' 2>/dev/null; then
  ok "2 GB swap already active"
else
  run "Creating 2 GB swap file..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab > /dev/null
  sudo sysctl -w vm.swappiness=10 > /dev/null
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf > /dev/null
  ok "2 GB swap created (swappiness=10)"
fi

# ── Docker ────────────────────────────────────────────────────────────────────
run "Checking Docker..."
if command -v docker &>/dev/null; then
  ok "Docker already installed"
else
  run "Installing Docker..."
  sudo dnf update -y -q
  sudo dnf install -y -q docker
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER" || true
  ok "Docker installed"
fi

# ── Docker Compose plugin ─────────────────────────────────────────────────────
run "Checking Docker Compose..."
if sudo docker compose version &>/dev/null 2>&1; then
  ok "Docker Compose already installed"
else
  run "Installing Docker Compose plugin..."
  COMPOSE_VER="$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest \
    | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')"
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -fsSL \
    "https://github.com/docker/compose/releases/download/v${COMPOSE_VER}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  ok "Docker Compose v${COMPOSE_VER} installed"
fi

# ── AWS CLI ───────────────────────────────────────────────────────────────────
run "Checking AWS CLI..."
if command -v aws &>/dev/null; then
  ok "AWS CLI already installed"
else
  run "Installing AWS CLI v2..."
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp/aws-install
  sudo /tmp/aws-install/aws/install
  rm -rf /tmp/awscliv2.zip /tmp/aws-install
  ok "AWS CLI installed"
fi

# ── App .env ──────────────────────────────────────────────────────────────────
ENV_FILE="${REMOTE_DIR}/.env"
if [[ -f "$ENV_FILE" ]]; then
  ok ".env already exists — keeping existing config"
else
  run "Writing .env..."
  cat > "$ENV_FILE" << EOF
PORT=8081
DB_PATH=/data/fluxforge.db
UPLOAD_DIR=/data/uploads
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
EOF
  chmod 600 "$ENV_FILE"
  ok ".env written"
fi

# ── ECR login on EC2 ──────────────────────────────────────────────────────────
run "Logging Docker into ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | sudo docker login --username AWS --password-stdin "$ECR_REGISTRY"
ok "ECR login successful"

# ── Pull images ───────────────────────────────────────────────────────────────
run "Pulling web image..."
sudo docker pull "$IMG_WEB"
run "Pulling server image..."
sudo docker pull "$IMG_SRV"
ok "Images pulled"

# ── Image override env ────────────────────────────────────────────────────────
cat > "${REMOTE_DIR}/.env.images" << EOF
WEB_IMAGE=${IMG_WEB}
SERVER_IMAGE=${IMG_SRV}
EOF

# ── Start / restart stack ─────────────────────────────────────────────────────
run "Starting stack..."
cd "$REMOTE_DIR"
sudo docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env \
  --env-file .env.images \
  up -d --remove-orphans

sudo docker image prune -f --filter "until=24h" > /dev/null

echo
echo "  Stack status:"
sudo docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env \
  --env-file .env.images \
  ps
REMOTE

# =============================================================================
# STEP 9 — Health check
# =============================================================================
echo
echo "━━━  [9/10] Health Check"
echo "  Waiting for ${APP_URL}/api/health ..."
for i in {1..18}; do
  HTTP="$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    "${APP_URL}/api/health" 2>/dev/null || echo 000)"
  if [[ "$HTTP" == "200" ]]; then
    echo "  ✔  HTTP 200 — app is live!"
    break
  fi
  echo "  [${i}/18] HTTP ${HTTP} — retrying in 5s..."
  sleep 5
  if [[ "$i" == "18" ]]; then
    echo "⚠️   Health check timed out after 90s."
    echo "    Check logs: \"$SSH\" -i \"$WIN_KEY\" ${EC2_USER}@${EC2_HOST_RESOLVED} 'sudo docker compose -f fluxforge/docker-compose.yml logs --tail=60'"
    exit 1
  fi
done

# =============================================================================
# Done
# =============================================================================
echo
echo "╔══════════════════════════════════════════════════════╗"
echo "║                  🚀  Deploy Complete                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  App   →  ${APP_URL}"
echo "  API   →  ${APP_URL}/api/health"
echo "  Tag   →  ${TAG}"
echo

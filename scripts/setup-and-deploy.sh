#!/usr/bin/env bash
# =============================================================================
# setup-and-deploy.sh — FluxForge one-shot AWS setup + deploy
#
# Runs everything end-to-end from a single command:
#   1. Creates ECR repos if they don't exist
#   2. Builds Docker images locally
#   3. Pushes images to ECR
#   4. SSHs into EC2 and sets up the instance (once — skips if already done):
#        • 2 GB swap file (critical for t3.micro 1 GB RAM)
#        • Docker + Docker Compose plugin
#        • AWS CLI v2
#   5. Uploads docker-compose files + nginx config
#   6. Writes .env on the server if missing
#   7. Pulls images and starts the stack
#   8. Health-checks the live endpoint
#
# Prerequisites on your LOCAL machine:
#   - AWS CLI v2 configured  (aws configure)
#   - Docker running
#   - SSH access to your EC2 instance
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

# ── Load config ───────────────────────────────────────────────────────────────
if [[ ! -f "$AWS_ENV" ]]; then
  echo "❌  .env.aws not found."
  echo "    Run: cp .env.aws.example .env.aws  then fill in your values."
  exit 1
fi
# shellcheck disable=SC1090
source "$AWS_ENV"

for var in AWS_ACCOUNT_ID AWS_REGION ECR_REPO_WEB ECR_REPO_SERVER EC2_HOST EC2_USER EC2_KEY_PATH; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌  $var is not set in .env.aws"; exit 1
  fi
done

if [[ ! -f "$EC2_KEY_PATH" ]]; then
  echo "❌  EC2 key not found: $EC2_KEY_PATH"; exit 1
fi
chmod 600 "$EC2_KEY_PATH"

REMOTE_DIR="${REMOTE_APP_DIR:-/home/${EC2_USER}/fluxforge}"
APP_ENV="$ROOT_DIR/.env"
APP_URL="${APP_URL:-http://${EC2_HOST}}"
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
echo "  EC2 host     : ${EC2_USER}@${EC2_HOST}"
echo "  Deploy tag   : $TAG"
echo "  App URL      : $APP_URL"
echo

# ── JWT secret ────────────────────────────────────────────────────────────────
# Read from .env if it exists, else prompt
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
# STEP 1 — ECR repositories
# =============================================================================
echo "━━━  [1/7] ECR Repositories"
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
# STEP 2 — ECR login (local Docker)
# =============================================================================
echo
echo "━━━  [2/7] ECR Login"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
echo "  ✔  Docker authenticated to ECR"

# =============================================================================
# STEP 3 — Build images
# =============================================================================
echo
echo "━━━  [3/7] Docker Build"
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
# STEP 4 — Push to ECR
# =============================================================================
echo
echo "━━━  [4/7] Push to ECR"
docker push "${IMG_WEB}:${TAG}"
docker push "${IMG_WEB}:latest"
docker push "${IMG_SRV}:${TAG}"
docker push "${IMG_SRV}:latest"
echo "  ✔  Images pushed"

# =============================================================================
# STEP 5 — Upload compose + config files to EC2
# =============================================================================
echo
echo "━━━  [5/7] Sync Files to EC2"
ssh -i "$EC2_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=20 \
  "${EC2_USER}@${EC2_HOST}" "mkdir -p ${REMOTE_DIR}/nginx"

scp -i "$EC2_KEY_PATH" -o StrictHostKeyChecking=no \
  "$ROOT_DIR/docker-compose.yml" \
  "$ROOT_DIR/docker-compose.prod.yml" \
  "${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}/"

if [[ -d "$ROOT_DIR/nginx" ]]; then
  scp -i "$EC2_KEY_PATH" -o StrictHostKeyChecking=no \
    "$ROOT_DIR/nginx/"* \
    "${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}/nginx/"
fi
echo "  ✔  Files synced"

# =============================================================================
# STEP 6 — Bootstrap EC2 (idempotent — skips anything already done)
#          + write .env + pull images + start stack
# =============================================================================
echo
echo "━━━  [6/7] Bootstrap + Deploy on EC2"
echo "  Connecting to ${EC2_HOST}..."

ssh -i "$EC2_KEY_PATH" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=20 \
  -o ServerAliveInterval=30 \
  "${EC2_USER}@${EC2_HOST}" \
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

# ── Swap (skip if already active) ─────────────────────────────────────────────
run "Checking swap..."
if swapon --show | grep -q '/swapfile' 2>/dev/null; then
  ok "2 GB swap already active"
else
  run "Creating 2 GB swap file (needed for t3.micro)..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab > /dev/null
  sudo sysctl -w vm.swappiness=10 > /dev/null
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf > /dev/null
  ok "2 GB swap created  (swappiness=10)"
fi

# ── Docker (skip if installed) ─────────────────────────────────────────────────
run "Checking Docker..."
if command -v docker &>/dev/null; then
  ok "Docker already installed"
else
  run "Installing Docker..."
  sudo dnf update -y -q
  sudo dnf install -y -q docker
  sudo systemctl enable --now docker
  ok "Docker installed"
fi

# ── Docker Compose plugin (skip if installed) ──────────────────────────────────
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

# ── AWS CLI (skip if installed) ────────────────────────────────────────────────
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

# ── App .env (write once, never overwrite) ─────────────────────────────────────
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

# ── ECR login on EC2 ───────────────────────────────────────────────────────────
run "Logging Docker into ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | sudo docker login --username AWS --password-stdin "$ECR_REGISTRY"
ok "ECR login successful"

# ── Pull images ────────────────────────────────────────────────────────────────
run "Pulling web image..."
sudo docker pull "$IMG_WEB"
run "Pulling server image..."
sudo docker pull "$IMG_SRV"
ok "Images pulled"

# ── Write image override env ───────────────────────────────────────────────────
cat > "${REMOTE_DIR}/.env.images" << EOF
WEB_IMAGE=${IMG_WEB}
SERVER_IMAGE=${IMG_SRV}
EOF

# ── Start / restart stack ──────────────────────────────────────────────────────
run "Starting stack..."
cd "$REMOTE_DIR"
sudo docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env \
  --env-file .env.images \
  up -d --remove-orphans

# ── Prune old images to save disk on t3.micro ──────────────────────────────────
sudo docker image prune -f --filter "until=24h" > /dev/null

echo
echo "  Stack status:"
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
REMOTE

# =============================================================================
# STEP 7 — Health check
# =============================================================================
echo
echo "━━━  [7/7] Health Check"
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
    echo "    Check logs: ssh -i $EC2_KEY_PATH ${EC2_USER}@${EC2_HOST} 'sudo docker compose -f fluxforge/docker-compose.yml logs --tail=60'"
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

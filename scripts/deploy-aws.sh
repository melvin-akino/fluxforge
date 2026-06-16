#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-aws.sh — One-stop FluxForge deployment to an AWS EC2 instance
#
# What this script does (in order):
#   1. Validates required tools and config
#   2. Authenticates Docker to Amazon ECR
#   3. Builds the web and server Docker images
#   4. Tags and pushes both images to ECR
#   5. SSHs into your EC2 instance
#   6. Pulls the new images on EC2
#   7. Runs docker compose up (zero-downtime rolling restart)
#   8. Waits for the health check and reports status
#
# Requirements (local machine):
#   - aws CLI v2  (https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
#   - docker
#   - ssh + your EC2 key pair
#
# First-time setup (run bootstrap ONCE before first deploy):
#   cp .env.aws.example .env.aws   ← fill in your values
#   chmod 600 .env.aws
#   ./scripts/bootstrap-ec2.sh    ← installs Docker + 2GB swap on the EC2 instance
#   ./scripts/deploy-aws.sh       ← then deploy
#
# Usage:
#   ./scripts/deploy-aws.sh            # deploy with tag = git short SHA
#   ./scripts/deploy-aws.sh v1.2.0     # deploy with explicit tag
#   ./scripts/deploy-aws.sh --dry-run  # print all steps without executing
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AWS_ENV="$ROOT_DIR/.env.aws"

if [[ ! -f "$AWS_ENV" ]]; then
  echo "❌  Missing .env.aws — copy .env.aws.example and fill in your values."
  echo "    cp .env.aws.example .env.aws"
  exit 1
fi

# shellcheck disable=SC1090
source "$AWS_ENV"

# Validate required variables
REQUIRED_VARS=(
  AWS_ACCOUNT_ID AWS_REGION
  EC2_HOST EC2_USER EC2_KEY_PATH
  ECR_REPO_WEB ECR_REPO_SERVER
)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌  $var is not set in .env.aws"
    exit 1
  fi
done

# ── Args ──────────────────────────────────────────────────────────────────────
DRY_RUN=false
TAG=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *)         TAG="$arg" ;;
  esac
done

# Default tag = git short SHA (falls back to "latest" outside a git repo)
if [[ -z "$TAG" ]]; then
  TAG="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo 'latest')"
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMG_WEB="${ECR_REGISTRY}/${ECR_REPO_WEB}:${TAG}"
IMG_WEB_LATEST="${ECR_REGISTRY}/${ECR_REPO_WEB}:latest"
IMG_SRV="${ECR_REGISTRY}/${ECR_REPO_SERVER}:${TAG}"
IMG_SRV_LATEST="${ECR_REGISTRY}/${ECR_REPO_SERVER}:latest"

# ── Helpers ───────────────────────────────────────────────────────────────────
run() {
  if $DRY_RUN; then echo "  [dry-run] $*"; else "$@"; fi
}

section() { echo; echo "━━━  $1  ━━━"; }

ssh_ec2() {
  # Runs a command on EC2 over SSH
  run ssh -i "$EC2_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=15 \
    "${EC2_USER}@${EC2_HOST}" "$@"
}

# ── 1. Pre-flight checks ──────────────────────────────────────────────────────
section "Pre-flight"

for tool in aws docker ssh; do
  if ! command -v "$tool" &>/dev/null; then
    echo "❌  '$tool' not found in PATH. Please install it first."; exit 1
  fi
done
echo "✅  Tools: aws, docker, ssh — all present"

if [[ ! -f "$EC2_KEY_PATH" ]]; then
  echo "❌  EC2 key not found at: $EC2_KEY_PATH"; exit 1
fi
chmod 600 "$EC2_KEY_PATH"
echo "✅  EC2 key: $EC2_KEY_PATH"

echo "   Tag:      $TAG"
echo "   Registry: $ECR_REGISTRY"
echo "   EC2 host: ${EC2_USER}@${EC2_HOST}"
if $DRY_RUN; then echo "   ⚠  DRY-RUN mode — no changes will be made"; fi

# ── 2. ECR login ──────────────────────────────────────────────────────────────
section "ECR Authentication"
echo "   Logging Docker into ECR..."
ECR_PASSWORD="$(aws ecr get-login-password --region "$AWS_REGION")"
if $DRY_RUN; then
  echo "  [dry-run] docker login --username AWS --password *** $ECR_REGISTRY"
else
  echo "$ECR_PASSWORD" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
fi
echo "✅  ECR login successful"

# ── 3. Build images ───────────────────────────────────────────────────────────
section "Docker Build"
echo "   Building web image..."
run docker build -f "$ROOT_DIR/Dockerfile.web" -t "$IMG_WEB" -t "$IMG_WEB_LATEST" "$ROOT_DIR"

echo "   Building server image..."
run docker build -f "$ROOT_DIR/Dockerfile.server" -t "$IMG_SRV" -t "$IMG_SRV_LATEST" "$ROOT_DIR"
echo "✅  Images built"

# ── 4. Push to ECR ────────────────────────────────────────────────────────────
section "Push to ECR"
echo "   Pushing web image ($TAG + latest)..."
run docker push "$IMG_WEB"
run docker push "$IMG_WEB_LATEST"

echo "   Pushing server image ($TAG + latest)..."
run docker push "$IMG_SRV"
run docker push "$IMG_SRV_LATEST"
echo "✅  Images pushed to ECR"

# ── 5. Upload compose files to EC2 ───────────────────────────────────────────
section "Sync Config to EC2"
REMOTE_DIR="${REMOTE_APP_DIR:-/home/${EC2_USER}/fluxforge}"

echo "   Uploading docker-compose files + nginx config..."
run scp -i "$EC2_KEY_PATH" \
  -o StrictHostKeyChecking=no \
  "$ROOT_DIR/docker-compose.yml" \
  "$ROOT_DIR/docker-compose.prod.yml" \
  "${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}/"

# Also sync nginx config if it exists
if [[ -d "$ROOT_DIR/nginx" ]]; then
  run ssh -i "$EC2_KEY_PATH" -o StrictHostKeyChecking=no \
    "${EC2_USER}@${EC2_HOST}" "mkdir -p ${REMOTE_DIR}/nginx"
  run scp -i "$EC2_KEY_PATH" -o StrictHostKeyChecking=no \
    "$ROOT_DIR/nginx/"* "${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}/nginx/"
fi
echo "✅  Compose files synced"

# ── 6. Deploy on EC2 ─────────────────────────────────────────────────────────
section "Deploy on EC2"
echo "   Connecting to ${EC2_HOST}..."

ssh_ec2 bash -s << REMOTE
set -euo pipefail

ECR_REGISTRY="${ECR_REGISTRY}"
IMG_WEB="${IMG_WEB_LATEST}"
IMG_SRV="${IMG_SRV_LATEST}"
REMOTE_DIR="${REMOTE_DIR}"
AWS_REGION="${AWS_REGION}"

echo "  → Logging into ECR on EC2..."
aws ecr get-login-password --region "\$AWS_REGION" \\
  | sudo docker login --username AWS --password-stdin "\$ECR_REGISTRY"

echo "  → Pulling new images..."
sudo docker pull "\$IMG_WEB"
sudo docker pull "\$IMG_SRV"

echo "  → Writing image tags into override file..."
cat > "\$REMOTE_DIR/.env.images" <<EOF
WEB_IMAGE=\$IMG_WEB
SERVER_IMAGE=\$IMG_SRV
EOF

echo "  → Restarting stack (swap available for t3.micro)..."
cd "\$REMOTE_DIR"
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml \\
  --env-file .env --env-file .env.images up -d --remove-orphans

echo "  → Pruning old images (free up disk on t3.micro)..."
sudo docker image prune -f --filter "until=24h"

echo "  → Stack status:"
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
REMOTE

# ── 7. Health check ───────────────────────────────────────────────────────────
section "Health Check"
APP_URL="${APP_URL:-http://${EC2_HOST}}"
echo "   Waiting for app to respond at ${APP_URL}/api/health ..."

if $DRY_RUN; then
  echo "  [dry-run] skipping health check"
else
  for i in {1..12}; do
    HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" \
      --max-time 5 "${APP_URL}/api/health" 2>/dev/null || echo 000)"
    if [[ "$HTTP_CODE" == "200" ]]; then
      echo "✅  Health check passed (HTTP 200) — deploy complete!"
      echo "   App: ${APP_URL}"
      break
    fi
    echo "   Attempt $i/12 — HTTP ${HTTP_CODE}, retrying in 5s..."
    sleep 5
    if [[ "$i" == "12" ]]; then
      echo "⚠️   Health check timed out. Check EC2 logs:"
      echo "   ssh -i $EC2_KEY_PATH ${EC2_USER}@${EC2_HOST} 'docker compose -f fluxforge/docker-compose.yml logs --tail=50'"
      exit 1
    fi
  done
fi

echo
echo "🚀  Deploy tag [${TAG}] complete →  ${APP_URL}"

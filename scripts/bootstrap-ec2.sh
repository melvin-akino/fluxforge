#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# bootstrap-ec2.sh — One-time setup for a fresh Amazon Linux 2023 EC2 instance
#
# Run this ONCE after launching your EC2 instance (t3.micro or any size).
# It will:
#   1. Create a 2 GB swap file  (essential on t3.micro's 1 GB RAM)
#   2. Install Docker + Docker Compose plugin
#   3. Install AWS CLI v2
#   4. Create the app directory and .env file
#   5. Set vm.swappiness=10 so RAM is preferred over swap
#
# Usage (from your local machine):
#   chmod +x scripts/bootstrap-ec2.sh
#   ./scripts/bootstrap-ec2.sh
#
# Or run it directly on the EC2 instance:
#   bash <(curl -s https://raw.githubusercontent.com/melvin-akino/fluxforge/master/scripts/bootstrap-ec2.sh)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AWS_ENV="$ROOT_DIR/.env.aws"

# ── Load config ───────────────────────────────────────────────────────────────
if [[ ! -f "$AWS_ENV" ]]; then
  echo "❌  Missing .env.aws — copy .env.aws.example and fill in your values first."
  exit 1
fi
# shellcheck disable=SC1090
source "$AWS_ENV"

REQUIRED_VARS=(EC2_HOST EC2_USER EC2_KEY_PATH)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌  $var is not set in .env.aws"; exit 1
  fi
done

chmod 600 "$EC2_KEY_PATH"
REMOTE_DIR="${REMOTE_APP_DIR:-/home/${EC2_USER}/fluxforge}"

echo
echo "━━━  FluxForge EC2 Bootstrap  ━━━"
echo "   Host:       ${EC2_USER}@${EC2_HOST}"
echo "   App dir:    ${REMOTE_DIR}"
echo "   Swap:       2 GB"
echo

# ── Prompt for JWT secret ─────────────────────────────────────────────────────
read -r -s -p "Enter a JWT_SECRET (min 32 chars, will be written to EC2 .env): " JWT_SECRET
echo
if [[ ${#JWT_SECRET} -lt 32 ]]; then
  echo "❌  JWT_SECRET must be at least 32 characters."
  echo "   Tip: openssl rand -hex 32"
  exit 1
fi

# ── Run bootstrap on EC2 ─────────────────────────────────────────────────────
echo "Connecting to ${EC2_HOST} ..."

ssh -i "$EC2_KEY_PATH" \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=15 \
  "${EC2_USER}@${EC2_HOST}" \
  JWT_SECRET="$JWT_SECRET" REMOTE_DIR="$REMOTE_DIR" bash -s << 'REMOTE'
set -euo pipefail

section() { echo; echo "──  $1"; }

# ── 1. Swap (2 GB) ────────────────────────────────────────────────────────────
section "Swap"
if swapon --show | grep -q '/swapfile'; then
  echo "   Swap already active — skipping"
else
  echo "   Creating 2 GB swap file at /swapfile..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile

  # Persist across reboots
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab > /dev/null
  fi
  echo "   ✅  2 GB swap active"
fi

# Prefer RAM — only use swap when RAM is under 10% free
sudo sysctl -w vm.swappiness=10 > /dev/null
if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
  echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf > /dev/null
fi
echo "   vm.swappiness = 10"

# ── 2. Docker ─────────────────────────────────────────────────────────────────
section "Docker"
if command -v docker &>/dev/null; then
  echo "   Docker already installed ($(docker --version))"
else
  echo "   Installing Docker..."
  sudo dnf update -y -q
  sudo dnf install -y -q docker
  sudo systemctl enable --now docker
  echo "   ✅  Docker installed"
fi

# Add user to docker group (takes effect on next login)
if ! groups "$USER" | grep -q docker; then
  sudo usermod -aG docker "$USER"
  echo "   Added $USER to docker group (re-login required)"
fi

# ── 3. Docker Compose plugin ──────────────────────────────────────────────────
section "Docker Compose"
if docker compose version &>/dev/null 2>&1; then
  echo "   Docker Compose already installed ($(docker compose version))"
else
  echo "   Installing Docker Compose plugin..."
  COMPOSE_VERSION="$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest \
    | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')"
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -fsSL \
    "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  echo "   ✅  Docker Compose v${COMPOSE_VERSION} installed"
fi

# ── 4. AWS CLI ────────────────────────────────────────────────────────────────
section "AWS CLI"
if command -v aws &>/dev/null; then
  echo "   AWS CLI already installed ($(aws --version 2>&1 | head -1))"
else
  echo "   Installing AWS CLI v2..."
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp/aws-install
  sudo /tmp/aws-install/aws/install
  rm -rf /tmp/awscliv2.zip /tmp/aws-install
  echo "   ✅  AWS CLI installed"
fi

# ── 5. App directory + .env ───────────────────────────────────────────────────
section "App directory"
mkdir -p "$REMOTE_DIR"
mkdir -p "$REMOTE_DIR/nginx"

ENV_FILE="$REMOTE_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "   .env already exists — skipping (edit manually if needed)"
else
  cat > "$ENV_FILE" << EOF
PORT=8081
DB_PATH=/data/fluxforge.db
UPLOAD_DIR=/data/uploads
JWT_SECRET=${JWT_SECRET}
EOF
  chmod 600 "$ENV_FILE"
  echo "   ✅  .env written to $ENV_FILE"
fi

# ── 6. Summary ────────────────────────────────────────────────────────────────
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  Bootstrap complete!"
echo
echo "Memory:"; free -h
echo
echo "Swap:";   swapon --show
echo
echo "Docker:"; docker --version
echo "Compose:"; docker compose version
echo "AWS CLI:"; aws --version 2>&1 | head -1
echo
echo "Next step — deploy the app:"
echo "  ./scripts/deploy-aws.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REMOTE

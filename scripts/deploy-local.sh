#!/usr/bin/env bash
# Start FluxForge web stack locally with Docker Compose.
# Usage:
#   ./scripts/deploy-local.sh           # dev mode (hot-reload not included in Docker)
#   ./scripts/deploy-local.sh prod      # layered with docker-compose.prod.yml
set -euo pipefail

MODE="${1:-dev}"
ENV_FILE=".env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "⚠  No .env file found. Copying from .env.example"
  cp .env.example .env
  echo "   Edit .env and set JWT_SECRET before going to production."
fi

if [[ "$MODE" == "prod" ]]; then
  echo "▶  Starting FluxForge (production)"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d
else
  echo "▶  Starting FluxForge (dev)"
  docker compose --env-file "$ENV_FILE" up --build
fi

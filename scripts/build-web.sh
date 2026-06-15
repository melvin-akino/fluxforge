#!/usr/bin/env bash
# Build and optionally push the FluxForge web Docker image.
# Usage:
#   ./scripts/build-web.sh                    # build locally as fluxforge-web:latest
#   REGISTRY=ghcr.io/yourorg ./scripts/build-web.sh [tag]
set -euo pipefail

TAG="${1:-latest}"
REGISTRY="${REGISTRY:-}"
IMAGE="fluxforge-web:${TAG}"

if [[ -n "$REGISTRY" ]]; then
  IMAGE="${REGISTRY}/fluxforge-web:${TAG}"
fi

echo "▶  Building ${IMAGE}"
docker build -f Dockerfile.web -t "$IMAGE" .

if [[ -n "$REGISTRY" ]]; then
  echo "▶  Pushing ${IMAGE}"
  docker push "$IMAGE"
fi

echo "✅  Done: ${IMAGE}"

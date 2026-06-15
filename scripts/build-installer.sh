#!/usr/bin/env bash
# Build the FluxForge desktop installer natively.
# Tauri cannot cross-compile — run this script on the target OS.
#
# Prerequisites:
#   - Rust + Cargo  (rustup.rs)
#   - Node.js 18+
#   - pnpm 8+
#   - Tauri system deps: https://tauri.app/v1/guides/getting-started/prerequisites
#
# Outputs (in PITauri/src-tauri/target/release/bundle/):
#   macOS  → .dmg + .app
#   Windows → .msi + .exe (NSIS)
#   Linux  → .deb + .AppImage
set -euo pipefail

echo "▶  Installing workspace deps"
pnpm install --frozen-lockfile

echo "▶  Building FluxForge Desktop"
cd PITauri
pnpm run tauri build

echo "✅  Installer artifacts:"
find src-tauri/target/release/bundle -type f \( -name "*.dmg" -o -name "*.msi" -o -name "*.deb" -o -name "*.AppImage" -o -name "*.exe" \) 2>/dev/null || true

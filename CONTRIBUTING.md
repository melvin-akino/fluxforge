# Contributing to FluxForge

Thank you for your interest in contributing!

## Getting Started

```bash
# 1. Fork and clone
git clone https://github.com/yourorg/fluxforge.git
cd fluxforge

# 2. Install deps (requires pnpm 8+)
pnpm install

# 3. Start the dev stack
pnpm dev:server   # Express API on :8081
pnpm dev:web      # Vue web on :5174
```

For the desktop app, you also need Rust + Cargo: https://rustup.rs

## Running Tests

```bash
node --test tests/sim-engine.test.js tests/uds-schema.test.js tests/core-logic.test.js
```

Server integration tests (requires a running server):

```bash
node --test tests/server-api.test.js
```

## Pull Requests

- One logical change per PR.
- All tests must pass (`node --test tests/sim-engine.test.js tests/uds-schema.test.js tests/core-logic.test.js`).
- Vite build must succeed (`cd PIWeb && pnpm run build`).
- No new PI-specific brand strings — use the generic family names (HPFC-1, IFC-CE, etc.).

## Code Style

- Vue 3 `<script setup>` composition API throughout.
- No TypeScript — plain JS with JSDoc where helpful.
- Shared UI logic goes in `packages/shared/src/` only.
- Platform-specific code stays in `PIWeb/` or `PITauri/`.
- Never import `httpApi` or `tauriApi` directly in shared components — use the `api` proxy.

## Project Structure

See [`CLAUDE.md`](CLAUDE.md) for the full architecture reference and engineering rules.

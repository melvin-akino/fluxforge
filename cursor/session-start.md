# FluxForge — Session Start Context

Paste this at the beginning of every new Cursor AI chat session.

---

## Project: FluxForge

A flyback transformer design tool delivered as both a web app and a native desktop app from a single shared codebase.

## Stack
- **Frontend:** Vue 3 (Composition API, `<script setup>`), Pinia, Vue Router, Vite
- **Backend:** Express 4, sql.js (SQLite in WebAssembly), custom JWT auth, multer
- **Desktop:** Tauri v2 wrapping the same Vue frontend
- **Infra:** Docker (nginx:alpine + node:22-alpine), AWS ECR + EC2 t3.micro
- **Package manager:** pnpm 10.33 workspaces

## Monorepo Layout
```
fluxforge/
├── packages/shared/src/    ← @fluxforge/shared — all Vue SFCs + engine
├── PIWeb/                  ← web shell (Vite, registerAdapter(httpApi))
├── PITauri/                ← desktop shell (Tauri, registerAdapter(tauriApi))
├── server/                 ← Express REST API
├── tests/                  ← Node.js built-in test runner
├── nginx/default.conf      ← SPA fallback + /api proxy to server:8081
├── Dockerfile.web          ← node:22-alpine builder → nginx:alpine
├── Dockerfile.server       ← node:22-alpine
├── docker-compose.yml      ← dev
├── docker-compose.prod.yml ← prod (uses ECR images via SERVER_IMAGE/WEB_IMAGE)
└── scripts/setup-and-deploy.sh ← one-shot AWS deploy
```

## Key Architectural Rules (never violate)
1. All shared components call `api.method()` through the Proxy adapter — never import httpApi/tauriApi directly
2. `designStore.wizardActive` is the only mechanism for hiding router-view when a design is open
3. Single `<style scoped>` per SFC — SchematicDiagram.vue must return 1 from `grep -c '<style'`
4. Always deep-clone UDS before mutation: `JSON.parse(JSON.stringify(uds))`
5. Production compose uses `image:` from ECR — never `build:` in prod

## Current Phase Status
| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Rebrand PI Expert → FluxForge |
| Phase 2 | ✅ Complete | Docker + AWS EC2 deployment |
| Phase 3 | 🔴 Not started | GitHub Actions CI + build-installer |

## Live Deployment
- URL: http://ec2-47-129-112-139.ap-southeast-1.compute.amazonaws.com
- Region: ap-southeast-1
- Instance: t3.micro, Amazon Linux 2023
- Key: ~/.ssh/fluxforge-ec2.pem

## Task Format (always use this structure)
When I ask you to implement something, respond with:
1. Objective
2. Scope boundaries
3. Files affected
4. Implementation plan
5. Code changes (diffs only — never full file rewrites)
6. Validation checklist
7. Risks
8. Next recommended step

---

Current session goal: [FILL IN WHAT YOU WANT TO DO]

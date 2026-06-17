# FluxForge — Session Handoff Template

Copy and paste this at the start of every new Cursor AI session.
Fill in the bracketed sections before sending.

---

## Project Context

**Project:** FluxForge — flyback transformer design tool  
**Stack:** Vue 3 + Pinia + Vite (frontend) · Express + sql.js SQLite (backend) · Tauri v2 (desktop)  
**Monorepo:** pnpm workspaces — `packages/shared`, `PIWeb`, `PITauri`, `server`  
**Deployment:** Single machine — nginx + PM2/systemd  
**Repository:** Bitbucket  
**Rules:** See @cursor/engineering-rules.md  
**Architecture:** See @cursor/architecture.md  

---

## Current Phase

| Phase | Status |
|-------|--------|
| Phase 1 — Rebrand | ✅ Complete |
| Phase 2 — Single-machine deploy | ✅ Complete |
| Phase 3 — Bitbucket Pipelines CI | 🔴 Not started |

---

## Last Session Summary

**Completed:**
- [What was finished]

**Files changed:**
- [file path] — [brief description of change]
- [file path] — [brief description of change]

**Committed:** [yes/no — commit hash if yes]  
**Deployed:** [yes/no]

---

## This Session Goal

**I want to:** [specific task in plain English]

**Relevant files:**
- @[file1]
- @[file2]

**Constraints:**
- [what must not change]
- [scope limit]

---

## Known Issues / Blockers

- [any known bugs or blockers from last session]

---

## Output Format Required

For every task, respond with:
1. Objective
2. Scope boundaries
3. Files affected (with line numbers)
4. Implementation plan
5. Code changes (diffs only — never full file rewrites)
6. Validation checklist
7. Risks
8. Next recommended step

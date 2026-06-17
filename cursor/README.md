# FluxForge — Cursor AI Documentation

This folder contains everything you need to continue developing FluxForge in Cursor AI.
Load these files at the start of every session.

## How to Use in Cursor

1. Copy `.cursorrules` to your project root (if not already there)
2. At the start of every chat session, paste the contents of `session-start.md` as your first message
3. Reference specific docs with `@file` mentions as needed

## File Index

| File | Purpose | When to use |
|------|---------|-------------|
| [`.cursorrules`](.cursorrules) | Auto-loaded rules for every session | Always (place in project root) |
| [`session-start.md`](session-start.md) | Paste at the start of every new chat | Every new session |
| [`architecture.md`](architecture.md) | Tech stack, monorepo, patterns | When making structural changes |
| [`engineering-rules.md`](engineering-rules.md) | Coding standards and constraints | When in doubt |
| [`poc-running.md`](poc-running.md) | Running web app and desktop build | Onboarding, environment setup |
| [`workflow.md`](workflow.md) | Step-by-step build & deploy | Deploying, redeploying |
| [`ai-workflow.md`](ai-workflow.md) | AI prompting patterns for this project | Starting new features |
| [`handoff-template.md`](handoff-template.md) | Session handoff template | End/start of sessions |

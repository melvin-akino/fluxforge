# FluxForge — AI-Assisted Development with Claude Code

This documents how Claude Code (and Claude.ai web) were used throughout this project, the patterns that worked well, and how to replicate the workflow in Cursor AI.

---

## Tools & Agents Used

### Claude Code (CLI)
The primary development environment. Claude Code was used for:
- Targeted file edits (never full rewrites)
- Running bash commands (git, docker, aws CLI, pnpm)
- Reading and cross-referencing multiple files simultaneously
- Debugging AWS deployment errors in real-time

### Claude.ai Web (prior to Claude Code)
Early development (15+ sessions) used Claude.ai web for:
- Scaffolding the monorepo structure
- Building the core Vue SFCs (DesignWizard, SchematicDiagram, MagneticsDesigner)
- Designing the UDS schema
- Writing the test suite

The CLAUDE.md file was written at the end of the web sessions to carry full context into Claude Code.

---

## Claude Code Skills & Agents Used

### Built-in Agent Types

| Agent | How it was used |
|-------|----------------|
| **Explore** (read-only search) | Auditing MagneticsDesigner layout — finding all SVG viewBox dimensions, overflow coordinates, CSS flex values across 3500+ line file |
| **General-purpose** | Multi-file research tasks spanning codebase |
| **Plan** | Not explicitly used — planning done inline via CLAUDE.md |

### Key Tool Patterns

**Parallel tool calls** — reading multiple files simultaneously:
```
Read(Dockerfile.web) + Read(Dockerfile.server) + Read(.env.aws.example)
→ understand full Docker/config picture in one turn
```

**Grep before Edit** — always locate the exact line before changing:
```
Grep(pattern="\.p-elec\s+\{") → line 3161
Edit(file, old_string="...", new_string="...")
```

**Bash for validation**:
```bash
git log --oneline -5        # verify commit history
grep -c '<style' file.vue   # verify single style block
curl http://host/api/health # verify deployment
```

---

## CLAUDE.md — The Session Memory File

`CLAUDE.md` (checked in at repo root) is auto-loaded by Claude Code at the start of every session. It contains:

- Project identity and rename targets
- Repository structure (full tree)
- Key architectural decisions with code examples
- Component API surfaces (what each component exposes)
- Phase plan (Phase 1: Rebrand, Phase 2: Docker, Phase 3: GitHub)
- Known bugs and watch items
- Session history summary

**This is the most important file for AI continuity.** Keep it updated after each major phase.

### Template for CLAUDE.md sections:
```markdown
## KEY ARCHITECTURE DECISIONS (do not violate)

### 1. Pattern Name
\`\`\`js
// Code example showing correct usage
\`\`\`
**Rule:** Plain English statement of what must not change.
```

---

## Prompting Patterns That Worked

### Starting a session
```
"Read CLAUDE.md. Confirm you understand the project state.
Then begin [Phase X / specific task]."
```

### Targeted fixes (most common)
```
"Fix [specific bug] in [file]. The issue is [root cause].
Only change [exactly what needs changing]."
```

### Assessments before large changes
```
"Assess the current implementation of [component/feature].
List all issues found before making any changes."
```
→ Spawns Explore agent → returns audit → then implement fixes.

### Deployment debugging
Paste the exact error output into chat. Claude Code reads the error,
identifies the root cause (IAM policy, path mangling, SSL cert),
and edits only the affected file/command.

### Avoiding scope creep
The engineering rules (`engineering-rules.md`) are included in CLAUDE.md.
This prevents the AI from adding unrequested features, comments, or abstractions.

---

## Replicating This in Cursor AI

### Setup

1. Copy `CLAUDE.md` → rename to `cursor-rules.md` or add to `.cursorrules`
2. Copy `docs/engineering-rules.md` content into `.cursorrules`
3. Install the Cursor AI extension and connect to Claude Sonnet (latest)

### .cursorrules structure
```
# Project: FluxForge
# Stack: Vue 3, Pinia, Express, sql.js, Docker, AWS EC2

## Engineering Rules
[paste from docs/engineering-rules.md]

## Architecture (do not violate)
[paste key sections from docs/architecture.md]

## Current Phase
[paste current phase plan from CLAUDE.md]
```

### Cursor-specific tips

| Claude Code pattern | Cursor equivalent |
|--------------------|------------------|
| `Read(file)` | Cmd+Click to open file, @ mention in chat |
| `Grep(pattern)` | Cmd+Shift+F (project search), then @ mention result |
| `Bash(command)` | Integrated terminal (Cursor doesn't run bash directly) |
| `Edit(old, new)` | Cursor inline edit (Cmd+K) or chat with file context |
| Explore agent | Ask Cursor to "search and summarize X across the codebase" |

### Workflow in Cursor
```
1. Open relevant files and @ mention them in chat
2. Paste CLAUDE.md content as system context at start of session
3. Describe task with: objective + files affected + constraints
4. Review diff in Cursor's diff view before accepting
5. Run validation in integrated terminal
6. Commit via Cursor's git panel
```

---

## Persistent Memory System

Claude Code maintains memory files at:
```
C:\Users\Windows\.claude\projects\C--Projects-fluxforge\memory\
├── MEMORY.md                    ← index (auto-loaded)
└── feedback_windows_openssh.md  ← use Windows OpenSSH in deploy scripts
```

### Memory types used
| Type | Example |
|------|---------|
| **feedback** | "Use Windows OpenSSH (`C:/Windows/System32/OpenSSH/ssh.exe`) for all SSH/SCP calls" |
| **project** | Deployment pipeline status, AWS account details |
| **user** | Developer preferences, tool constraints |

In Cursor: maintain a `docs/session-notes.md` manually, and reference it at the start of each session.

---

## What NOT to Ask the AI to Do

| Task | Why |
|------|-----|
| Rewrite entire files | Creates drift, loses existing logic |
| Add "nice to have" features without asking | Scope creep |
| Generate mocks/placeholders | Leads to incomplete implementations |
| Fix multiple unrelated bugs in one prompt | Hard to review, more likely to introduce errors |
| Skip the assessment step for large components | Fixes the wrong thing |

---

## Session Handoff Template

Use this to start a new Claude Code or Cursor session after a break:

```
Read CLAUDE.md and docs/workflow.md.

Current state:
- Phase [X] is [complete/in progress]
- Last thing done: [specific task]
- Pending: [next task]
- Known issues: [any blockers]

Continue with: [next specific task]
```

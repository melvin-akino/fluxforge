# FluxForge — AI-Assisted Development in Cursor

Patterns and techniques for effective AI-assisted development on this project.

---

## How to Set Up Cursor for This Project

### 1. Place `.cursorrules` at project root
The `.cursorrules` file in the `cursor/` folder belongs at the repo root.
Cursor loads it automatically and injects it as system context for every chat.

```bash
cp cursor/.cursorrules .cursorrules
```

### 2. Start every session with `session-start.md`
Open a new Cursor chat and paste the contents of `cursor/session-start.md`.
This gives the AI the project identity, stack, rules, and current phase in one shot.
Update the last line with what you want to do in this session.

### 3. Reference files with @
In Cursor chat, use `@filename` to attach file content directly:
```
@packages/shared/src/components/MagneticsDesigner.vue
Fix the layout issue in the spiral view — the stats text at y=360 is outside the viewBox (height=340).
```

---

## Prompting Patterns That Work

### Starting a task
```
Read @cursor/session-start.md

Today I want to: [specific task]
The relevant files are: @[file1] @[file2]
```

### Targeted bug fix (most common)
```
Fix [specific bug] in @[file].
The issue is [root cause — be specific].
Only change [exactly what needs changing].
Do not touch anything else.
```

### Assessment before large changes
```
Audit @[large file] for [specific problem type].
List all issues found. Do not make any changes yet.
```
→ Review the findings → then ask for fixes one issue at a time.

### Feature addition
```
Add [feature] to @[file].

Objective: [one sentence]
Constraints: [what must not change]
Expected output: [what the feature should do]

Follow the output format: objective, scope, files, plan, diffs, validation, risks, next step.
```

### Server debugging
Paste the exact error output and ask:
```
Here is the error from the server:
[paste error]

What is the root cause and what is the minimal fix?
```

---

## Task Output Format

Always ask the AI to respond in this structure:

1. **Objective** — one sentence
2. **Scope boundaries** — what is out of scope
3. **Files affected** — with line numbers where known
4. **Implementation plan** — numbered steps
5. **Code changes** — diffs only, never full file rewrites
6. **Validation checklist** — how to verify
7. **Risks** — what could break
8. **Next recommended step**

Enforce this by including it in your prompt or in `.cursorrules`.

---

## Assessment Before Touching Large Files

For any file over 500 lines, always audit first:

```
Audit @[file] for [problem type].
For each view/section/function report:
1. [specific metric 1]
2. [specific metric 2]
3. Issues found

Do not modify anything. Report only.
```

This prevents fixing the wrong thing and narrows the scope of subsequent edits.

**Example — used on MagneticsDesigner.vue (3700+ lines):**
```
Audit @MagneticsDesigner.vue for SVG layout issues.
For each mechanical diagram view report:
1. The SVG viewBox dimensions
2. Whether content coordinates exceed the viewBox
3. Whether text labels are clipped
4. Any overlapping elements
Do not make any changes.
```

---

## Phased Development Model

Break work into phases. Never start phase N+1 without finishing phase N.

```
Phase 0: Bootstrap (monorepo, package.json, workspace config)
Phase 1: Core features (SimEngine, DesignWizard, Schematic, Magnetics)
Phase 2: Branding (rename all references)
Phase 3: Single-machine deployment (nginx + PM2)
Phase 4: Iteration (feature work, bugfixes, redeploys)
```

After each phase, validate before moving on:
```bash
# Phase 2 validation
grep -rn "TOPSwitch\|InnoSwitch" --include="*.vue" --include="*.js" --exclude-dir=node_modules .
# Expected: 0 results

# Phase 3 validation
curl http://localhost/api/health
# Expected: HTTP 200
```

---

## What NOT to Ask the AI

| Request | Why to avoid |
|---------|-------------|
| "Rewrite this file" | Creates drift, loses existing logic, impossible to review |
| "Add improvements while you're at it" | Scope creep, untested changes |
| "Generate placeholders for now" | Leads to half-finished implementations reaching production |
| "Fix everything in one go" | Too large to review safely; break into individual fixes |
| "Just make it work somehow" | Produces hacks that need refactoring later |

---

## Session Handoff

At the end of a session, note:
- What was completed
- What files were changed
- What is pending
- Any known issues or blockers

At the start of the next session, paste `session-start.md` and add:
```
Last session completed: [what was done]
Files changed: [list]
Next task: [specific next step]
```

See `handoff-template.md` for the full template.

---

## Useful Cursor Shortcuts for This Project

| Action | Shortcut |
|--------|---------|
| Open file by name | Ctrl + P |
| Search across project | Ctrl + Shift + F |
| Attach file to chat | @ in chat input |
| Inline edit | Select code → Ctrl + K |
| Accept diff | Click "Accept" in diff view |
| Open terminal | Ctrl + ` |
| Run test | Terminal: `node --test tests/sim-engine.test.js` |

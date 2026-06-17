# FluxForge — Engineering Rules

These rules are enforced on every code change regardless of who (or what) is making them.

---

## Core Rules

| Rule | Detail |
|------|--------|
| **Never regenerate entire files** | Targeted edits and diffs only. Never rewrite a file from scratch unless explicitly required. |
| **One subsystem at a time** | Complete and validate before moving on to the next change. |
| **Stop after each phase** | Wait for explicit approval before continuing to the next phase. |
| **No placeholders, no mocks** | Production-grade patterns only. No `// TODO`, no stub returns, no hardcoded test data in production paths. |
| **No unnecessary abstractions** | Three similar lines is better than a premature abstraction. Don't design for hypothetical future requirements. |
| **No comments on the obvious** | Only add a comment when the WHY is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug. |
| **No half-finished implementations** | Either a feature is complete and tested, or it isn't merged. |
| **No error handling for impossible scenarios** | Only validate at system boundaries (user input, external APIs). Trust internal code and framework guarantees. |

---

## Pre-Flight Checklist

Run this before every code change:

1. **Architecture consistency** — Does this change violate any of the key architectural decisions (platform abstraction, wizardActive signal, UDS schema shape)?
2. **Dependency graph impact** — Does changing this file break any importers?
3. **Async flow correctness** — Are all promises awaited? Are race conditions possible?
4. **Test coverage affected** — Which test files need to be updated?
5. **Security** — Does this introduce XSS, injection, or credential exposure?

---

## Output Format for Every Task

When implementing a task, always produce output in this order:

1. **Objective** — one sentence
2. **Scope boundaries** — what is explicitly out of scope
3. **Files affected** — list with line ranges where known
4. **Implementation plan** — numbered steps
5. **Code changes** — diffs only, never full file rewrites
6. **Validation checklist** — how to verify the change works
7. **Risks** — what could break
8. **Next recommended step**

---

## Architecture Rules (Never Violate)

### Platform Abstraction
```js
// CORRECT — shared components call api agnostically
import { api } from '../api/index.js';
api.getFiles();

// WRONG — never import adapters directly in shared components
import { httpApi } from '../api/http.js';
```

### wizardActive Signal
```js
// CORRECT — read from Pinia store
const designWizardActive = computed(() => designStore.wizardActive);

// WRONG — do not read from component ref
const designWizardActive = computed(() => designWizardRef.value?.isActive?.value);
```

### Single `<style scoped>` per SFC
After editing any `.vue` file, verify:
```bash
grep -c '<style' packages/shared/src/components/SchematicDiagram.vue
# Must return 1
```

### UDS Mutations
Always deep-clone before writing to UDS:
```js
const newUds = JSON.parse(JSON.stringify(uds));
newUds.components[ref] = { ...edits };
emit('update:uds', newUds);
```

---

## Docker Rules

- Never install pnpm via `corepack` inside Docker on Windows — use `npm install -g pnpm@x.x.x`
- Set `npm config set strict-ssl false` before npm installs in Docker on corporate networks
- The web image must never contain Node.js at runtime — only nginx:alpine
- The server image mounts a named volume at `DB_PATH` — never bake the database into the image
- Production compose always uses `image:` from ECR — never `build:` in production
- Always include `--env-file .env` and `--env-file .env.images` in all `docker compose` commands on the server

---

## Windows / SSH Rules

- All SSH and SCP calls in bash scripts must use Windows OpenSSH: `C:/Windows/System32/OpenSSH/ssh.exe`
- Convert Unix paths to Windows paths before passing to Windows OpenSSH:
  ```bash
  win_path() { local p="${1/#\~/$HOME}"; echo "$p" | sed 's|^/\([a-zA-Z]\)/|\1:/|'; }
  WIN_KEY="$(win_path "$EC2_KEY_PATH")"
  ```
- Prefix all `aws` CLI calls that contain `/dev/` paths with `MSYS_NO_PATHCONV=1`
- Prefix all SSH heredoc calls that pass Unix paths as env vars with `MSYS_NO_PATHCONV=1`
- Always use `MSYS_NO_PATHCONV=1` before `"$SSH"` and `"$SCP"` calls

---

## Security Rules

- Never commit `.env`, `.env.aws`, or `*.pem` files — all are in `.gitignore`
- JWT secret minimum 32 characters
- SQLite DB lives on a named Docker volume — never in the image layer
- EC2 SSH port `:22` should be restricted to known IPs in production
- IAM role `fluxforge-ec2-role` has read-only ECR access — do not grant write access to the instance role

---

## Known Bugs / Watch Items

1. **Duplicate `<style scoped>`** — SchematicDiagram.vue had this bug before. Always verify after editing.
2. **`@fluxforge/shared` import alias** — Must be updated atomically with package.json rename. Vite alias `@shared` must also be kept.
3. **wizardActive reactivity** — Do NOT use `designWizardRef.value?.isActive?.value`. Use `designStore.wizardActive` only.
4. **HIT_BOXES mixed property names** — SchematicDiagram.vue HIT_BOXES has mixed `h` and `height` properties. The overlay template handles both.
5. **sql.js DB_PATH** — server/index.js uses `process.env.DB_PATH`. In Docker, mount a named volume at this path.

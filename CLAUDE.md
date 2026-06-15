# FluxForge — Claude Code Project Memory
> Auto-loaded by Claude Code on every session. Keep this file updated after each phase.

---

## ENGINEERING RULES (always enforced)

- **Never regenerate entire files** — targeted edits and diffs only
- **One subsystem at a time** — complete and validate before moving on
- **Stop after each phase** — wait for explicit approval before continuing
- **No placeholders, no mocks** — production-grade patterns only
- **Pre-flight checklist before every code change:**
  1. Architecture consistency
  2. Dependency graph impact
  3. Async flow correctness
  4. Token/cost implications
  5. Test coverage affected

**Output format for every task:**
1. Objective
2. Scope boundaries
3. Files affected
4. Implementation plan
5. Code changes (diffs only)
6. Validation checklist
7. Risks
8. Next recommended step

---

## PROJECT IDENTITY

| Field | Current (broken) | Target |
|---|---|---|
| App name | PI Expert / PIExpert | **FluxForge** |
| npm name | `pi-expert-monorepo` | `fluxforge` |
| Shared pkg | `@pi/shared` | `@fluxforge/shared` |
| Tauri productName | `PIExpert` | `FluxForge` |
| Tauri identifier | `com.piexpert.desktop` | `io.fluxforge.desktop` |
| Server pkg | `pi-server` | `fluxforge-server` |
| Brand color | PI navy #1B3A6B | Teal #0D7377 |
| CSS prefix | `--pi-*` | `--ff-*` |
| Import alias (Vite) | `@pi/shared` | `@fluxforge/shared` |
| IC families | TOPSwitch / InnoSwitch / TinySwitch / LinkSwitch | HPFC / IFC / LPFC / PSC (generic) |

---

## REPOSITORY STRUCTURE

```
fluxforge/                          ← root (was pi-expert-monorepo)
├── CLAUDE.md                       ← this file
├── package.json                    ← pnpm workspace root
├── packages/
│   └── shared/                     ← @fluxforge/shared (was @pi/shared)
│       ├── package.json
│       └── src/
│           ├── index.js            ← barrel export
│           ├── api/
│           │   ├── index.js        ← Proxy adapter (registerAdapter pattern)
│           │   ├── http.js         ← HTTP adapter (web)
│           │   └── tauri.js        ← Tauri IPC adapter (desktop)
│           ├── components/         ← 17 Vue SFCs (all shared)
│           │   ├── AppMenuBar.vue
│           │   ├── BOMPanel.vue
│           │   ├── BoardLayout.vue
│           │   ├── ComponentSetsManager.vue
│           │   ├── ComponentsManager.vue
│           │   ├── DesignNotes.vue
│           │   ├── DesignResultsPanel.vue
│           │   ├── DesignTreePanel.vue
│           │   ├── DesignWizard.vue       ← 4032 lines
│           │   ├── FileManager.vue
│           │   ├── HelpSystem.vue         ← 52 articles
│           │   ├── MagneticsDatabase.vue
│           │   ├── MagneticsDesigner.vue  ← 3746 lines
│           │   ├── ProductPortfolio.vue
│           │   ├── SchematicDiagram.vue   ← 1700 lines
│           │   ├── TransformerConstruction.vue
│           │   └── WelcomeScreen.vue
│           ├── composables/
│           │   └── useI18n.js
│           ├── data/
│           │   ├── ComponentDatabase.js   ← 111 parts
│           │   ├── designTree.js
│           │   └── udsSchema.js
│           ├── engine/
│           │   └── SimEngine.js
│           ├── stores/
│           │   ├── useDesignStore.js
│           │   └── useFilesStore.js
│           └── styles/
│               └── brand.css             ← CSS custom properties
├── PIWeb/                          ← Web application shell
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js                 ← Router + Pinia + registerAdapter(httpApi)
│       ├── App.vue                 ← 186 lines
│       ├── stubs/
│       │   └── tauri-api-core.js   ← stubs out Tauri API for web build
│       ├── stores/
│       │   └── useAuthStore.js
│       └── views/
│           ├── LoginView.vue
│           ├── RegisterView.vue
│           ├── WelcomeView.vue
│           ├── FilesView.vue
│           ├── ComponentsView.vue
│           ├── MagneticsView.vue
│           ├── ComponentSetsView.vue
│           └── HelpView.vue
├── PITauri/                        ← Desktop application shell
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.vue                 ← 245 lines, view-stack navigator
│       ├── components/
│       │   ├── DesignPage.vue
│       │   ├── FilesPage.vue
│       │   └── SettingsPage.vue
│       └── src-tauri/
│           ├── Cargo.toml
│           ├── tauri.conf.json
│           └── capabilities/
│               └── default.json
├── server/                         ← Express.js REST API
│   ├── package.json
│   └── index.js                   ← sql.js + SQLite + multer
├── tests/
│   ├── sim-engine.test.js         ← 235 lines
│   ├── uds-schema.test.js         ← 155 lines
│   ├── core-logic.test.js         ← 511 lines
│   └── server-api.test.js         ← 285 lines
├── TDD.md                          ← Technical design document
└── README.md
```

---

## KEY ARCHITECTURE DECISIONS (do not violate)

### 1. Platform Abstraction Layer
```js
// packages/shared/src/api/index.js
// Proxy pattern — all shared components call api.method() agnostically
let _adapter = httpApi;
export function registerAdapter(adapter) { _adapter = adapter; }
export const api = new Proxy({}, { get(_, key) { return (...args) => _adapter[key]?.(...args); } });

// PIWeb/src/main.js  → registerAdapter(httpApi)   → HTTP calls to Express
// PITauri/src/main.js → registerAdapter(tauriApi) → Tauri IPC to Rust
```
**Rule:** Never import `httpApi` or `tauriApi` directly in shared components.

### 2. wizardActive Pinia Store Signal
```js
// packages/shared/src/stores/useDesignStore.js
const wizardActive = ref(false);
function setWizardActive(v) { wizardActive.value = !!v; }

// DesignWizard.vue watches isActive computed → calls designStore.setWizardActive(v)
// PIWeb/src/App.vue reads designStore.wizardActive → v-show="!designWizardActive" on main-content
```
**Rule:** This is the ONLY mechanism for hiding router-view when a design is active on web.
Do NOT revert to component ref chains — they don't propagate reactively across component boundaries.

### 3. DesignWizard Slot in App.vue (Web)
```html
<!-- PIWeb/src/App.vue -->
<DesignWizard class="dw-content-slot" @update:uds="onUdsUpdated" ... />
<main class="main-content" v-show="!designWizardActive">
  <router-view ... />
</main>
```
CSS: `.dw-content-slot { flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden; }`

### 4. Schematic Component Editor
- Click on schematic component → centered modal dialog (teleported to `<body>`)
- Modal has 3 tabs: Component DB | Parameters | Notes
- ComponentDB tab: filtered searchable table from `COMPONENT_DB[category][subcategory]`
- `confirmEdit()` → deep-clone UDS → write to `uds.components[ref]` → emit `update:uds`
- Modified refs rendered with solid blue outline + `✎ ref` badge in SVG overlay
- `modifiedRefs` is a `Set` stored in component state (not UDS — visual only)
- `frozenRefs` is separate — used for pin/freeze without edit

### 5. Export to CAD Chain
```
AppMenuBar emits 'export-cad'
  → PIWeb/App.vue: onExportCAD() → designWizardRef.value?.exportCAD()
  → PITauri/App.vue: onExportCAD() → activeDesignPageRef?.triggerExportCAD()
  → PITauri/DesignPage.vue: triggerExportCAD() → wizardRef.value?.exportCAD()
  → DesignWizard.vue: exportCAD() → buildCADComponents() → generateKiCadSchematic()
                    → ZIP (JSZip from CDN) containing:
                      .kicad_sch, _netlist.csv, _BOM.csv, README.txt
```

### 6. Single `<style scoped>` Rule
**Critical:** SchematicDiagram.vue previously had a duplicate `<style scoped>` bug that caused PostCSS
parse errors. Always verify: `grep -c '<style' SchematicDiagram.vue` must return 1.

### 7. UDS (Unified Design Schema)
```js
// Portable JSON design file format
{
  meta:  { fileName, family, topology, totalPower, inputSpec, createdAt },
  spec:  { input: { vMin, vMax, lineFreq }, outputs: [...], options: { VOR, KP, ... } },
  result: { Np, Ns, Nb, Lp_uH, coreName, gap_mm, efficiency, ... },
  components: { F1: {...}, C2: {...} },  // user-modified components
  bom: [...],
  designNotes: ''
}
```

---

## COMPONENT API SURFACE

### DesignWizard.vue
```js
defineExpose({
  startWizard,        // startWizard(payload) — opens wizard with pre-filled fields
  exportPDF,          // exports all tabs to PDF via jsPDF (CDN)
  exportCAD,          // exports KiCad zip
  openDesignProperties,
  rerunSimulation,
  optimizeDesign,
  switchTab,          // switchTab(tabName)
  validateDesign,
  isActive            // computed: wizardOpen || designReady || simulating || pickerOpen
})
```

### SchematicDiagram.vue
```js
defineEmits(['component-click', 'update:uds'])
defineProps({ uds: Object })
// Internal: COMP_CATEGORY map, getAlternatives(), openEditor(), confirmEdit()
// modifiedRefs: Set — refs with user-applied changes (renders blue)
// frozenRefs: Set — refs pinned by user (renders dashed blue)
```

### AppMenuBar emits (subset)
```js
'new-design', 'open-design', 'open-portfolio', 'go-home',
'save', 'save-as', 'export-all', 'export-cad', 'preferences',
'switch-tab', 'zoom-in', 'zoom-out', 'fit-all',
'design-properties', 'simulate', 'optimize', 'validate'
```

### useDesignStore.js API
```js
{ activeDesign, openDesign, clearDesign,
  currentDesign, designReady, setCurrentDesign, clearCurrentDesign,
  pendingWizardStart, requestWizardStart, consumeWizardStart,
  actionSignal, dispatchAction, consumeAction,
  wizardActive, setWizardActive }
```

---

## IC FAMILY CONFIG (FAMILY_CONFIG keys — must rename in Phase 1)

| Current key | New generic key | Category |
|---|---|---|
| `TOPSwitch-JX` | `HPFC-1` | High-Power Flyback Controller |
| `TOPSwitch-HX` | `HPFC-2` | High-Power Flyback Controller |
| `TOPSwitch-GX` | `HPFC-3` | High-Power Flyback Controller |
| `InnoSwitch3-CE` | `IFC-CE` | Integrated Flyback Controller |
| `InnoSwitch3-AE` | `IFC-AE` | Integrated Flyback Controller |
| `InnoSwitch3-EP` | `IFC-EP` | Integrated Flyback Controller |
| `TinySwitch-4` | `LPFC-1` | Low-Power Flyback Controller |
| `TinySwitch-LT` | `LPFC-2` | Low-Power Flyback Controller |
| `LinkSwitch-TN2` | `PSC-TN` | Primary-Side Controller |
| `LinkSwitch-XT2` | `PSC-XT` | Primary-Side Controller |
| `LinkSwitch-HP` | `PSC-HP` | Primary-Side Controller |

**Note:** TL431, EFD30, ETD39, N87, 3F3, Ferroxcube are generic industry-standard
designations — safe to keep. Only manufacturer-specific IC names need renaming.

---

## BRAND TOKENS (current → target)

```css
/* Current (brand.css)       →    Target */
--pi-navy:    #1B3A6B         →   --ff-primary:   #0D7377
--pi-blue:    #0066CC         →   --ff-secondary: #14A085
--pi-cyan:    #00A8C8         →   --ff-accent:    #2ECC71
--pi-orange:  #D94F00         →   --ff-highlight: #E67E22
/* All --pi-* → --ff-* */
/* CSS prefix in all components: .pi- → .ff- */
```

Logo: Replace PI IC-chip + lightning bolt SVG with a generic transformer-symbol + spark SVG.
No company name in logo. App name: "FluxForge" only.

---

## ROUTES (PIWeb)

| Path | Component | Guard |
|---|---|---|
| `/login` | LoginView | public |
| `/register` | RegisterView | public |
| `/` | → redirect /welcome | auth |
| `/welcome` | WelcomeView | auth |
| `/files` | FilesView | auth |
| `/components` | ComponentsView | auth |
| `/magnetics` | MagneticsView | auth |
| `/component-sets` | ComponentSetsView | auth |
| `/help` | HelpView | auth |
| `/design` | → redirect /welcome | auth |
| `/:pathMatch(.*)` | → redirect /welcome | auth |

---

## SERVER (Express + sql.js SQLite)

- **Port:** `process.env.PORT || 8081`
- **DB:** `process.env.DB_PATH || ./server/piexpert.db`
- **Tables:** `files`, `users`, `components`, `designs`
- **Auth:** JWT (custom HMAC-SHA256, no dependency)
- **Upload:** multer, `UPLOAD_DIR || ./server/uploads`

---

## TESTS

```
tests/sim-engine.test.js    235 lines  — SimEngine calculations
tests/uds-schema.test.js    155 lines  — UDS shape validation
tests/core-logic.test.js    511 lines  — design logic
tests/server-api.test.js    285 lines  — HTTP API
```
Run: `node --test tests/`

---

## PHASE STATUS

| Phase | Status | Description |
|---|---|---|
| **Phase 1** | 🔴 NOT STARTED | Rebrand: PI Expert → FluxForge across 39 files |
| **Phase 2** | 🔴 NOT STARTED | Docker: Dockerfile.web + Dockerfile.server + docker-compose |
| **Phase 3** | 🔴 NOT STARTED | GitHub: .github/workflows CI + build-installer + LICENSE |

---

## PHASE 1 PLAN — Rebrand (start here)

**Objective:** Remove all PI-specific trademarks. Replace with generic equivalents.
**Constraint:** No logic changes. String replacements and targeted edits only.

### Step 1.1 — Package metadata (4 files)
```
package.json                        name: pi-expert-monorepo → fluxforge
packages/shared/package.json        name: @pi/shared → @fluxforge/shared
PIWeb/package.json                  name: PIWeb + dep @pi/shared → @fluxforge/shared
PITauri/package.json               name: PITauri + dep @pi/shared → @fluxforge/shared
server/package.json                 name: pi-server → fluxforge-server
PITauri/src-tauri/tauri.conf.json  productName + identifier
PITauri/src-tauri/Cargo.toml       package.name
PITauri/src-tauri/capabilities/default.json  identifier
```

### Step 1.2 — Vite aliases (2 files)
```
PIWeb/vite.config.js    alias @pi/shared → @fluxforge/shared (keep @shared alias as-is)
PITauri/vite.config.js  same
```

### Step 1.3 — Brand CSS + logo (2 files)
```
packages/shared/src/styles/brand.css   --pi-* → --ff-*, colors updated
packages/shared/src/components/AppMenuBar.vue   logo SVG + brand name
packages/shared/src/components/WelcomeScreen.vue   logo + about text
```

### Step 1.4 — App shell naming (4 files)
```
PIWeb/src/App.vue              import @pi/shared → @fluxforge/shared, app name refs
PIWeb/src/main.js              import alias
PITauri/src/App.vue            app name refs
packages/shared/src/composables/useI18n.js   'PI Expert' → 'FluxForge'
```

### Step 1.5 — IC family names (5 files)
```
packages/shared/src/components/DesignWizard.vue    FAMILY_CONFIG keys + labels
packages/shared/src/components/ProductPortfolio.vue   family display names
packages/shared/src/components/SchematicDiagram.vue   SVG text labels
packages/shared/src/engine/SimEngine.js               family key lookups
packages/shared/src/data/udsSchema.js                 default family values
```

### Step 1.6 — View/component PI refs (7 files)
```
PIWeb/src/views/LoginView.vue
PIWeb/src/views/RegisterView.vue
PITauri/src/components/SettingsPage.vue
packages/shared/src/components/BOMPanel.vue
packages/shared/src/components/BoardLayout.vue
packages/shared/src/components/DesignNotes.vue
packages/shared/src/components/ComponentsManager.vue
```

### Step 1.7 — Data layer (2 files)
```
packages/shared/src/data/ComponentDatabase.js   IC part entries → generic refs
server/index.js                                  sample data family names
```

### Step 1.8 — Help system + docs (4 files)
```
packages/shared/src/components/HelpSystem.vue   all PI product name refs
README.md                                        full rewrite
TDD.md                                           remove PI company section, keep architecture
tests/  (3 files)                                family name strings in test fixtures
```

### Validation after Phase 1
```bash
grep -rn "Power Integrations\|TOPSwitch\|InnoSwitch\|TinySwitch\|LinkSwitch\|PIExpert\|pi-expert\|@pi/shared" \
  --include="*.vue" --include="*.js" --include="*.json" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=.git .
# Expected: 0 results

npm run test          # all tests pass
npm run build:web     # Vite build succeeds, no errors
grep -c '<style' packages/shared/src/components/SchematicDiagram.vue  # must be 1
```

---

## PHASE 2 PLAN — Docker

**New files only. No existing file modifications.**

```
Dockerfile.web          multi-stage: node:20-alpine → nginx:alpine
Dockerfile.server       node:20-alpine, Express + sql.js
docker-compose.yml      dev: web(5174) + server(8081) + sqlite volume
docker-compose.prod.yml prod: healthchecks + restart:always + env overrides
.dockerignore
nginx/default.conf      SPA routing + /api proxy to server:8081
scripts/
  build-web.sh          docker build + tag + push to ECR or GCR
  build-installer.sh    native Tauri build instructions (NOT Docker)
  deploy-local.sh       docker compose up --env-file .env
.env.example            PORT, DB_PATH, JWT_SECRET, UPLOAD_DIR
```

**Key decisions:**
- Web image: nginx:alpine, ~15MB. Serves Vite /dist. No Node at runtime.
- Server image: node:20-alpine, ~80MB. Mounts named volume for SQLite.
- Desktop: Tauri cannot build cross-platform in Docker. `build-installer.sh`
  runs natively. GitHub Actions matrix handles CI (ubuntu/windows/macos).

---

## PHASE 3 PLAN — GitHub Ready

**New files only.**

```
LICENSE                             MIT
CONTRIBUTING.md
.gitignore                          (update: add .env, *.db, dist/, target/)
.github/workflows/
  ci.yml                            lint + test on every PR
  build-web.yml                     Docker build + push on merge to main
  build-installer.yml               Tauri build on git tag v*.*.*
                                    matrix: ubuntu-latest / windows-latest / macos-latest
```

---

## KNOWN BUGS / WATCH ITEMS

1. **Duplicate `<style scoped>` pattern** — SchematicDiagram.vue previously had this bug.
   Always run `grep -c '<style' SchematicDiagram.vue` after any edit. Must return `1`.

2. **`@pi/shared` import alias** — referenced in PIWeb/src/App.vue, PITauri/src/App.vue,
   and all view files. Must be updated atomically with package.json rename.
   Vite alias `@shared` → `packages/shared/src` must also be kept (used in component imports).

3. **wizardActive reactivity** — do NOT use `designWizardRef.value?.isActive?.value` in
   App.vue computed. This does not propagate reactively. Use `designStore.wizardActive` only.

4. **HIT_BOXES `box.h || box.height || 20`** — SchematicDiagram.vue HIT_BOXES has mixed
   `h` and `height` property names. The overlay template must handle both.

5. **sql.js DB_PATH env** — server/index.js uses `process.env.DB_PATH`.
   In Docker, mount a named volume at this path. Default is `./server/piexpert.db`
   (will become `./server/fluxforge.db` after rename).

---

## HOW TO START IN CLAUDE CODE

```bash
# 1. Install Claude Code
npm install -g @anthropic-ai/claude-code

# 2. Unzip project
unzip pi-expert-monorepo.zip -d fluxforge
cd fluxforge

# 3. Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# 4. Start
claude

# 5. First prompt
"Read CLAUDE.md. Confirm you understand the project state and phase plan. Then begin Phase 1 Step 1.1."
```

Claude Code will read this file automatically at session start.

---

## SESSION HISTORY SUMMARY

Built over ~15 sessions in Claude.ai web. Key milestones:

- **Monorepo scaffold** — PIWeb + PITauri + @pi/shared + Express server + pnpm workspaces
- **DesignWizard** — 4-step family-aware wizard, FAMILY_CONFIG for 11 families, portfolio pre-selection
- **Schematic SVG** — TOPSwitch-JX pixel-accurate redraw matching PI Expert reference diagram
- **Component editor** — click-to-edit modal dialog with ComponentDB search table, Parameters tab, Notes tab; confirmed edits turn component blue in schematic
- **Magnetics Designer** — 7-tab workstation (Cross-Section, Spiral, Construction, Designer, Foundry, Thermal, Dimensions)
- **Export to PDF** — jsPDF all-tabs export
- **Export to CAD** — KiCad .kicad_sch + netlist CSV + BOM CSV, family-aware, JSZip download
- **Web layout fix** — wizardActive Pinia store signal hides router-view when design is active
- **PI branding** applied then scheduled for removal (Phase 1 of this file)
- **Help system** — 52 articles, 7 categories
- **Docker + GitHub plan** — designed, ready to implement (Phases 2 and 3)
- **CLAUDE.md** — this file, written to enable Claude Code migration

---

*Last updated: end of Claude.ai session. Next action: Phase 1 Step 1.1 in Claude Code.*

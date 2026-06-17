# FluxForge — Architecture & Technical Stack

## Overview

FluxForge is a **flyback transformer design tool** delivered as both a web application and a native desktop application from a single shared codebase. It runs a Vue 3 frontend backed by an Express REST API with a SQLite database.

---

## Monorepo Structure

```
fluxforge/                          ← pnpm workspace root
├── packages/
│   └── shared/                     ← @fluxforge/shared
│       └── src/
│           ├── api/                ← Platform abstraction (HTTP ↔ Tauri IPC)
│           ├── components/         ← 17 Vue SFCs shared by web + desktop
│           ├── composables/
│           ├── data/               ← Component DB, UDS schema, design tree
│           ├── engine/             ← SimEngine.js — core calculations
│           ├── stores/             ← Pinia stores (design, files)
│           └── styles/             ← brand.css (CSS custom properties)
├── PIWeb/                          ← Web shell (Vite + Vue Router)
│   └── src/
│       ├── main.js                 ← registerAdapter(httpApi)
│       ├── App.vue
│       ├── stubs/                  ← tauri-api-core.js (no-op for web build)
│       └── views/                  ← LoginView, FilesView, MagneticsView, etc.
├── PITauri/                        ← Desktop shell (Tauri v2 + Vite)
│   └── src-tauri/
│       ├── tauri.conf.json         ← productName: FluxForge, id: io.fluxforge.desktop
│       └── Cargo.toml
├── server/                         ← Express REST API
│   └── index.js                   ← sql.js SQLite, multer, JWT (custom HMAC-SHA256)
├── tests/                          ← Node.js built-in test runner
├── nginx/
│   └── default.conf               ← SPA fallback + /api proxy to server:8081
├── Dockerfile.web                  ← node:22-alpine (build) → nginx:alpine (serve)
├── Dockerfile.server               ← node:22-alpine
├── docker-compose.yml              ← Dev: ports 5200:80, 8099:8081
├── docker-compose.prod.yml         ← Prod: ECR images, restart:always, healthchecks
└── scripts/
    └── setup-and-deploy.sh        ← One-shot AWS deploy (10 steps)
```

---

## Tech Stack

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Vue 3 (Composition API, `<script setup>`) | ^3.4 |
| State | Pinia | ^2.1 |
| Router | Vue Router | ^4.3 |
| Build | Vite | ^5.0 |
| Desktop wrapper | Tauri v2 | ^2.0 |
| Diagramming | svg-schematic-js (local vendor) | custom |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Database | sql.js (SQLite in WebAssembly — no native build) |
| Auth | Custom JWT (HMAC-SHA256, no dependency) |
| File upload | multer (50 MB limit) |
| Package manager | pnpm 10.33 (workspaces) |

### Infrastructure
| Layer | Technology |
|-------|-----------|
| Container registry | AWS ECR |
| Compute | AWS EC2 t3.micro (1 GB RAM + 2 GB swap) |
| Web server | nginx:alpine |
| CI deploy | `scripts/setup-and-deploy.sh` (bash, Windows OpenSSH) |
| OS | Amazon Linux 2023 |

---

## Key Architectural Patterns

### 1. Platform Abstraction Layer

All shared components call `api.method()` through a proxy — never import HTTP or Tauri adapters directly.

```js
// packages/shared/src/api/index.js
let _adapter = httpApi;
export function registerAdapter(adapter) { _adapter = adapter; }
export const api = new Proxy({}, {
  get(_, key) { return (...args) => _adapter[key]?.(...args); }
});

// PIWeb/src/main.js
registerAdapter(httpApi);   // → HTTP calls to Express

// PITauri/src/main.js
registerAdapter(tauriApi);  // → Tauri IPC to Rust
```

### 2. Pinia Store Signal (`wizardActive`)

The only mechanism for hiding the router-view when a design is active. Do NOT revert to component ref chains.

```js
// useDesignStore.js
const wizardActive = ref(false);
function setWizardActive(v) { wizardActive.value = !!v; }

// PIWeb/src/App.vue
<main v-show="!designWizardActive">
  <router-view />
</main>
```

### 3. UDS (Unified Design Schema)

Portable JSON format for all design files:

```json
{
  "meta":   { "fileName", "family", "topology", "totalPower", "createdAt" },
  "spec":   { "input": { "vMin", "vMax", "lineFreq" }, "outputs": [], "options": {} },
  "result": { "Np", "Ns", "Nb", "Lp_uH", "coreName", "gap_mm", "efficiency" },
  "components": { "F1": {}, "C2": {} },
  "bom":    [],
  "designNotes": ""
}
```

### 4. Docker Architecture

```
Browser
  │  :80
  ▼
nginx:alpine (web container)
  ├── serves /dist (Vite SPA build)
  └── proxies /api/* → server:8081
                          │
                    Express container
                          └── /data volume (SQLite + uploads)
```

- Web image: `node:22-alpine` builder → `nginx:alpine` runtime (~15 MB)
- Server image: `node:22-alpine` (~80 MB)
- Named volume `fluxforge-data` persists SQLite DB and uploads across deploys

### 5. IC Family Config

| Generic key | Category |
|---|---|
| `HPFC-1/2/3` | High-Power Flyback Controller |
| `IFC-CE/AE/EP` | Integrated Flyback Controller |
| `LPFC-1/2` | Low-Power Flyback Controller |
| `PSC-TN/XT/HP` | Primary-Side Controller |

---

## Ports Reference

| Port | Binding | Purpose |
|------|---------|---------|
| `80` | EC2 public → nginx | All web traffic |
| `8081` | nginx → Express (internal) | API proxy |
| `8099` | EC2 host → Express | Direct API (dev/debug) |
| `5174` | localhost | Vite dev server |
| `22` | EC2 | SSH |

---

## Routes (PIWeb)

| Path | View | Guard |
|------|------|-------|
| `/login` | LoginView | public |
| `/register` | RegisterView | public |
| `/welcome` | WelcomeView | auth |
| `/files` | FilesView | auth |
| `/components` | ComponentsView | auth |
| `/magnetics` | MagneticsView | auth |
| `/component-sets` | ComponentSetsView | auth |
| `/help` | HelpView | auth |

---

## Component API Surface

### DesignWizard.vue (exposed)
```js
startWizard(payload)    // open wizard with pre-filled fields
exportPDF()             // jsPDF export of all tabs
exportCAD()             // KiCad .kicad_sch + netlist + BOM zip
openDesignProperties()
rerunSimulation()
optimizeDesign()
switchTab(tabName)
validateDesign()
isActive                // computed: wizardOpen || designReady || simulating
```

### AppMenuBar emits
```js
'new-design', 'open-design', 'open-portfolio', 'go-home',
'save', 'save-as', 'export-all', 'export-cad',
'switch-tab', 'zoom-in', 'zoom-out', 'fit-all',
'design-properties', 'simulate', 'optimize', 'validate'
```

### useDesignStore API
```js
{ activeDesign, openDesign, clearDesign,
  currentDesign, designReady, setCurrentDesign,
  pendingWizardStart, requestWizardStart, consumeWizardStart,
  actionSignal, dispatchAction, consumeAction,
  wizardActive, setWizardActive }
```

---

## Test Suite

```bash
node --test tests/sim-engine.test.js    # 235 lines — SimEngine calculations
node --test tests/uds-schema.test.js    # 155 lines — UDS shape validation
node --test tests/core-logic.test.js    # 511 lines — design logic
node --test tests/server-api.test.js    # 285 lines — HTTP API
```

# FluxForge — Power Supply Design Tool

<div align="center">

  **FluxForge — Web & Desktop Monorepo**

  [![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js)](https://vuejs.org/)
  [![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8D8?logo=tauri)](https://tauri.app/)
  [![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
  [![Pinia](https://img.shields.io/badge/Pinia-2.x-yellow?logo=pinia)](https://pinia.vuejs.org/)
</div>

---

## About FluxForge

**FluxForge** is an open-source flyback converter design tool that runs as both a native desktop application and a full web application, sharing 95%+ of its codebase. It provides an end-to-end design workflow: topology selection, simulation, schematic generation, magnetics design, BOM export, and KiCad CAD export.

---

## Monorepo Architecture

This project demonstrates that a **single codebase** can power both a native desktop application and a full web application with 95%+ shared code — no duplication, no divergence.

```
fluxforge/
├── packages/
│   └── shared/              ← @fluxforge/shared — ALL UI components & logic
│       ├── src/
│       │   ├── components/  ← 17 Vue components (wizard, schematic, magnetics...)
│       │   ├── stores/      ← Pinia stores (design, files)
│       │   ├── api/         ← Platform abstraction layer
│       │   ├── data/        ← Component DB, UDS schema, design tree
│       │   └── styles/      ← brand.css — FluxForge theme
│       └── package.json
│
├── PIWeb/                   ← Web Application (Vue 3 + Express + SQLite)
│   ├── src/
│   │   ├── App.vue          ← Web shell (router-view)
│   │   ├── main.js          ← Vue Router, Pinia, HTTP adapter
│   │   └── views/           ← Welcome, Files, Components, Help...
│   └── vite.config.js
│
├── PITauri/                 ← Desktop Application (Tauri + Rust)
│   ├── src/
│   │   ├── App.vue          ← Desktop shell (view switching)
│   │   └── components/      ← DesignPage, thin platform wrappers
│   └── src-tauri/           ← Rust backend (SQLite, file system, IPC)
│
└── server/                  ← Express REST API (shared with PIWeb)
    └── index.js
```

### How it works

The key insight is the **platform abstraction layer** in `@fluxforge/shared`:

```js
// packages/shared/src/api/index.js
let _adapter = null;
export function registerAdapter(adapter) { _adapter = adapter; }
export default new Proxy({}, {
  get: (_, method) => (...args) => _adapter[method](...args)
});

// PIWeb registers HTTP adapter → all API calls → Express REST API
// PITauri registers Tauri adapter → all API calls → Rust IPC commands
```

Every component in `@fluxforge/shared` calls `api.listFiles()`, `api.saveDesign()`, etc. without knowing if it's talking to HTTP or Tauri. The adapter is swapped at boot time.

### What's shared (95%+)

| Feature | Component | Shared? |
|---|---|---|
| Design Wizard (4-step, family-aware) | `DesignWizard.vue` | ✅ 100% |
| Schematic Diagram (interactive SVG) | `SchematicDiagram.vue` | ✅ 100% |
| Schematic Component Editor | `SchematicDiagram.vue` | ✅ 100% |
| Magnetics Designer (8-tab tool) | `MagneticsDesigner.vue` | ✅ 100% |
| Product Portfolio | `ProductPortfolio.vue` | ✅ 100% |
| File Manager | `FileManager.vue` | ✅ 100% |
| Export to CAD (KiCad) | `DesignWizard.vue` | ✅ 100% |
| BOM Panel | `BOMPanel.vue` | ✅ 100% |
| Board Layout | `BoardLayout.vue` | ✅ 100% |
| Design Tree Panel | `DesignTreePanel.vue` | ✅ 100% |
| Help System (52 articles) | `HelpSystem.vue` | ✅ 100% |
| Component Library | `ComponentsManager.vue` | ✅ 100% |
| App Menu Bar | `AppMenuBar.vue` | ✅ 100% |
| Welcome Screen | `WelcomeScreen.vue` | ✅ 100% |
| Design Store (Pinia) | `useDesignStore.js` | ✅ 100% |
| Files Store (Pinia) | `useFilesStore.js` | ✅ 100% |
| UDS Schema | `udsSchema.js` | ✅ 100% |
| Component Database | `ComponentDatabase.js` | ✅ 100% |
| Brand Theme | `styles/brand.css` | ✅ 100% |
| Routing | — | ❌ Platform-specific |
| App shell | — | ❌ Platform-specific |
| Auth (web only) | — | ❌ Web-only |
| File system access | Tauri IPC commands | ❌ Platform-specific |

---

## Tech Stack

| Layer | Web | Desktop |
|---|---|---|
| **UI Framework** | Vue 3 + Vite | Vue 3 + Vite |
| **State** | Pinia | Pinia |
| **Routing** | Vue Router 4 | Custom view stack |
| **Backend** | Express.js + SQLite | Rust (Tauri) + SQLite |
| **Build** | Vite → static files | Tauri → native .exe/.app/.deb |
| **Packaging** | pnpm workspaces | Cargo + Tauri bundler |
| **Styling** | CSS Variables (FluxForge theme) | CSS Variables (FluxForge theme) |

---

## Design Files: Unified Design Schema (UDS)

All designs are stored as `.uds` JSON files — platform-agnostic, portable between desktop and web:

```json
{
  "meta": {
    "version": "2.0",
    "family": "HPFC-1",
    "topology": "Flyback",
    "totalPower": 60.0,
    "createdAt": "2026-03-19T..."
  },
  "spec": {
    "input": { "vMin": 85, "vMax": 265, "lineFreq": 50 },
    "outputs": [{ "voltage": 12, "current": 5 }],
    "options": { "VOR": 90, "KP": 0.65 }
  },
  "result": { "Np": 72, "Ns": 9, "Nb": 11, "Lp_uH": 892 },
  "bom": [ "..." ],
  "designNotes": "..."
}
```

---

## Converter Families Supported

| Family | Max Power | Primary Use |
|---|---|---|
| HPFC-1 | 230 W | Universal adapter, multi-output |
| HPFC-2 | 250 W | High-power adapter/industrial |
| HPFC-3 | 270 W | Industrial PSU |
| IFC-CE | 65 W | USB-PD, integrated SR |
| IFC-AE | 65 W | Automotive/industrial |
| IFC-EP | 100 W | High-power integrated |
| LPFC-1 | 25 W | Ultra-low standby |
| LPFC-2 | 30 W | USB charger, LED |
| PSC-TN | 8 W | Buck, no optocoupler |
| PSC-XT | 12 W | Flyback, EN/UV control |
| PSC-HP | 165 W | Industrial flyback |

---

## Schematic Component Editor

Click any component on the schematic to open a centered modal editor. The modal shows:
- **Component DB tab** — searchable table of compatible alternatives from the component database
- **Parameters tab** — editable fields specific to the component type (capacitors: value/voltage/ESR; U1: part/family/package; T1: core/material)
- **Notes tab** — free-form notes for this component in the design

Confirmed changes write back to the UDS `components` section immediately. Modified components turn **blue** on the schematic with a ✎ badge. Reset any component to its original simulated value at any time.

---

## Export to CAD

FluxForge can export any completed design as a **KiCad-compatible CAD package** via **Edit → Export to CAD**.

The download is a `.zip` file containing:

| File | Format | Purpose |
|---|---|---|
| `{name}.kicad_sch` | KiCad 6+ S-expression | Open directly in KiCad EESchema |
| `{name}_netlist.csv` | CSV (Ref, Value, Footprint, Net_A, Net_B) | Import in Altium Designer, Eagle, or any CSV-netlist EDA tool |
| `{name}_BOM.csv` | CSV with grouped quantities | Procurement / BOM comparison |
| `README.txt` | Plain text | Step-by-step import instructions |

Component values come directly from the simulation result. The transformer T1 value includes core name, material, Lp, Np/Ns/Nb turns, and gap length. Components are family-aware: HPFC designs include the full RCD clamp and TL431+opto feedback network; IFC designs omit the clamp; LPFC/PSC designs use the BP-pin topology.

---

## Getting Started

### Web (PIWeb)
```bash
cd server && node index.js &          # Start REST API on :8081
cd PIWeb && npm install && npm run dev  # Start web on :5174
```

### Desktop (PITauri)
```bash
cd PITauri && npm install && npm run tauri dev
```

### Requirements
- Node.js 18+
- Rust + Cargo (for desktop build)
- pnpm 8+ (for workspace support)

---

## Brand

| Token | Hex | Usage |
|---|---|---|
| `--ff-primary` | `#0D7377` | Primary brand color, headers |
| `--ff-secondary` | `#14A085` | Secondary surfaces |
| `--ff-accent` | `#2ECC71` | Accent, highlights |
| `--ff-highlight` | `#E67E22` | Warnings, callouts |

---

## Tests

```bash
# All unit tests (no server required)
node --test tests/sim-engine.test.js tests/uds-schema.test.js tests/core-logic.test.js

# With spec reporter
node --test --test-reporter=spec tests/sim-engine.test.js tests/uds-schema.test.js tests/core-logic.test.js

# Server integration tests (requires pnpm dev:server)
node --test tests/server-api.test.js
```

| File | Tests | Coverage |
|---|---|---|
| `sim-engine.test.js` | 31 | SimEngine physics |
| `uds-schema.test.js` | 18 | UDS schema validation |
| `core-logic.test.js` | 52 | Logic, router, app configs |
| `server-api.test.js` | 24 | REST API (integration) |

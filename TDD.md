# FluxForge — Technical Design Document

## What This Project Is

FluxForge is a full-stack monorepo that runs as both a **Tauri desktop app** and a **Vue 3 web app**. It implements a flyback converter design wizard for generating power supply schematics, with persistent file management, authentication (web only), a full component database, a magnetics database, and multi-tab design output.

## Monorepo Structure

```
fluxforge/
├── packages/shared/           ← All shared Vue components, stores, API adapters
│   └── src/
│       ├── api/               ← Platform adapter (tauri.js / http.js / index.js)
│       ├── stores/            ← useFilesStore, useDesignStore
│       ├── data/              ← udsSchema.js (UDS builder + defaults)
│       └── components/        ← All shared UI components (see table below)
├── PITauri/                   ← Tauri desktop app
│   └── src/
│       ├── api/tauri.js       ← Desktop adapter (Rust invoke + HTTP fallback)
│       ├── components/        ← DesignPage, FilesPage, SettingsPage,
│       │                         ComponentsPage, MagneticsPage
│       └── App.vue            ← Sidebar nav + v-show view routing
│   └── src-tauri/src/lib.rs   ← Rust commands
├── PIWeb/                     ← Web app
│   └── src/
│       ├── views/             ← DesignView, FilesView, ComponentsView,
│       │                         MagneticsView, LoginView, RegisterView
│       ├── stores/            ← useAuthStore
│       └── main.js            ← Vue Router + auth guards
├── server/                    ← Express + sql.js (port 8081)
│   └── index.js               ← All routes, schema, seed data
├── SETUP_GUIDE.md             ← Full developer + deployment guide
└── CLAUDE.md                  ← This file
```

## Shared Components

| File | Purpose |
|------|---------|
| `DesignWizard.vue` | 4-step wizard → simulation → picker → result view (6 tabs) |
| `DesignTreePanel.vue` | Component tree sidebar for active design |
| `SchematicDiagram.vue` | Reactive SVG flyback schematic with hover/click interactivity |
| `DesignResultsPanel.vue` | Calculated design outputs table |
| `BOMPanel.vue` | Bill of Materials from UDS |
| `BoardLayout.vue` | PCB outline preview |
| `TransformerConstruction.vue` | Winding construction guide |
| `DesignNotes.vue` | Notes, revision history, standards checks |
| `FileManager.vue` | File browser — `.uds` files only |
| `ComponentsManager.vue` | Component database CRUD with category tabs |
| `MagneticsDatabase.vue` | Cores, bobbins, materials, accessories DB |

## Key Architecture Rules

- **Never import `@tauri-apps/api` in `packages/shared/`** — use the platform adapter only.
- **Platform routing** via `registerAdapter()` in `packages/shared/src/api/index.js`.
- **Long-lived state** goes in Pinia stores (`useDesignStore`), never local refs.
- **Desktop App.vue** uses `v-show` (not `v-if`) so components stay mounted.
- **All refs declared before any `watch()`** calls in `<script setup>`.
- **Only `.uds` files** are allowed in the File Manager.

---

## Core Features

### 1. Design Wizard (`DesignWizard.vue`)

4-step wizard → simulation overlay → Design Picker (6 variants) → result tabs:
Schematic · Design Results · Board Layout · BOM · Transformer Construction · Design Notes

**All dropdowns are fully dynamic:**

| Dropdown | Source |
|----------|--------|
| Topology | `TOPOLOGIES` constant array |
| Product Line | `PRODUCT_LINES` constant array |
| Family | `computed` from `FAMILY_CONFIG[productLine].families` |
| Package | `computed` from `FAMILY_CONFIG[productLine].packages[family]` |
| Frequency | `computed` from `FAMILY_CONFIG[productLine].freqs` |
| Core Material | Live from `api.getMagMaterials()` on mount |
| Component Set | Live from `api.listSets()` on mount |

**`FAMILY_CONFIG`** in `DesignWizard.vue` — keys are product line names, values are `{families, packages, freqs}`.
To add a new product line: add one entry to `FAMILY_CONFIG`. Nothing else needs changing.

Selecting a new Product Line triggers `onProductLineChange()` → resets Family, Package, Frequency to first valid option. Selecting a new Family triggers `onFamilyChange()` → resets Package, Frequency.

**Actions menu** (gear icon, top-right of result view):
- **New Design** — clears store, increments `newDesignKey` in App.vue forcing a full wizard remount
- **Export All Tabs to PDF** — jsPDF 7-page export loaded from CDN

---

### 2. Design Tree Panel (`DesignTreePanel.vue`)

Sidebar tree of all reference designators. Clicking a node opens a 4-tab dialog:

**Component DB tab:**
- Loads `api.getComponents({type})` — full component type with no subtype restriction
- Subtype dropdown filters within the loaded set (computed from `availableSubtypes`)
- Table columns: Part #, Manufacturer, Value/Capacitance, Rated Voltage, ESR/Tolerance, Package, Temp (°C), Cost
- Format helpers handle both old and new schema fields:
  - `fmtValue(row)` — uses `capacitance`+`uom`, falls back to `value`+`unit`, then `power`, `current`
  - `fmtVoltage(row)` — uses `rated_voltage`, falls back to `voltage`, `voltage_ac`, `vf`
  - `fmtEsrTol(row)` — uses `esr`, falls back to `tol`, `dcr`, `ctr`
- Preview strip below table shows chips: voltage, value, ESR, package, cost, notes

**Compatible tab:** parts linked via `compatible_components` — click one to apply it

**Parameters tab:** inline edit of part, value, unit, voltage, current, ESR, package + frozen checkbox

**Notes tab:** free-text notes for this component in the design

**`openByRefDes(refDes)`** — exposed method that external components can call to programmatically open the dialog for any ref designator (e.g. `F1`, `U1`). Used by SchematicDiagram click events.

---

### 2b. Schematic Diagram Interactivity (`SchematicDiagram.vue`)

The SVG schematic supports hover highlighting and click-to-inspect for all 25 reference designators.

**`HIT_BOXES`** — a map of `{ refDes: {x, y, w, h} }` defining the clickable bounding box for each component in the 1120×640 SVG viewport. To adjust a hit zone, edit the corresponding entry.

**Hover behaviour:** moving the mouse over a component draws a dashed blue `stroke-dasharray` rectangle around it and shows a tooltip label.

**Click behaviour:** clicking a component fires `emit('component-click', refDes)` which `DesignWizard.vue` catches and forwards to `treePanelRef.value.openByRefDes(refDes)` — opening the full 4-tab component dialog just as if the user clicked it in the left tree.

**`clearActiveRef()`** — exposed method to reset the blue active-selection highlight (called when switching away from the Schematic tab).

Covered components: F1, RT1, L1, BR1, VR1, C1, C2, C3, R4, R5, U1, T1, D1, D2, D3, C7, R10, C9, C10, C11, U3, U2A, R11, R12, R13.

---

### 3. Component Database (`ComponentsManager.vue`)

Sidebar nav → **Components**. Layout mirrors the FluxForge reference screenshot.

**Category tabs** (2 rows) map to type/subtype DB filters. See `CAT_FILTER` in the component.

**Schema fields** on `components` table (44 columns):
`library`, `qualification`, `type`, `subtype`, `part`, `mfr`, `value`, `unit`, `mount_type`, `capacitance`, `uom`, `tol`, `rated_voltage`, `voltage_ac`, `ripple`, `esr`, `dcr`, `rated_life`, `temp_coeff`, `temp_min`, `rated_temp`, `size_l`, `size_w`, `package`, `current`, `power`, `freq`, `family`, `ctr`, `vf`, `vce`, `vref`, `ae`, `le`, `al`, `material`, `voltage`, `rating`, `vaclamp`, `energy`, `imax`, `cost`, `notes`

**Actions:**
- **Fields** — toggle column visibility dialog (some columns hidden by default)
- **Import** — CSV import (stub)
- **Export** — downloads filtered view as CSV
- **Assign to Set** — adds selected component to a named component set
- **Add…** — create new component
- **View** — view full detail of selected component
- **Delete** — delete selected component (with confirm)

**Compatible Parts** — link any two components bidirectionally. Shows in Design Tree "Compatible" tab.

**Component Sets** — named groups (e.g. "65W Flyback Standard") with topology label. Used in wizard "Default Component Set" dropdown. Seeded with 4 sets + 50+ compatibility links.

---

### 4. Magnetics Database (`MagneticsDatabase.vue`)

Sidebar nav → **Magnetics**. Three-column workspace:

**Left panel** — filter by:
- Core shape (Shell / Toroid / Drum)
- Series checkboxes (all checked by default, from live data)
- Material checkboxes (all checked by default, from live data)
- Name / Part Number / Manufacturer text filters

**Centre grid (4 panes):**
- **Cores** — sortable, filterable. Click to auto-select matching bobbin + material
- **Bobbins** — auto-filters to bobbins for selected core's `core_name`
- **Magnetic Material** — sortable, filterable. Library + type dropdowns at footer
- **Accessories** — auto-filters to accessories whose `for_core` matches selected core

**Right panel tabs:**
- **Core Param** — name, PN, mfr, series, planar, material, default bobbin, AE/LE/VE/AL/SA, mechanical dimensions A–H with SVG cross-section diagram
- **Bobbin Param** — PN, core, winding area, slots, creepage, clearance
- **Accessory Para** — PN, ordering code, type, parts per set, for_core, mfr
- **Magnetic Mat** — material name, Bmax @25°C and @100°C with visual bar chart, µi, tolerance, freq range, max temp, application description

**Seeded data:**
- 15 magnetic materials (PC95, N97, N87, N27, 3F3, 3C95, 3C90, 3C81, PC44, PC40, NC2H, T38, PC200, DMR50, ML91S)
- 40 cores: EF12.6, EFD20/25/30, EE13/16/19/25/30/40/55, ETD29/34/39/44/49, PQ20/32/35, RM6/8/10/12, T106/T130/T157 (iron powder), T60/T80 (Kool Mµ)
- 24 bobbins matching the core set
- 17 accessories (spring clips, yoke sets, cover plates, gap tapes)

---

## Database Tables

| Table | Description | Rows seeded |
|-------|-------------|-------------|
| `components` | Component library (44 cols) | 111 parts |
| `component_sets` | Named BOM groups | 4 sets |
| `set_components` | Set ↔ component junction | ~60 links |
| `compatible_components` | Bidirectional compatibility | 50+ links |
| `mag_cores` | Ferrite + powder cores | 40 cores |
| `mag_bobbins` | Bobbin library | 24 bobbins |
| `mag_materials` | Ferrite material properties | 15 materials |
| `mag_accessories` | Clips, yokes, gap tapes | 17 items |
| `files` | Uploaded .uds file records | — |
| `users` | Auth users (web only) | — |

To reseed: delete `server/fluxforge.db` — tables are recreated and seeded on next server start.

---

## API Adapter Pattern

All API methods are defined on `httpApi` (web) and `tauriApi` (desktop) via plain object properties or `Object.assign`. The `api` export in `api/index.js` is a **JavaScript Proxy** — it intercepts any method call and routes it to the currently registered adapter:

```js
// Any of these work automatically — no registration in index.js needed:
api.getComponents({ type: 'capacitor' })
api.getMagCores({ series: 'EFD' })
api.listSets()
api.createMagMaterial({ material: 'PC200', ... })
```

To add a new method: add it to `httpApi` in `http.js` and to `tauriApi` in `tauri.js`. It is immediately available as `api.yourMethod()` everywhere.

## API Routes

### Components
```
GET    /api/components?type=&subtype=&q=
GET    /api/components/types
GET    /api/components/:id
POST   /api/components                      { all 44 fields }
PUT    /api/components/:id
DELETE /api/components/:id
GET    /api/components/:id/compatible
POST   /api/components/:id/compatible       { compat_id, reason }
DELETE /api/components/:id/compatible/:cid
```

### Component Sets
```
GET    /api/component-sets
GET    /api/component-sets/:id              (includes members array)
POST   /api/component-sets                  { name, description, topology }
PUT    /api/component-sets/:id
DELETE /api/component-sets/:id
POST   /api/component-sets/:id/components   { component_id, role }
DELETE /api/component-sets/:id/components/:cid
```

### Magnetics
```
GET    /api/mag/cores?series=&material=&q=
GET    /api/mag/cores/:id
POST   /api/mag/cores                       { library, planar, core_pn, material, series,
                                              core_name, name1, ae_mm2, ae_min_mm2, le_mm,
                                              al_nh, sa_mm2, ve_mm3, default_bobbin,
                                              a_mm…h_mm, mfr, notes }
PUT    /api/mag/cores/:id
DELETE /api/mag/cores/:id

GET    /api/mag/bobbins
POST   /api/mag/bobbins                     { library, bobbin_pn, core_name,
                                              winding_area_mm2, num_slots,
                                              creepage_mm, clearance_mm, mfr, notes }
PUT    /api/mag/bobbins/:id
DELETE /api/mag/bobbins/:id

GET    /api/mag/materials
POST   /api/mag/materials                   { library, material, bmax_100c, bmax_25c,
                                              mu_i, mu_tol, freq_min_khz, freq_max_khz,
                                              temp_max_c, mfr, comment }
PUT    /api/mag/materials/:id
DELETE /api/mag/materials/:id

GET    /api/mag/accessories?for_core=
POST   /api/mag/accessories                 { library, part_number, ordering_code,
                                              type, parts_num, for_core, mfr, notes }
DELETE /api/mag/accessories/:id
```

### Files + Auth
```
GET/POST/DELETE  /api/files, /api/files/:id, /api/files/:id/copy, /api/files/:id/notes
POST             /api/auth/register, /api/auth/login, /api/auth/logout
GET              /api/auth/me, /api/health
```

---

## Dev Commands

```bash
pnpm install          # install all workspace deps
pnpm dev:server       # Express API on :8081
pnpm dev:web          # Vue web on :5174
pnpm dev:all          # server + web together
pnpm dev:desktop      # Tauri desktop (requires Rust toolchain)
```

**First run:** server auto-creates and seeds all tables. Delete `server/fluxforge.db` to force a fresh reseed.

---

## Navigation

### Desktop (PITauri) sidebar
```
Design
  ├─ New Design       → resets wizard (goNewDesign() increments newDesignKey)
  └─ Active Design    → enabled only when designStore.designReady is true
Manage
  ├─ Files            → FileManager (.uds only)
  ├─ Components       → ComponentsManager
  ├─ Magnetics        → MagneticsDatabase
  └─ Settings
```

### Web (PIWeb) routes
```
/             → redirect to /new-design
/new-design   → DesignView (mode=new)
/design       → DesignView (mode=active)
/files        → FilesView
/components   → ComponentsView
/magnetics    → MagneticsView
/login        → LoginView (public)
/register     → RegisterView (public)
```

---

## UDS File Format

```json
{
  "meta": {
    "fileName": "65W_Adapter",
    "createdAt": "2025-01-01T00:00:00Z",
    "variant": "Balanced",
    "topology": "Flyback",
    "family": "HPFC-1",
    "pkg": "EG (eSIP-7C)",
    "frequency": "132 kHz",
    "feedbackType": "Secondary TL431",
    "inputSpec": "Universal (85–265 V)",
    "totalPower": 65,
    "componentSet": "Standard 65W Flyback"
  },
  "spec": {
    "input": { "vMin": 85, "vMax": 265, "lineFreq": 50, "inputType": "AC Defaults" },
    "outputs": [{ "voltage": 19.5, "current": 3.33, "peakCurrent": 4, "dutyCycle": 0 }],
    "options": {
      "operationMode": "CV Only", "transformerType": "Wire Wound",
      "coreMaterial": "3F3", "shieldWindings": false
    }
  },
  "components": {
    "U1": { "ref": "U1", "part": "TOP266EG", "type": "ic", "subtype": "topswitch" },
    "T1": { "ref": "T1", "part": "EFD30/15/9", "frozen": false }
  },
  "schematic": { "frozen": [] },
  "notes": ""
}
```

`udsSchema.js` helpers:
- `buildUds(form, variant)` — build full UDS from wizard form
- `buildDefaultComponents(base)` — 30+ default component entries (F1, RT1, VR1…)
- `applyDbComponent(existing, dbRecord)` — merge a DB record into UDS component
- `compLabel(c)` — display label string

---


---

## Recent Fixes (Current Session)

### Schematic Click Fix
**Root cause:** All result tab wrappers used `v-if` — this destroyed and recreated `DesignTreePanel` on every tab switch, making `treePanelRef` null whenever the Schematic tab wasn't active.

**Fix:** All 6 result tab wrappers now use `v-show` instead of `v-if`. Components stay mounted permanently; only their visibility changes. `treePanelRef.value.openByRefDes(refDes)` now always works regardless of which tab is currently showing.

### DesignResultsPanel + DesignNotes UDS Fix
Both components were reading flat fields (`design.topology`, `design.vMin`, `design.family`) but `savedDesign` is a UDS object with nested paths (`design.meta.topology`, `design.spec.input.vMin`, `design.meta.family`).

**Fix:** Both components now use a normalise pattern with dual-path access:
```js
const meta    = computed(() => props.design?.meta    || props.design || {});
const specInp = computed(() => props.design?.spec?.input   || props.design || {});
// Usage: meta.value.topology ?? d.topology (always works for both old and UDS format)
```
DesignResultsPanel was also fully rewritten with a 12-item calculated parameters grid and a key components summary section.

### DesignNotes CSS Fix
Cards were clipped because `overflow:hidden` was set on `.dn-card`. Fixed by setting `overflow:visible` + `flex-shrink:0` on cards, and `overflow-y:auto` + `min-height:0` on the scroll container. Note textareas got `min-height:80px` and `box-sizing:border-box`.

### Filename Auto-Increment + Duplicate Prevention
- `startWizard()` now calls `nextAvailableFileName()` which scans `filesStore.files` for existing `.uds` names and increments the numeric suffix until a unique name is found
- `onFamilyChange()` also updates the suggested filename to match the selected family
- `finishWizard()` validates the final filename against existing files and shows an alert if a duplicate is found, preventing overwrite

### API Proxy (Previous Session)
`api/index.js` was rewritten as a JavaScript `Proxy` — all methods on the registered adapter (httpApi or tauriApi) are automatically available as `api.*()` with no manual listing needed.

## Adding New Things

### New component category
1. Seed rows in `server/index.js` with appropriate `type`/`subtype`
2. Add to `CATEGORIES_ROW1` or `CATEGORIES_ROW2` in `ComponentsManager.vue`
3. Add entry to `CAT_FILTER` with the filter function

### New converter family
1. Add entry to `FAMILY_CONFIG` in `DesignWizard.vue`
2. Family, package, frequency dropdowns update automatically

### New core series / materials
1. Add rows to `mag_cores`, `mag_bobbins`, `mag_materials` seed blocks in `server/index.js`
2. Delete `server/fluxforge.db` to reseed

### New API endpoint
1. Add route in `server/index.js`
2. Add method to `packages/shared/src/api/http.js`
3. Add method to `PITauri/src/api/tauri.js` (with `_magReq` HTTP fallback pattern)

### New page / view
1. Create component in `packages/shared/src/components/`
2. Export from `packages/shared/src/index.js`
3. Create wrapper in `PITauri/src/components/` (one `<template>` + one import)
4. Create wrapper in `PIWeb/src/views/`
5. Add nav + `v-show` in `PITauri/src/App.vue`
6. Add route + nav link in `PIWeb/src/main.js` + `PIWeb/src/App.vue`

---

## Current Session Additions

### Welcome Screen (`WelcomeScreen.vue`)
Post-login landing page matching FluxForge design. Four main tiles: New Design → opens Product Portfolio, Open Design → goes to Files, Component Library → shows menu (Components / Component Sets), Help. Bottom row: Preferences, Getting Started, About, Feedback. After login, the app starts at `/welcome` (web) or the Home sidebar item (desktop).

### Product Portfolio (`ProductPortfolio.vue`)
Dialog matching the FluxForge reference screenshot. Left panel shows a tree of all PI device families (IFC-5/4/3, HPFC-1/GX, LPFC-1/III, PSC, LYTSwitch, BridgeSwitch, CAPZero) with expandable application entries. Right panel has 8 filter dropdowns (Application, Output Power, Input Type, # Outputs, Isolated Supply, Output Type, Topology, High PF). HELP ME CHOOSE suggests a device based on power filter. FluxForge button launches the wizard.

### Component Sets Manager (`ComponentSetsManager.vue`)
Dedicated full-page CRUD for component sets. Left panel lists all sets with member count and topology. Right panel lets you edit name/topology/description, view all members in a table with inline role editing, remove members, and search+add components from the full database. Accessed via Component Library → Component Sets or the sidebar.

### Help System (`HelpSystem.vue`)
Full interactive help center with 5 sections, 16 articles, search, navigation history, breadcrumbs, prev/next navigation, related articles, and quick links. Each article includes mock screen illustrations, step diagrams, data tables, and tips. Content covers: Getting Started (Welcome Screen, Product Portfolio), Design Wizard (wizard steps, Design Results, Interactive Schematic, BOM, Design Notes), Component Database (overview, search, CRUD, compatible parts, component sets), Magnetics Database (overview, cores, materials), File Management.

### Schematic Click Fix (Final)
The pan handler `startPan` previously intercepted `mousedown` on all elements including SVG hit areas. Fixed by:
1. `startPan` now skips if target is a `rect`, `text`, or `g` element
2. `dragDist` accumulates total drag distance — `onSvgClick` skips if `dragDist > 5px`
3. Removed duplicate `@click.stop` from individual transparent rect overlays (was competing with SVG-level click)
4. `svgPoint()` now catches exceptions from `getScreenCTM()` which can fail if the SVG isn't rendered


---

## Session — Menu Bar, i18n, Real Simulation, Export

### Application Menu Bar (`AppMenuBar.vue`)
Global menu bar matching FluxForge screenshot. Two rows:
- **Top bar** (dark): brand name "Expert / FluxForge / Beta", GET TECH SUPPORT, LANGUAGE selector, username, LOGOUT
- **Menu bar** (white): File, Edit, View, Active Design, Tools, Help — each with full dropdown menus; right side has 6 icon buttons (New, Open, Undo, Redo, Simulate, Help) + Design Warning badge

All menu items emit events that both `PITauri/App.vue` and `PIWeb/App.vue` handle for navigation. Keyboard shortcuts are global (`Ctrl+N/O/S/E/Z/Y`, `F1`, `Escape`). Built-in calculators: Inductance, Thermal, Efficiency.

### i18n (`composables/useI18n.js`)
6-language system with ~30 keys each. Languages: English (en), Filipino/Tagalog (tl), Japanese (ja), Chinese Simplified (zh), German (de), Korean (ko). Uses a reactive singleton — changing language updates all components instantly. Persisted to `localStorage('fluxforge-lang')`. Auto-detects from `navigator.language` on first load. Used in `AppMenuBar.vue` (all menus), `WelcomeScreen.vue` (title + tile labels).

### Real Simulation Engine (`engine/SimEngine.js`)
Replaces the scripted timer with real flyback converter calculations based on AN-19/AN-29/AN-57:
- `runSimulation(spec)` — computes: DC bus voltage, duty cycle (min/max), primary inductance (Lp), turns ratio, peak/RMS primary and secondary currents, core selection (10-core table), primary turns (Ampere's law), loss breakdown (7 components), thermal junction temperatures, EMC pre-checks (5 standards), design warnings
- `generateVariants(base)` — generates 6 optimised design variants by varying KP and VOR: Balanced, High Efficiency, Low Profile, Extended Input, Low EMI, High Reliability
- The simulation runs in a `Promise` concurrent with the progress animation so UI remains responsive

### DesignWizard expose
`defineExpose({ startWizard })` added so `WelcomePage.vue` / `AppMenuBar.vue` can programmatically trigger the wizard. `DesignPage.vue` updated to expose `triggerStartWizard()` via a `wizardRef`.

### Welcome → Wizard flow
`ProductPortfolio` emits `@launch(app)` → `WelcomePage` emits `@new-design(app)` → `PITauri/App.vue: startNewDesignWithApp()` increments `newDesignKey` (forces remount), switches to `new-design` view, then calls `nextTick(() => newDesignPageRef.value.triggerStartWizard())` to auto-open the wizard at step 1.

### Global Export (Edit → Export All Tabs to PDF)
Keyboard shortcut `Ctrl+E` and Edit menu item trigger `export-all` event → forwarded to wizard's existing `exportPDF()` function. Generates 7-page jsPDF report.

### PIWeb App.vue
Old `<nav>` block (router-links + user chip dropdown) replaced entirely with `<AppMenuBar>`. User-menu functionality (logout, profile) is now in the AppMenuBar's LOGOUT button and top bar.

---

## Session — Bug Fixes & UX Refinements

### Fix: PITauri broken `useAuthStore` import
`PITauri/src/App.vue` had `import { useAuthStore } from '../stores/useAuthStore.js'` — but `PITauri/src/stores/` does not exist (auth is web-only). Removed the import entirely. `auth` is now a plain object `{ username: '' }` in the desktop app.

### Menu Bar hidden on Welcome page
`AppMenuBar` now has `v-if="activeView !== 'welcome'"` (desktop) and `v-if="auth.isLoggedIn && $route.name !== 'welcome'"` (web). The Welcome Screen stands alone with its own tile navigation, matching the FluxForge design.

### Top-right bar: LOGOUT removed, HOME added
Per the screenshot: the top-right bar now shows only GET TECH SUPPORT, LANGUAGE selector, and the logged-in username. LOGOUT was removed. A 🏠 Home button was added that emits `go-home` → navigates to the welcome page.

### New Design icon → Product Portfolio
The first icon button (New Design) now emits `open-portfolio` instead of `new-design`. Both `PITauri/App.vue` and `PIWeb/App.vue` handle this by showing the `ProductPortfolio` dialog. Selecting an application and clicking FluxForge → launches the wizard at step 1.

### i18n applied to all components
`useI18n` composable added to: `WelcomeScreen.vue`, `WelcomePage.vue`, `HelpPage.vue`, `AppMenuBar.vue`, `ComponentSetsManager.vue`, `MagneticsDatabase.vue`, `HelpSystem.vue`. All UI strings go through `t('key')` so they update when language changes.

### ProductPortfolio in both apps
`PITauri/App.vue` and `PIWeb/App.vue` both import `ProductPortfolio` and render it as a global overlay (not scoped to any view). Triggered by: AppMenuBar new-design icon, Welcome tile, or File → New Design menu item.

### Navigation to homepage
Three ways to reach the home screen:
1. 🏠 Home button in AppMenuBar top-right
2. Sidebar "Home" nav item (desktop)
3. `Edit → Preferences` and `File → Close Design` both route to welcome

---

## Session — Homepage Menu, Auth Separation, Portfolio Flow, Simulation Timer

### 1. AppMenuBar always shown on homepage
`AppMenuBar` is now rendered on every page including the Welcome Screen (`v-if` condition removed). The `isHome` prop tells the bar it's on the home page — the Home button in the top-right is hidden when already on home. This gives users access to all menus (File, Edit, View, Tools, Help, language switcher) from the landing page.

### 2. Desktop has no authentication, Web has authentication
- **Desktop (PITauri)**: `useAuthStore` import fully removed. `auth = { username: '' }` is a plain stub. No login page, no session check, no JWT. The app opens directly to the Welcome Screen.
- **Web (PIWeb)**: `useAuthStore` from `PIWeb/src/stores/useAuthStore.js` handles JWT login, `checkSession()` on mount, logout redirect to `/login`, and router guards in `main.js`.

### 3. All "New Design" paths go through Product Portfolio
Every entry point that would start a new design now opens `ProductPortfolio` first:
- AppMenuBar File → New Design
- AppMenuBar icon button (📄)
- Sidebar "New Design" button (desktop)
- Welcome Screen "New Design" tile
- `DesignWizard` launcher page button ("New Design" → emits `open-portfolio`)

The event bubbles: `DesignWizard.vue` → emits `open-portfolio` → `DesignPage.vue` → bubbles to `PITauri/App.vue` or `PIWeb/App.vue` → sets `showPortfolio=true`. `ProductPortfolio` is rendered as a global overlay in both app shells.

### 4. Simulation timer
Real elapsed time is now shown during simulation. A `setInterval(100ms)` starts when simulation begins and counts milliseconds from `Date.now()`. The computed `simElapsedStr` formats it as `X.Xs`. Displayed with a ⏱ icon above the step message in the simulation overlay. The interval is cleared with `clearInterval` when simulation completes.

---

## Session — Simulation Fix, Portfolio→Wizard, SimEngine v2

### Root cause 1: Simulation appeared to never finish
`confirmDesign()` calls `buildUds(form, variant)` which reads `variant.mods`. The new SimEngine's `generateVariants` returned objects with `variant.design` (not `variant.mods`). When `mods` was `undefined`, `buildUds` spread an undefined object and produced a broken UDS — the design never reached `designReady = true`.

**Fix:** `confirmDesign` now detects both formats:
```js
const mergedForm = variant.design
  ? { ...baseForm, ...variant.design, _variant: variant.label }
  : { ...baseForm, ...(variant.mods || {}), _variant: variant.label };
```
`simResult` is also attached to the UDS for display in Design Results.

### Root cause 2: All 6 design variants were identical
`runSimulation()` used the module-level constant `KP_DEFAULT = 0.65` directly in all formulas, completely ignoring `spec.KP`. Since all variants called `runSimulation` with the same KP regardless of what was passed, results were identical.

**Fix (SimEngine.js v2):** `runSimulation` now destructures `KP` from the spec with a default of 0.65. `generateVariants` passes distinct `KP` values (0.40–0.80) and `freqMult` (0.5×–2.0×) per variant. Results now differ meaningfully:

| Variant | KP | Freq | η | Lp |
|---------|-----|------|---|----|
| Balanced | 0.65 | 132 kHz | ~93% | baseline |
| High Efficiency | 0.50 | 66 kHz | +1.2% | 2.3× larger |
| Compact | 0.80 | 264 kHz | -2.4% | 0.46× smaller |
| Low Cost | 0.70 | 99 kHz | ~similar | 1.3× |
| Low EMI | 0.40 | 99 kHz | +0.9% | 1.8× |
| Wide Input | 0.55 | 132 kHz | -0.9% | different VOR |

### Root cause 3: Portfolio → wizard didn't open at step 1
`import('vue').then(({ nextTick }) => { nextTick(...) })` is an unreliable pattern — the dynamic import resolves asynchronously after the component remount triggered by `:key` increment. By the time `nextTick` fires, the old component ref may still be bound.

**Fix:** Use directly imported `nextTick` from Vue with `await nextTick(); await nextTick()` (double tick) inside an `async function`. The first tick processes the `:key` change, the second ensures the new component instance is fully mounted and `wizardRef` is bound before `triggerStartWizard()` is called.

### SimEngine.js v2 improvements
- `KP` now read from spec (was hardcoded constant)
- `calcBulkVoltage` corrected: uses `Math.SQRT2`, proper µF/W rule
- `calcLosses` KP-dependent copper loss model (lower KP = lower P_cu_pri)
- `Bmax` reduced to 80% of saturation for thermal margin
- `calcPrimaryTurns` min 15 turns enforced
- `generateVariants` uses real engine calls not hardcoded numbers
- Each variant has `{ id, label, tag, desc, efficiency, cost, size, thermalRise, design, simResult }` — fully compatible with picker card template and `confirmDesign`

---

## Session — WelcomePage Fix, User Profile, UDS in Tabs, Global Export

### Fix: WelcomePage.vue syntax error (line 5:13)
Automated i18n injection mangled the script section: `const emit = const { t } = useI18n()` — an invalid assignment that crashed the Vite compiler. Root cause: the injection code matched `defineEmits` as `const emit =` and prepended `const { t } = useI18n()` into the wrong position. Fixed by rewriting `WelcomePage.vue` cleanly. i18n removed from this thin wrapper since it passes all text through to `WelcomeScreen.vue`.

### User profile area (AppMenuBar)
Replaced the plain username text with a full user chip: `[avatar] [name] ▾`. Clicking opens a dropdown with two actions:
- **View / Edit Profile** — opens a profile modal with name, email, and password fields. Emits `update-profile` which both apps handle. In PIWeb, calls `PUT /api/auth/me` with the new values and updates the auth store. Server decodes JWT, runs `UPDATE users SET name=?,email=? WHERE id=?`, returns updated user.
- **Logout** — emits `logout` → both apps call `auth.logout()` and redirect to login (web) or no-op (desktop).

### UDS data drives all tabs (items 4)
Three components updated to read from `uds.simResult` (attached to UDS when design is confirmed) with graceful fallback to estimation when simResult is absent:

**DesignResultsPanel** — `calcParams` now reads 15 parameters directly from `simResult`: Ip_pk, Ip_rms, D_max/D_min, Lp_uH, KP, Vdc_min, VOR, Np, Ns, coreName, η_percent. Falls back to formula when simResult is null (e.g. old files).

**TransformerConstruction** — Np, Ns, Nb now come from `simResult.Np/Ns/Nb`. Core loss from `simResult.losses.core`. Thermal ΔT from `simResult.thermal.T1_ΔT`. All flat field reads normalised to UDS nested paths (`meta.frequency`, `opts.transformerType`, etc.).

**BOMPanel** — New `udsComp(ref, fallback)` helper: checks `uds.components[ref]` first; if a real part is assigned (e.g. U1=TOP266EG from the component database), uses that data (part#, mfr, package, rating, cost). Falls back to generated defaults. T1 entry now shows the selected core name and turn count `(40:7t)` from simResult.

### Global export via CustomEvent (item 5)
Both apps now dispatch `window.dispatchEvent(new CustomEvent('pi-export-pdf'))` from their `onExportAll()` handlers. `DesignWizard.vue` registers a global listener on mount: `window.addEventListener('pi-export-pdf', exportPDF)`. `exportPDF` is also added to `defineExpose` so parent refs can call it directly. Triggered by: Edit menu, Ctrl+E, the actions gear icon in the result view.

---

## Session — Web Wizard Flow, Export Fix, Design Navigation

### Fix 1: PIWeb — portfolio → wizard step 1 not triggered
**Root cause:** `onPortfolioLaunch()` only called `router.push('/new-design')`. `DesignView.vue` had no `wizardRef` and didn't expose `triggerStartWizard`. After navigation, no one called `startWizard()`.

**Fix:**
- `DesignView.vue` now holds `wizardRef = ref(null)`, exposes `triggerStartWizard()`, and bubbles `@design-ready`
- `PIWeb/App.vue` holds `designViewRef` pointing to the `<router-view>` component
- `onPortfolioLaunch()` is now `async`: navigates → `await nextTick(); await nextTick()` → calls `designViewRef.value.triggerStartWizard()`

### Fix 2: Global export contained no UDS data
**Root cause:** `exportPDF()` read `d.family`, `d.vMin`, `d.totalPower`, `d.topology` etc. directly from `savedDesign.value`. But `savedDesign` is a UDS object with nested structure: `meta.family`, `spec.input.vMin`, etc. All these reads returned `undefined`.

**Fix:** A normalisation block at the top of `exportPDF` creates a flat `d` object by reading from `raw.meta || raw`, `raw.spec.input || raw`, etc. — same dual-path pattern used in other display components. `simResult` values are now unpacked into `d`: `Ip_pk`, `Ip_rms`, `D_max`, `D_min`, `Lp_uH`, `KP`, `Np`, `Ns`, `VOR`, `Vdc_min`, `η`, `coreName`, `losses`, `thermal`.

PDF now includes additional sections:
- **Calculated Parameters** (page 3): 15 parameters from simResult including Ip_pk, D_max, Lp_uH, turns ratio, VOR, DC bus voltage, efficiency, KP, selected core
- **Thermal Analysis** (page 3b): U1/D3 junction temps, T1 ΔT, margin, pass/fail
- **Loss Budget** (page 3b): switching, copper primary/secondary, diode, core, other, total, efficiency

### Fix 3: Homepage persists after design finishes
**Root cause:** After `confirmDesign()` sets `designReady = true`, the web app was still at `/welcome` or `/new-design`. The result view (schematic, BOM etc.) was rendered inside `DesignWizard` but the route wasn't changing.

**Fix:** `confirmDesign()` now emits `'design-ready'` after completing. `DesignView` bubbles it. `PIWeb/App.vue` handles `@design-ready` by calling `onDesignReady()` which pushes to `{ name: 'design' }` if not already there. This ensures the `/design` route is active, the active DesignWizard shows the result view (schematic, BOM, etc.).

---

## Session — Wizard Start & Homepage Persistence (Root Cause Fix)

### Root cause: `router-view` ref is unreliable for calling child component methods
Previous approach tried to call `designViewRef.value.triggerStartWizard()` via a ref on `<router-view>`. This fails because `<router-view>` is a Vue internal component — the ref resolves to the route component instance **only if** the component is mounted AND has been processed by the renderer in the same tick. Double `nextTick` wasn't guaranteed to be enough, especially on slower machines or first-load scenarios.

### Fix: Pinia store flag (`pendingWizardStart`)
Added to `useDesignStore`:
- `pendingWizardStart: ref(false)` — reactive flag
- `requestWizardStart()` — set it to true
- `consumeWizardStart()` — read and reset atomically

**Flow:**
1. User clicks FluxForge in Portfolio dialog
2. `onPortfolioLaunch()` calls `designStore.requestWizardStart()` then `router.push('/new-design')`
3. Vue router unmounts `WelcomeView`, mounts `DesignView` → which mounts `DesignWizard`
4. `DesignWizard.onMounted` calls `designStore.consumeWizardStart()` — if `true`, immediately calls `startWizard()`
5. **Backup:** `DesignWizard` also has a `watch(() => designStore.pendingWizardStart)` that fires if the wizard is already mounted when the flag is set (e.g. navigating from another page back to `/new-design`)
6. **Second backup:** PITauri still keeps the `triggerStartWizard()` direct call via the component ref, plus the store flag

### Bug 2: Welcome page persisting
The `WelcomeView.onLaunch` was calling `router.push('/new-design')` without setting `requestWizardStart`, so the wizard never auto-opened. Also `WelcomeView` had its own `ProductPortfolio` component that did the same thing. Both are now fixed to call `designStore.requestWizardStart()` before navigating. Since the welcome page IS a proper Vue route (`/welcome`), navigating away from it unmounts it immediately — there is no "homepage staying on screen" issue once the route changes.

---

## Session — Active Design Menu: Properties, Simulate, Optimize, View Tabs

### Design Properties (`openDesignProperties`)
Opens a full-page modal dialog (teleported to body) with all editable fields from the current UDS:
- **Basic**: File Name, Topology, IC Family, Package, Switching Frequency, Feedback Type
- **Input Spec**: Vin Min/Max, Line Frequency, Input Spec string, Total Power, Component Set
- **Transformer**: Transformer Type, Core Material, Shield Windings checkbox
- **Notes**: free-text textarea

Save button calls `saveDesignProperties()` which merges the draft back into the UDS nested structure (`meta`, `spec.input`, `spec.options`) and persists to the file store. Accessed via Active Design → Design Properties.

### Re-run Simulation (`rerunSimulation`)
Extracts the current design spec from the saved UDS (normalising nested/flat paths), then runs the same simulation flow as `finishWizard`: shows the animated overlay with elapsed timer, runs `engineVariants(base)` in parallel, then shows the 6-variant picker. User can pick a variant and confirm to update the active design. Accessed via Active Design → Run Simulation.

### Optimize Design (`optimizeDesign`)
Performs a grid search over 10 KP values × 6 frequency multipliers = 60 combinations using `runSimulation`. The combination with the highest efficiency and zero warnings is selected as the optimum. Displays a before/after comparison panel with:
- 4 key stats side-by-side (η, Lp, total losses, Ip_pk)
- Improvements table: icon, parameter name, before value → after value, gain/label

"Apply Optimization" writes the best KP and frequency into the UDS meta and updates simResult. Accessed via Active Design → Optimize Design.

### View Tab Switching
AppMenuBar View menu items emit `switch-tab` with the tab key string (`'Schematic'`, `'Design Results'`, `'BOM'`, `'Board Layout'`, `'Transformer Construction'`, `'Design Notes'`). Both apps catch this and:
1. Update local `activeTab` ref (for the checkmark in the dropdown)
2. Call `triggerSwitchTab(tab)` on the active DesignPage/DesignView ref
3. `DesignWizard.switchTab(tabName)` sets `activeTab.value = tabName` — instantly shows the right tab

`DesignWizard` exposes: `{ startWizard, exportPDF, openDesignProperties, rerunSimulation, optimizeDesign, switchTab }`.

---

## Session — Desktop Homepage Overlap Fix

### Root cause
Two problems were stacked:

1. **`WelcomePage` used `v-show`** — `v-show` only sets `display:none` on the element but the component stays mounted and rendered. When `activeView = 'new-design'`, `WelcomePage` was still in the DOM and visible because `.desktop-main` has `display:flex` — the `display:none` from `v-show` was being overridden or the layout was stacking both children.

2. **`DesignPage` with `v-show` had its tab bar always rendered** — since `DesignPage` must stay mounted (to preserve wizard state), its tabs (`Schematic`, `Design Results`, etc.) appeared on top of the welcome screen because both were simultaneously in the flex layout.

### Fix: layered absolute-position view system

`WelcomePage`, `FilesPage`, `ComponentsPage`, `MagneticsPage`, `ComponentSetsPage`, `HelpPage`, `SettingsPage` — switched to **`v-if`**. These have no state worth preserving across navigation.

`DesignPage` (both new and active) — wrapped in `<div class="dm-view-layer">` with CSS:
```css
.desktop-main   { position: relative; }
.dm-view-layer  { position: absolute; inset: 0; display: none; flex-direction: column; overflow: hidden; }
.dm-view-active { display: flex; }
```

The `:class="{'dm-view-active': activeView === 'new-design'}"` binding on the wrapper div controls which DesignPage is visible. When not active, `display:none` on the wrapper hides it completely — the `position:absolute;inset:0` ensures it fills the parent when shown, and the inactive one is truly invisible with zero layout footprint.

`v-if` pages render on top of everything and fill the `desktop-main` flex column normally since there are no `dm-view-layer` siblings competing for space when they exist.

---

## Session — Web Menu Navigation, Route Cleanup, Validate Design, Remove Compare

### Fix 1: Active Design menu + View tabs not working on web (root cause)
`currentDesignViewRef` refs `<router-view>`. Vue router-view only forwards the exposed interface of the **currently rendered route component**. When the user is on `/welcome`, `currentDesignViewRef` resolves to `WelcomeView` which has no exposed methods — all calls silently fail.

**Fix:** `withDesignView(fn)` helper: navigates to `/design` if not already there, waits 50ms for route transition, then calls `fn(currentDesignViewRef.value)`. All Active Design actions and View tab switches now use this helper. This guarantees the DesignView component is mounted and its exposed methods are available before calling them.

### Fix 2: Remove /new-design route, homepage as default
- `/new-design` route removed from `main.js`
- `onPortfolioLaunch` pushes to `/design` instead (wizard auto-starts via `pendingWizardStart` store flag)
- `{ path: '/' }` redirects to `{ name: 'welcome' }`
- Router guard: logged-in users hitting public pages (login/register) now go to `welcome` instead of `design`

### Fix 3: Validate Design
`validateDesign()` runs 12+ checks across 5 categories and generates a pass/fail/review report:

| Category | Checks |
|----------|--------|
| Electrical | Ip_pk vs ILIM, D_max < 55%, Lp ≥ 50µH, η ≥ 82% |
| Thermal | U1 Tj < 135°C, D3 Tj < 110°C |
| EMC | fsw in CISPR 32 range, Y-cap C3 present |
| Safety | Fuse F1 present, input range covers 85–265VAC |
| Compliance | IEC 62368-1, CISPR 32, ErP Lot 6, DOE Level VI |

Results show a coloured banner (green PASS / amber REVIEW / red FAIL) with count, then checks grouped by category. Each row has severity icon (✓/⚠/✕), name, detail with values, and standard reference. "Re-validate" button re-runs. Accessed via Active Design → Validate Design.

### Fix 4: Compare Variants removed
Removed from AppMenuBar template and emits list. The 6-variant picker shown during simulation/re-simulation already serves the comparison purpose.

---

## Session — Thorough Check, Unit Tests, Help & Docs Update

### Thorough Functional Check Results (101 assertions)

All systems verified:

| Area | Checks | Status |
|------|--------|--------|
| Server API routes | 13 (health, components CRUD, sets, magnetics, auth, files) | ✓ all pass |
| SimEngine | 31 (η bounds, currents, duty cycle, KP/freq effects, variants) | ✓ all pass |
| i18n catalogue | 13 (6 langs, key coverage, localStorage, auto-detect) | ✓ all pass |
| Design Store | 7 (pendingWizardStart lifecycle, designReady toggle) | ✓ all pass |
| UDS Schema | 18 (buildUds structure, meta/spec/components paths) | ✓ all pass |
| Router config | 6 (no /new-design, redirects, auth guard) | ✓ all pass |
| PITauri App | 7 (no auth, v-if not v-show, dm-view-layer, menu wiring) | ✓ all pass |
| PIWeb App | 5 (withDesignView, validate, no compare, portfolio nav) | ✓ all pass |
| DesignWizard | 12 (defineExpose 7 methods, store flag, emits, timer, dialogs) | ✓ all pass |
| AppMenuBar | 9 (user chip, lang selector, profile, shortcuts, View tabs) | ✓ all pass |

**3 test bugs fixed:**
1. `@compare=` leftover in `PITauri/src/App.vue` → removed
2. VOR direction test had physics backwards (LPFC VOR=100 > HPFC@Vout12=90) → corrected to test IFC(135) vs LPFC(100)
3. `buildDefaultComponents` not exported from `udsSchema.js` → test rewritten to check `buildUds` component output instead

### Unit Test Suite

Location: `tests/` (4 test files + README.md)

**Tools:** Node.js built-in `node:test` + `node:assert/strict` — zero npm install required.

**Run commands (from project root):**
```bash
# All tests (excludes server integration — needs running server)
node --test tests/sim-engine.test.js tests/uds-schema.test.js tests/core-logic.test.js

# With spec reporter
node --test --test-reporter=spec tests/sim-engine.test.js tests/uds-schema.test.js tests/core-logic.test.js

# Individual suites
node --test tests/sim-engine.test.js    # 31 tests - SimEngine physics
node --test tests/uds-schema.test.js    # 18 tests - UDS Schema
node --test tests/core-logic.test.js    # 52 tests - Logic, Router, App configs
node --test tests/server-api.test.js    # 24 tests - REST API (needs pnpm dev:server)

# npm script shortcuts
npm test                # all unit tests
npm run test:verbose    # spec reporter
npm run test:api        # server integration tests
```

**sim-engine.test.js (31):**
- `runSimulation`: 20 tests — output type, η bounds, Ip_pk, D_max, Lp, Np/Ns, turns ratio, losses structure, thermal, EMC, warnings, KP override, frequency derating, core size scaling
- `generateVariants`: 11 tests — count, IDs, fields, distinct Lp/η, KP values, frequency relationships, efficiency bounds

**uds-schema.test.js (18):**
- `buildUds`: 14 tests — all meta fields, spec.input paths, outputs array, components, variant mods
- `buildUds components output`: 2 tests — type field, standard ref designators
- `applyDbComponent`: 1 test — field overwrite + preservation
- `compLabel`: 1 test — non-empty string

**core-logic.test.js (52):**
- `i18n translation catalogue`: 7 tests — all 6 langs, key coverage, localStorage, fallback
- `Design Store`: 6 tests — pendingWizardStart lifecycle, designReady
- `validateDesign function`: 10 tests — all 5 categories, status values, result structure
- `AppMenuBar`: 9 tests — emits, no compare, user chip, lang, profile, shortcuts, View tabs, isHome
- `PIWeb Router config`: 6 tests — no /new-design, routes, redirects, guard
- `PITauri App`: 7 tests — no auth, v-if/v-show, dm-view-layer, menu events
- `DesignWizard defineExpose`: 7 tests — all 7 exposed methods, store flag, emits, timer, schematic

**server-api.test.js (24 integration):**
- Starts a live server on port 18082, runs all HTTP tests, shuts down
- Auth: register (creates user+token), duplicate rejection, login valid, login wrong password
- Components: GET list, filter by type, GET by id, 404 for unknown, POST/PUT/DELETE
- Component Sets: GET, POST, add component, verify membership, DELETE component, PUT name, DELETE set
- Magnetics: GET cores (seeded), GET materials, GET bobbins, 404 for unknown, POST+DELETE round-trip
- Files: GET returns array

### Help System Updates
Two new articles added:
- **Running the Test Suite** (System & Navigation section) — CLI commands, test suite table, coverage summary
- **Validate Design** (Design Wizard section) — how to run, 5 check categories, result status meanings

---

## Session — Web Menubar Navigation Fix & Optimize Design Verification

### Root cause: `<router-view ref="x">` does NOT forward `defineExpose`
In Vue Router 4, a plain `ref` on `<router-view>` binds to the `RouterView` internal component instance — NOT to the rendered route component. The rendered component's `defineExpose` is never accessible through this ref. This is why `currentDesignViewRef.value?.triggerValidate()` silently did nothing on the web version.

**Desktop works** because `DesignPage` components are mounted persistently inside `dm-view-layer` wrappers with permanent refs (`newDesignPageRef`, `activeDesignPageRef`). These refs are always bound regardless of which "view" is active.

### Fix: Pinia store action signal channel

Extended `useDesignStore` with:
- `actionSignal: ref({ type, payload, seq })` — reactive object
- `dispatchAction(type, payload)` — increments `seq` so the watch re-fires even for repeated actions

`DesignWizard` watches `designStore.actionSignal` (with `{ deep: true }`) and runs a switch/case:
```js
watch(() => designStore.actionSignal, (signal) => {
  switch (signal.type) {
    case 'simulate':     rerunSimulation();   break;
    case 'design-props': openDesignProperties(); break;
    case 'optimize':     optimizeDesign();    break;
    case 'validate':     validateDesign();    break;
    case 'switch-tab':   switchTab(signal.payload); break;
  }
}, { deep: true });
```

`PIWeb/App.vue` uses `withDesignAction(type, payload)`:
1. Navigate to `/design` if not already there
2. Wait 30ms for route transition
3. Call `designStore.dispatchAction(type, payload)` — the watcher in the mounted `DesignWizard` fires immediately

The `seq` counter is critical: if the user triggers "validate" twice, the `type` is the same but `seq` differs, so Vue's reactivity system fires the watcher both times.

### Optimize Design — confirmed real physics
Optimize runs **60 real `runSimulation()` calls** (10 KP × 6 frequency multipliers). Example result for a 60W design:

| | KP | fsw | η | Lp | Losses |
|--|--|--|--|--|--|
| Current | 0.65 | 132 kHz | 90.6% | 331 µH | 6.24 W |
| Optimized | 0.35 | 66 kHz | 92.3% | 1007 µH | 4.97 W |

+1.7% efficiency, -20.3% losses. The larger Lp at lower KP is physically correct: lower ripple ratio requires more primary inductance. The "Apply Optimization" button writes `bestKP` and `bestFreq` into the UDS and updates `simResult`.

---

## Session — Schematic Hover, Right-Click, Auto-Save, Component CRUD

### 1. Enhanced Hover on Schematic Diagram
Hovering over a component now shows:
- **Blue dashed animated border** — `stroke-dasharray="5,3"` with CSS `@keyframes sd-dash-march` (marching ants effect via `stroke-dashoffset` animation at 0.6s)
- **Blue fill tint** — `fill="rgba(79,124,255,0.08)"` inside the hit box
- **Tooltip badge** — component ref designator (e.g. `U1`) in white on dark blue pill, 20px above the component

Frozen components show a **solid blue border** with `fill="rgba(45,108,228,0.10)"` and a permanent ref label in blue below the component.

### 2. Auto-save on All Design Changes
All design mutation paths call `saveUdsFile(uds)` and `designStore.setCurrentDesign(uds)`:
- `confirmDesign()` — after selecting a variant from the picker
- `saveDesignProperties()` — after editing meta/spec fields  
- `applyOptimization()` — after accepting optimize results
- `onUdsUpdated()` — after Design Tree component changes
- Re-run simulation → `confirmDesign()` path above

`simResult` is stored in the UDS object, so all calculated values (η, Lp, Np/Ns, losses, thermal) persist and are reflected in Design Results, Transformer Construction, and BOM tabs immediately.

### 3. Right-Click Context Menu on Schematic
Right-clicking a component (within a hit box) shows a context menu with:
- **Freeze** (❄️) / **Unfreeze** (🔓) — toggles `frozenRefs` Set. Frozen refs have a permanent blue solid border and blue label even when not hovered. The hint text explains: "Keep permanently highlighted" / "Remove permanent highlight"
- **Open Functional Diagram** (🔍) — equivalent to left-click: sets `activeRef` and emits `component-click` to open the Design Tree dialog for that component

Context menu closes when clicking anywhere outside it (via `sd-ctx-backdrop` overlay).

### 4. ComponentsManager Add/Edit — Live with Full CRUD
The dialog was redesigned as a 2-panel layout:
- **Left (form)**: 3 sections — Identity (Part#*, Type*, Mfr, Package, Mount, Library), Electrical Parameters (Capacitance, Voltage, Current, etc.), Physical & Thermal (Temp range, Rated life, Size)
- **Right (live preview)**: real-time card showing Part#, type badge, Mfr, Package, and a table of filled electrical values. Shows "⚠ Part # and Type are required" or "✓ Ready to add" based on form state

Validation: save button is disabled until `part` and `type` are filled. `saving` state prevents double-submit. `saveError` displays inline rather than `alert()`. After create, the new component is unshifted to the top and `selectedId` is set to it (immediately visible and selectable).

---

## Session — Full System Check, 133 Tests, TDD.docx, Help Update, Skeleton Template

### System Check Results
145 assertions across 14 areas. 144/145 pass. 1 false-fail: "Compatible parts wired in ComponentsManager" — feature is correctly implemented in DesignTreePanel (not ComponentsManager), where the Compatible Parts tab calls api.getCompatible().

### Updated Test Suite (133 tests)
Added 5 new test suites to core-logic.test.js with 29 additional tests:

| Suite | Tests | Coverage |
|-------|-------|---------|
| SchematicDiagram | 10 | 25 hit boxes, dash-march animation, frozenRefs, right-click menu, Freeze/Unfreeze, Open Functional Diagram, dragDist guard, component-click emit |
| ComponentsManager CRUD | 8 | Live preview, validation, saveError inline, saving state, all 3 API calls |
| dispatchAction pattern | 6 | Store signal structure, wizard watcher, web app usage, no broken router-view refs |
| Auto-save | 5 | All 4 mutation paths call saveUdsFile; simResult attached before save |

### Help System Updates
4 new articles added:
- **Optimize Design** — sweep mechanics, 60 combinations, before/after interpretation, Apply Optimization button
- **Schematic Right-Click Menu** — Freeze/Unfreeze behaviour, Open Functional Diagram, hover highlight description
- **Re-run Simulation** — how to use, what changes, relationship to Design Properties
- **Design Properties** — 4 sections table, access methods, when to re-simulate after changes

### Technical Design Document (FluxForge-TDD.docx)
Generated with docx@9.5.3. 11 sections:
1. Executive Summary — platform overview, deployment targets, key differentiator
2. System Architecture — monorepo structure table, 3 communication patterns, data flow pipeline
3. Simulation Engine — runSimulation() 12-output table, 6-variant table with KP/freq values, 60-point optimization sweep results
4. UDS File Format — 7-key schema table, persistence callout
5. Complete Feature Inventory — design flow, design views, management tools
6. REST API — 13 endpoint group table with methods and notes
7. Test Suite — 4-file table with test counts and coverage
8. Security & Auth — JWT, scrypt, CORS, file isolation
9. Desktop vs Web — 7-row comparison table across key architectural concerns
10. Shared Component Catalogue — 16 components with props/events and purpose
11. Developer Reference — setup commands, 6 key engineering decision rationales

### Skeleton Template (vue-tauri-web-skeleton)
31 files across 4 packages. Encodes all key FluxForge architectural patterns:

**Shared patterns:**
- `packages/shared/src/api/index.js` — Proxy-based adapter (same pattern as FluxForge)
- `packages/shared/src/stores/useAppStore.js` — pendingStartSignal + dispatchAction with seq counter
- `packages/shared/src/composables/useI18n.js` — 6 languages with localStorage + navigator.language

**AppWeb patterns:**
- `AppWeb/src/App.vue` — withDesignAction-style dispatch, auth guard, clean App shell
- `AppWeb/src/main.js` — Vue Router 4 setup with auth guard (unauth → login, auth+public → welcome)
- `AppWeb/src/stores/useAuthStore.js` — JWT auth with localStorage persistence

**AppTauri patterns:**
- `AppTauri/src/App.vue` — dm-view-layer system (position:absolute;inset:0) for persistent desktop views
- `AppTauri/src/api/tauriApi.js` — Tauri filesystem adapter stub
- Navigation via Pinia activeView ref (no Vue Router needed for desktop)

**Server pattern:**
- `server/index.js` — Express + sql.js with scrypt auth, JWT tokens, CRUD template for items resource

28 skeleton tests (node:test, no install) verify all architectural patterns.

---

## Session — Magnetics Designer + Spiral Diagram

### New Feature: Transformer Designer (`MagneticsDesigner.vue`, 1767 lines)

Accessible via **Magnetics → ⚡ Transformer Designer** tab. Complete flyback transformer design tool based on AN-19/AN-29/AN-57.

#### Interface: FluxForge-style 3×2 fixed docking panel grid

| Panel | Position | Content |
|-------|----------|---------|
| Mechanical Diagram | Top-left | Horizontal bobbin cross-section SVG — wire circles in layers, FL labels, gap annotation. Tabbed: Cross-Section \| Spiral |
| Windings Info | Top-centre | Stack fill factor, copper weight, per-winding stats (CMA, LENw, Irms) |
| Electrical Diagram | Top-right | Schematic: core bars, primary/secondary/bias winding arcs, polarity dots, pin labels |
| Coil Former Properties | Bottom-left | Two-column table: Core PN, Al gapped, gap, Lp, Bmax, fill, creepage, Tj, status |
| Winding Properties | Bottom-centre | Per-winding table + 9 compliance checks |
| Instructions | Bottom-right | Three sub-tabs: BOM / Assembly (10 steps) / Compliance |

#### Toolbar
Inline inputs: Vin min/max, Pout, Vout, Iout, fsw, KP, Material, Core, Isolation, Preset. `▶ Run Design` button, `⬇ Report` (text export), `↺ Reset`. Preset select applies full form state.

#### Design Engine (AN-19/AN-29/AN-57)

All equations are pure ES function calls — no server dependency.

| Quantity | Formula | Reference |
|----------|---------|-----------|
| Lp | Vdc_min² × D_max² / (2 × fsw × Pin × KP×(2−KP)/2) | AN-19 eq.4 |
| Ip_pk | 2×Pin / (Vdc_min × D_max × (2−KP)) | AN-19 eq.6 |
| Np | max(15, ⌈Lp × Ip_pk / (Bmax × Ae)⌉) | AN-29 eq.1 |
| Air gap | µ₀ × Np² × Ae / Lp − Le/µr | AN-29 |
| Fringing | 1 + (Lgap/√Ae) × ln(2×MLT/Lgap) | AN-29 |
| Core loss | k × Bmax^α × fsw^β × Ve (Steinmetz) | AN-57 |
| Tj(U1) | θJA × (P_sw + P_cu_pri) + Ta | AN-57 |

8 ferrite materials with real Steinmetz constants (PC95, N97, N87, 3F3, 3C95, PC44, 3C90, N27). 19 core geometries (EFD12.6 → ETD49, PQ, RM) with Ae, Le, Ve, Al, Wa, MLT. Wire table AWG10–32. CMA (circular mils per amp) computed per winding.

#### Spiral Winding Diagram (new sub-feature of Mechanical Diagram panel)

**Tab:** "Spiral" button in Mechanical Diagram cyan title bar. Returns to "Cross-Section" with second button.

**What it draws (420×420 SVG):**

1. **Centre post** — tan-filled rectangle, scaled to 18% of bobbin window half-width
2. **Bobbin wall** — dashed inner rectangle (winding window boundary)
3. **Core outline** — brown outer rectangle (core body)
4. **Concentric rectangular rings** — one per winding group (secondary innermost per AN-29, then primary, then bias). Ring width proportional to wire diameter × layer count. WIRE_DIA lookup table maps AWG → mm.
5. **Yellow dashed ring border** — insulation tape indicator (appears between windings). Presence depends on isolation class (basic=1 layer, reinforced=3 layers).
6. **Wire dots on top edge** — individual wire cross-sections rendered as circles, count = min(turns, max_that_fit_in_topLen). Dot radius = WIRE_DIA[awg] × PX_PER_MM / 2.
7. **Archimedean spiral path** — per winding: r = r₀ + (r₁−r₀)×θ/(2π×N), rendered as 60 segments per turn. Shows actual wire path spiralling from inner to outer radius.
8. **Polarity dot** — filled circle at spiral start marking winding polarity.
9. **Legend** — colour + winding name + turns + AWG.
10. **Annotations** — Fill %, Ku, Wa mm², gap mm (bottom-right). Core dimension arrow line with marker-start/marker-end SVG arrows.

**Key computed functions:**
- `spiralData` computed: derives ring geometry from `result.windings`, scales via `PX_PER_MM = (BOB_HALF - POST_HALF) / (√Wa_mm2 / 2)`
- `buildSpiralPath(cx, cy, r0, r1, turns)`: pure JS function returning SVG path string
- `mechView` ref: `'cross'` | `'spiral'` — drives v-if on both SVG elements

#### Compliance Checks (9 checks)

D_max < 55% (AN-29) · Bmax < 80% Bsat (AN-57) · η ≥ 82% (DOE Level VI) · Fill ≤ 40% (IPC-2152) · U1 Tj < 135°C · D3 Tj < 110°C (IEC 62368-1) · Gap ≥ 0.05mm (manufacturing) · fsw ≤ 500kHz (CISPR 32) · Reinforced isolation (IEC 62368-1 §5.4)

#### BOM Auto-Generation

`bomItems` computed produces a numbered materials list matching FluxForge datasheet format: Core (part number + gapped Al), Bobbin (GFR thermosetting PN), per-winding wire (AWG, OD with insulation, IEC 60317-56 reference), separation tape (width from √Wa_mm2), Hi-Pot test spec (3kVAC / 1s / P→S).

#### Piping into existing app
- `packages/shared/src/index.js`: `export { default as MagneticsDesigner }`
- `PITauri/src/components/MagneticsPage.vue`: tabs wrapper (Database | Designer), activeTab defaults to 'designer'
- `PIWeb/src/views/MagneticsView.vue`: same tabs wrapper

### Help System Updates (41 articles, +7 new)

6 new articles added to the Magnetics section:

| Article ID | Title |
|------------|-------|
| magnetics-designer | Transformer Designer — Overview |
| magnetics-designer-panels | Six Result Panels Explained |
| magnetics-designer-spiral | Spiral Winding Diagram |
| magnetics-designer-engine | Design Engine — AN-19/AN-29/AN-57 |
| magnetics-designer-compliance | Compliance Checks |
| magnetics-designer-bom | BOM and Assembly Guide |

Section title updated: "Magnetics Database" → "Magnetics & Transformer Designer". Section description updated to mention Transformer Designer and spiral diagram. All new articles have `related` arrays pointing to adjacent articles.

---

## Session — Constructional Diagram

### New Feature: Construction tab in Mechanical Diagram panel

A third tab added to the Mechanical Diagram panel title bar alongside **Cross-Section** and **Spiral**. The Construction diagram is a detailed 760×480 SVG side-view cross-section of the fully assembled transformer, suitable for production assembly reference.

#### What it renders

**E-core assembly:**
- Top and bottom E-core halves as brown rectangles with ferrite material label
- Centre post limbs (gold) extending from each core half into the bobbin window
- Air gap line (red) between the two centre post limbs with gap value annotation (mm)

**Bobbin flanges:**
- Left flange (purple, `#9b59b6`) — primary-side, height = full build width
- Right flange (grey, `#d5d8dc`) — secondary-side, FL pins exit here
- Base insulation strip (tan) at bottom of winding window

**Winding layer bands:**
- One horizontal band per row of turns (colour = winding: blue=primary, red=secondary, orange=bias)
- Individual wire dots within each band (circles, filled = actual turns, outline = row padding)
- Wire dot radius derived from `WIRE_DIA[awg]` × scale factor (28 px/mm)
- Max wire dots per row capped at 55 for SVG performance
- Winding label (right side): name + turns + AWG + strands
- Row number (left side, inside flange): counts down from outermost inward

**Insulation tape bands:**
- Gold (`#f0c840`) horizontal bands between winding groups
- Height = `TAPE_H × nLayers` where nLayers is 1/2/3 for basic/supplementary/reinforced
- Label inside band: `"NL tape (class)"`

**Dimension annotations (SVG arrow markers):**
- BW height arrow (left side): `result.core.Wa_mm2 / 10` mm
- Le width arrow (bottom): `result.core.Le_mm` mm
- Outer width arrow (below): core name

**Pin diagram (right SVG group, offset x=580):**
- 4 left pins (primary side): numbered circles with colour, label, winding ref
- 4 right pins (FL labels, secondary side): circles with colour and winding name
- Connection lines between pin and winding label text

**Layer legend (bottom, y=440):**
- One swatch + text per winding group
- Plus tape entry: "Insulation tape (class)"

#### `cd` computed property

```js
cd = computed(() => {
  // Winding order: [...secs, pri, bias] (secondary innermost per AN-29)
  // For each winding:
  //   nRows = ceil(turns / maxWiresPerRow)
  //   maxWiresPerRow = floor((BOBBIN_W - 8) / (wireDia_px + 1.5))
  //   wireDia_px = max(4, min(11, WIRE_DIA[awg] * 28))
  //   Each row → layer object { y, h, color, wireDots[], label, rowNum }
  // Tape bands inserted before each winding group after first
  //   h = TAPE_H × (1|2|3 based on isolationClass)
  // Pin data: fixed arrays for left (1–4) and right (FL1–FL4)
})
```

#### CSS additions
- `.constr-wrap`: flex, overflow:auto, background:#fdfdfd (scrollable for large designs)
- `.constr-svg`: min-width 760px, block display

#### Help System
New article added: **magnetics-designer-construction** (42 total articles). Covers all visual elements, winding order rationale, tape layer count table, and production use guidance.

---

## Session — 7-View Mechanical Diagram Panel

### MagneticsDesigner.vue now has 7 selectable diagram views

All 7 views share the same Mechanical Diagram panel (top-left). The panel title bar has 7 tab buttons: **Cross-Section | Spiral | Construction | Designer | Foundry | 3D View | Thermal**.

| View | mechView value | SVG size | Computed | Background |
|------|---------------|----------|----------|------------|
| Cross-Section | `'cross'` | dynamic | `mechLayers` | #fafafa |
| Spiral | `'spiral'` | 420×420 | `spiralData` | #f9f9f9 |
| Construction | `'construction'` | 760×480 | `cd` | #fdfdfd |
| Designer | `'designer'` | 820×520 | `dvData` | #fff |
| Foundry | `'foundry'` | 820×580 | `fdData` | #f8f8f8 |
| 3D View | `'3d'` | 680×480 | `tdData` | #1a1e35 |
| Thermal | `'thermal'` | 760×480 | `thermData` | #0d0f1a |

#### Designer View (`dvData`)
Professional engineering schematic drawing. Winding blocks with diagonal ANSI hatching. Callout circles (P/S/B) with leader lines to a right-side spec table (per-winding: turns/AWG/strands/Irms/DCR + 10 core parameters). Title block (bottom-right): component PN, revision A0, material, IEC 62368-1, drawn by FluxForge, date. BW and Le dimension arrows. Winding layer heights computed from real wire diameter.

#### Foundry View (`fdData`)
Formal manufacturing drawing with: double-line drawing border, ANSI ferrite cross-hatch on core flanges (clipPath-bounded diagonal lines), ANSI wire single-hatch on winding blocks (per-clipPath per winding), callout circles with dashed leader lines, gap dimension with ±0.03mm tolerance. Right panel: materials spec table (Ref | Item | Specification | Tolerance | Standard) covering core, bobbin, each wire, tape, hi-pot test, Lp test. Five numbered general notes. Title block with drawing frame. Gap = `${r.gap_mm}mm ±0.03mm` annotation.

#### 3D Isometric View (`tdData`)
Isometric projection using: `function iso(x,y,z)` → `[x×cos(30°) − y×cos(30°), −z + (x+y)×0.5]`. Three-face rendering for each solid (top/front/right faces at different fill-opacity for depth). Bottom E-core, top E-core, centre post, winding bands (front+top faces), lead wires (line + dot + label). Gap annotation dashed line. Legend panel (top-right): colour swatches + labels + Lp/Np:Ns readout. XYZ axis indicator (bottom-left).

#### Thermal View (`thermData`)
False-colour thermal gradient map. `function tempColor(T)` maps temperature to a 6-stop HSL gradient (cold blue → cyan → green → yellow → orange → hot red). Winding bands coloured by T = Ta + P_loss × thermal_coefficient. Isothermal gradient lines (vertical, semi-transparent) inside each band. Three hot-spot markers (circles + leader lines + labelled boxes): U1, D3, Core. Right panel: 5-row thermal budget table with margin readouts + PASS/FAIL banner. Loss source horizontal bar chart (5 items). Colour scale bar (linearGradient). Temperature range: [Ta (bottom)] → [tMax (top)].

### Help System — 46 articles (+4 new)

| Article ID | Title |
|------------|-------|
| magnetics-view-designer | Designer View |
| magnetics-view-foundry | Foundry View |
| magnetics-view-3d | 3D Isometric View |
| magnetics-view-thermal | Thermal Map |

---

## Session — Dimensions View (8th tab)

### MagneticsDesigner.vue — 8 diagram views, 3516 lines

Added **Dimensions** tab as the 8th view in the Mechanical Diagram panel.

#### CORES table expanded
All 19 CORES now carry real physical dimensions from TDK/Ferroxcube datasheets:

| Field | Meaning | Source |
|-------|---------|--------|
| A | Outer length (mm) | Datasheet dimension A |
| B | Outer width (mm) | Dimension B |
| C | Single E-half height (mm) | Dimension C |
| D | Window/bobbin height (mm) | Dimension D |
| E | Window length (mm) | Dimension E |
| F | Centre post width (mm) | Dimension F |
| H | Fully assembled height 2×C (mm) | Dimension H |

`dimData` falls back to derived values (from Ae/Le/Wa_mm2) if a core has no datasheet dimensions stored.

#### Dimensions View (`dimData` computed)

Three orthographic views (front/side/top) on a single SVG canvas with a grid background:

**Front View:** Core rectangle (A×H), outer limbs filled gold, centre post in two halves with red dashed gap line, winding colour bands in the window area (height proportional to actual wire build), dimension arrows A/H (blue), E/D (green), F (purple), gap callout with leader line showing gap mm + Al nH/T².

**Side View:** Core rectangle (B×H), top/bottom bars (C height, gold fill), centre post as a circle/ellipse (F diameter), dimension arrow B, C annotation on left.

**Top View:** Core rectangle (A×B), outer limbs as top/bottom strips, centre post bar, concentric winding rings (colour-coded by winding, width ∝ wire diameter × scalePx), MLT dashed circle with label.

**Scale:** `scalePx = max(2.5, min(8, 220/A))` — auto-fits so the core's A dimension occupies ~220px, maintaining consistent rendering regardless of core size. Scale bar: 0/10/20mm with 1:1 calibration label.

**Physical Dimensions table (14 rows):** A, B, H (outer, ±0.3mm), C (E-half, ±0.2mm), D (window height, ±0.2mm), E (window length, ±0.2mm), F (post width, ±0.15mm), Ae, Le, Ve, Al ungapped, Al gapped, Gap (±0.03mm), MLT.

**Winding Build table:** Per-winding build in mm = `ceil(turns/30) × WIRE_DIA[awg] × 1.15`, insulation tape total = `(nWindings-1) × nLayers × 0.04mm`, Total BW vs D (green/red), Fill factor vs 40% limit (green/red).

**PCB Footprint banner:** `A mm × B mm × H mm (L×W×H)`.

#### Help System — 47 articles
New article: `magnetics-view-dimensions` — covers three-view layout, all 7 dimension letters (A–H), magnetic parameters, dimension table, winding build table, scale bar usage, gap annotation.

---

## Session — Product Portfolio, Family Schematics, Magnetics+Evaluation Tabs

### 1. ProductPortfolio.vue — Trimmed to 11 known families

Removed speculative entries (IFC-5, IFC-4, InnoMux-2, BridgeSwitch, LYTSwitch-0/5/6/7, LPFC-3, PSC-PH, CAPZero-3). Retained families with real circuit data and published application notes:

| Family | Max Power | Topology |
|--------|-----------|----------|
| IFC-CE | < 65W | Flyback |
| IFC-AE | < 65W | Flyback |
| IFC-EP | < 100W | Flyback |
| HPFC-1 | < 230W | Flyback/Forward |
| HPFC-2 | < 250W | Flyback/Forward |
| HPFC-3 | < 270W | Flyback/Forward |
| LPFC-1 | < 25W | Flyback/Buck |
| LPFC-2 | < 30W | Flyback/USB-PD |
| PSC-TN | < 8W | Buck/Flyback |
| PSC-XT | < 12W | Flyback |
| PSC-HP | < 165W | Flyback |

Each family tree node shows a power range badge (`.pp-power-badge` blue pill).

### 2. SchematicDiagram.vue — Family-aware rendering (1086 lines)

Added computed properties:
- `family` → `props.uds?.meta?.family`
- `schematicType` → maps family string to `'topswitch'|'innoswitch3'|'tinyswitch4'|'tinyswitchlt'|'linkswitchtn'|'linkswitchxt'|'linkswitchhp'`
- `icPins` → per-family pin labels and brand colour

Four distinct SVG schematics keyed by `v-if`/`v-else-if` on `schematicType`:

**HPFC** (default, existing): Blue IC, D/V/F/S/X pins, RCD clamp, opto feedback.

**IFC**: Green IC (`.d1fae5`), split primary/secondary block with isolation barrier dashed line + `ISOLATION` rotated label. SR output connection dashed to secondary. Feedback resistors R_fb1/R_fb2. Polarity dots on primary and secondary.

**LPFC-1/LT**: Amber IC (`#fef3c7`), EN/UV + BYP pins, Y-cap CY1, optocoupler U2 Opto, BP bypass cap. `FluxForge Auto-restart` label.

**PSC-TN/XT2/HP**: Purple IC (`#ede9fe`), component label adapts to `schematicType` (L1 Inductor for TN2, T1 Transformer for XT2/HP), BP cap, `FluxForge` label.

All schematics show: dynamic `Np={{ result?.Np || '?' }}T` and `Ns={{ result?.Ns || '?' }}T` from simulation result. Individual title block with topology/family/input/power/date.

### 3. DesignWizard.vue — Two new result tabs

`RESULT_TABS` updated to: `['Schematic','Design Results','Magnetics Designer','Design Evaluation','Board Layout','BOM','Transformer Construction','Design Notes']`

#### Magnetics Designer tab
Renders `<MagneticsDesigner :seed-design="savedDesign"/>`. The `seedFromDesign()` function in MagneticsDesigner auto-populates all form fields from the UDS design on `onMounted` and via `watch`. VOR is auto-set per family: IFC→135V, LPFC→60V, others→90V.

#### Design Evaluation tab
Six-card 3×2 grid showing comprehensive design evaluation:

| Card | Key fields |
|------|-----------|
| Power Stage | Pin, Pout, η vs 82%, Vdc_min, D_max vs 55%, Ip_pk, Ip_rms, Vclamp, mode |
| Transformer | Core, Lp, Np/Ns/Nb, Bmax, Ae, n_ps, fsw |
| Thermal | U1_Tj/D3_Tj/T1_dT with colour-coded margins |
| Compliance | 7 checks with pass/warn/fail styling |
| Windings | Turns, AWG, Irms, DCR per winding |
| Loss Budget | Horizontal bar chart, total W, η% |

`evalStatus` computed drives the top banner: PASS ✅ / REVIEW ⚠️ / FAIL ❌ based on `thermal.pass && D_max < 55 && η_percent >= 82`.

### 4. MagneticsDesigner.vue — seedDesign prop

Added `defineProps({ seedDesign })` and `seedFromDesign(d)` function called from `onMounted` and `watch`. Fixed duplicate `from 'vue'` import by merging `ref,computed,watch,onMounted` into one import.

### 5. HelpSystem — 50 articles (+3 new)
- `schematic-families`: family schematic differences table
- `design-eval-tab`: six-card layout description, status banner
- `magnetics-designer-seed`: auto-population field mapping table

---

## Session — MagneticsDesigner Layout + SVG Fixes + HPFC Schematic

### MagneticsDesigner.vue — Layout restructured (2 rows)

**Row 1 (flex: 2.2, ~60% height):**
- Left: `p-mech` (flex: 2) — Mechanical Diagram panel with 7 diagram tabs
- Right: `md-right-col` (flex: 1, column) containing:
  - `p-winfo` (flex: 1.4) — Windings Info
  - `p-windprop` (flex: 1) — Winding Properties

**Row 2 (flex: 1.5, ~40% height):**
- `p-elec` (flex: 1) — Electrical Diagram
- `p-coilprop` (flex: 1) — Coil Former Properties  
- `p-instr` (flex: 1) — Instructions

Winding Properties was moved from Row 2 to the right-col of Row 1. Instructions was moved from a dedicated Row 3 into Row 2.

**Fixed compile error:** Orphan `</div><!-- end row 2 -->` inside Row 1 caused `-1` div balance. Removed.

### SVG Diagram Fixes

| Diagram | Fix |
|---------|-----|
| **Spiral** | Legend + stats moved outside SVG (were at y=340–415 inside 420×420 viewBox overlapping diagram). SVG shrunk to 420×340. Legend renders as `.spiral-legend` HTML below SVG. |
| **Construction** | Pin Assignments moved from beside drawing (`translate(640,40)`) to below drawing (`translate(50,370)`). ViewBox 760×560 (taller). Pin rows use 26px spacing. Left pins cx=20, right pins cx=340. |
| **Designer** | ViewBox 820×600. Spec table at translate(445,30) width 365px. Title block relocated to y=510–592 (bottom-left). |
| **Foundry** | ViewBox 1060×580. Spec table at translate(290,14) width 760px. Tol column x=470, Std column x=600. |
| **Thermal** | ViewBox 1020×480. Budget table width 490px, Tj column x=160, margin x=250. PASS/FAIL banner 480px wide. Scale bar at x=990. |
| **Dimensions** | scalePx formula improved: max(4,min(12,320/A)) — 40% larger minimum. dims-svg CSS: `width:100%; height:auto`. |
| **Electrical** | ViewBox 560×380. Core bars at x=200/208 (primary) and x=280/288 (secondary). Left labels x=92, right labels x=330. All arcs and polarity dots updated. |

### SchematicDiagram.vue — HPFC-1 rewritten

Complete rewrite of HPFC-1 SVG to match FluxForge reference schematic:

**Input stage (L→R):** AC terminals → Fuse F1 → C1 X-cap → NTC thermistor RT1 → CM choke L1 (both windings) → Bridge BR1 → Bulk cap C2 + Bleed resistors R4/R5

**Transformer T1:** EFD30 with primary arcs (blue, Np turns), bias arcs (orange), secondary arcs (red), polarity dots. Winding labels read live Np/Ns from simulation.

**Clamp + output:** RCD clamp (D2+C7+R10 snubber), D3 output diode, C9/C10 output caps, output terminals +V/RTN with actual voltage.

**IC U1:** HPFC-1 box with D/V/F/S/X pins. C4 bypass cap. Feedback: D1 freewheeling + U2A opto + U3 TL431 + R11/R12/R13 divider.

**Interactive:** All HIT_BOXES preserved. Hover/freeze overlays intact. Title block shows live design metadata.

### Div Balance Note

DesignWizard, SchematicDiagram, and ProductPortfolio all use inner `<template>` tags for Vue's `v-if`/`v-for` wrappers. The SFC `</template>` boundary is the one immediately followed by `<script setup>`. All three files have correct HTML div balance when measured to the correct boundary.

---

## Session — Web UI Fix + Portfolio→Wizard Family Pre-selection

### Problem 1: "FluxForge Design Wizard" hero persisting on web

The `DesignWizard` component (mounted at App level in PIWeb) contained a `dw-launcher` div that rendered whenever `!wizardOpen && !designReady && !simulating && !pickerOpen` — true on every page load. This caused the wizard hero section to always be visible behind every route (welcome, files, components, etc.).

**Fix:** 
- `dw-launcher` block removed from `DesignWizard.vue` template entirely
- Orphan CSS (`.dw-launcher`, `.dw-launcher-inner`, `.dw-launcher-icon`, `.dw-launcher-title`, `.dw-launcher-desc`) removed from style block
- `dw-root` div now has `v-if="wizardOpen || designReady || simulating || pickerOpen"` — renders zero DOM when idle

### Problem 2: Portfolio selection not carried into Wizard Step 1

When the user selected a family+app in the portfolio (e.g. "HPFC-1 Flyback (Universal Input)") and clicked "FluxForge", the wizard opened at Step 1 with default HPFC-1 settings regardless of selection.

**Fix — full chain updated:**

**`ProductPortfolio.vue`:**
- Added `selectedFamily` computed — finds the family object for the currently selected app
- Added `parseAppString(app)` — maps app strings to `{ topology, inputSpec }`:
  - `'Flyback'` → `'Flyback'`, `'Forward'` → `'Forward'`, etc.
  - `'Universal Input'` → `'Universal (85 - 265 V)'`
  - `'European Input'` → `'Single 230V (195 - 265 V)'`
  - `'High Voltage DC'` → `'High Voltage DC (127 - 400 V)'`
- `launchFluxForge()` now emits `{ app, family, productLine, topology, inputSpec }` instead of a plain string

**`PIWeb/App.vue`:** `onPortfolioLaunch(payload)` passes payload to `startWizard(payload)`

**`PITauri/App.vue`:** Same — `onPortfolioLaunch(payload)` → `triggerStartWizard(payload)`

**`PITauri/DesignPage.vue`:** `triggerStartWizard(payload)` forwards to `wizardRef.value?.startWizard(payload || {})`

**`DesignWizard.vue` — `startWizard(payload = {})`:**
1. Sets `form.value.productLine` from payload (derived from family name if not explicit)
2. Sets `form.value.family = payload.family`
3. Calls `onFamilyChange()` — applies ALL family defaults (VOR, KP, isolation class, feedback type, outputs, frequency, packages)
4. Overrides `form.value.topology` and `form.value.inputSpec` from payload
5. Auto-fills `vMin`/`vMax` via `specVmin()`/`specVmax()` from the inputSpec string
6. Falls back to current family defaults if no payload

**Result:** Selecting "IFC-CE Flyback (Universal Input)" → opens Step 1 with IFC-CE family selected, topology=Flyback, inputSpec=Universal, vMin=85, vMax=265, VOR=135 locked, max 2 outputs, PSR feedback — all pre-filled.

### Cleanup
- Removed unused `DesignView` import from `PIWeb/src/main.js` (route redirects to welcome, component never instantiated)

---

## Session — Export to CAD, Homepage Tiles Restored, Final Polish

### Export to CAD Feature

**DesignWizard.vue** — `exportCAD()` function generates a complete CAD package:

- `{name}.kicad_sch` — KiCad 6+ S-expression schematic with populated title block (input/output spec, core, turns, gap), component symbol instances laid out on a grid, and `(lib_symbols)` section mapping to standard KiCad device library IDs
- `{name}_netlist.csv` — CSV netlist (Reference, Value, Footprint, Net_A, Net_B, Description) importable in KiCad, Altium Designer, Eagle
- `{name}_BOM.csv` — Bill of materials with grouped quantities
- `README.txt` — Step-by-step import instructions for KiCad and Altium

All files bundled as `{name}_CAD.zip` via JSZip (loaded from cdnjs on demand).

Component generation is family-aware via `buildCADComponents()`:
- HPFC: bleed resistors R4/R5, RCD clamp (VR1/R10/C7/D2), V-pin resistors, TL431+opto feedback
- IFC: no RCD clamp, simplified PSR feedback
- LPFC/PSC: freewheeling diode D1, BP-pin topology
- Bias winding (D8/C8): only when `hasBias` is true for the family
- T1 value string includes live simulation result: core, Lp, Np/Ns/Nb, gap

**AppMenuBar.vue** — "Export to CAD" added to Edit menu:
- Positioned directly below "Export All Tabs to PDF"
- IC-grid SVG icon, navy "KiCad" badge (`.amb-dd-badge` CSS)
- Disabled when no design active (`:class="{'amb-dd-item--dis':!hasDesign}"`)
- `'export-cad'` added to emits list

**Full wiring chain:**
- `AppMenuBar` emits `'export-cad'`
- `PIWeb/App.vue`: `@export-cad="onExportCAD"` → `designWizardRef.value?.exportCAD()`
- `PITauri/App.vue`: `@export-cad="onExportCAD"` → `activeDesignPageRef` or `newDesignPageRef` `.triggerExportCAD()`
- `PITauri/DesignPage.vue`: `triggerExportCAD()` → `wizardRef.value?.exportCAD()`
- `DesignWizard.vue` `defineExpose`: `exportCAD` added

### WelcomeScreen Tiles Restored

The `ws-title` heading ("Welcome to FluxForge") and all four `ws-tiles` (New Design, Open Design, Component Library, Help & Documentation) were accidentally dropped during a previous logo replacement. Restored:
- `<h1 class="ws-title">{{ t('ui.welcome') }}</h1>`
- Four `ws-tile` buttons with SVG icons emitting `new-design`, `open-design`, `component-library`, `help`

### Final State

All 26 validation checks pass:
- 6 components with balanced divs and single style blocks
- All key features verified: CAD export, no dw-launcher, wizardActive store signal, family config, PI logo, welcome tiles, brand CSS, routing

---

## Session — Export to CAD Help System Documentation

### HelpSystem.vue — 51 articles (+1)

Added `export-cad` article covering:
- How to trigger the export (Edit → Export to CAD)
- Files included in the ZIP (`.kicad_sch`, `_netlist.csv`, `_BOM.csv`, `README.txt`) with format and purpose for each
- What the schematic contains (live simulation values in component labels, title block population, left-to-right component layout)
- Family-specific component generation table (HPFC/IFC/LPFC/PSC rows)
- Step-by-step instructions for opening in KiCad 6+ and importing in Altium Designer
- Verification warning and CDN dependency note

Updated `export-all` article:
- Added cross-reference tip: "Also see Edit → Export to CAD to generate a KiCad schematic, CSV netlist, and BOM for PCB layout work"
- Added `export-cad` to related articles list

### README.md
Added dedicated "Export to CAD" section with file format table and family-aware component description.

### TDD.md
Added Export to CAD entry to the features table.

---

## Session — Schematic Component Editor + Full Documentation Pass

### SchematicDiagram.vue — Component Editor Panel

**Trigger:** clicking any component hit region on the schematic.

**COMP_CATEGORY map** — every schematic reference (F1–U3) is mapped to:
- `label` — human-readable component type
- `db` + `sub` — ComponentDB category and sub-category to pull alternatives from
- `fields` — ordered list of fields to show as editable inputs
- `isTransformer` flag — for T1 special display

**`getAlternatives(ref)`** — resolves the right ComponentDB list:
- `COMPONENT_DB.fuses` (flat array) → for F1
- `COMPONENT_DB.capacitors.bulk_electrolytic` → for C2
- `COMPONENT_DB.inductors.transformer_cores` → for T1
- `COMPONENT_DB.ics` (all sub-arrays flattened) → for U1/U2/U3

**`openEditor(ref)`** — seeds `editDraft` from `uds.components[ref]` if previously modified, otherwise empty; sets `editorOpen=true`.

**`applyAlternative(alt)`** — copies the selected DB row into `editDraft` so all fields populate at once.

**`confirmEdit()`** — deep-clones UDS, writes `editDraft` into `uds.components[ref]`, adds ref to `modifiedRefs` and `frozenRefs`, emits `update:uds`.

**`resetComponent()`** — removes `uds.components[ref]`, clears `modifiedRefs` and `frozenRefs` for that ref, emits `update:uds`.

**Blue modified overlay** — the SVG hover overlay loop now checks `modifiedRefs.has(refKey)` first. Modified refs get: solid `#0D7377` outline (2px), semi-transparent blue fill, navy pill badge with white `✎ {ref}` text.

**Panel UI** — slide-in from right (`translateX` transition, 340px wide):
- Header: brand navy background, ref designator, component type label, "Modified" badge, current part summary, close ✕ button
- Edit fields: label–input pairs for each field in `editFields`
- Alternatives list: scrollable, each item shows part/mfr + key specs as chips + cost badge
- Active alternative highlighted with blue border
- Footer: Reset (only when modified) | Cancel | Apply change

**CSS:** `sd-editor-panel`, `sd-ep-*` — all scoped. `sd-wrap` given `position:relative` so the panel can absolutely position against it.

### HelpSystem.vue — 52 articles (+1)
New article `schematic-component-editor`: how to edit components, panel sections table, component-specific alternatives table, blue indicator explanation, UDS write-back explanation.

### README.md + TDD.md
Both updated with Schematic Component Editor section and all previous session features (Export to CAD, homepage tiles, layout fix, brand theme).

---

## Session — Schematic Pixel-Perfect Redraw + Component Dialog Modal

### SchematicDiagram.vue — full SVG rewrite

The HPFC-1 schematic SVG was completely redrawn to match the FluxForge reference diagram pixel-by-pixel:
- ViewBox expanded to 1440×660
- All 28 component groups redrawn with correct positions, labels, values, and wiring
- Junction dots (filled circles) added at all wire T-junctions
- Component value labels use `cv()` accessor for live UDS-driven display
- Np/Ns/Nb turn counts live from `result` computed
- Title block includes design file name, topology, family, input spec, power, date
- New HIT_BOXES coordinates matched to redrawn component positions
- Hover overlays use `box.h || box.height || 20` to handle both property names

### SchematicDiagram.vue — Component Dialog replaces side panel

The previous slide-in side panel was removed and replaced with a centered modal dialog matching the reference UI (Image 1):

**Modal structure (teleported to body):**
- Header: component type label, ref designator, current part/modified indicator, ✕ close
- Three tabs: Component DB | Parameters | Notes
- Component DB tab: search input + type filter dropdown + `N parts` count + sortable table
  - Columns: radio | Part # | Manufacturer | Value/Cap. | Rated Voltage | ESR/Tol | Package | Temp (°C) | Cost
  - Table header: brand navy (#1B3A6B) with white text, sticky
  - Selected row: blue highlight + filled radio dot
  - Filter uses `filteredAlts` computed from `altSearch` + `altFilter` against all alt fields
- Parameters tab: field-label + input pairs for component-type-specific fields
- Notes tab: free-form textarea stored in `editDraft._notes`
- Footer: Reset to original (conditional) | Cancel | Apply

**New reactive state:** `modalTab`, `altSearch`, `altFilter`, `selectedAltIdx`, `filteredAlts` (computed), `altTypeOptions` (computed)

**openEditor()** now resets all modal state and pre-selects the currently active part in the alternatives list via `findIndex`.

**confirmEdit()** unchanged — writes to UDS, marks ref in `modifiedRefs`, emits `update:uds`.

**Blue indicator** — modified refs show solid `#0D7377` 2.5px outline + `✎ {ref}` navy pill badge in the SVG hover overlay layer.

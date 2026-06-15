# PIExpert Monorepo — Technical Design Document & Setup Guide

> A single codebase that runs as both a **Tauri desktop app** and a **Vue 3 web app**,
> sharing all components, stores, and logic. Backed by SQLite on both platforms.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Project Structure](#3-project-structure)
4. [First-Time Installation](#4-first-time-installation)
5. [Running the Web App](#5-running-the-web-app)
6. [Running the Desktop App](#6-running-the-desktop-app)
7. [Feature Reference](#7-feature-reference)
8. [How the SQLite Backends Work](#8-how-the-sqlite-backends-work)
9. [How Shared Code Works](#9-how-shared-code-works)
10. [Adding New Features](#10-adding-new-features)
11. [Building for Production](#11-building-for-production)
12. [Troubleshooting](#12-troubleshooting)
13. [Quick Reference: All Commands](#13-quick-reference-all-commands)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    @pi/shared  (packages/shared)                  │
│                                                                    │
│   DesignWizard.vue   FileManager.vue   SchematicDiagram.vue       │
│   BoardLayout.vue    BOMPanel.vue      TransformerConstruction.vue│
│   DesignNotes.vue    DesignResultsPanel.vue                       │
│                                                                    │
│   stores/useFilesStore.js    stores/useDesignStore.js             │
│                                                                    │
│   api/index.js  ──── isTauri() ? tauriApi : httpApi              │
│       │                   │                    │                   │
│   api/tauri.js        api/http.js              │                   │
│   invoke() calls     fetch('/api/...')          │                   │
└────────────────────────────────────────────────────────────────────┘
         ↑                                    ↑
  ┌──────────────┐                    ┌──────────────┐
  │   PITauri    │                    │    PIWeb     │
  │   Desktop    │                    │   Browser    │
  └──────────────┘                    └──────────────┘
         ↓                                    ↓
  ┌──────────────┐                    ┌──────────────┐
  │  Rust/Tauri  │                    │   server/    │
  │  Commands    │                    │  index.js    │
  │  (lib.rs)    │                    │  Express +   │
  └──────────────┘                    │  sql.js      │
         ↓                            └──────────────┘
  ┌──────────────┐                           ↓
  │ piexpert.db  │                    ┌──────────────┐
  │ (~/.local/   │                    │ piexpert.db  │
  │  share/...)  │                    │ (server/)    │
  └──────────────┘                    └──────────────┘
```

---

## 2. Prerequisites

### For the Web App

| Tool    | Version | Install |
|---------|---------|---------|
| Node.js | 18+     | https://nodejs.org |
| pnpm    | 8+      | `npm install -g pnpm` |

### For the Desktop App (additional)

| Tool       | Notes |
|------------|-------|
| Rust       | https://rustup.rs |
| **Windows**| Visual Studio Build Tools 2022 (C++ workload) + WebView2 |
| **macOS**  | `xcode-select --install` |
| **Linux**  | `sudo apt install libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev` |

---

## 3. Project Structure

```
pi-expert-monorepo/
│
├── TDD.md                        ← Claude project context
├── SETUP_GUIDE.md                   ← This document (TDD)
├── pnpm-workspace.yaml              ← workspace config
├── package.json                     ← root scripts
│
├── server/                          ← Web SQLite backend
│   ├── package.json
│   ├── index.js                     ← Express REST API (Files + Auth)
│   └── uploads/                     ← Uploaded .uds files
│
├── packages/
│   └── shared/                      ← Shared Vue + logic
│       └── src/
│           ├── api/
│           │   ├── index.js         ← Platform router
│           │   ├── tauri.js         ← Desktop: invoke() calls
│           │   └── http.js          ← Web: fetch() calls
│           ├── stores/
│           │   ├── useFilesStore.js ← File list state
│           │   └── useDesignStore.js← Design state (persists across tabs)
│           └── components/
│               ├── DesignWizard.vue          ← Main wizard + result view
│               ├── SchematicDiagram.vue      ← SVG schematic
│               ├── DesignResultsPanel.vue    ← Computed parameters table
│               ├── BoardLayout.vue           ← PCB viewer
│               ├── BOMPanel.vue              ← Bill of materials
│               ├── TransformerConstruction.vue
│               ├── DesignNotes.vue
│               └── FileManager.vue           ← .uds file manager
│
├── PITauri/                         ← Desktop app
│   ├── src/
│   │   ├── App.vue                  ← v-show nav (preserves state)
│   │   ├── api/tauri.js             ← Desktop API adapter
│   │   └── components/
│   │       ├── DesignPage.vue
│   │       ├── FilesPage.vue
│   │       └── SettingsPage.vue
│   └── src-tauri/src/lib.rs        ← Rust commands + SQLite
│
└── PIWeb/                           ← Web app
    └── src/
        ├── App.vue                  ← Top nav + user menu
        ├── main.js                  ← Router + auth guard
        ├── views/
        │   ├── LoginView.vue
        │   ├── RegisterView.vue
        │   ├── DesignView.vue
        │   └── FilesView.vue
        └── stores/
            └── useAuthStore.js
```

---

## 4. First-Time Installation

```bash
pnpm install
```

---

## 5. Running the Web App

```bash
# Terminal 1 — SQLite API server
pnpm dev:server      # → http://localhost:8081

# Terminal 2 — Vue app
pnpm dev:web         # → http://localhost:5174

# Or both together
pnpm dev:all
```

Navigate to `http://localhost:5174` and **register** an account (email + password ≥ 8 chars) before using the app.

---

## 6. Running the Desktop App

```bash
pnpm dev:desktop
```

> First Rust compilation takes 2–5 minutes. Subsequent runs are fast.

---

## 7. Feature Reference

### 7.1 PI Expert Design Wizard

A 4-step wizard modelled on Power Integrations' PI Expert design flow.

**Step 1 — Design Options**
- Topology (Flyback), IC Family (TOPSwitch-JX / TOPSwitch-GX / TinySwitch-4 etc.)
- Package, feedback type, file name

**Step 2 — Input**
- Vin min/max, line frequency, input spec selector

**Step 3 — Outputs**
- Add/edit/remove output rails (voltage, current, peak current, tolerance)
- Calculates total power in real time

**Step 4 — Settings**
- Operation mode, component set, transformer type, core material, shield windings

**Simulation Overlay**
12-stage animated progress sequence (180–300 ms per stage) with spinner, percentage counter, progress bar and stage indicators.

**Design Picker Dialog**
After simulation completes, a full-screen modal presents **6 optimised design variants**:

| Variant | Optimises for |
|---------|--------------|
| Balanced | Overall trade-off (default) |
| High Efficiency | Low switching losses |
| Compact | Higher frequency → smaller magnetics |
| Low Cost | Minimum BOM cost |
| Low EMI | Spread-spectrum, enhanced filtering |
| Wide Input | Extended Vin range with enhanced protection |

Each card shows: label, tag badge, description, and 4 animated metric bars (Efficiency %, Relative Cost ×, Relative Size ×, ΔT Rise °C). User selects one → "Use This Design" saves the `.uds` file.

**Result View — 6 Tabs**

| Tab | Contents |
|-----|----------|
| Schematic | Interactive SVG flyback schematic with pan/zoom |
| Design Results | Input/output/IC parameters table |
| Board Layout | Interactive PCB viewer with DRC, layer toggle |
| BOM | 14-component bill of materials with search/filter/CSV export |
| Transformer Construction | Winding data, cross-section, specs, assembly steps |
| Design Notes | Auto-generated documentation, compliance checklist |

**Actions Submenu** (top-right button):
- **New Design** — clears state, returns to launcher
- **Export All Tabs to PDF** — generates a professional 7-page PDF report using jsPDF (loaded from CDN at export time):
  - Cover page (design summary, parameters)
  - Schematic (SVG capture + parameters)
  - Design Results
  - Board Layout (SVG capture + PCB summary)
  - Bill of Materials (full table)
  - Transformer Construction
  - Design Notes & Compliance Checklist

### 7.2 File Manager

- Lists all `.uds` design files with search, filter, sort, breadcrumbs
- **Upload restricted to `.uds` files only** (enforced via `accept=".uds"` and server-side check)
- Drag-and-drop also validates `.uds` extension before upload
- Clicking a `.uds` file (or double-click / "Open Design") loads it into the Design Viewer
- Context menu: Open Design, Download, Rename, Duplicate, Notes, Delete

### 7.3 Authentication (Web only)

- Register: email + name + password (min 8 chars), 3-step wizard with password strength meter
- Login: email + password
- Session persisted via `localStorage` token, validated on every app load via `GET /api/auth/me`
- Router guard redirects unauthenticated users to `/login`

---

## 8. How the SQLite Backends Work

### Web backend (`server/index.js`)

Uses **sql.js** (synchronous Node.js SQLite). Schema:

```sql
CREATE TABLE IF NOT EXISTS files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT    NOT NULL,
  stored_name   TEXT    NOT NULL UNIQUE,
  mime_type     TEXT,
  size          INTEGER DEFAULT 0,
  notes         TEXT,
  created_at    TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now'))
);

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  password   TEXT    NOT NULL,   -- scrypt hash
  salt       TEXT    NOT NULL,   -- 16-byte random hex
  token      TEXT,               -- 32-byte session token
  created_at TEXT
);
```

**REST Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server status |
| GET | `/api/files` | List all files |
| POST | `/api/files` | Upload a file (multipart) |
| POST | `/api/files/:id/copy` | Duplicate a file |
| PATCH | `/api/files/:id/notes` | Update file notes |
| DELETE | `/api/files/:id` | Delete file + disk copy |
| GET | `/uploads/:name` | Serve uploaded file (static) |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → token |
| GET | `/api/auth/me` | Validate session |
| POST | `/api/auth/logout` | Invalidate token |

### Desktop backend (`PITauri/src-tauri/src/lib.rs`)

Uses **rusqlite** (bundled). Tauri commands:

| Command | Description |
|---------|-------------|
| `get_all_files` | List files from DB |
| `import_file_base64` | Save base64-encoded file to disk + DB |
| `copy_file` | Duplicate file |
| `update_file_notes` | Update notes field |
| `delete_file` | Remove from disk + DB |
| `get_upload_dir` | Returns upload directory path |
| `read_file_text` | Read file content as string |

### Database Locations

| Platform | Path |
|----------|------|
| Web | `server/piexpert.db` |
| Windows (Desktop) | `%APPDATA%\PIExpert\piexpert.db` |
| macOS (Desktop) | `~/Library/Application Support/PIExpert/piexpert.db` |
| Linux (Desktop) | `~/.local/share/PIExpert/piexpert.db` |

---

## 9. How Shared Code Works

The platform adapter in `packages/shared/src/api/index.js` proxies all calls:

```js
// Web app registers httpApi:
registerAdapter(httpApi);

// Desktop app registers tauriApi:
registerAdapter(tauriApi);

// Components call the same API regardless of platform:
api.listFiles()       // → httpApi.listFiles() or tauriApi.listFiles()
api.uploadFile(file)  // → httpApi.uploadFile() or tauriApi.uploadFile()
```

### useDesignStore

Key store for design state persistence. Survives tab switches and component remounts:

```js
designStore.setCurrentDesign(design)  // persist after confirming
designStore.clearCurrentDesign()      // on "New Design"
designStore.openDesign(design)        // trigger from File Manager
designStore.clearDesign()             // consumed by DesignWizard watch
```

---

## 10. Adding New Features

### Add a new result tab

1. Create `packages/shared/src/components/MyNewTab.vue` with `defineProps({ design: Object })`
2. Add `'My Tab'` to `RESULT_TABS` array in `DesignWizard.vue`
3. Add `<MyNewTab v-if="activeTab === 'My Tab'" :design="savedDesign" />` in the result section
4. Export from `packages/shared/src/index.js`

### Add a new PDF page to the export

In `DesignWizard.vue`'s `exportPDF()` function, call `doc.addPage()` and use the `drawPageHeader()`, `drawKeyVal()`, and `secHeader()` helpers.

---

## 11. Building for Production

### Web

```bash
pnpm build:web
# Output: PIWeb/dist/
```

Deploy `PIWeb/dist/` to a static host. Run `server/` as a Node.js service (PM2, Docker, etc).

### Desktop

```bash
pnpm build:desktop
# Output: PITauri/src-tauri/target/release/bundle/
```

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| Web: "Failed to fetch" | Start the server first: `pnpm dev:server` |
| Desktop: blank page on UDS open | Check browser console — likely a null `totalPower`. Ensure `.uds` file contains all required fields. |
| Design state resets on tab switch | Only on desktop. Ensure `PITauri/App.vue` uses `v-show`, not `v-if`, on all views. |
| PDF export button does nothing | Check browser console. jsPDF is loaded from CDN — requires internet access. |
| Upload rejected | File Manager only accepts `.uds` files. |
| Rust compile error | Need C compiler. Windows: Visual Studio Build Tools. Linux: `sudo apt install build-essential`. |
| Reset web database | `rm server/piexpert.db && pnpm dev:server` |
| Reset desktop database | Delete the `.db` file from the platform-specific path above |

---

## 13. Quick Reference: All Commands

```bash
# Install
pnpm install

# Web development
pnpm dev:server          # API server on :8081
pnpm dev:web             # Vue app on :5174
pnpm dev:all             # Both together

# Desktop development
pnpm dev:desktop         # Tauri desktop app

# Production builds
pnpm build:web           # → PIWeb/dist/
pnpm build:desktop       # → target/release/bundle/

# Health check (with server running)
curl http://localhost:8081/api/health
```

---

## 14. Component Database

The component database is accessible via the **Components** sidebar item. It displays 111 seeded real-world components in a PI Expert-style tabbed interface.

### Category tabs

Row 1: Capacitors · Diodes · Zeners/TVS · Inductors · Fuses · Fusible Resistors · Optocouplers · Heatsinks
Row 2: Shunt Regulators · Thermistors · SCR · Transistors · Varistors · MOSFET · Resistors

### Using the database

- **Filter rows**: use the dropdown filter row directly beneath the column headers
- **Sort**: click any column header
- **Search**: the filter row inputs accept partial text matches
- **Add**: click **Add…** to create a new component
- **Edit**: click **View** with a component selected, then **Edit** in the detail dialog
- **Delete**: select a component and click **Delete**
- **Export**: click **Export** to download the current filtered view as CSV
- **Fields**: click **Fields** to show/hide columns (ESR, rated life, temp, size columns are hidden by default)

### Component sets

Named groups of components (e.g. "Standard 65W Flyback") used in the wizard "Default Component Set" dropdown.

- Manage sets from the **⚙ Component Sets** button in the old ComponentsManager view
- Or assign any component to a set with the **Assign Components to a Set** button

### Compatible parts

Link any two components as compatible alternatives:

1. Click the 🔗 button on any component row
2. Search for the compatible part and click **+ Link**
3. Optionally enter a reason (e.g. "drop-in replacement")

In the Design view, the Design Tree **Compatible** tab shows these alternatives for any component currently in the design.

---

## 15. Magnetics Database

The magnetics database is accessible via the **Magnetics** sidebar item.

### Layout

```
[Left: filters] | [Cores table | Bobbins table] | [Right: detail tabs]
                | [Materials table | Accessories  ]
```

### Filtering cores

- Check/uncheck **series** (EF, EFD, EE, ETD, PQ, RM, T) in the left panel
- Check/uncheck **materials** (N87, PC95, 3F3…) in the left panel
- Type in **Name**, **Part Number**, or **Manufacturer** filter fields
- Use the **column filter dropdowns** in the filter row beneath table headers

### Selecting a core

Clicking a core row:
1. Auto-selects the matching bobbin in the Bobbins pane
2. Auto-selects the matching material in the Materials pane
3. Filters Accessories to show only parts for that core
4. Populates the **Core Param** tab in the right panel with full details

### Right panel tabs

| Tab | Contents |
|-----|---------|
| Core Param | Name, PN, series, material, AE/LE/VE/AL/SA, A–H dimensions, SVG diagram |
| Bobbin Param | Winding area, slots, creepage, clearance |
| Accessory Para | Ordering code, type, parts per set |
| Magnetic Mat | Bmax @25°C and @100°C (with bar chart), µi, freq range, max temp |

### Adding records

Use the **＋** button in each pane's title bar to add new cores, bobbins, materials, or accessories.

### Seeded data

| Data | Count |
|------|-------|
| Magnetic materials | 15 (PC95, N97, N87, N27, 3F3, 3C95, 3C90, 3C81, PC44, PC40, NC2H, T38, PC200, DMR50, ML91S) |
| Cores | 40 (EF12.6, EFD20/25/30, EE13–EE55, ETD29–ETD49, PQ20–PQ35, RM6–RM12, T-powder, Kool Mµ) |
| Bobbins | 24 |
| Accessories | 17 (clips, yokes, cover plates, gap tapes) |

---

## 16. Design Wizard — Dynamic Dropdowns

All dropdowns in the wizard are now fully dynamic:

| Dropdown | Source |
|----------|--------|
| **Topology** | `TOPOLOGIES` constant — 7 options |
| **Product Line** | `PRODUCT_LINES` constant — 6 options |
| **Family** | Computed from `FAMILY_MAP[productLine].families` |
| **Package** | Computed from `FAMILY_MAP[productLine].packages[family]` |
| **Frequency** | Computed from `FAMILY_MAP[productLine].freqs` |
| **Core Material** | Live from `GET /api/mag/materials` on mount |
| **Component Set** | Live from `GET /api/component-sets` on mount |

Selecting a new Product Line resets Family, Package, Frequency automatically.
Selecting a new Family resets Package and Frequency.

Core Material always reflects whatever is currently in the magnetics database — add a new material record and it appears in the wizard immediately on next open (no code change needed).

---

## 17. API Proxy Fix — How Methods Are Exposed

**Root cause of components not loading:** `api/index.js` previously listed only 6 file methods by hand. All component/magnetics/sets methods added via `Object.assign` on `httpApi` were silently unavailable through the `api` export.

**Fix:** `api/index.js` was rewritten to use a JavaScript `Proxy`:

```js
export const api = new Proxy({}, {
  get(_, key) {
    return (...args) => _adapter[key](...args);
  },
});
```

This means **every** method on the registered adapter (whether defined in the original object or added later via `Object.assign`) is automatically accessible as `api.methodName()`. No manual listing in `index.js` is ever needed again.

---

## 18. Interactive Schematic

The flyback schematic diagram supports component inspection directly:

- **Hover** over any component to see a dashed blue highlight box and a tooltip showing the ref designator
- **Click** any component to open the same 4-tab dialog as clicking it in the left Design Tree panel (Part # lookup, Compatible parts, Parameters, Notes)

**How it works:**
1. `SchematicDiagram.vue` defines `HIT_BOXES` — a map of 25 ref designators to their `{x,y,w,h}` bounding rectangles in the SVG viewport
2. Mouse events on the SVG test the cursor position against hit boxes
3. On click, `emit('component-click', refDes)` fires
4. `DesignWizard.vue` catches this and calls `treePanelRef.value.openByRefDes(refDes)`
5. `DesignTreePanel.vue` exposes `openByRefDes(refDes)` which finds the node in the TREE and opens the dialog

**Adding more clickable areas:** edit `HIT_BOXES` in `SchematicDiagram.vue`. Each entry is:
```js
R6: { x: 443, y: 290, w: 32, h: 22 }
```
Coordinates are in the SVG's 1120×640 user-space coordinate system.

---

## 19. Component Database — All Records View

The Component Database defaults to the **All Components** tab which shows all 111 seeded records together. Category tabs (Capacitors, Diodes, etc.) filter to specific types/subtypes.

**Column filter dropdowns:** each column header has a filter row beneath it. Columns with ≤40 distinct values show a dropdown; others show a text input.

**Showing hidden columns:** click **Fields** to toggle column visibility. Hidden by default: Ripple, ESR, Rated Life, Temp Coefficient, Temp Min/Max, Size L/W, Notes.

---

## 20. Schematic Interactivity — How the Click Chain Works

The schematic click flow:

```
User clicks component on SVG
  → SchematicDiagram.vue: onSvgClick() → hitTest() → emit('component-click', refDes)
  → DesignWizard.vue: onSchematicComponentClick(refDes) → treePanelRef.value.openByRefDes(refDes)
  → DesignTreePanel.vue: openByRefDes(refDes) → finds node in TREE → openDialog(node)
```

**Critical requirement:** The `DesignTreePanel` must stay mounted at all times. All result tabs now use `v-show` (not `v-if`) so the component ref is always valid.

---

## 21. Filename Rules

When the wizard opens, `nextAvailableFileName()` generates a unique name:
1. Scans `filesStore.files` for all existing `.uds` filenames
2. Builds base: `{family}_PIDesign` (e.g. `TOPSwitch-JX_PIDesign`)
3. Appends incrementing number: `TOPSwitch-JX_PIDesign1`, `2`, `3`…
4. Returns first unused name

When family changes, the suggested filename is also updated to match.

`finishWizard()` re-validates before saving — shows an alert and blocks if the typed filename already exists.

---

## 22. UDS Format vs Flat Design Format

Older saves and FilesPage fallbacks may produce "flat" design objects. All display components (`DesignResultsPanel`, `DesignNotes`, `SchematicDiagram`, `DesignTreePanel`, `BOMPanel`) now support both formats via a dual-path accessor pattern:

```js
// Reads UDS nested path first, falls back to flat field
const topology = design?.meta?.topology || design?.topology
const vMin     = design?.spec?.input?.vMin || design?.vMin
const outputs  = design?.spec?.outputs || design?.outputs || []
```

When opening old `.uds` files, `FilesPage.vue` normalises flat designs into UDS structure before pushing to the store.

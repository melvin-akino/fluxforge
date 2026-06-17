# FluxForge — Complete Build History

This document records everything used to build FluxForge from scratch:
prompts, features, libraries, and tools.

---

## Prompts Used to Build the Project

These are the actual prompts (paraphrased where needed for clarity) used across all sessions.

### Session 1 — Project Bootstrap
```
Create a pnpm monorepo for a flyback transformer design tool called PI Expert.
Packages: shared Vue SFCs, PIWeb (Vite web app), PITauri (Tauri desktop), server (Express + SQLite).
Wire a platform abstraction layer so shared components work identically on web and desktop.
```

```
Set up Vite aliases so @pi/shared resolves to packages/shared/src.
Add a Tauri API stub for the web build so it doesn't fail on tauri imports.
```

### Session 2 — SimEngine
```
Implement SimEngine.js — flyback transformer calculation engine.
It must support 11 IC families: TOPSwitch-JX/HX/GX, InnoSwitch3-CE/AE/EP, TinySwitch-4/LT, LinkSwitch-TN2/XT2/HP.
Family-aware: each family has different efficiency curves, KP ranges, VOR recommendations.
Outputs: Np, Ns, Nb, Lp_uH, core selection, gap_mm, efficiency, full BOM.
```

### Session 3 — DesignWizard
```
Build DesignWizard.vue — a 4-step design flow:
Step 1: Select IC family and topology
Step 2: Enter input/output specification
Step 3: Run simulation (call SimEngine)
Step 4: Review results and export
Include portfolio pre-selection so clicking a product auto-fills family + typical spec.
```

```
Add FAMILY_CONFIG lookup table to DesignWizard — maps each IC family to
its efficiency curve, recommended KP, VOR range, and max output power.
```

### Session 4 — Schematic Diagram
```
Build SchematicDiagram.vue using svg-schematic-js vendor library.
Render a pixel-accurate flyback topology schematic for the current design.
Wire the schematic to the UDS so component values auto-update.
```

```
Add click-to-edit functionality to the schematic.
Clicking any component opens a modal dialog with 3 tabs:
1. Component DB — searchable table filtered by component category
2. Parameters — edit component values
3. Notes — free-text notes
After confirming, emit update:uds with deep-cloned UDS and render a blue outline
on modified components.
```

### Session 5 — Magnetics Designer
```
Build MagneticsDesigner.vue with 7 tabs:
1. Cross-section — core geometry diagram
2. Spiral — winding spiral view
3. Construction — layer stack construction
4. Designer — electrical design summary
5. Foundry — manufacturing specifications
6. Thermal — thermal analysis
7. Dimensions — dimensional drawings
Each tab is an SVG mechanical diagram.
```

### Session 6 — Shared Components
```
Build AppMenuBar.vue — top navigation bar with File, Edit, View, Design, Help menus.
Emit named events for all menu actions.
Brand color: PI navy #1B3A6B.
```

```
Build BOMPanel.vue — bill of materials table showing all components from the UDS.
Columns: Ref, Description, Value, Footprint, Manufacturer, Part number.
```

```
Build HelpSystem.vue — in-app help with 52 articles across 7 categories.
Categories: Getting Started, Design Wizard, Schematic, Magnetics, Files, Components, Export.
```

```
Build FileManager.vue — file list panel.
Actions: New, Open, Save, Save As, Delete.
Files stored via api.getFiles() / api.saveFile() through the platform abstraction.
```

```
Build ComponentsManager.vue — component library browser.
Display all 111 parts from ComponentDatabase.js in a searchable, filterable table.
```

### Session 7 — Auth and Router (PIWeb)
```
Add JWT authentication to the Express server.
Custom HMAC-SHA256 implementation — no jwt library dependency.
Endpoints: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me.
```

```
Add Vue Router to PIWeb with auth guards.
Routes: /login, /register, /welcome, /files, /components, /magnetics, /component-sets, /help.
Redirect unauthenticated users to /login.
```

### Session 8 — Export Features
```
Add Export to PDF to DesignWizard.
Use jsPDF from CDN (no npm install).
Export all wizard tabs as a multi-page PDF.
```

```
Add Export to CAD (KiCad format).
Generate:
1. .kicad_sch schematic file
2. _netlist.csv
3. _BOM.csv
4. README.txt
Bundle into a ZIP using JSZip from CDN and trigger download.
```

### Session 9 — Tauri Desktop Shell
```
Build PITauri — Tauri v2 desktop shell wrapping the same Vue frontend.
Register tauriApi adapter so shared components use IPC instead of HTTP.
Build a view-stack navigator in App.vue for: Files, Design, Settings pages.
```

```
Configure PITauri/src-tauri/tauri.conf.json:
productName: PIExpert
identifier: com.piexpert.desktop
window: 1200x800, min 900x600
```

### Session 10 — Tests
```
Write tests/sim-engine.test.js — test SimEngine calculations for all 11 families.
Use Node.js built-in test runner (no Jest, no Vitest).
Test: Np/Ns ratios, core selection, efficiency at min/max input, boundary conditions.
```

```
Write tests/uds-schema.test.js — validate UDS JSON shape.
Write tests/core-logic.test.js — test DesignWizard logic, FAMILY_CONFIG, portfolio pre-selection.
Write tests/server-api.test.js — integration tests for all Express endpoints.
```

### Session 11 — Rebrand to FluxForge
```
Rename PI Expert → FluxForge across the entire codebase.
- package.json names: pi-expert-monorepo → fluxforge, @pi/shared → @fluxforge/shared
- brand.css: --pi-* → --ff-*, navy #1B3A6B → teal #0D7377
- CSS class prefix: .pi- → .ff-
- IC family keys: TOPSwitch/InnoSwitch/TinySwitch/LinkSwitch → HPFC/IFC/LPFC/PSC
- Tauri: productName PIExpert → FluxForge, identifier com.piexpert → io.fluxforge
- All visible text: "PI Expert" → "FluxForge"
Do not change: TL431, EFD30, ETD39, N87, 3F3, Ferroxcube (generic industry names).
```

### Session 12 — Layout Fixes (MagneticsDesigner SVG)
```
Audit @MagneticsDesigner.vue for SVG layout issues.
For each mechanical diagram view (Spiral, Construction, Designer, Foundry, Thermal) report:
1. The SVG viewBox dimensions
2. Whether content coordinates exceed the viewBox
3. Whether text labels are clipped
4. Any overlapping elements
Do not make any changes. Report only.
```

```
Fix all SVG layout clipping issues found in the audit:
- Spiral: expand viewBox from 340 to 430 height, move stats inside bounds
- Construction: expand background rect height from 480 to 560
- Designer: shrink border width from 820 to 460 to match viewBox
- Foundry: reposition title block from x=290 to x=8, width 294
- Thermal: expand background rect width from 760 to 1020
```

```
Move winding specification tables out of SVG into HTML panels below the diagram.
Designer tab: winding table (Winding/Turns/AWG/Strands/Irms/DCR) + core params.
Foundry tab: spec rows table (Ref/Item/Specification/Tolerance/Standard).
```

### Session 13 — Documentation
```
Create a docs/ folder with comprehensive documentation:
1. architecture.md — tech stack, monorepo, patterns, component APIs
2. engineering-rules.md — coding standards, pre-flight checklist, architecture rules
3. poc-running.md — how to run locally, on server, and build desktop installer
4. workflow.md — step-by-step build and deploy sequence
5. ai-workflow.md — AI-assisted development patterns and prompts
```

```
Create cursor/ folder with the same documentation set,
stripped of any AI-assistant-specific references,
formatted for use with Cursor AI.
Remove all Docker, GitHub, and AWS references.
This deploys to a single machine only.
Repository is Bitbucket.
```

---

## All Features Built

### Design Engine
- **SimEngine** — flyback transformer calculation engine: Np/Ns/Nb turns, Lp inductance, core selection, air gap, efficiency, full BOM generation
- **FAMILY_CONFIG** — 11 IC family configurations with efficiency curves, KP ranges, VOR recommendations, max power limits
- **Family-aware simulation** — different calculation paths for HPFC / IFC / LPFC / PSC families
- **Portfolio pre-selection** — clicking a product in the portfolio auto-fills wizard Step 1

### Design Wizard (4-step flow)
- Step 1: IC family selector + topology picker
- Step 2: Input/output specification form (Vin min/max, line frequency, output rails)
- Step 3: Simulation runner with progress indicator
- Step 4: Results panel with full design summary

### Schematic Diagram
- SVG schematic rendering via svg-schematic-js (flyback topology)
- Component value annotations auto-updated from UDS
- Click-to-edit any component: 3-tab modal (Component DB / Parameters / Notes)
- Component DB tab: searchable/filterable table from 111-part ComponentDatabase
- Modified components render with blue outline + ✎ badge
- Frozen (pinned) components render with dashed blue outline
- Deep-clone UDS on every edit → emit `update:uds`

### Magnetics Designer (7 tabs)
- **Cross-section** — core cross-section geometry diagram
- **Spiral** — winding spiral visualization with turn count and layer data
- **Construction** — layer stack construction with winding order
- **Designer** — electrical design summary + winding spec table (HTML panel)
- **Foundry** — manufacturing spec table with tolerances and standards (HTML panel)
- **Thermal** — thermal analysis diagram
- **Dimensions** — dimensional drawing with callouts

### Bill of Materials
- BOM panel with full component list from UDS
- Columns: Ref, Description, Value, Footprint, Manufacturer, Part number
- Export to CSV

### Export Features
- **Export to PDF** — jsPDF multi-tab export of entire design
- **Export to KiCad** — generates `.kicad_sch`, `_netlist.csv`, `_BOM.csv`, `README.txt` in a ZIP download

### File Management
- File list panel — browse, open, rename, delete design files
- Save / Save As — persist UDS to server-side SQLite via REST
- Open design — load UDS from server, restore full wizard state

### Component Library
- ComponentsManager — 111-part searchable/filterable component table
- ComponentSetsManager — named component set presets
- ComponentDatabase.js — structured by category → subcategory

### Help System
- 52 articles across 7 categories
- In-app help panel with search
- Categories: Getting Started, Design Wizard, Schematic, Magnetics, Files, Components, Export

### Authentication (Web)
- JWT auth with custom HMAC-SHA256 (no library)
- Register / Login / Logout
- Route guards — all design routes require auth
- Token stored in localStorage

### App Shell (Web — PIWeb)
- Vue Router with 8 routes + auth guards
- `wizardActive` Pinia signal — hides router-view when design is open
- Responsive layout: sidebar nav + main content area
- AppMenuBar — full menu system with keyboard shortcuts

### App Shell (Desktop — PITauri)
- Tauri v2 native window (1200×800, min 900×600)
- View-stack navigator (Files → Design → Settings)
- tauriApi adapter — uses Tauri IPC instead of HTTP for file operations
- Offline capable — no server required for desktop

### Design Notes
- DesignNotes.vue — free-text notes panel linked to current design
- Notes persisted in UDS `designNotes` field

### Product Portfolio
- ProductPortfolio.vue — product family browser
- Click a product to launch wizard with pre-filled specification

---

## All Libraries and Tools Used

### Frontend Dependencies (npm)
| Package | Version | Purpose |
|---------|---------|---------|
| `vue` | ^3.4 | UI framework |
| `pinia` | ^2.1 | State management |
| `vue-router` | ^4.3 | Client-side routing |
| `vite` | ^5.0 | Build tool + dev server |
| `@vitejs/plugin-vue` | ^5.0 | Vite Vue SFC plugin |

### Desktop Dependencies (npm)
| Package | Version | Purpose |
|---------|---------|---------|
| `@tauri-apps/api` | ^2.0 | Tauri JavaScript API |
| `@tauri-apps/cli` | ^2.0 | Tauri CLI (devDep) |

### Backend Dependencies (npm)
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18 | HTTP server framework |
| `sql.js` | ^1.10 | SQLite in WebAssembly (no native build) |
| `multer` | ^1.4 | Multipart file upload middleware |
| `cors` | ^2.8 | Cross-origin resource sharing |
| `dotenv` | ^16.0 | `.env` file loader |

### CDN Libraries (loaded at runtime, not bundled)
| Library | Purpose |
|---------|---------|
| `jsPDF` | PDF generation for design export |
| `JSZip` | ZIP file creation for CAD export |

### Vendor Libraries (local copy, not npm)
| Library | Location | Purpose |
|---------|----------|---------|
| `svg-schematic-js` | `packages/shared/src/vendor/` | SVG schematic diagram rendering |

### Rust / Tauri
| Tool | Version | Purpose |
|------|---------|---------|
| Rust | stable | Tauri native layer compilation |
| Cargo | stable | Rust package manager |
| `tauri` | ^2.0 | Desktop app framework (Cargo dep) |
| `tauri-build` | ^2.0 | Tauri build scripts (Cargo dep) |

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22.x | Runtime |
| pnpm | 10.33 | Monorepo package manager |
| Node.js built-in `node:test` | — | Test runner (no external test framework) |

### Infrastructure
| Tool | Purpose |
|------|---------|
| nginx | Reverse proxy + SPA serving |
| PM2 | Node.js process manager |
| systemd | Alternative process manager |
| Bitbucket | Source control repository |

---

## Key Architectural Decisions Made During Build

1. **sql.js over better-sqlite3** — chosen because sql.js has no native compilation step, works in CI on any platform without build tools
2. **Custom JWT over jsonwebtoken** — eliminates a dependency, keeps auth logic visible and auditable
3. **Platform abstraction Proxy pattern** — lets all 17 shared SFCs work identically on web and desktop without conditional imports
4. **wizardActive Pinia signal** — component ref chains don't propagate reactively across component boundaries; store signal does
5. **svg-schematic-js as local vendor copy** — library is not on npm; vendored to ensure reproducible builds
6. **jsPDF + JSZip from CDN** — avoids bundling large libraries that are only used on demand
7. **pnpm workspaces** — single install for all packages, proper workspace hoisting, fast install via content-addressable store
8. **UDS as portable JSON** — all design state in one serializable object; easy to save, load, and version
9. **No Docker, no cloud** — single-machine deployment with nginx + PM2 keeps ops simple and removes infrastructure dependencies

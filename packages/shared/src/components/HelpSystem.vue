<template>
  <div class="hs-root">
    <!-- Header -->
    <div class="hs-header">
      <div class="hs-header-left">
        <span class="hs-logo">⚡ FluxForge Help</span>
        <input class="hs-search" v-model="searchQuery" placeholder="Search help topics…" @input="doSearch"/>
      </div>
      <div class="hs-header-right">
        <button class="hs-hbtn" @click="goHome">🏠 Home</button>
        <button class="hs-hbtn" :disabled="history.length<=1" @click="goBack">← Back</button>
      </div>
    </div>

    <!-- Body -->
    <div class="hs-body">
      <!-- Left nav -->
      <nav class="hs-nav">
        <div v-for="section in SECTIONS" :key="section.id">
          <div class="hs-nav-section" @click="toggleNav(section.id)">
            <span class="hs-nav-caret">{{ openNav.has(section.id)?'▼':'▶' }}</span>
            {{ section.title }}
          </div>
          <div v-if="openNav.has(section.id)">
            <div v-for="article in section.articles" :key="article.id"
              class="hs-nav-item"
              :class="{'hs-nav-item--active':currentId===article.id}"
              @click="navigate(article.id)">
              {{ article.title }}
            </div>
          </div>
        </div>
      </nav>

      <!-- Main content -->
      <main class="hs-main" ref="mainEl">
        <!-- Search results -->
        <div v-if="searchQuery && searchResults.length>0" class="hs-search-results">
          <h2 class="hs-results-title">Search results for "{{ searchQuery }}"</h2>
          <div v-for="r in searchResults" :key="r.id" class="hs-result-card" @click="navigate(r.id); searchQuery=''">
            <div class="hs-result-section">{{ r.section }}</div>
            <div class="hs-result-title">{{ r.title }}</div>
            <div class="hs-result-excerpt">{{ r.excerpt }}</div>
          </div>
        </div>
        <div v-else-if="searchQuery && searchResults.length===0" class="hs-empty-search">
          No results for "{{ searchQuery }}"
        </div>

        <!-- Article content -->
        <div v-else-if="currentArticle" class="hs-article">
          <div class="hs-breadcrumb">{{ currentSection?.title }} › {{ currentArticle.title }}</div>
          <h1 class="hs-article-title">{{ currentArticle.title }}</h1>
          <div class="hs-article-body" v-html="currentArticle.content"></div>

          <!-- Navigation links -->
          <div class="hs-article-nav">
            <button v-if="prevArticle" class="hs-anav-btn" @click="navigate(prevArticle.id)">← {{ prevArticle.title }}</button>
            <button v-if="nextArticle" class="hs-anav-btn hs-anav-next" @click="navigate(nextArticle.id)">{{ nextArticle.title }} →</button>
          </div>

          <!-- Related articles -->
          <div v-if="currentArticle.related?.length" class="hs-related">
            <div class="hs-related-title">Related articles</div>
            <div class="hs-related-links">
              <span v-for="id in currentArticle.related" :key="id"
                class="hs-related-link" @click="navigate(id)">
                {{ findArticle(id)?.title }}
              </span>
            </div>
          </div>
        </div>

        <!-- Home screen -->
        <div v-else class="hs-home">
          <h1 class="hs-home-title">⚡ FluxForge Help Center</h1>
          <p class="hs-home-sub">Find answers, guides, and reference material for all FluxForge features.</p>
          <div class="hs-home-grid">
            <div v-for="section in SECTIONS" :key="section.id" class="hs-home-card" @click="navigate(section.articles[0].id)">
              <div class="hs-home-card-icon">{{ section.icon }}</div>
              <div class="hs-home-card-title">{{ section.title }}</div>
              <div class="hs-home-card-desc">{{ section.desc }}</div>
            </div>
          </div>
          <div class="hs-quick-links">
            <div class="hs-ql-title">Quick Start</div>
            <div class="hs-ql-grid">
              <button class="hs-ql-btn" @click="navigate('new-design-wizard')">Create my first design</button>
              <button class="hs-ql-btn" @click="navigate('product-portfolio')">Choose a product family</button>
              <button class="hs-ql-btn" @click="navigate('schematic-interact')">Use the schematic diagram</button>
              <button class="hs-ql-btn" @click="navigate('comp-db-search')">Search the component database</button>
              <button class="hs-ql-btn" @click="navigate('magnetics-cores')">Browse magnetics cores</button>
              <button class="hs-ql-btn" @click="navigate('comp-sets-create')">Create a component set</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../composables/useI18n.js';
import { ref, computed } from 'vue';

const { t } = useI18n();
const searchQuery  = ref('');
const searchResults= ref([]);
const currentId    = ref('');
const history      = ref(['']);
const openNav      = ref(new Set(['getting-started','design-wizard','system','components']));
const mainEl       = ref(null);

// ── Help content ──────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id:'getting-started', title:'Getting Started', icon:'🚀',
    desc:'Welcome screen, first steps, and project overview',
    articles:[
      { id:'welcome', title:'Welcome to FluxForge',
        content:`<h2>Welcome to FluxForge Desktop</h2>
<p>FluxForge is a power supply design tool for engineers working with FluxForge IC families. It provides a guided design wizard, component database, magnetics database, and schematic viewer.</p>
<h3>First Steps</h3>
<ol><li>After logging in, you will see the <strong>Welcome Screen</strong> with four main actions.</li><li>Click <strong>New Design</strong> to open the Product Portfolio and start a new design.</li><li>Click <strong>Open Design</strong> to open a previously saved <code>.uds</code> file.</li><li>Click <strong>Component Library</strong> to browse components or manage component sets.</li><li>Click <strong>Help &amp; Documentation</strong> to return to this help system.</li></ol>
<div class="hs-mock-screen"><div class="hs-mock-bar">Welcome Screen</div><div class="hs-mock-body hs-mock-welcome"><div class="hs-mock-tile">New Design</div><div class="hs-mock-tile">Open Design</div><div class="hs-mock-tile">Component Library</div><div class="hs-mock-tile">Help</div></div></div>
<h3>Navigation</h3><p>The desktop app has a <strong>left sidebar</strong> with quick access to: New Design, Active Design, Files, Components, Magnetics, and Settings.</p>`,
        related:['product-portfolio','new-design-wizard'],
      },
      { id:'product-portfolio', title:'Product Portfolio',
        content:`<h2>Product Portfolio</h2>
<p>The Product Portfolio dialog lets you select a PI device family and application type before starting a design.</p>
<div class="hs-mock-screen"><div class="hs-mock-bar">Product Portfolio</div><div class="hs-mock-body hs-mock-pp"><div class="hs-mock-pp-left"><div class="hs-mock-pp-fam">▼ HPFC-1</div><div class="hs-mock-pp-app hs-mock-pp-sel">HPFC-1 Flyback (Universal Input)</div><div class="hs-mock-pp-app">HPFC-1 Forward</div><div class="hs-mock-pp-fam">▶ LPFC-1</div></div><div class="hs-mock-pp-right"><div class="hs-mock-pp-filter">Application: Any ▾</div><div class="hs-mock-pp-filter">Output Power: Any ▾</div><div class="hs-mock-pp-filter">Topology: Any ▾</div></div></div></div>
<h3>How to use</h3>
<ol><li>Browse the tree on the <strong>left</strong> — families are expandable, applications are listed inside.</li><li>Use <strong>Product Filter</strong> on the right to narrow the list by application, power, topology, etc.</li><li>Click <strong>HELP ME CHOOSE</strong> to get an automatic suggestion based on your filter selections.</li><li>Click the application you want to design with.</li><li>Click <strong>FluxForge</strong> to launch the design wizard.</li></ol>
<h3>Filter fields</h3>
<table class="hs-table"><tr><th>Field</th><th>Description</th></tr><tr><td>Application</td><td>Target end product type</td></tr><tr><td>Output Power</td><td>Total continuous output power range</td></tr><tr><td>Input Type</td><td>AC mains voltage range or DC input</td></tr><tr><td># of outputs</td><td>Number of isolated output rails</td></tr><tr><td>Topology</td><td>Flyback, Forward, Buck, Boost, etc.</td></tr></table>`,
        related:['new-design-wizard','welcome'],
      },
    ],
  },
  {
    id:'design-wizard', title:'Design Wizard', icon:'⚡',
    desc:'4-step wizard for generating power supply designs',
    articles:[
      { id:'new-design-wizard', title:'Creating a New Design',
        content:`<h2>Creating a New Design</h2>
<p>The Design Wizard guides you through 4 steps to configure your power supply design.</p>
<div class="hs-step-flow"><div class="hs-step">1<div>Design Options</div></div><div class="hs-step-arrow">→</div><div class="hs-step">2<div>Input Spec</div></div><div class="hs-step-arrow">→</div><div class="hs-step">3<div>Output Spec</div></div><div class="hs-step-arrow">→</div><div class="hs-step">4<div>Design Options</div></div></div>
<h3>Step 1 — Design Options</h3><p>Select <strong>Topology</strong> (Flyback, Forward, Buck…), <strong>Product Line</strong> (HPFC, LPFC…), <strong>Family</strong>, <strong>Package</strong>, <strong>Switching Frequency</strong>, and <strong>Feedback Type</strong>. Family and package options update automatically when you change the product line.</p>
<h3>Step 2 — Input Specification</h3><p>Enter AC input voltage range (vMin/vMax), line frequency, and input type. Use the preset buttons for Universal (85–265V), European, or Japanese mains.</p>
<h3>Step 3 — Output Specification</h3><p>Add one or more output rails. For each output, specify voltage, current, and peak current. The total power is calculated automatically.</p>
<h3>Step 4 — Design Options</h3><p>Set the file name (auto-incremented to avoid duplicates), choose a default component set, core material, and transformer type.</p>
<div class="hs-tip">💡 <strong>Tip:</strong> The filename auto-increments — if <code>HPFC-1_PIDesign1</code> exists, the wizard will suggest <code>HPFC-1_PIDesign2</code>.</div>`,
        related:['design-results','schematic-interact','design-notes'],
      },
      { id:'design-results', title:'Design Results Tab',
        content:`<h2>Design Results</h2>
<p>After confirming a design variant from the Design Picker, the <strong>Design Results</strong> tab shows calculated parameters for your design.</p>
<h3>Sections</h3>
<ul><li><strong>Input Parameters</strong> — voltage range, line frequency, topology</li><li><strong>Output Parameters</strong> — per-rail voltage/current/power, operation mode</li><li><strong>Device Selection</strong> — family, package, frequency, feedback, variant</li><li><strong>Transformer Design</strong> — core material, winding type, T1 core part</li><li><strong>Calculated Parameters</strong> — peak/RMS primary current, duty cycle, primary inductance, efficiency</li><li><strong>Key Components</strong> — U1, T1, D3, C1, C2 and other key parts with their selected values</li></ul>
<h3>Calculated Parameters Reference</h3>
<table class="hs-table"><tr><th>Parameter</th><th>Formula</th></tr><tr><td>Peak Primary Current</td><td>Pout / (η × Vmin)</td></tr><tr><td>RMS Primary Current</td><td>Ipk × 0.45</td></tr><tr><td>Max Duty Cycle</td><td>Vmin / (Vmin + Vmax)</td></tr><tr><td>Primary Inductance</td><td>Vmin² / (2 × Pout × fsw × KP)</td></tr></table>`,
        related:['schematic-interact','bom-tab'],
      },
      { id:'schematic-interact', title:'Interactive Schematic',
        content:`<h2>Interactive Schematic Diagram</h2>
<p>The <strong>Schematic</strong> tab shows a full flyback converter schematic diagram with interactive component highlights.</p>
<div class="hs-mock-screen"><div class="hs-mock-bar">Schematic Diagram</div><div class="hs-mock-body hs-mock-schem"><div class="hs-mock-schem-comp hs-mock-hover">F1<div class="hs-mock-tooltip">Fuse F1</div></div><div class="hs-mock-schem-comp">U1</div><div class="hs-mock-schem-comp">T1</div><div class="hs-mock-schem-comp">D3</div></div></div>
<h3>Hover</h3><p>Move your mouse over any component symbol on the schematic. A <strong>dashed blue box</strong> appears around it, and a label tooltip shows the reference designator (e.g. <code>F1</code>, <code>U1</code>).</p>
<h3>Click</h3><p>Clicking a component opens the <strong>Component Dialog</strong> with 4 tabs:</p>
<ul><li><strong>Component DB</strong> — search and select a replacement part from the database</li><li><strong>Compatible</strong> — view linked compatible/alternative parts</li><li><strong>Parameters</strong> — edit value, voltage, package, and frozen state</li><li><strong>Notes</strong> — add design notes for this component</li></ul>
<h3>Pan &amp; Zoom</h3><ul><li><strong>Scroll</strong> to zoom in/out</li><li><strong>Click &amp; drag</strong> on empty schematic area to pan</li><li>Toolbar: <strong>＋ / －</strong> to zoom, <strong>Fit</strong> to fit all, <strong>1:1</strong> for 100%</li></ul>
<h3>Covered components</h3><p>F1, RT1, L1, BR1, VR1, C1, C2, C3, R4, R5, U1, T1, D1, D2, D3, C7, R10, C9, C10, C11, U3, U2A, R11, R12, R13</p>
<div class="hs-tip">💡 <strong>Tip:</strong> Click a component in the schematic and it opens the same dialog as clicking it in the Design Tree on the left.</div>`,
        related:['design-results','new-design-wizard'],
      },
      { id:'bom-tab', title:'BOM Tab',
        content:`<h2>Bill of Materials (BOM)</h2>
<p>The <strong>BOM</strong> tab lists all components in the current design with their reference designators, part numbers, quantities, and values.</p>
<h3>Columns</h3><table class="hs-table"><tr><th>Column</th><th>Description</th></tr><tr><td>Ref Des</td><td>Reference designator (U1, T1, C1…)</td></tr><tr><td>Part #</td><td>Manufacturer part number</td></tr><tr><td>Description</td><td>Component type and value</td></tr><tr><td>Qty</td><td>Quantity per board</td></tr><tr><td>Mfr</td><td>Manufacturer name</td></tr></table>
<p>The BOM is generated from the <strong>UDS components object</strong> — it updates automatically when you change components in the Design Tree or schematic.</p>`,
        related:['schematic-interact','design-results'],
      },
      { id:'validate-design', title:'Validate Design',
        content:`<h2>Validate Design</h2>
<p>Active Design → Validate Design runs an automated compliance and engineering check against your current design.</p>
<h3>How to run</h3><ol><li>Open an active design (must have a saved design with simulation results)</li><li>Click <strong>Active Design → Validate Design</strong> in the menu bar</li><li>The dialog runs instantly and shows a PASS / REVIEW / FAIL banner</li><li>Click <strong>↺ Re-validate</strong> after making changes</li></ol>
<h3>Check categories</h3>
<table class="hs-table"><tr><th>Category</th><th>Checks</th></tr><tr><td>Electrical</td><td>Ip_pk vs device ILIM, D_max &lt; 55%, Lp ≥ 50µH, η ≥ 82%</td></tr><tr><td>Thermal</td><td>U1 Tj &lt; 135°C (derated), D3 Tj &lt; 110°C</td></tr><tr><td>EMC</td><td>fsw in CISPR 32 range, Y-capacitor C3 assigned</td></tr><tr><td>Safety</td><td>Fuse F1 assigned, input covers 85–265V</td></tr><tr><td>Compliance</td><td>IEC 62368-1, CISPR 32, ErP Lot 6, DOE Level VI</td></tr></table>
<h3>Result statuses</h3>
<ul><li><strong class="hs-tip" style="background:#F0FFF4">PASS</strong> — all checks passed</li><li><strong>REVIEW ⚠</strong> — warnings present (non-critical, review recommended)</li><li><strong>FAIL ✕</strong> — one or more critical errors (design should be corrected)</li></ul>
<div class="hs-tip">💡 Run simulation first to get accurate thermal and electrical results for validation.</div>`,
        related:['design-results','sim-engine','new-design-wizard'],
      },
      { id:'optimize-design', title:'Optimize Design',
        content:`<h2>Optimize Design</h2>
<p>The Optimize Design tool runs an automated parameter sweep to find the most efficient design configuration for your current specification.</p>
<h3>How it works</h3>
<p>FluxForge tests <strong>60 combinations</strong> of KP (ripple ratio) and switching frequency:</p>
<ul>
  <li>KP values: 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80</li>
  <li>Frequency multipliers: 0.5×, 0.75×, 1.0×, 1.25×, 1.5×, 2.0× of your baseline</li>
</ul>
<p>The combination with the highest efficiency and zero design warnings is selected as the optimum.</p>
<h3>Running the optimizer</h3>
<ol>
  <li>Open an active design with simulation results</li>
  <li>Click <strong>Active Design → Optimize Design</strong></li>
  <li>Wait while all 60 combinations are tested (typically under 1 second)</li>
  <li>Review the before/after comparison panel</li>
  <li>Click <strong>Apply Optimization</strong> to update your design</li>
</ol>
<h3>Interpreting results</h3>
<p>The dialog shows a side-by-side comparison of your current design vs. the optimized design across 4 key metrics: efficiency (η), primary inductance (Lp), total losses, and peak primary current (Ip_pk). The improvements table lists every changed parameter with its before/after values.</p>
<div class="hs-tip">💡 Apply Optimization writes the new KP and frequency into the UDS and triggers an auto-save. All tabs immediately reflect the updated simulation results.</div>`,
        related:['validate-design','sim-engine','new-design-wizard'],
      },
      { id:'schematic-rightclick', title:'Schematic Right-Click Menu',
        content:`<h2>Schematic Right-Click Context Menu</h2>
<p>Right-clicking any highlighted component on the schematic diagram opens a context menu with two options.</p>
<h3>Freeze / Unfreeze</h3>
<p>Freeze (❄️) permanently highlights a component with a solid blue border and label, regardless of where your mouse is. This is useful for keeping track of components you are actively working on. Frozen components:</p>
<ul>
  <li>Show a solid blue border at all times</li>
  <li>Display the reference designator label below the symbol in blue</li>
  <li>Remain highlighted across zoom and pan operations</li>
</ul>
<p>Click <strong>Unfreeze</strong> (🔓) to remove the permanent highlight.</p>
<h3>Open Functional Diagram</h3>
<p>Opens the Design Tree panel for the right-clicked component — the same as left-clicking the component. This shows the component's specifications, assigned parts, compatible alternatives, and position in the circuit.</p>
<h3>Hover highlight</h3>
<p>Hovering over any component shows an animated blue dashed border (marching ants effect) with a light blue fill tint and a tooltip showing the reference designator. Left-clicking selects the component and opens the Design Tree.</p>`,
        related:['schematic-interact','comp-db-crud'],
      },
      { id:'run-simulation', title:'Re-run Simulation',
        content:`<h2>Re-run Simulation</h2>
<p>After a design is complete, you can re-run the simulation engine to generate 6 new optimised variants based on the current design parameters.</p>
<h3>How to use</h3>
<ol>
  <li>Open an active design</li>
  <li>Click <strong>Active Design → Run Simulation</strong></li>
  <li>The simulation overlay appears with a progress bar and elapsed timer</li>
  <li>After completion, the 6-variant picker is shown</li>
  <li>Select a variant and click <strong>Confirm Design</strong> to update the active design</li>
</ol>
<h3>What changes</h3>
<p>Re-running uses the current design's input specification (Vin range, outputs, frequency, KP) as the base. Each of the 6 variants applies a different KP and frequency multiplier. Confirming a variant replaces the simResult in the UDS and auto-saves.</p>
<div class="hs-tip">💡 Use Re-run Simulation after changing the Design Properties to update calculated values such as Lp, turns ratio, and efficiency.</div>`,
        related:['optimize-design','new-design-wizard','design-results'],
      },
      { id:'design-properties', title:'Design Properties',
        content:`<h2>Design Properties</h2>
<p>The Design Properties dialog lets you edit all metadata and specification fields of your active design without re-running the full wizard.</p>
<h3>Sections</h3>
<table class="hs-table">
  <tr><th>Section</th><th>Fields</th></tr>
  <tr><td>Basic Information</td><td>File Name, Topology, IC Family, Package, Switching Frequency, Feedback Type</td></tr>
  <tr><td>Input Specification</td><td>Vin Min/Max, Line Frequency, Input Spec string, Total Power, Component Set</td></tr>
  <tr><td>Transformer &amp; Magnetics</td><td>Transformer Type, Core Material, Shield Windings</td></tr>
  <tr><td>Notes</td><td>Free-text design notes</td></tr>
</table>
<h3>How to access</h3>
<p>Click <strong>Active Design → Design Properties</strong> in the menu bar, or use the ⚙ Actions button in the design view. Changes are auto-saved to the UDS file on clicking Save Changes.</p>
<div class="hs-tip">💡 After changing frequency or other electrical parameters, click Active Design → Run Simulation to update the calculated values.</div>`,
        related:['run-simulation','new-design-wizard'],
      },
      { id:'design-notes', title:'Design Notes',
        content:`<h2>Design Notes</h2>
<p>The <strong>Design Notes</strong> tab provides auto-generated and user-editable notes for the current design.</p>
<h3>Auto-generated sections</h3><ul><li><strong>Design Summary</strong> — topology, device, power, input spec, feedback</li><li><strong>Design Intent</strong> — narrative description of the design</li><li><strong>Power Budget</strong> — efficiency, losses, no-load power</li><li><strong>Thermal Analysis</strong> — estimated junction temperatures</li><li><strong>Safety &amp; EMC Compliance</strong> — applicable standards (IEC 62368-1, CISPR 32…)</li><li><strong>Startup &amp; Protection</strong> — built-in protection features of the selected device</li><li><strong>PCB Layout Guidelines</strong> — critical loop areas, creepage distances</li></ul>
<h3>User notes</h3><p>Click <strong>＋ Add Note</strong> to create a custom note card. Notes can be edited by clicking the ✎ icon and deleted with ✕.</p>
<h3>Right panel</h3><p>The right side shows <strong>Revision History</strong>, <strong>Simulation Log</strong>, and a <strong>Compliance checklist</strong> (IEC 62368-1, CISPR 32, ErP Lot 6, DOE Level VI).</p>`,
        related:['design-results','bom-tab'],
      },
    ],
  },
  {
    id:'components', title:'Component Database', icon:'🗄️',
    desc:'Component library, CRUD, compatible parts, and component sets',
    articles:[
      { id:'comp-db-overview', title:'Component Database Overview',
        content:`<h2>Component Database</h2>
<p>The Component Database (accessed via <strong>Components</strong> in the sidebar) contains 111 real-world components across all categories.</p>
<div class="hs-mock-screen"><div class="hs-mock-bar">Component Database</div><div class="hs-mock-body hs-mock-compdb"><div class="hs-mock-tabs"><span class="hs-mock-tab hs-mock-tab-act">All Components</span><span class="hs-mock-tab">Capacitors</span><span class="hs-mock-tab">Diodes</span><span class="hs-mock-tab">ICs</span></div><div class="hs-mock-table-hd">Library | Type | Part # | Mfr | Value | Voltage | Package</div><div class="hs-mock-table-row">Default | electrolytic_output | EEEFK1E391SP | Panasonic | 390µF | 25V | SMD</div><div class="hs-mock-table-row hs-mock-row-sel">Default | topswitch | TOP266EG | PI | — | — | eSIP-7C</div></div></div>
<h3>Category tabs</h3><p>Use the tabs at the top to filter by component type: Capacitors, Diodes, Zeners/TVS, Inductors, Fuses, Optocouplers, Thermistors, Transistors, Varistors, Resistors, etc.</p>
<h3>Column filters</h3><p>Each column has a filter row beneath the header. Columns with ≤40 distinct values show a dropdown; others show a text input. Multiple filters can be active simultaneously.</p>
<h3>Hidden columns</h3><p>Click <strong>Fields</strong> to toggle column visibility. Columns hidden by default: Ripple, ESR, Rated Life, Temp Coefficient, Temp Min/Max, Size L/W, Notes.</p>`,
        related:['comp-db-search','comp-db-crud','comp-sets-overview'],
      },
      { id:'comp-db-search', title:'Searching Components',
        content:`<h2>Searching the Component Database</h2>
<h3>Using category tabs</h3><ol><li>Click a category tab (e.g. <strong>Capacitors</strong>) to filter to that type</li><li>The table shows only components of that category</li><li>Click <strong>All Components</strong> to see everything</li></ol>
<h3>Using column filters</h3><ol><li>The row directly beneath the blue column headers is the filter row</li><li>Click a dropdown to filter by a specific value (e.g. Manufacturer = Panasonic)</li><li>Type in a text filter box to search by partial match</li><li>Multiple column filters stack — they are AND'd together</li></ol>
<h3>Export filtered results</h3><p>Click <strong>Export</strong> to download the current filtered view as a <code>.csv</code> file.</p>`,
        related:['comp-db-overview','comp-db-crud'],
      },
      { id:'comp-db-crud', title:'Adding & Editing Components',
        content:`<h2>Adding and Editing Components</h2>
<h3>Add a component</h3><ol><li>Click <strong>Add…</strong> in the bottom toolbar</li><li>Fill in the form: Type, Subtype, Part #, Manufacturer, and electrical parameters</li><li>Click <strong>Add</strong> to save</li></ol>
<h3>Edit a component</h3><ol><li>Select the component row (click it)</li><li>Click <strong>View</strong> to open the detail dialog</li><li>Click <strong>Edit</strong> inside the detail dialog</li><li>Modify fields and click <strong>Save</strong></li></ol>
<h3>Delete a component</h3><ol><li>Select the component row</li><li>Click <strong>Delete</strong> in the bottom toolbar</li><li>Confirm the deletion in the dialog</li></ol>
<h3>Compatible parts</h3><p>See <a class="hs-link" onclick="void(0)">Compatible Parts</a> for linking alternatives.</p>`,
        related:['comp-compat','comp-sets-overview'],
      },
      { id:'comp-compat', title:'Compatible Parts',
        content:`<h2>Compatible Parts</h2>
<p>You can link any two components as compatible alternatives. These links appear in the <strong>Compatible</strong> tab of the Design Tree dialog when selecting components.</p>
<h3>Linking compatible parts (from Component Database)</h3><ol><li>Open the Component Database</li><li>Click the 🔗 button on any component row to open the Compatible Parts dialog</li><li>Search for the compatible part in the search box</li><li>Optionally enter a reason (e.g. "drop-in replacement", "higher voltage rating")</li><li>Click <strong>+ Link</strong> to create the link</li></ol>
<h3>Using compatible parts in the Design Tree</h3><ol><li>Open the Active Design view</li><li>Click any component in the Design Tree</li><li>Select the <strong>Compatible</strong> tab</li><li>Browse listed alternatives — click one to select it</li><li>Click <strong>Use [part]</strong> to apply it to the design</li></ol>
<div class="hs-tip">💡 Compatible links are bidirectional — linking A to B automatically makes B show A as compatible too.</div>`,
        related:['comp-db-crud','comp-sets-overview'],
      },
      { id:'comp-sets-overview', title:'Component Sets Overview',
        content:`<h2>Component Sets</h2>
<p>Component Sets are named groups of components that represent a full BOM for a specific design scenario (e.g. "Standard 65W Flyback"). They appear in the Design Wizard's "Default Component Set" dropdown.</p>
<h3>Pre-seeded sets</h3><table class="hs-table"><tr><th>Set Name</th><th>Description</th></tr><tr><td>Standard 65W Flyback</td><td>HPFC-1 TOP256EG, EFD30 core</td></tr><tr><td>High Efficiency 105W Flyback</td><td>TOP262EG, EE40 core, dual output caps</td></tr><tr><td>Low Power 18W Adapter</td><td>TOP246YN, TO-220, EE19 core</td></tr><tr><td>5W Phone Charger (LPFC-1)</td><td>TNY274PN, compact adapter</td></tr></table>`,
        related:['comp-sets-create','comp-sets-use'],
      },
      { id:'comp-sets-create', title:'Creating a Component Set',
        content:`<h2>Creating a Component Set</h2>
<ol><li>Open <strong>Component Library</strong> from the welcome screen or sidebar</li><li>Click <strong>Component Sets</strong> in the dialog that appears</li><li>Click <strong>+ New Set</strong></li><li>Enter a name, topology (optional), and description</li><li>Click <strong>Create</strong></li><li>Use the <strong>Add Component</strong> panel to search for and add parts</li><li>Optionally assign a <strong>role</strong> to each component (e.g. "output_cap", "pi_device")</li><li>Click <strong>💾 Save</strong> to persist your changes</li></ol>
<div class="hs-tip">💡 Once saved, the set name appears in the Design Wizard's "Default Component Set" dropdown.</div>`,
        related:['comp-sets-use','comp-sets-overview'],
      },
      { id:'comp-sets-use', title:'Using Component Sets in Designs',
        content:`<h2>Using Component Sets in Designs</h2>
<p>Component sets can be assigned to a design in Step 4 of the Design Wizard.</p>
<ol><li>In the Design Wizard, go to <strong>Step 4 — Design Options</strong></li><li>Find the <strong>Default Component Set</strong> dropdown</li><li>Select a set from the list (all saved sets appear here)</li><li>Complete the wizard — the selected set's components will be pre-loaded into the design</li></ol>
<p>You can also assign any single component to a set directly from the Component Database using the <strong>Assign Components to a Set</strong> button.</p>`,
        related:['comp-sets-create','new-design-wizard'],
      },
    ],
  },
  {
    id:'magnetics', title:'Magnetics & Transformer Designer', icon:'🧲',
    desc:'Ferrite cores, materials, Transformer Designer, and spiral winding diagram',
    articles:[
      { id:'magnetics-overview', title:'Magnetics Database Overview',
        content:`<h2>Magnetics Database</h2>
<p>The Magnetics Database (accessed via <strong>Magnetics</strong> in the sidebar) provides a comprehensive library of ferrite cores, bobbins, materials, and accessories.</p>
<h3>Layout</h3><div class="hs-panel-diagram"><div class="hs-pd-box hs-pd-left">Left Panel<br/><small>Shape filter<br/>Series checkboxes<br/>Material checkboxes<br/>Text filters</small></div><div class="hs-pd-centre"><div class="hs-pd-box hs-pd-top">Cores Table</div><div class="hs-pd-box hs-pd-top">Bobbins Table</div><div class="hs-pd-box hs-pd-bot">Materials Table</div><div class="hs-pd-box hs-pd-bot">Accessories Table</div></div><div class="hs-pd-box hs-pd-right">Right Panel<br/><small>Core Param<br/>Bobbin Param<br/>Accessory Para<br/>Magnetic Mat</small></div></div>
<h3>Seeded data</h3><table class="hs-table"><tr><th>Category</th><th>Count</th><th>Examples</th></tr><tr><td>Materials</td><td>15</td><td>PC95, N97, 3F3, N87, 3C95</td></tr><tr><td>Cores</td><td>40</td><td>EFD30, EE40, ETD34, PQ32/20, RM12</td></tr><tr><td>Bobbins</td><td>24</td><td>EFD30-1, EE40-1, ETD34-1</td></tr><tr><td>Accessories</td><td>17</td><td>Clips, yokes, cover plates, gap tape</td></tr></table>`,
        related:['magnetics-cores','magnetics-materials'],
      },
      { id:'magnetics-cores', title:'Browsing Cores',
        content:`<h2>Browsing Transformer Cores</h2>
<h3>Filtering cores</h3><ul><li>Select <strong>Shell Cores</strong>, <strong>Toroids</strong>, or <strong>Drum Cores</strong> in the left panel</li><li>Check/uncheck <strong>series</strong> checkboxes (EFD, EE, ETD, PQ, RM, T)</li><li>Check/uncheck <strong>material</strong> checkboxes (PC95, N87, 3F3…)</li><li>Use the <strong>column filter dropdowns</strong> in the filter row beneath column headers</li></ul>
<h3>Selecting a core</h3><p>Clicking a core row automatically:</p><ul><li>Selects the matching bobbin in the Bobbins pane</li><li>Selects the matching material in the Materials pane</li><li>Filters Accessories to show only clips/yokes for that core</li><li>Populates the <strong>Core Param</strong> tab with full details</li></ul>
<h3>Core parameters shown</h3><table class="hs-table"><tr><th>Parameter</th><th>Meaning</th></tr><tr><td>AE (mm²)</td><td>Effective cross-sectional area</td></tr><tr><td>LE (mm)</td><td>Effective magnetic path length</td></tr><tr><td>AL (nH/T²)</td><td>Inductance factor</td></tr><tr><td>VE (mm³)</td><td>Effective core volume</td></tr><tr><td>A–H (mm)</td><td>Mechanical dimensions</td></tr></table>`,
        related:['magnetics-materials','magnetics-overview'],
      },
      { id:'magnetics-designer', title:'Transformer Designer — Overview',
        content:`<h2>Transformer Designer</h2>
<p>The <strong>Transformer Designer</strong> (⚡ tab on the Magnetics page) is a complete flyback transformer design tool based on FluxForge application note methodology:</p>
<ul>
  <li><strong>AN-19</strong> — Primary inductance, duty cycle, and peak current calculations</li>
  <li><strong>AN-29</strong> — Core selection, turns calculation, air gap design</li>
  <li><strong>AN-57</strong> — Thermal modelling and EMC pre-compliance</li>
</ul>
<h3>Workflow</h3>
<ol>
  <li>Select a <strong>Quick Preset</strong> or enter your power stage specification manually</li>
  <li>Choose core material, isolation class, and winding style</li>
  <li>Click <strong>▶ Run Design</strong></li>
  <li>Review the six result panels — Core Design, Winding Design, Loss Budget, Thermal, Compliance, Assembly Guide</li>
  <li>Click <strong>⬇ Report</strong> to download a full text report with BOM</li>
</ol>
<h3>Quick presets</h3>
<table class="hs-table">
  <tr><th>Preset</th><th>IC Family</th><th>Topology</th></tr>
  <tr><td>5W Phone Charger</td><td>LPFC-1</td><td>5V/1A, 132kHz</td></tr>
  <tr><td>18W Quick Charge</td><td>LPFC-2</td><td>9V/2A, 132kHz</td></tr>
  <tr><td>65W Laptop Adapter</td><td>HPFC-1</td><td>20V/3.25A, 132kHz</td></tr>
  <tr><td>105W Industrial</td><td>HPFC-2</td><td>24V/4.4A + 12V/0.25A</td></tr>
  <tr><td>200W High Power</td><td>IFC-CE</td><td>48V/4.2A, 66kHz</td></tr>
</table>
<div class="hs-tip">💡 The toolbar at the top of the designer updates all calculations in real-time as you change parameters — no need to click Run Design for small adjustments.</div>`,
        related:['magnetics-designer-panels','magnetics-designer-spiral','magnetics-designer-bom'],
      },
      { id:'magnetics-designer-panels', title:'Six Result Panels Explained',
        content:`<h2>Six-Panel Result Layout</h2>
<p>After running a design, results appear in a fixed 3×2 panel grid matching the FluxForge interface. Each panel is dedicated to a specific aspect of the transformer design.</p>
<h3>Top row</h3>
<table class="hs-table">
  <tr><th>Panel</th><th>Content</th></tr>
  <tr><td>Mechanical Diagram</td><td>Horizontal bobbin cross-section showing wire layers as rows of circles. Tabs: Cross-Section | Spiral. Left flange = purple bar. Wire colours: blue=primary, red=secondary, orange=bias. Yellow lines = insulation tape. FL pin labels outside flanges. Gap annotation across centre post.</td></tr>
  <tr><td>Windings Info</td><td>Stack fill factor and copper weight summary. Colour-coded card per winding showing: Lp%, name, IRMS, turns, AWG, CMA (circular mils per amp), LENw (wire length in cm).</td></tr>
  <tr><td>Electrical Diagram</td><td>Schematic view: core bars, winding arcs (primary left, secondary right), polarity dots, pin numbers, winding labels with turns and AWG.</td></tr>
</table>
<h3>Bottom row</h3>
<table class="hs-table">
  <tr><th>Panel</th><th>Content</th></tr>
  <tr><td>Coil Former Properties</td><td>Complete design summary table: Core type/PN/material, bobbin PN, Al (gapped), air gap, Lp, Bmax, fill factor, creepage/clearance, efficiency, losses, junction temperatures, pass/fail status.</td></tr>
  <tr><td>Winding Properties</td><td>Per-winding table (turns, AWG, strands, Irms, current density J, DCR, fill%). Compliance checks summary below.</td></tr>
  <tr><td>Instructions</td><td>Three sub-tabs: BOM (numbered materials list), Assembly (10-step winding guide with specs), Compliance (9 checks with standard references).</td></tr>
</table>`,
        related:['magnetics-designer','magnetics-designer-spiral','magnetics-designer-compliance'],
      },
      { id:'magnetics-designer-spiral', title:'Spiral Winding Diagram',
        content:`<h2>Spiral Winding Diagram</h2>
<p>The <strong>Spiral</strong> tab (in the Mechanical Diagram panel title bar) shows a top-down cross-section of the bobbin window — the view looking straight down the centre post of the assembled transformer.</p>
<h3>How to read the spiral diagram</h3>
<table class="hs-table">
  <tr><th>Element</th><th>What it represents</th></tr>
  <tr><td>Outer square (brown border)</td><td>Core outer boundary, scaled to core geometry</td></tr>
  <tr><td>Dashed inner rectangle</td><td>Bobbin wall — marks the winding window boundary</td></tr>
  <tr><td>Tan/brown filled square</td><td>Ferrite centre post (carries the magnetic flux)</td></tr>
  <tr><td>Coloured concentric rings</td><td>Each ring = one winding group. Blue=primary, red=secondary, orange=bias. Width proportional to wire diameter × layer count.</td></tr>
  <tr><td>Yellow dashed ring border</td><td>Insulation tape layer between winding groups (IEC 62368-1)</td></tr>
  <tr><td>Dots along top edge of ring</td><td>Individual wire cross-sections (turns in that layer)</td></tr>
  <tr><td>Spiral path lines</td><td>Archimedean spiral: r = r₀ + (r₁−r₀)×θ/(2π·N) — illustrates the actual wire path</td></tr>
  <tr><td>Polarity dot (●)</td><td>Start of winding — mark on physical transformer for correct phase connection</td></tr>
  <tr><td>Bottom-right annotations</td><td>Fill factor %, Ku (window utilisation), Wa (window area mm²), air gap mm</td></tr>
</table>
<h3>Winding order (innermost → outermost)</h3>
<p>The winding order follows PI AN-29 recommendations to minimise leakage inductance:</p>
<ol>
  <li><strong>Secondary</strong> — wound first, closest to centre post (lowest leakage)</li>
  <li><strong>Primary</strong> — wound over secondary after insulation tape</li>
  <li><strong>Bias</strong> — outermost, wound last (lowest coupling requirement)</li>
</ol>
<div class="hs-tip">💡 If Fill Factor exceeds 40%, the rings will visually overflow the bobbin window boundary — a clear indication to choose a larger core or reduce turns via a higher-frequency design.</div>`,
        related:['magnetics-designer-panels','magnetics-designer'],
      },
      { id:'magnetics-designer-engine', title:'Design Engine — AN-19/AN-29/AN-57',
        content:`<h2>Transformer Design Engine</h2>
<p>All calculations follow FluxForge published application note methodology. The engine runs in the browser with no server dependency.</p>
<h3>Key equations implemented</h3>
<table class="hs-table">
  <tr><th>Parameter</th><th>Equation</th><th>Reference</th></tr>
  <tr><td>DC bus voltage</td><td>Vdc_min = Vin_min×√2 × (1 − ΔV/Vpk), ΔV from bulk cap model</td><td>AN-19</td></tr>
  <tr><td>Max duty cycle</td><td>D_max = VOR / (Vdc_min + VOR)</td><td>AN-19</td></tr>
  <tr><td>Primary inductance</td><td>Lp = Vdc_min² × D_max² / (2 × fsw × Pin × KP×(2−KP)/2)</td><td>AN-19 eq.4</td></tr>
  <tr><td>Peak primary current</td><td>Ip_pk = 2×Pin / (Vdc_min × D_max × (2−KP))</td><td>AN-19 eq.6</td></tr>
  <tr><td>Primary turns</td><td>Np = max(15, ⌈Lp × Ip_pk / (Bmax × Ae)⌉)</td><td>AN-29 eq.1</td></tr>
  <tr><td>Air gap</td><td>Lgap = µ₀ × Np² × Ae / Lp − Le/µr</td><td>AN-29</td></tr>
  <tr><td>Fringing factor</td><td>F = 1 + (Lgap/√Ae) × ln(2×MLT/Lgap)</td><td>AN-29</td></tr>
  <tr><td>Core loss</td><td>Pcore = k × Bmax^α × fsw^β × Ve (Steinmetz)</td><td>AN-57</td></tr>
  <tr><td>Junction temperature</td><td>Tj = θJA × P_dissipated + Ta</td><td>AN-57</td></tr>
</table>
<h3>Bmax derating</h3>
<p>Bmax is limited to <strong>80% of Bsat</strong> at 100°C per PI AN-57. This provides a thermal margin — as the core heats up, Bsat decreases; the 20% margin ensures no saturation at operating temperature. The actual Bsat value is read from the selected material's database entry.</p>
<h3>Wire sizing (CMA method)</h3>
<p>Wire gauge is selected to achieve a current density target of <strong>4 A/mm²</strong>. CMA (Circular Mils per Amp) is computed as: CMA = (wire_area_mm² × 1973) / Irms. Values above 300 CMA/A indicate conservative sizing; below 200 CMA/A may cause excessive heating.</p>`,
        related:['magnetics-designer','magnetics-materials'],
      },
      { id:'magnetics-designer-compliance', title:'Compliance Checks',
        content:`<h2>Transformer Design Compliance Checks</h2>
<p>After running a design, 9 compliance checks are evaluated and displayed in the Winding Properties panel and the Instructions → Compliance tab.</p>
<table class="hs-table">
  <tr><th>Check</th><th>Limit</th><th>Standard</th></tr>
  <tr><td>D_max &lt; 55%</td><td>55% WARNING, 60% ERROR</td><td>PI AN-29</td></tr>
  <tr><td>Bmax &lt; 80% Bsat</td><td>80% WARNING, 100% ERROR (saturation)</td><td>PI AN-57</td></tr>
  <tr><td>η ≥ 82%</td><td>82% WARNING, 80% ERROR</td><td>DOE Level VI</td></tr>
  <tr><td>Bobbin fill ≤ 40%</td><td>40% WARNING</td><td>IPC-2152</td></tr>
  <tr><td>U1 junction temp &lt; 135°C</td><td>135°C WARNING, 150°C ERROR</td><td>IEC 62368-1</td></tr>
  <tr><td>D3 junction temp &lt; 110°C</td><td>110°C WARNING, 125°C ERROR</td><td>IEC 62368-1</td></tr>
  <tr><td>Air gap ≥ 0.05mm</td><td>0.05mm WARNING (manufacturing limit)</td><td>Manufacturing</td></tr>
  <tr><td>fsw ≤ 500kHz</td><td>500kHz WARNING</td><td>CISPR 32</td></tr>
  <tr><td>Reinforced isolation</td><td>Warn if basic class used above 150V</td><td>IEC 62368-1</td></tr>
</table>
<h3>Isolation classes (IEC 62368-1)</h3>
<table class="hs-table">
  <tr><th>Class</th><th>Creepage P→S</th><th>Clearance</th><th>Tape layers</th></tr>
  <tr><td>Basic</td><td>3.2 mm</td><td>1.5 mm</td><td>1</td></tr>
  <tr><td>Supplementary</td><td>4.0 mm</td><td>2.0 mm</td><td>2</td></tr>
  <tr><td>Reinforced</td><td>6.4 mm</td><td>3.0 mm</td><td>3</td></tr>
</table>
<div class="hs-tip">💡 Reinforced isolation is required for all mains-connected (85–265V AC) power supplies per IEC 62368-1. Always use this class unless designing for extra-low voltage (≤50V AC) systems.</div>`,
        related:['magnetics-designer','magnetics-designer-engine'],
      },
      { id:'magnetics-designer-bom', title:'BOM and Assembly Guide',
        content:`<h2>BOM and Assembly Guide</h2>
<p>The <strong>Instructions</strong> panel (bottom-right) provides three sub-tabs of manufacturing documentation generated automatically from the design results.</p>
<h3>BOM tab</h3>
<p>A numbered materials list matching the format used in FluxForge datasheets and reference designs. Items include:</p>
<ul>
  <li>[1] Core — part number, material, gapped Al value</li>
  <li>[2] Bobbin — GFR thermosetting plastic, part number</li>
  <li>[3–5] Wire — per winding: AWG, diameter, insulation grade (IEC 60317-56)</li>
  <li>[6] Separation tape — polyester film, width calculated from bobbin window</li>
  <li>[7] Hi-Pot test specification — 3kVAC / 1 second / P→S</li>
</ul>
<h3>Assembly tab — 10 steps</h3>
<table class="hs-table">
  <tr><th>Step</th><th>Action</th></tr>
  <tr><td>1</td><td>Prepare bobbin — inspect, mark pin 1, clean</td></tr>
  <tr><td>2</td><td>Apply base insulation tape (25µm polyester)</td></tr>
  <tr><td>3</td><td>Wind primary — turns, AWG, strands, margin spec</td></tr>
  <tr><td>4</td><td>Apply primary insulation — layers per isolation class</td></tr>
  <tr><td>5</td><td>Wind secondary — turns, polarity dot marking</td></tr>
  <tr><td>6</td><td>Wind bias winding</td></tr>
  <tr><td>7</td><td>Apply final outer insulation</td></tr>
  <tr><td>8</td><td>Insert air gap shims — calculated per-leg dimension</td></tr>
  <tr><td>9</td><td>Secure core assembly — tape perimeter</td></tr>
  <tr><td>10</td><td>Test — Lp measurement, Llk &lt; 3%, Hi-Pot 3kVAC</td></tr>
</table>
<h3>Downloading the report</h3>
<p>Click <strong>⬇ Report</strong> in the toolbar to download a plain-text report containing the complete winding summary, core/gap parameters, loss budget, and full BOM. The filename includes the output power and core name.</p>`,
        related:['magnetics-designer-panels','magnetics-designer-compliance'],
      },
      { id:'magnetics-designer-construction', title:'Constructional Diagram',
        content:`<h2>Constructional Diagram</h2>
<p>The <strong>Construction</strong> tab (in the Mechanical Diagram panel title bar) shows a precise side-view cross-section of the fully assembled transformer. This is the view an assembly technician would use on the production floor.</p>
<h3>How to access</h3>
<p>After running a design, click the <strong>Construction</strong> button in the cyan Mechanical Diagram title bar. Click <strong>Cross-Section</strong> or <strong>Spiral</strong> to switch to other views.</p>
<h3>What the diagram shows</h3>
<table class="hs-table">
  <tr><th>Element</th><th>Description</th></tr>
  <tr><td>E-core halves (top/bottom)</td><td>Brown/tan rectangles representing the top and bottom ferrite E-core halves. Each shows the material name.</td></tr>
  <tr><td>Centre post limbs</td><td>Gold rectangles extending from each core half into the bobbin window. The red gap line between them shows the air gap with its calculated value in mm.</td></tr>
  <tr><td>Left flange (purple)</td><td>The primary-side bobbin wall. Pin numbers 1–4 exit from this side. Height represents the full bobbin build height (BW).</td></tr>
  <tr><td>Right flange (grey)</td><td>The secondary-side bobbin wall. FL pin labels exit from this side.</td></tr>
  <tr><td>Winding bands</td><td>Coloured horizontal bands inside the window — one band per winding row. Blue=primary, red=secondary, orange=bias. Filled/outline wire dots show the conductor cross-sections. Row numbers appear inside the left flange.</td></tr>
  <tr><td>Insulation tape bands</td><td>Gold/yellow bands between winding groups. Label shows the number of tape layers (1 for basic, 2 for supplementary, 3 for reinforced isolation) and the isolation class.</td></tr>
  <tr><td>Winding labels</td><td>Right side of each band: winding name, turns count, AWG, strands.</td></tr>
  <tr><td>Pin diagram</td><td>Right-side panel showing pin numbers with colour-coded circles, connection lines, and winding assignment labels.</td></tr>
  <tr><td>Dimension arrows</td><td>Annotated arrows for BW (build width height), Le (effective path length as window width), and outer core width.</td></tr>
  <tr><td>Layer legend</td><td>Bottom row: one colour swatch per winding group plus the tape indicator.</td></tr>
</table>
<h3>Winding order (inside → outside)</h3>
<p>Following PI AN-29 recommendations to minimise primary leakage inductance:</p>
<ol>
  <li><strong>Secondary</strong> — wound first on the bobbin, innermost (closest to centre post)</li>
  <li><strong>Insulation tape</strong> — 1–3 layers depending on isolation class (IEC 62368-1)</li>
  <li><strong>Primary</strong> — wound next</li>
  <li><strong>Insulation tape</strong> — before bias winding</li>
  <li><strong>Bias</strong> — outermost winding</li>
</ol>
<h3>Tape layer count</h3>
<table class="hs-table">
  <tr><th>Isolation Class</th><th>Tape Layers</th><th>Creepage (250V AC)</th></tr>
  <tr><td>Basic</td><td>1 layer</td><td>3.2 mm</td></tr>
  <tr><td>Supplementary</td><td>2 layers</td><td>4.0 mm</td></tr>
  <tr><td>Reinforced</td><td>3 layers</td><td>6.4 mm</td></tr>
</table>
<div class="hs-tip">💡 The Construction diagram is the primary reference for production assembly. Print it alongside the BOM and Assembly Guide from the Instructions panel for a complete transformer manufacturing package.</div>`,
        related:['magnetics-designer-panels','magnetics-designer-spiral','magnetics-designer-bom'],
      },
      { id:'magnetics-view-designer', title:'Designer View',
        content:`<h2>Designer View</h2>
<p>The <strong>Designer</strong> tab shows a professional engineering schematic drawing of the transformer winding stack — the format used when submitting a design to a magnetics manufacturer or documenting a design for production approval.</p>
<h3>What it shows</h3>
<table class="hs-table">
  <tr><th>Element</th><th>Description</th></tr>
  <tr><td>Core boundary</td><td>Outer rectangle with core name and material label above. Left flange = purple (primary side), right flange = grey (secondary side).</td></tr>
  <tr><td>Winding blocks (hatched)</td><td>Each winding is a diagonal-hatched rectangular block. Colour matches the winding (blue=primary, red=secondary, orange=bias). Callout letter (P/S/B) on a leader circle links to the spec table.</td></tr>
  <tr><td>Tape bands (gold)</td><td>Gold/yellow bands between winding groups showing insulation tape: e.g. "3× 40µm poly" for reinforced isolation.</td></tr>
  <tr><td>Winding Specification table</td><td>Right panel: per-winding row with turns, AWG, strands, Irms, DCR. Followed by core parameters (Al, gap, Lp, Bmax, fill, η, losses, Tj, status).</td></tr>
  <tr><td>Title block</td><td>Bottom-right: component name/PN, revision, material, standard (IEC 62368-1), drawn by, date.</td></tr>
  <tr><td>Dimension arrows</td><td>Left: BW (build width) total height. Bottom: core Le dimension.</td></tr>
</table>`,
        related:['magnetics-designer-panels','magnetics-view-foundry','magnetics-designer-construction'],
      },
      { id:'magnetics-view-foundry', title:'Foundry View',
        content:`<h2>Foundry View</h2>
<p>The <strong>Foundry</strong> tab produces a formal manufacturing drawing suitable for sending to a magnetics winding house or contract manufacturer. It follows engineering drawing conventions (ANSI Y14.5 / ISO 128).</p>
<h3>What it shows</h3>
<table class="hs-table">
  <tr><th>Element</th><th>Description</th></tr>
  <tr><td>Full drawing border</td><td>Double-line engineering drawing frame with inner border.</td></tr>
  <tr><td>Core with ANSI ferrite hatching</td><td>Core flanges shown with 45° diagonal cross-hatch lines — the ANSI symbol for ferrite/ceramic material (per ANSI Y14.2).</td></tr>
  <tr><td>Winding blocks with ANSI hatching</td><td>Each winding block uses 45° single-direction hatching in the winding colour. Callout circles (P/S/B) with leader dashed lines connect to the spec table.</td></tr>
  <tr><td>Gap with tolerance</td><td>Red dashed line across the centre post gap with "GAP = Xmm ±0.03mm" annotation — the machining tolerance for production gap grinding.</td></tr>
  <tr><td>Title block</td><td>Bottom-right: Title, Part Number, Material, Standard, Drawn by, Date.</td></tr>
  <tr><td>General Notes</td><td>Numbered production notes covering: dimensions, gap tolerance, winding order, isolation class with creepage distance, and electrical test requirements.</td></tr>
  <tr><td>Materials & Specification table</td><td>Right panel with columns: Ref | Item | Specification | Tolerance | Standard. Rows cover core, bobbin, each winding (wire spec + DCR limit), insulation tape, hi-pot test, and inductance test.</td></tr>
</table>
<div class="hs-tip">💡 Print the Foundry view and attach it to the purchase order when ordering custom-wound transformers. The part number, gap tolerance, hi-pot spec, and IEC reference are all included.</div>`,
        related:['magnetics-view-designer','magnetics-designer-bom','magnetics-designer-compliance'],
      },
      { id:'magnetics-view-3d', title:'3D Isometric View',
        content:`<h2>3D Isometric View</h2>
<p>The <strong>3D View</strong> tab renders an isometric (30°/60°) perspective projection of the complete transformer assembly, giving an intuitive 3D understanding of the component.</p>
<h3>What it shows</h3>
<table class="hs-table">
  <tr><th>Element</th><th>Description</th></tr>
  <tr><td>Top and bottom E-core halves</td><td>Brown isometric boxes rendered with 3 visible faces (top, front, right) — each shaded at a different luminance to convey 3D depth.</td></tr>
  <tr><td>Centre post</td><td>Gold vertical column visible through the bobbin window. The air gap annotation line appears between the two core halves.</td></tr>
  <tr><td>Winding bands</td><td>Coloured horizontal rings on the bobbin, one per winding group. Front and top faces rendered at different opacities to convey depth.</td></tr>
  <tr><td>Lead wires</td><td>Coloured lines exiting the primary flange, one per winding. Dot at the exit point. Labels show winding reference (P/S/B).</td></tr>
  <tr><td>Legend</td><td>Top-right panel: material colour, each winding, centre post. Includes Lp and Np/Ns readout.</td></tr>
  <tr><td>XYZ axis indicator</td><td>Bottom-left corner: three-axis reference showing X (right-forward, green), Y (left-forward, orange), Z (up, blue).</td></tr>
</table>
<h3>Isometric projection formula</h3>
<p>The projection uses standard 30° isometric angles: x_screen = x×cos(30°) − y×cos(30°), y_screen = −z + (x+y)×sin(30°). All three axes are equally foreshortened at cos(30°) ≈ 0.866.</p>`,
        related:['magnetics-view-thermal','magnetics-designer-panels'],
      },
      { id:'magnetics-view-thermal', title:'Thermal Map',
        content:`<h2>Thermal Map</h2>
<p>The <strong>Thermal</strong> tab displays a false-colour thermal map of the transformer, showing temperature distribution across the core, windings, and power semiconductor junction estimates.</p>
<h3>Colour scale</h3>
<p>The gradient runs from <strong>blue (cool = Ta ambient)</strong> through cyan → green → yellow → orange to <strong>red (hottest element)</strong>. The scale bar on the right shows the temperature range from Ta (bottom) to the hottest element (top).</p>
<h3>What it shows</h3>
<table class="hs-table">
  <tr><th>Element</th><th>Temperature calculation</th></tr>
  <tr><td>Core (top/bottom)</td><td>Ta + T1_dT (core temperature rise from Steinmetz losses)</td></tr>
  <tr><td>Primary winding</td><td>Ta + P_cu_pri × 18 + T1_dT × 0.4 (combined I²R + proximity heating)</td></tr>
  <tr><td>Secondary winding</td><td>Ta + P_cu_sec × 22 + T1_dT × 0.35</td></tr>
  <tr><td>Bias winding</td><td>Ta + P_cu_sec × 8 (low current, coolest winding)</td></tr>
  <tr><td>Flanges</td><td>Ta + T1_dT × 0.5 (conduction through bobbin)</td></tr>
  <tr><td>Isothermal lines</td><td>Vertical lines within each band showing the gradient — closer spacing = steeper thermal gradient</td></tr>
</table>
<h3>Hot-spot markers</h3>
<p>Three annotated hot spots with leader lines show: U1 junction temperature (from simResult.thermal.U1_Tj), D3 diode junction temperature, and the core surface temperature.</p>
<h3>Thermal Budget table (right panel)</h3>
<p>Shows each component with its temperature and margin to limit: U1 (limit 135°C), D3 (limit 110°C), T1 core ΔT (user-defined limit), Primary Cu, Secondary Cu. A green PASS / red FAIL banner confirms overall thermal compliance.</p>
<h3>Loss bar chart</h3>
<p>Horizontal bar chart below the table showing the proportional contribution of each loss source (switching, copper primary/secondary, core, diode) to the total losses.</p>
<div class="hs-tip">💡 If the thermal map shows red in the core, increase core size or reduce switching frequency (lower Steinmetz losses). Red in the primary winding suggests increasing wire gauge or reducing KP (which lowers Ip_pk and I²R losses).</div>`,
        related:['magnetics-designer-engine','magnetics-designer-compliance','magnetics-view-3d'],
      },
      { id:'magnetics-view-dimensions', title:'Dimensions View',
        content:`<h2>Dimensions View</h2>
<p>The <strong>Dimensions</strong> tab provides a full orthographic three-view drawing of the selected core with every physical dimension annotated, plus a winding build table and 1:1 scale reference bar.</p>
<h3>Three views drawn</h3>
<table class="hs-table">
  <tr><th>View</th><th>Shows</th><th>Key dimensions</th></tr>
  <tr><td>Front View</td><td>Core face-on. Outer limbs, centre post, gap, winding bands, window area.</td><td>A (length), H (height), E (window length), D (window height), F (post width)</td></tr>
  <tr><td>Side View</td><td>Core from the side. Top/bottom bars (C height), centre post as circle.</td><td>B (width), C (E-half height)</td></tr>
  <tr><td>Top View</td><td>Core from above. Outer limbs, centre post, concentric winding rings, MLT path.</td><td>A (length), B (width)</td></tr>
</table>
<h3>Dimension key</h3>
<table class="hs-table">
  <tr><th>Letter</th><th>Dimension</th><th>Used for</th></tr>
  <tr><td>A</td><td>Outer length (mm)</td><td>PCB footprint, pick-and-place</td></tr>
  <tr><td>B</td><td>Outer width (mm)</td><td>PCB footprint</td></tr>
  <tr><td>C</td><td>Half-height of one E-core piece</td><td>Assembly clearance</td></tr>
  <tr><td>D</td><td>Window height (mm)</td><td>Maximum winding build height</td></tr>
  <tr><td>E</td><td>Window length (mm)</td><td>Bobbin winding width</td></tr>
  <tr><td>F</td><td>Centre post width (mm)</td><td>Minimum gap shim size; gap jig tolerance</td></tr>
  <tr><td>H</td><td>Total assembled height (mm)</td><td>Board height, clearance check</td></tr>
  <tr><td>Ae</td><td>Effective cross-sectional area (mm²)</td><td>Flux calculation</td></tr>
  <tr><td>Le</td><td>Effective magnetic path length (mm)</td><td>Reluctance calculation</td></tr>
  <tr><td>MLT</td><td>Mean length per turn (mm)</td><td>Wire length, DCR, copper weight</td></tr>
</table>
<h3>Dimension tables (right panel)</h3>
<p><strong>Core Physical</strong> — All 7 mechanical dimensions with tolerance (±0.3mm for outer, ±0.2mm for window, ±0.03mm for gap), plus magnetic parameters (Ae, Le, Ve, Al ungapped, Al gapped, gap, MLT).</p>
<p><strong>Winding Build</strong> — Per-winding build height in mm (turns × wire diameter × 1.15 packing factor), insulation tape total, <strong>total build width vs window height D</strong> (highlighted green if fits, red if over-wound), and fill factor.</p>
<p><strong>PCB Footprint</strong> — Banner showing L×W×H in mm.</p>
<h3>Scale bar</h3>
<p>A blue/white 20mm calibration bar at the bottom-left lets you verify the 1:1 scale at 96 dpi. The top toolbar also shows a ruler widget. The SVG auto-scales so the core fits on screen — the <code>scalePx</code> factor ensures 1 SVG pixel = 1/scalePx mm.</p>
<h3>Gap annotation</h3>
<p>A red dashed line marks the air gap on the centre post with the gap value (mm) and the effective Al (nH/T²) annotated by a leader line.</p>
<div class="hs-tip">💡 Use the Dimensions view when designing the PCB keep-out zone. Check the Total BW row in the Winding Build table — if it shows red, the winding stack is too tall for the bobbin window. Increase core size or reduce turns via higher switching frequency.</div>`,
        related:['magnetics-designer-construction','magnetics-view-foundry','magnetics-designer-engine'],
      },
      { id:'schematic-families', title:'Family-Specific Schematics',
        content:`<h2>Family-Specific Schematic Diagrams</h2>
<p>The Schematic tab automatically renders a different circuit diagram depending on which IC family was selected during the Design Wizard. Each schematic is accurate to the typical application circuit from the PI datasheet.</p>
<table class="hs-table">
  <tr><th>Family</th><th>Schematic Features</th><th>Colour</th></tr>
  <tr><td>HPFC-1/HX/GX</td><td>D/V/F/S/X pin configuration, RCD clamp, optocoupler feedback (U2A), secondary regulation (U3)</td><td>Blue (#0066A6)</td></tr>
  <tr><td>IFC-CE/AE/EP</td><td>Split IC block showing primary and secondary sides separated by an isolation barrier. SR (sync rectifier) connection. Feedback resistors.</td><td>Green (#38A169)</td></tr>
  <tr><td>LPFC-1/LT</td><td>EN/UV + BYP pins, Y-cap CY1, compact transformer, optocoupler feedback, auto-restart label</td><td>Amber (#d97706)</td></tr>
  <tr><td>PSC-TN/XT2/HP</td><td>L1 Inductor (TN2) or T1 Transformer (XT2/HP), BP bypass cap, minimal external components</td><td>Purple (#7c3aed)</td></tr>
</table>
<h3>Common elements on all schematics</h3>
<ul>
  <li>AC input terminals with 85–265V annotation</li>
  <li>Fuse F1, bridge rectifier BR1, bulk capacitor C1</li>
  <li>Transformer T1 with primary (Np) and secondary (Ns) coil symbols and polarity dots</li>
  <li>Dynamic Np/Ns/Nb turn counts from the current simulation result</li>
  <li>Output diode D3, output capacitor Co, output terminals (+Vout / GND)</li>
  <li>Title block: file name, topology, family, input spec, power, date</li>
</ul>`,
        related:['design-wizard','magnetics-designer'],
      },
      { id:'design-eval-tab', title:'Design Evaluation Tab',
        content:`<h2>Design Evaluation Tab</h2>
<p>The <strong>Design Evaluation</strong> tab (in the result tabs row after running a design) provides a comprehensive pass/fail dashboard summarising all key metrics from the simulation.</p>
<h3>Status Banner</h3>
<p>A large banner at the top shows overall status: <strong>✅ PASS</strong> (all checks met), <strong>⚠️ REVIEW</strong> (warnings present), or <strong>❌ FAIL</strong> (critical checks failed). Key metrics are shown inline: η%, D_max%, U1 Tj°C.</p>
<h3>Six evaluation cards</h3>
<table class="hs-table">
  <tr><th>Card</th><th>Contents</th></tr>
  <tr><td>⚡ Power Stage</td><td>Input power, output power, efficiency vs 82% limit, Vdc_min, D_max vs 55% limit, Ip_peak, Ip_rms, clamp voltage, DCM/BCM mode</td></tr>
  <tr><td>🔁 Transformer</td><td>Core name, Lp (µH), Np/Ns/Nb turns, Bmax vs 80% Bsat, Ae, n_ps turns ratio, fsw vs 500kHz limit</td></tr>
  <tr><td>🌡️ Thermal</td><td>U1 Tj vs 135°C, D3 Tj vs 110°C, T1 core ΔT vs 40°C, margins, overall thermal PASS/FAIL</td></tr>
  <tr><td>✅ Compliance</td><td>7 checks: D_max, η DOE Level VI, U1 Tj, D3 Tj, IEC 62368-1, CISPR 32, ErP Lot 6</td></tr>
  <tr><td>🧵 Windings</td><td>Per-winding table: turns, AWG, Irms, DCR</td></tr>
  <tr><td>📊 Loss Budget</td><td>Horizontal bar chart for switching, primary Cu, secondary Cu, core, diode, other losses. Total losses in W and overall η%.</td></tr>
</table>
<div class="hs-tip">💡 The Design Evaluation tab only shows data after a design variant has been confirmed. If it shows "No simulation data yet", go to the Schematic tab and select a design variant first.</div>`,
        related:['design-results','magnetics-designer'],
      },
      { id:'magnetics-designer-seed', title:'Magnetics Designer Auto-Population',
        content:`<h2>Magnetics Designer — Auto-Population from Design</h2>
<p>When you open the <strong>Magnetics Designer</strong> tab from within a completed design, the transformer design form is automatically pre-populated with all parameters from that design:</p>
<table class="hs-table">
  <tr><th>Field</th><th>Source</th></tr>
  <tr><td>Vin min/max</td><td>design.spec.input.vMin / vMax</td></tr>
  <tr><td>Line frequency</td><td>design.spec.input.lineFreq</td></tr>
  <tr><td>Pout</td><td>design.meta.totalPower</td></tr>
  <tr><td>fsw</td><td>design.meta.frequency (or spec.options.frequency)</td></tr>
  <tr><td>IC Family</td><td>design.meta.family</td></tr>
  <tr><td>KP</td><td>design.spec.options.KP</td></tr>
  <tr><td>Output rails</td><td>design.spec.outputs (voltage + current per rail)</td></tr>
  <tr><td>VOR</td><td>Auto-set: IFC→135V, LPFC→60V, others→90V</td></tr>
</table>
<p>After the form is populated, click <strong>▶ Run Design</strong> to generate a complete transformer design for the active design's parameters. Results show across all 7 diagram views (Cross-Section, Spiral, Construction, Designer, Foundry, Thermal, Dimensions).</p>`,
        related:['magnetics-designer','design-eval-tab'],
      },
      { id:'magnetics-materials', title:'Magnetic Materials',
        content:`<h2>Magnetic Materials</h2>
<p>The Materials pane lists ferrite material properties for all grades in the database.</p>
<h3>Key parameters</h3><table class="hs-table"><tr><th>Parameter</th><th>Meaning</th></tr><tr><td>Bmax @100°C</td><td>Saturation flux density at 100°C (operating temp)</td></tr><tr><td>Bmax @25°C</td><td>Saturation flux density at room temperature</td></tr><tr><td>µi</td><td>Initial permeability</td></tr><tr><td>Freq range</td><td>Optimum operating frequency range</td></tr></table>
<h3>Material selection guide</h3><table class="hs-table"><tr><th>Frequency</th><th>Recommended</th></tr><tr><td>&lt; 100 kHz</td><td>3C81, 3C90, N27</td></tr><tr><td>100–200 kHz</td><td>PC44, N87, 3F3, PC40</td></tr><tr><td>200–500 kHz</td><td>PC95, N97, 3C95, 3F3</td></tr><tr><td>&gt; 500 kHz</td><td>NC2H, PC200</td></tr></table>
<div class="hs-tip">💡 PC95 and N97 are the lowest-loss materials for 100 kHz flyback designs — preferred for efficiency-critical applications.</div>`,
        related:['magnetics-cores','magnetics-overview'],
      },
    ],
  },
  {
    id:'system', title:'System & Navigation', icon:'🖥️',
    desc:'Menu bar, keyboard shortcuts, language, and export',
    articles:[
      { id:'menu-bar', title:'Application Menu Bar',
        content:`<h2>Application Menu Bar</h2>
<p>The menu bar at the top of the application provides access to all features, matching the FluxForge Online interface.</p>
<div class="hs-mock-screen"><div class="hs-mock-bar">FluxForge Online — Menu Bar</div><div class="hs-mock-body" style="flex-direction:column;padding:0;"><div style="background:#1B3A6B;padding:.3rem .8rem;font-size:.7rem;color:#3498db;display:flex;gap:1.5rem"><span>GET TECH SUPPORT</span><span>LANGUAGE 🇺🇸</span><span>USER</span><span>LOGOUT</span></div><div style="background:#fff;padding:.2rem .5rem;font-size:.78rem;color:#1a1a2e;display:flex;gap:.1rem;align-items:center;border-bottom:1px solid #eee"><span style="padding:.2rem .6rem">File</span><span style="padding:.2rem .6rem">Edit</span><span style="padding:.2rem .6rem;background:#e8ecff">View</span><span style="padding:.2rem .6rem">Active Design</span><span style="padding:.2rem .6rem">Tools</span><span style="padding:.2rem .6rem">Help</span><div style="margin-left:auto;display:flex;gap:2px"><span style="background:#2980b9;color:#fff;padding:.15rem .3rem;border-radius:2px">📄</span><span style="background:#2980b9;color:#fff;padding:.15rem .3rem;border-radius:2px">📂</span><span style="background:#2980b9;color:#fff;padding:.15rem .3rem;border-radius:2px">↩</span><span style="background:#2980b9;color:#fff;padding:.15rem .3rem;border-radius:2px">↪</span><span style="background:#2980b9;color:#fff;padding:.15rem .3rem;border-radius:2px">▶</span><span style="background:#2980b9;color:#fff;padding:.15rem .3rem;border-radius:2px">❓</span><span style="background:#D97706;color:#1a1a2e;padding:.15rem .5rem;border-radius:2px;font-size:.68rem;font-weight:bold">⚠ Design Warning</span></div></div></div></div>
<h3>Top bar</h3><table class="hs-table"><tr><th>Item</th><th>Function</th></tr><tr><td>GET TECH SUPPORT</td><td>Opens FluxForge support resources</td></tr><tr><td>LANGUAGE</td><td>Opens language selector (see below)</td></tr><tr><td>Username</td><td>Shows logged-in user</td></tr><tr><td>LOGOUT</td><td>Signs out of the application</td></tr></table>
<h3>Menu items</h3><table class="hs-table"><tr><th>Menu</th><th>Key items</th></tr><tr><td>File</td><td>New, Open, Save, Save As, Export, Print, Recent, Close</td></tr><tr><td>Edit</td><td>Undo/Redo, Cut/Copy/Paste, <strong>Export All Tabs to PDF</strong>, Preferences</td></tr><tr><td>View</td><td>Switch design tabs, Zoom In/Out, Fit All</td></tr><tr><td>Active Design</td><td>Properties, Simulate, Optimize, Validate, Compare variants</td></tr><tr><td>Tools</td><td>Component DB, Component Sets, Magnetics, Calculators, Settings</td></tr><tr><td>Help</td><td>Help Center, Getting Started, Keyboard Shortcuts, About</td></tr></table>
<h3>Icon toolbar (right side)</h3><p>6 blue icon buttons: New Design, Open Design, Undo, Redo, Run Simulation, Help. A yellow <strong>Design Warning</strong> badge appears when the current design has warnings from the simulation engine.</p>`,
        related:['kbd-shortcuts','language','export-all'],
      },
      { id:'kbd-shortcuts', title:'Keyboard Shortcuts',
        content:`<h2>Keyboard Shortcuts</h2>
<table class="hs-table"><tr><th>Shortcut</th><th>Action</th></tr><tr><td><code>Ctrl+N</code></td><td>New Design</td></tr><tr><td><code>Ctrl+O</code></td><td>Open Design</td></tr><tr><td><code>Ctrl+S</code></td><td>Save</td></tr><tr><td><code>Ctrl+Shift+S</code></td><td>Save As</td></tr><tr><td><code>Ctrl+E</code></td><td>Export All Tabs to PDF</td></tr><tr><td><code>Ctrl+Z</code></td><td>Undo</td></tr><tr><td><code>Ctrl+Y</code></td><td>Redo</td></tr><tr><td><code>Ctrl++</code></td><td>Zoom In (Schematic)</td></tr><tr><td><code>Ctrl+-</code></td><td>Zoom Out (Schematic)</td></tr><tr><td><code>Ctrl+0</code></td><td>Fit All (Schematic)</td></tr><tr><td><code>F1</code></td><td>Keyboard Shortcuts dialog</td></tr><tr><td><code>Escape</code></td><td>Close dialog / cancel</td></tr></table>`,
        related:['menu-bar','export-all'],
      },
      { id:'language', title:'Language Selector',
        content:`<h2>Language Selector</h2>
<p>FluxForge supports 6 languages. Your selection is saved and remembered on next launch.</p>
<h3>Supported languages</h3><table class="hs-table"><tr><th>Flag</th><th>Language</th><th>Code</th></tr><tr><td>🇺🇸</td><td>English</td><td>en</td></tr><tr><td>🇵🇭</td><td>Filipino (Tagalog)</td><td>tl</td></tr><tr><td>🇯🇵</td><td>日本語 (Japanese)</td><td>ja</td></tr><tr><td>🇨🇳</td><td>中文 (Chinese Simplified)</td><td>zh</td></tr><tr><td>🇩🇪</td><td>Deutsch (German)</td><td>de</td></tr><tr><td>🇰🇷</td><td>한국어 (Korean)</td><td>ko</td></tr></table>
<h3>How to change language</h3><ol><li>Click <strong>LANGUAGE</strong> in the top bar of the menu bar</li><li>Select your language from the dropdown</li><li>All menus, labels, and UI text update immediately</li><li>The selection is stored in localStorage and persists across sessions</li></ol>
<div class="hs-tip">💡 The language is also auto-detected from your browser's <code>navigator.language</code> setting on first launch.</div>`,
        related:['menu-bar'],
      },
      { id:'export-all', title:'Export All Tabs to PDF',
        content:`<h2>Export All Tabs to PDF</h2>
<p>The <strong>Export All Tabs to PDF</strong> feature generates a comprehensive 7-page PDF report containing all design information from the active design.</p>
<h3>How to export</h3><ol><li>Open a design (must have an active design loaded)</li><li>Go to <strong>Edit → Export All Tabs to PDF</strong> OR press <code>Ctrl+E</code> OR use the gear icon in the result view</li><li>A 7-page PDF is generated and downloaded automatically</li></ol>
<h3>PDF contents</h3><table class="hs-table"><tr><th>Page</th><th>Content</th></tr><tr><td>1</td><td>Title page — design name, topology, family, date</td></tr><tr><td>2</td><td>Design summary — input spec, output rails, total power</td></tr><tr><td>3</td><td>Schematic diagram</td></tr><tr><td>4</td><td>Calculated parameters (Lp, duty cycle, currents, efficiency)</td></tr><tr><td>5</td><td>Bill of Materials (all components)</td></tr><tr><td>6</td><td>Transformer construction (winding data)</td></tr><tr><td>7</td><td>Design notes and compliance checklist</td></tr></table>
<div class="hs-tip">💡 Requires internet access — jsPDF is loaded from CDN the first time you export.</div>
<div class="hs-tip">📐 Also see <strong>Edit → Export to CAD</strong> to generate a KiCad schematic, CSV netlist, and BOM for PCB layout work.</div>`,
        related:['export-cad','kbd-shortcuts','menu-bar'],
      },
      { id:'export-cad', title:'Export to CAD (KiCad)',
        content:`<h2>Export to CAD</h2>
<p>The <strong>Export to CAD</strong> feature generates a complete KiCad-compatible CAD package from your active design, bundled as a single <code>.zip</code> download.</p>
<h3>How to trigger the export</h3>
<ol>
  <li>Make sure you have an active completed design (simulation must have run)</li>
  <li>Go to <strong>Edit → Export to CAD</strong> in the menu bar</li>
  <li>Your browser downloads <code>{DesignName}_CAD.zip</code> automatically</li>
</ol>
<h3>Files included in the ZIP</h3>
<table class="hs-table">
  <tr><th>File</th><th>Format</th><th>Purpose</th></tr>
  <tr><td><code>.kicad_sch</code></td><td>KiCad 6+ S-expression</td><td>Open directly in KiCad EESchema — full schematic with symbol instances, title block, and library refs</td></tr>
  <tr><td><code>_netlist.csv</code></td><td>CSV</td><td>Import in Altium Designer, Eagle, or any EDA tool that accepts CSV netlists (Reference, Value, Footprint, Net_A, Net_B)</td></tr>
  <tr><td><code>_BOM.csv</code></td><td>CSV</td><td>Bill of materials with components grouped by value and footprint, ready for procurement</td></tr>
  <tr><td><code>README.txt</code></td><td>Plain text</td><td>Step-by-step import instructions for KiCad and Altium Designer</td></tr>
</table>
<h3>What the schematic contains</h3>
<p>Component values in the schematic are populated directly from your simulation result:</p>
<ul>
  <li>Transformer T1 carries the full spec string — e.g. <code>EFD30 (3F3) Lp=892µH Np=72T Ns=9T Nb=11T Gap=0.711mm</code></li>
  <li>Resistors, capacitors, and inductors use BOM values where available, otherwise datasheet-typical values for the design</li>
  <li>Components are laid out left-to-right: AC input → clamp → transformer → IC → output stage → feedback network</li>
  <li>The KiCad title block is filled with your design's input spec, output power, core/turns/gap summary, and FluxForge version</li>
</ul>
<h3>Family-specific components</h3>
<table class="hs-table">
  <tr><th>Family</th><th>What gets generated</th></tr>
  <tr><td>HPFC-1/HX/GX</td><td>Full universal-input flyback: F1, C1/RT1/L1 input filter, BR1 bridge, C2 bulk, R4/R5 bleeds, VR1/R10/C7/D2 RCD clamp, T1, U1 with passives, D3/C9/C10/L2/C11 output, D8/C8 bias, TL431+opto feedback (U3, U2A/B, R7–R13, C13)</td></tr>
  <tr><td>IFC-CE/AE/EP</td><td>AC input stage, no RCD clamp (IFC architecture), simplified feedback, no bias winding</td></tr>
  <tr><td>LPFC-1/LT</td><td>AC input, D1 freewheeling diode, BP-pin IC supply, opto or PSR feedback</td></tr>
  <tr><td>PSC-TN/XT2/HP</td><td>AC input, D1, BP-pin supplied IC, PSR or opto depending on family</td></tr>
</table>
<h3>Opening in KiCad 6+</h3>
<ol>
  <li>Open KiCad and open or create a project</li>
  <li>Open the Schematic Editor</li>
  <li>Choose <strong>File → Import → KiCad Schematic</strong> and select the <code>.kicad_sch</code> file</li>
  <li>When prompted, map unresolved symbols to your local KiCad symbol libraries (most map to the standard <code>Device:*</code> library)</li>
</ol>
<h3>Importing in Altium Designer</h3>
<ol>
  <li>Go to <strong>File → Import → CSV Netlist</strong></li>
  <li>Select the <code>_netlist.csv</code> file</li>
  <li>Map columns: Reference, Value, Footprint, Net_A (first net), Net_B (second net)</li>
</ol>
<div class="hs-tip">⚠ <strong>Verify before fabrication:</strong> This is a Proof-of-Concept export. All component values and suggested footprints should be confirmed by a hardware engineer against manufacturer datasheets before PCB fabrication or ordering parts.</div>
<div class="hs-tip">💡 JSZip is loaded from CDN on first use — internet access required for the initial download.</div>`,
        related:['export-all','design-results','bom','menu-bar'],
      },
      { id:'schematic-component-editor', title:'Editing Components on the Schematic',
        content:`<h2>Editing Components on the Schematic</h2>
<p>You can change any component directly on the schematic diagram. Clicking a component opens a slide-in editor panel showing fields specific to that component type and a list of compatible alternatives from the component database.</p>

<h3>How to edit a component</h3>
<ol>
  <li>Open a completed design and go to the <strong>Schematic</strong> tab</li>
  <li>Click any component symbol on the schematic (e.g. F1, C2, T1, U1)</li>
  <li>A dialog opens showing the <strong>Component DB</strong>, <strong>Parameters</strong>, and <strong>Notes</strong> tabs</li>
  <li>Either type directly into the fields, or click an alternative to populate all fields at once</li>
  <li>Click <strong>✔ Apply change</strong> to save — the schematic and UDS are updated immediately</li>
</ol>

<h3>What the panel shows</h3>
<table class="hs-table">
  <tr><th>Section</th><th>Description</th></tr>
  <tr><td>Component DB tab</td><td>Searchable table of compatible parts from the database. Click a row to select it. Use the search box or type filter to narrow the list.</td></tr>
  <tr><td>Parameters tab</td><td>Fields relevant to the component type — capacitors show Value/Voltage/ESR, resistors show Value/Power/Tolerance, transformer T1 shows Core/Material/Ae/Le, ICs show Part/Family/Package</td></tr>
  <tr><td>Compatible alternatives</td><td>Parts from the component database that are the correct type for that reference. Click any row to populate all fields instantly.</td></tr>
  <tr><td>Action buttons</td><td><strong>Apply change</strong> saves to the design. <strong>Cancel</strong> discards. <strong>Reset to original</strong> appears when a component has been modified and restores the simulated value.</td></tr>
</table>

<h3>Component-specific behaviour</h3>
<table class="hs-table">
  <tr><th>Component</th><th>Alternatives shown</th><th>Key fields</th></tr>
  <tr><td>F1</td><td>Fuse database — slow-blow and fast-blow types</td><td>Rating, Voltage, Type, Size</td></tr>
  <tr><td>C1</td><td>X2 safety capacitors</td><td>Value, Voltage, Type</td></tr>
  <tr><td>C2</td><td>Bulk electrolytic capacitors</td><td>Value, Voltage, ESR, Temp</td></tr>
  <tr><td>C9/C10/C11</td><td>Output electrolytic capacitors</td><td>Value, Voltage, ESR</td></tr>
  <tr><td>R4/R5–R13</td><td>Resistors filtered by function (startup, feedback, current-sense)</td><td>Value, Power, Tolerance, Package</td></tr>
  <tr><td>D3/D8</td><td>Schottky output rectifier diodes</td><td>Voltage, Current, Vf, Package</td></tr>
  <tr><td>BR1</td><td>Bridge rectifiers</td><td>Voltage, Current, Package</td></tr>
  <tr><td>L1/L2</td><td>EMI filter inductors / output chokes</td><td>Value, Current, DCR</td></tr>
  <tr><td>T1</td><td>Transformer cores (EE, EFD, ETD, PQ, RM series from TDK and Ferroxcube)</td><td>Core part, Ae, Le, Material</td></tr>
  <tr><td>U1</td><td>All PI IC families in the database</td><td>Part, Family, Package, Power</td></tr>
</table>

<h3>Modified components — the blue indicator</h3>
<p>When you apply a change to a component, it turns <strong>blue</strong> on the schematic with a <strong>✎</strong> pen badge. This tells you at a glance which components you have customised versus which are still using the original simulated values.</p>
<p>Blue components also remain permanently highlighted (frozen) so you can always see your changes even when hovering elsewhere.</p>
<p>To revert a modified component, click it again and press <strong>↺ Reset to original</strong>.</p>

<h3>How changes are saved</h3>
<p>Confirmed changes are written back to the active design's UDS (Unified Design Schema) in the <code>components</code> section. Each entry stores the full component data — part number, manufacturer, value, and all specifications. When you export to PDF or CAD, the modified component values are used instead of the defaults.</p>

<div class="hs-tip">💡 You can use this to substitute a preferred supplier part, adjust a capacitor voltage rating, or select a specific core geometry for the transformer — without re-running the full design simulation.</div>`,
        related:['schematic-families','export-cad','export-all','bom'],
      },
      { id:'testing', title:'Running the Test Suite',
        content:`<h2>Test Suite</h2>
<p>FluxForge includes a comprehensive unit test suite using Node.js built-in <code>node:test</code> — no install required.</p>
<h3>Quick start</h3>
<pre class="hs-code">
# Run all tests (from project root)
node --test tests/sim-engine.test.js tests/uds-schema.test.js tests/core-logic.test.js

# With spec reporter (verbose)
node --test --test-reporter=spec tests/

# Individual suites
node --test tests/sim-engine.test.js     # SimEngine: 31 tests
node --test tests/uds-schema.test.js     # UDS Schema: 18 tests
node --test tests/core-logic.test.js     # Logic/Router/App: 52 tests
node --test tests/server-api.test.js     # Server API (live): 24 tests
</pre>
<h3>Test suites</h3>
<table class="hs-table"><tr><th>File</th><th>Tests</th><th>Coverage</th></tr><tr><td>sim-engine.test.js</td><td>31</td><td>runSimulation, generateVariants, KP/frequency effects</td></tr><tr><td>uds-schema.test.js</td><td>18</td><td>buildUds, applyDbComponent, compLabel</td></tr><tr><td>core-logic.test.js</td><td>52</td><td>i18n, Design Store, Validate logic, AppMenuBar, Router, App configs</td></tr><tr><td>server-api.test.js</td><td>24</td><td>REST API integration: auth, components, sets, magnetics, files</td></tr></table>
<h3>What is tested</h3>
<ul><li><strong>SimEngine</strong> — efficiency range, duty cycle bounds, KP effect on Lp, frequency vs Lp relationship, variant differentiation</li><li><strong>UDS Schema</strong> — buildUds output structure, meta/spec/components paths, variant mod merging</li><li><strong>i18n</strong> — all 6 language catalogues, required key coverage, localStorage persistence</li><li><strong>Design Store</strong> — pendingWizardStart flag lifecycle, designReady toggling</li><li><strong>Validate Design</strong> — all 5 check categories present, PASS/REVIEW/FAIL status logic</li><li><strong>Router</strong> — no /new-design route, correct redirects, auth guard behaviour</li><li><strong>Server API</strong> — CRUD for components, sets, magnetics, auth register/login</li></ul>
<div class="hs-tip">💡 Tests use <code>node:test</code> (Node 18+) and <code>node:assert/strict</code> — no npm install needed.</div>`,
        related:['sim-engine','menu-bar'],
      },
      { id:'sim-engine', title:'Simulation Engine',
        content:`<h2>Simulation Engine</h2>
<p>FluxForge uses a real electrical engineering calculation engine for flyback converter design — not a scripted timer. The calculations are based on FluxForge application notes AN-19, AN-29, and AN-57.</p>
<h3>What is calculated</h3><table class="hs-table"><tr><th>Parameter</th><th>Formula</th></tr><tr><td>DC Bus Voltage</td><td>Vpk − ΔV (capacitor ripple model)</td></tr><tr><td>Duty Cycle (max)</td><td>VOR / (Vdc_min + VOR)</td></tr><tr><td>Primary Inductance</td><td>Vmin² × D² / (2 × fsw × Pin × KP)</td></tr><tr><td>Primary Peak Current</td><td>2 × Pin / (Vdc_min × D × (1 + KP/2))</td></tr><tr><td>Turns Ratio</td><td>N_p/N_s = Vdc_min × D / ((Vout + Vd) × (1−D))</td></tr><tr><td>Primary Turns</td><td>N = L × Ipk / (Bmax × Ae)</td></tr><tr><td>Junction Temp</td><td>Tj = Ta + P_loss × Rθja</td></tr></table>
<h3>Loss breakdown</h3><p>The engine calculates 7 loss components: switching losses, primary copper, secondary copper, output diode, core loss (Steinmetz model), gate drive, and shield winding (if enabled).</p>
<h3>EMC pre-checks</h3><p>Automatic compliance checks against: IEC 61000-3-2 (harmonics), CISPR 32 (emissions), IEC 62368-1 (energy), ErP Lot 6 (standby), DOE Level VI (efficiency).</p>
<h3>6 design variants</h3><p>The engine generates 6 optimised variants by varying KP (ripple ratio) and VOR (reflected output voltage): Balanced, High Efficiency, Low Profile, Extended Input, Low EMI, High Reliability.</p>`,
        related:['new-design-wizard','design-results'],
      },
    ],
  },
  {
    id:'files', title:'File Management', icon:'📁',
    desc:'Saving, opening, and managing .uds design files',
    articles:[
      { id:'files-overview', title:'File Management Overview',
        content:`<h2>File Management</h2>
<p>FluxForge saves designs as <code>.uds</code> (Unified Design Schema) JSON files. The <strong>Files</strong> section lets you manage all saved designs.</p>
<h3>Saving a design</h3><p>Designs are automatically saved to the file manager when you confirm a variant in the Design Picker. The file is named <code>{family}_PIDesign{n}.uds</code> where <code>n</code> is auto-incremented.</p>
<h3>Opening a design</h3><ol><li>Go to <strong>Files</strong> in the sidebar (or click <strong>Open Design</strong> on the welcome screen)</li><li>Click on any <code>.uds</code> file in the list</li><li>The design loads into the <strong>Active Design</strong> view</li></ol>
<h3>Uploading a .uds file</h3><p>Use the upload button in the File Manager to import an existing <code>.uds</code> file from disk. Only <code>.uds</code> files are accepted.</p>
<h3>UDS file format</h3><pre class="hs-code">{ "meta": { "fileName":"...", "topology":"Flyback", "family":"HPFC-1" },\n  "spec": { "input":{...}, "outputs":[...], "options":{...} },\n  "components": { "U1":{...}, "T1":{...} },\n  "notes": "" }</pre>`,
        related:['welcome','new-design-wizard'],
      },
    ],
  },
];

// Flatten for search
const ALL_ARTICLES = [];
SECTIONS.forEach(s => s.articles.forEach(a => ALL_ARTICLES.push({ ...a, section: s.title })));

function findArticle(id) { return ALL_ARTICLES.find(a=>a.id===id); }

const currentArticle = computed(() => findArticle(currentId.value));
const currentSection = computed(() => SECTIONS.find(s=>s.articles.some(a=>a.id===currentId.value)));

// Prev/next within same section
const prevArticle = computed(() => {
  const sec = currentSection.value;
  if (!sec) return null;
  const idx = sec.articles.findIndex(a=>a.id===currentId.value);
  return idx>0 ? sec.articles[idx-1] : null;
});
const nextArticle = computed(() => {
  const sec = currentSection.value;
  if (!sec) return null;
  const idx = sec.articles.findIndex(a=>a.id===currentId.value);
  return idx>=0 && idx<sec.articles.length-1 ? sec.articles[idx+1] : null;
});

function navigate(id) {
  if (!id) return;
  history.value.push(currentId.value);
  currentId.value = id;
  searchQuery.value = '';
  if (mainEl.value) mainEl.value.scrollTop = 0;
  // Auto-open the nav section
  const sec = SECTIONS.find(s=>s.articles.some(a=>a.id===id));
  if (sec) openNav.value = new Set([...openNav.value, sec.id]);
}
function goHome() { history.value = ['']; currentId.value = ''; searchQuery.value = ''; }
function goBack() {
  if (history.value.length>1) {
    history.value.pop();
    currentId.value = history.value[history.value.length-1];
  }
}
function toggleNav(id) {
  const s = new Set(openNav.value);
  s.has(id) ? s.delete(id) : s.add(id);
  openNav.value = s;
}
function doSearch() {
  if (!searchQuery.value) { searchResults.value = []; return; }
  const q = searchQuery.value.toLowerCase();
  searchResults.value = ALL_ARTICLES.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.content.toLowerCase().includes(q)
  ).map(a => ({
    ...a,
    excerpt: a.content.replace(/<[^>]+>/g,'').slice(0,120) + '…',
  }));
}
</script>

<style scoped>
.hs-root { display:flex; flex-direction:column; height:100%; background:#fff; font-family:'Segoe UI',Arial,sans-serif; font-size:13px; }
.hs-header { display:flex; align-items:center; justify-content:space-between; padding:.5rem 1rem; background:#1b4f72; color:#fff; flex-shrink:0; gap:1rem; }
.hs-header-left { display:flex; align-items:center; gap:.8rem; flex:1; }
.hs-header-right { display:flex; gap:.4rem; }
.hs-logo { font-size:.95rem; font-weight:700; white-space:nowrap; }
.hs-search { flex:1; max-width:360px; padding:.32rem .6rem; border:1px solid rgba(255,255,255,.3); border-radius:4px; background:rgba(255,255,255,.12); color:#fff; font-size:.82rem; }
.hs-search::placeholder { color:rgba(255,255,255,.6); }
.hs-search:focus { outline:none; background:rgba(255,255,255,.2); border-color:rgba(255,255,255,.6); }
.hs-hbtn { padding:.28rem .65rem; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); border-radius:4px; color:#fff; font-size:.78rem; cursor:pointer; }
.hs-hbtn:hover { background:rgba(255,255,255,.28); }
.hs-hbtn:disabled { opacity:.35; cursor:not-allowed; }
.hs-body { display:flex; flex:1; overflow:hidden; }

/* Nav */
.hs-nav { width:220px; flex-shrink:0; border-right:1px solid #e2e4ea; overflow-y:auto; background:#f8f9fb; padding:.4rem 0; }
.hs-nav-section { padding:.35rem .75rem; font-size:.78rem; font-weight:700; color:#2c3e50; cursor:pointer; display:flex; align-items:center; gap:.4rem; user-select:none; }
.hs-nav-section:hover { background:#eef2ff; }
.hs-nav-caret { font-size:.6rem; width:10px; color:#888; }
.hs-nav-item { padding:.28rem .75rem .28rem 1.5rem; font-size:.77rem; color:#2980b9; cursor:pointer; }
.hs-nav-item:hover { background:#eaf2ff; }
.hs-nav-item--active { background:#2980b9; color:#fff; font-weight:600; }
.hs-nav-item--active:hover { background:#2471a3; }

/* Main */
.hs-main { flex:1; overflow-y:auto; padding:1.5rem 2rem; }
.hs-breadcrumb { font-size:.75rem; color:#888; margin-bottom:.6rem; }
.hs-article-title { font-size:1.4rem; font-weight:700; color:#1a1a2e; margin:0 0 1rem; padding-bottom:.5rem; border-bottom:2px solid #e2e4ea; }
.hs-article-body :global(h2) { font-size:1.1rem; font-weight:700; color:#2c3e50; margin:1.2rem 0 .5rem; }
.hs-article-body :global(h3) { font-size:.92rem; font-weight:700; color:#2c3e50; margin:.9rem 0 .35rem; }
.hs-article-body :global(p)  { line-height:1.65; color:#333; margin:.4rem 0; }
.hs-article-body :global(ol), .hs-article-body :global(ul) { padding-left:1.4rem; line-height:1.8; color:#333; margin:.3rem 0; }
.hs-article-body :global(code) { background:#f0f2f8; padding:.1rem .3rem; border-radius:3px; font-family:monospace; font-size:.85em; color:#1a3ab0; }
.hs-article-body :global(pre.hs-code) { background:#f0f2f8; padding:.7rem .9rem; border-radius:5px; font-family:monospace; font-size:.78rem; line-height:1.5; overflow-x:auto; color:#1a1a2e; margin:.5rem 0; }
.hs-article-body :global(a.hs-link) { color:#2980b9; cursor:pointer; text-decoration:underline; }
.hs-article-body :global(.hs-table) { width:100%; border-collapse:collapse; font-size:.8rem; margin:.5rem 0; }
.hs-article-body :global(.hs-table th) { background:#24467A; color:#e8ecff; padding:.32rem .55rem; text-align:left; font-size:.76rem; }
.hs-article-body :global(.hs-table td) { padding:.28rem .55rem; border-bottom:1px solid #e8eaf0; color:#1a1a2e; }
.hs-article-body :global(.hs-tip) { background:#fffbeb; border-left:3px solid #D97706; padding:.5rem .7rem; border-radius:0 4px 4px 0; font-size:.8rem; color:#444; margin:.6rem 0; line-height:1.5; }
/* Mock screens */
.hs-article-body :global(.hs-mock-screen) { border:1px solid #d0d4e8; border-radius:6px; overflow:hidden; margin:1rem 0; background:#f8f9fb; }
.hs-article-body :global(.hs-mock-bar) { background:#24467A; color:#e8ecff; padding:.3rem .6rem; font-size:.72rem; font-weight:700; }
.hs-article-body :global(.hs-mock-body) { padding:.6rem; display:flex; gap:.4rem; flex-wrap:wrap; }
.hs-article-body :global(.hs-mock-welcome) { background:#1b4f72; justify-content:center; padding:1rem; gap:.6rem; }
.hs-article-body :global(.hs-mock-tile) { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); border-radius:5px; padding:.5rem .8rem; font-size:.72rem; color:#fff; font-weight:600; cursor:pointer; }
.hs-article-body :global(.hs-mock-pp) { align-items:flex-start; }
.hs-article-body :global(.hs-mock-pp-left) { width:160px; border-right:1px solid #e2e4ea; padding-right:.4rem; }
.hs-article-body :global(.hs-mock-pp-right) { flex:1; padding-left:.4rem; }
.hs-article-body :global(.hs-mock-pp-fam) { font-size:.72rem; font-weight:700; color:#2c3e50; padding:.15rem 0; }
.hs-article-body :global(.hs-mock-pp-app) { font-size:.7rem; color:#2980b9; padding:.1rem .3rem; cursor:pointer; }
.hs-article-body :global(.hs-mock-pp-sel) { background:#2980b9; color:#fff; border-radius:2px; }
.hs-article-body :global(.hs-mock-pp-filter) { font-size:.72rem; color:#555; padding:.18rem 0; border-bottom:1px solid #f0f0f0; }
.hs-article-body :global(.hs-mock-compdb) { flex-direction:column; gap:.3rem; }
.hs-article-body :global(.hs-mock-tabs) { display:flex; gap:.3rem; }
.hs-article-body :global(.hs-mock-tab) { padding:.15rem .5rem; font-size:.7rem; border-radius:3px; background:#e8ecf5; color:#2c3e50; cursor:pointer; border:1px solid #c8ccd8; }
.hs-article-body :global(.hs-mock-tab-act) { background:#24467A; color:#fff; border-color:#24467A; }
.hs-article-body :global(.hs-mock-table-hd) { font-size:.68rem; font-weight:700; color:#e8ecff; background:#24467A; padding:.25rem .4rem; }
.hs-article-body :global(.hs-mock-table-row) { font-size:.7rem; color:#1a1a2e; padding:.2rem .4rem; border-bottom:1px solid #e8eaf0; }
.hs-article-body :global(.hs-mock-row-sel) { background:#b8d0ff; }
.hs-article-body :global(.hs-mock-schem) { min-height:80px; background:#fff; border:1px solid #e2e4ea; gap:.8rem; align-items:center; padding:.8rem; }
.hs-article-body :global(.hs-mock-schem-comp) { position:relative; border:1px dashed #0066A6; border-radius:3px; padding:.3rem .5rem; font-size:.72rem; font-weight:700; color:#1a3ab0; font-family:monospace; cursor:pointer; }
.hs-article-body :global(.hs-mock-hover) { background:#eef2ff; }
.hs-article-body :global(.hs-mock-tooltip) { position:absolute; bottom:100%; left:50%; transform:translateX(-50%); background:#2d4080; color:#fff; padding:.12rem .4rem; border-radius:3px; font-size:.65rem; white-space:nowrap; margin-bottom:3px; }
/* Step flow */
.hs-article-body :global(.hs-step-flow) { display:flex; align-items:center; gap:.4rem; margin:.7rem 0; flex-wrap:wrap; }
.hs-article-body :global(.hs-step) { background:#24467A; color:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-direction:column; font-size:.9rem; font-weight:700; flex-shrink:0; }
.hs-article-body :global(.hs-step div) { font-size:.55rem; color:#b8d0ff; text-align:center; line-height:1; }
.hs-article-body :global(.hs-step-arrow) { color:#888; font-size:1.1rem; }
/* Panel diagram */
.hs-article-body :global(.hs-panel-diagram) { display:flex; gap:.4rem; margin:.7rem 0; font-size:.72rem; }
.hs-article-body :global(.hs-pd-box) { border:1px solid #b8c8e8; border-radius:4px; padding:.3rem .5rem; background:#f0f4ff; text-align:center; color:#2d4080; font-weight:600; }
.hs-article-body :global(.hs-pd-left,.hs-pd-right) { width:100px; display:flex; align-items:center; justify-content:center; flex-direction:column; }
.hs-article-body :global(.hs-pd-left small,.hs-pd-right small) { font-weight:400; color:#555; font-size:.65rem; line-height:1.4; text-align:center; margin-top:.2rem; }
.hs-article-body :global(.hs-pd-centre) { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:.3rem; }

/* Article nav */
.hs-article-nav { display:flex; justify-content:space-between; margin:1.5rem 0 .5rem; gap:.5rem; }
.hs-anav-btn { padding:.38rem .85rem; border:1px solid #d0d4e8; border-radius:5px; background:#fff; color:#2980b9; font-size:.8rem; cursor:pointer; }
.hs-anav-btn:hover { background:#eaf2ff; }
.hs-anav-next { margin-left:auto; }

/* Related */
.hs-related { border-top:1px solid #e2e4ea; padding-top:.7rem; margin-top:.5rem; }
.hs-related-title { font-size:.72rem; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.4rem; }
.hs-related-links { display:flex; gap:.4rem; flex-wrap:wrap; }
.hs-related-link { padding:.25rem .65rem; background:#f0f4ff; border:1px solid #c8d4ff; border-radius:4px; color:#2980b9; font-size:.78rem; cursor:pointer; }
.hs-related-link:hover { background:#dce8ff; }

/* Search results */
.hs-search-results, .hs-empty-search { padding:.5rem 0; }
.hs-results-title { font-size:1rem; font-weight:700; color:#2c3e50; margin-bottom:.8rem; }
.hs-result-card { border:1px solid #e2e4ea; border-radius:6px; padding:.6rem .85rem; margin-bottom:.5rem; cursor:pointer; }
.hs-result-card:hover { background:#f0f4ff; border-color:#0066A6; }
.hs-result-section { font-size:.68rem; color:#888; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.15rem; }
.hs-result-title { font-size:.88rem; font-weight:700; color:#1a1a2e; margin-bottom:.2rem; }
.hs-result-excerpt { font-size:.78rem; color:#555; line-height:1.4; }
.hs-empty-search { text-align:center; padding:2rem; color:#888; font-size:.88rem; }

/* Home */
.hs-home { max-width:860px; margin:0 auto; }
.hs-home-title { font-size:1.6rem; font-weight:700; color:#1a1a2e; margin:0 0 .4rem; }
.hs-home-sub { color:#888; font-size:.88rem; margin-bottom:1.5rem; }
.hs-home-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:.8rem; margin-bottom:1.5rem; }
.hs-home-card { border:1px solid #e2e4ea; border-radius:8px; padding:.85rem 1rem; cursor:pointer; background:#fff; transition:box-shadow .15s, border-color .15s; }
.hs-home-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); border-color:#0066A6; }
.hs-home-card-icon { font-size:1.4rem; margin-bottom:.4rem; }
.hs-home-card-title { font-size:.85rem; font-weight:700; color:#1a1a2e; margin-bottom:.2rem; }
.hs-home-card-desc { font-size:.75rem; color:#888; line-height:1.4; }
.hs-quick-links { border-top:1px solid #e2e4ea; padding-top:1rem; }
.hs-ql-title { font-size:.78rem; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.06em; margin-bottom:.6rem; }
.hs-ql-grid { display:flex; flex-wrap:wrap; gap:.4rem; }
.hs-ql-btn { padding:.32rem .8rem; background:#f0f4ff; border:1px solid #c8d4ff; border-radius:4px; color:#2980b9; font-size:.78rem; cursor:pointer; }
.hs-ql-btn:hover { background:#dce8ff; }
</style>

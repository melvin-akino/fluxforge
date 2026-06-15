<template>
  <teleport to="body">
    <div class="pp-overlay" @click.self="$emit('cancel')">
      <div class="pp-dialog">
        <!-- Header -->
        <div class="pp-header">
          <div class="pp-header-title">Product Portfolio</div>
          <button class="pp-x" @click="$emit('cancel')">✕</button>
        </div>
        <div class="pp-sub">
          <strong>New Design</strong> — Select Topology and Family, then choose application type
        </div>

        <!-- Body: left tree + right filter -->
        <div class="pp-body">
          <!-- Left: product tree -->
          <div class="pp-left">
            <input class="pp-search" v-model="search" placeholder="Quick select (Enter to launch, Shift+Enter for XLS)"/>
            <div class="pp-tree">
              <template v-for="family in filteredFamilies" :key="family.name">
                <div class="pp-family" @click="toggleFamily(family.name)" :title="family.power ? family.name + ' — up to ' + family.power : family.name">
                  <span class="pp-caret">{{ openFamilies.has(family.name) ? '▼' : '▶' }}</span>
                  {{ family.name }}<span v-if="family.power" class="pp-power-badge">{{ family.power }}</span>
                </div>
                <template v-if="openFamilies.has(family.name)">
                  <div v-for="app in family.apps" :key="app"
                    class="pp-app"
                    :class="{'pp-app--sel': selectedApp===app}"
                    @click="selectedApp=app">
                    {{ app }}
                  </div>
                </template>
              </template>
              <div v-if="filteredFamilies.length===0" class="pp-empty">No matching designs</div>
            </div>
          </div>

          <!-- Right: product filter -->
          <div class="pp-right">
            <div class="pp-filter-title">Product Filter</div>
            <div class="pp-filter-form">
              <div class="pp-filter-row" v-for="f in FILTERS" :key="f.key">
                <label>{{ f.label }}<span v-if="f.req" class="pp-req">*</span></label>
                <select class="pp-fsel" v-model="filterVals[f.key]" @change="applyFilters">
                  <option value="">Any</option>
                  <option v-for="opt in f.options" :key="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
            <button class="pp-help-me" @click="helpMeChoose">HELP ME CHOOSE</button>
          </div>
        </div>

        <!-- Footer buttons -->
        <div class="pp-footer">
          <div class="pp-selected-label" v-if="selectedApp">
            Selected: <strong>{{ selectedApp }}</strong>
          </div>
          <div class="pp-selected-label" v-else>Select an application from the list</div>
          <div class="pp-footer-btns">
            <button class="pp-btn pp-btn-blue" :disabled="!selectedApp" @click="launchFluxForge">Launch</button>
            <button class="pp-btn pp-btn-blue" :disabled="!selectedApp" @click="launchPIXls">PI Xls</button>
            <button class="pp-btn pp-btn-outline" @click="openHelp">Help</button>
            <button class="pp-btn pp-btn-cancel" @click="$emit('cancel')">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
const emit = defineEmits(['cancel','launch','launch-xls']);

// ── Full product catalogue ────────────────────────────────────────────────────
// ── Product catalogue — only families with real design data ─────────────────
const ALL_FAMILIES = [
  // ── IFC ───────────────────────────────────────────────────────────
  { name:'IFC-CE', topology:'Flyback', power:'< 65 W', apps:[
    'IFC-CE Flyback (Universal Input)',
    'IFC-CE Flyback (European Input)',
    'IFC-CE USB-PD Flyback',
  ]},
  { name:'IFC-AE', topology:'Flyback', power:'< 65 W', apps:[
    'IFC-AE Flyback (Universal Input)',
    'IFC-AE Flyback (High Voltage DC)',
  ]},
  { name:'IFC-EP', topology:'Flyback', power:'< 100 W', apps:[
    'IFC-EP Flyback (Universal Input)',
    'IFC-EP Flyback (European Input)',
  ]},
  // ── HPFC-1 ──────────────────────────────────────────────────────────
  { name:'HPFC-1', topology:'Flyback', power:'< 230 W', apps:[
    'HPFC-1 Flyback (Universal Input)',
    'HPFC-1 Flyback (High Voltage DC)',
    'HPFC-1 Forward',
    'HPFC-1 Two Switch Forward',
  ]},
  // ── HPFC-2 ──────────────────────────────────────────────────────────
  { name:'HPFC-2', topology:'Flyback', power:'< 250 W', apps:[
    'HPFC-2 Flyback (Universal Input)',
    'HPFC-2 Flyback (European Input)',
    'HPFC-2 Forward',
  ]},
  // ── HPFC-3 ──────────────────────────────────────────────────────────
  { name:'HPFC-3', topology:'Flyback', power:'< 270 W', apps:[
    'HPFC-3 Flyback (Universal Input)',
    'HPFC-3 Forward',
  ]},
  // ── LPFC ───────────────────────────────────────────────────────────
  { name:'LPFC-1', topology:'Flyback', power:'< 25 W', apps:[
    'LPFC-1 Flyback (Universal Input)',
    'LPFC-1 Flyback (European Input)',
    'LPFC-1 Buck',
  ]},
  { name:'LPFC-2', topology:'Flyback', power:'< 30 W', apps:[
    'LPFC-2 Flyback (Universal Input)',
    'LPFC-2 Flyback (USB-PD)',
  ]},
  // ── PSC ───────────────────────────────────────────────────────────
  { name:'PSC-TN', topology:'Buck', power:'< 8 W', apps:[
    'PSC-TN Buck (Universal Input)',
    'PSC-TN Flyback',
    'PSC-TN Buck-Boost',
  ]},
  { name:'PSC-XT', topology:'Flyback', power:'< 12 W', apps:[
    'PSC-XT Flyback (Universal Input)',
    'PSC-XT Buck-Boost',
  ]},
  { name:'PSC-HP', topology:'Flyback', power:'< 165 W', apps:[
    'PSC-HP Flyback (Universal Input)',
    'PSC-HP Flyback (European Input)',
  ]},




  { name:'HPFC-1', topology:'Flyback', apps:[
    'HPFC-1 Flyback (Universal Input)','HPFC-1 Flyback (High Voltage DC)',
    'HPFC-1 Forward','HPFC-1 Two Switch Forward',
  ]},

  { name:'LPFC-1', topology:'Flyback', apps:[
    'LPFC-1 Flyback','LPFC-1 Buck',
  ]},

  { name:'LPFC-2', topology:'Flyback', apps:[
    'LPFC-2 Flyback',
  ]},
  { name:'PSC-TN', topology:'Buck', apps:[
    'PSC-TN Buck','PSC-TN Flyback',
  ]},
  { name:'PSC-XT', topology:'Flyback', apps:[
    'PSC-XT Flyback','PSC-XT Buck-Boost',
  ]},



];

const FILTERS = [
  { key:'application', label:'Application', req:true, options:['AC-DC Power Supply','LED Driver','USB PD Charger','Motor Drive','PFC','Battery Charger','Isolated Gate Driver'] },
  { key:'power',       label:'Output Power', req:true, options:['< 5W','5W–15W','15W–45W','45W–100W','100W–300W','> 300W'] },
  { key:'inputType',   label:'Input type',   req:false, options:['Universal (85–265VAC)','European (195–265VAC)','Japanese (85–132VAC)','High Voltage DC','Low Voltage DC'] },
  { key:'numOutputs',  label:'# of outputs', req:false, options:['1','2','3','4+'] },
  { key:'isolated',    label:'Isolated supply', req:false, options:['Yes','No'] },
  { key:'outputType',  label:'Output Type',  req:false, options:['CV Only','CC/CV','CC Only','CV+CC LED'] },
  { key:'topology',    label:'Topology',     req:false, options:['Flyback','Forward','Buck','Boost','Buck-Boost','PFC','Motor Drive'] },
  { key:'highPF',      label:'High PF / Low THD', req:false, options:['Yes','No'] },
];

const search       = ref('');
const openFamilies = ref(new Set(ALL_FAMILIES.slice(0,3).map(f=>f.name)));
const selectedApp  = ref('');

// Derive the full family object from selectedApp
const selectedFamily = computed(() => {
  if (!selectedApp.value) return null;
  return ALL_FAMILIES.find(f => f.apps.includes(selectedApp.value)) || null;
});

// Parse topology and inputSpec from the app string
function parseAppString(app) {
  // e.g. 'HPFC-1 Flyback (Universal Input)' → { topology:'Flyback', inputSpec:'Universal (85 - 265 V)' }
  const topoMap = { 'Flyback':'Flyback', 'Forward':'Forward', 'Buck':'Buck',
                    'Buck-Boost':'Buck-Boost', 'Two Switch Forward':'Two Switch Forward' };
  const specMap = {
    'Universal Input':    'Universal (85 - 265 V)',
    'European Input':     'Single 230V (195 - 265 V)',
    'High Voltage DC':    'High Voltage DC (127 - 400 V)',
    'USB-PD':             'Universal (85 - 265 V)',
  };
  let topology = 'Flyback';
  for (const [k,v] of Object.entries(topoMap)) {
    if (app.includes(k)) { topology = v; break; }
  }
  let inputSpec = 'Universal (85 - 265 V)';
  for (const [k,v] of Object.entries(specMap)) {
    if (app.includes(k)) { inputSpec = v; break; }
  }
  return { topology, inputSpec };
}
const filterVals   = ref(Object.fromEntries(FILTERS.map(f=>[f.key,''])));

// Open first family by default
selectedApp.value = ALL_FAMILIES[0].apps[0];

const filteredFamilies = computed(() => {
  const q = search.value.toLowerCase();
  const topoFilter = filterVals.value.topology;
  return ALL_FAMILIES.map(fam => ({
    ...fam,
    apps: fam.apps.filter(a => {
      if (q && !a.toLowerCase().includes(q) && !fam.name.toLowerCase().includes(q)) return false;
      if (topoFilter && !a.toLowerCase().includes(topoFilter.toLowerCase()) && !fam.topology.toLowerCase().includes(topoFilter.toLowerCase())) return false;
      return true;
    }),
  })).filter(fam => fam.apps.length > 0);
});

// Auto-open families when search is active
watch(search, (v) => {
  if (v) openFamilies.value = new Set(filteredFamilies.value.map(f=>f.name));
});

function toggleFamily(name) {
  const s = new Set(openFamilies.value);
  s.has(name) ? s.delete(name) : s.add(name);
  openFamilies.value = s;
}

function applyFilters() {
  // Topology filter drives the tree filtering
  // Auto-expand all when filter is active
  if (Object.values(filterVals.value).some(v=>v)) {
    openFamilies.value = new Set(filteredFamilies.value.map(f=>f.name));
    if (filteredFamilies.value.length > 0 && filteredFamilies.value[0].apps.length > 0) {
      selectedApp.value = filteredFamilies.value[0].apps[0];
    }
  }
}

function helpMeChoose() {
  // Pick based on power filter
  const power = filterVals.value.power;
  let suggestion = 'HPFC-1 Flyback (Universal Input)';
  if (power === '< 5W') suggestion = 'LPFC-1 Flyback';
  else if (power === '5W–15W') suggestion = 'LPFC-1 Flyback';
  else if (power === '15W–45W') suggestion = 'HPFC-1 Flyback (Universal Input)';
  else if (power === '45W–100W') suggestion = 'HPFC-1 Flyback (Universal Input)';
  else if (power === '100W–300W') suggestion = 'IFC-CE Flyback';
  else if (power === '> 300W') suggestion = 'IFC4-Pro ACF Flyback';
  selectedApp.value = suggestion;
  // Expand the right family
  const fam = ALL_FAMILIES.find(f=>f.apps.includes(suggestion));
  if (fam) openFamilies.value = new Set([...openFamilies.value, fam.name]);
}

function launchFluxForge() {
  if (!selectedApp.value) return;
  const fam = selectedFamily.value;
  const { topology, inputSpec } = parseAppString(selectedApp.value);
  emit('launch', {
    app:       selectedApp.value,
    family:    fam?.name    || '',
    productLine: fam?.name?.split('-')[0] || '',
    topology,
    inputSpec,
  });
}
function launchPIXls() {
  if (!selectedApp.value) return;
  const fam = selectedFamily.value;
  const { topology, inputSpec } = parseAppString(selectedApp.value);
  emit('launch-xls', {
    app:       selectedApp.value,
    family:    fam?.name    || '',
    productLine: fam?.name?.split('-')[0] || '',
    topology,
    inputSpec,
  });
}
function openHelp() {
  emit('cancel');
}
</script>

<style scoped>
.pp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9000; display:flex; align-items:center; justify-content:center; }
.pp-dialog  { background:#fff; border-radius:6px; width:680px; max-width:97vw; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.35); overflow:hidden; }
.pp-header  { display:flex; align-items:center; justify-content:space-between; padding:.65rem 1rem; background:#2c3e50; color:#fff; flex-shrink:0; }
.pp-header-title { font-size:.95rem; font-weight:700; }
.pp-x { background:none; border:none; color:#aaa; font-size:1rem; cursor:pointer; } .pp-x:hover { color:#fff; }
.pp-sub { padding:.45rem 1rem; background:#f8f9fb; border-bottom:1px solid #e2e4ea; font-size:.8rem; color:#555; flex-shrink:0; }
.pp-body { display:flex; flex:1; overflow:hidden; }

/* Left tree */
.pp-left { width:280px; flex-shrink:0; border-right:1px solid #e2e4ea; display:flex; flex-direction:column; overflow:hidden; }
.pp-search { padding:.4rem .6rem; border:none; border-bottom:1px solid #e2e4ea; font-size:.78rem; color:#333; width:100%; box-sizing:border-box; outline:none; background:#f8f9fb; }
.pp-tree { flex:1; overflow-y:auto; padding:.3rem 0; }
.pp-family { display:flex; align-items:center; gap:.4rem; padding:.28rem .7rem; font-size:.79rem; font-weight:700; color:#1B3A6B; cursor:pointer; user-select:none; }
.pp-family:hover { background:#f0f3ff; }
.pp-caret { font-size:.65rem; width:12px; color:#888; }
.pp-app { padding:.25rem .7rem .25rem 1.8rem; font-size:.77rem; color:#2980b9; cursor:pointer; }
.pp-app:hover { background:#eaf2ff; }
.pp-app--sel { background:#2980b9; color:#fff; font-weight:600; }
.pp-app--sel:hover { background:#2471a3; }
.pp-empty { padding:1rem; text-align:center; color:#aaa; font-size:.8rem; }
.pp-power-badge { margin-left:.45rem; font-size:.62rem; padding:.08rem .35rem; background:#eef2ff; color:#0066A6; border-radius:3px; font-weight:600; vertical-align:middle; }

/* Right filter */
.pp-right { flex:1; display:flex; flex-direction:column; padding:.6rem .8rem; overflow-y:auto; gap:.4rem; }
.pp-filter-title { font-size:.85rem; font-weight:700; color:#2c3e50; padding-bottom:.3rem; border-bottom:1px solid #e2e4ea; }
.pp-filter-form { display:flex; flex-direction:column; gap:.35rem; flex:1; }
.pp-filter-row { display:flex; flex-direction:column; gap:.12rem; }
.pp-filter-row label { font-size:.72rem; font-weight:600; color:#555; }
.pp-req { color:#e74c3c; margin-left:2px; }
.pp-fsel { padding:.28rem .4rem; border:1px solid #c8ccd8; border-radius:3px; font-size:.78rem; color:#1a1a2e; background:#fff; }
.pp-fsel:focus { outline:none; border-color:#2980b9; }
.pp-help-me { margin-top:auto; padding:.45rem; background:#ecf0f1; border:1px solid #bdc3c7; border-radius:3px; font-size:.78rem; font-weight:700; color:#2c3e50; cursor:pointer; letter-spacing:.05em; }
.pp-help-me:hover { background:#d5dbdb; }

/* Footer */
.pp-footer { display:flex; align-items:center; justify-content:space-between; padding:.6rem 1rem; background:#f8f9fb; border-top:1px solid #e2e4ea; flex-shrink:0; flex-wrap:wrap; gap:.4rem; }
.pp-selected-label { font-size:.78rem; color:#555; flex:1; }
.pp-footer-btns { display:flex; gap:.4rem; }
.pp-btn { padding:.35rem .85rem; border-radius:3px; font-size:.8rem; font-weight:600; cursor:pointer; border:1px solid transparent; }
.pp-btn:disabled { opacity:.4; cursor:not-allowed; }
.pp-btn-blue { background:#2980b9; color:#fff; border-color:#2471a3; }
.pp-btn-blue:hover:not(:disabled) { background:#2471a3; }
.pp-btn-outline { background:#fff; color:#2c3e50; border-color:#bdc3c7; }
.pp-btn-outline:hover { background:#ecf0f1; }
.pp-btn-cancel { background:#fff; color:#7f8c8d; border-color:#bdc3c7; }
.pp-btn-cancel:hover { background:#ecf0f1; }
</style>

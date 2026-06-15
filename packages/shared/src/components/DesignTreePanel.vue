<template>
  <div class="dtp-wrap">
    <!-- Search -->
    <div class="dtp-search-wrap">
      <input class="dtp-search" v-model="search" placeholder="🔍 Search tree…"/>
    </div>

    <!-- Tree nodes -->
    <div class="dtp-tree">
      <template v-for="grp in filteredTree" :key="grp.id">
        <div class="dtp-group" @click="toggleGroup(grp.id)">
          <span class="dtp-caret">{{ openGroups.has(grp.id) ? '▾' : '▸' }}</span>
          <span class="dtp-grp-icon">{{ grp.icon }}</span>
          <span class="dtp-grp-label">{{ grp.label }}</span>
        </div>
        <template v-if="openGroups.has(grp.id)">
          <div v-for="node in grp.nodes" :key="node.id"
            class="dtp-node"
            :class="{ 'dtp-node--active': activeNode?.id === node.id }"
            @click="openDialog(node)">
            <span class="dtp-node-icon">{{ node.icon }}</span>
            <span class="dtp-node-label">{{ node.label }}</span>
            <span v-if="node.refDes" class="dtp-ref-badge">{{ node.refDes }}</span>
          </div>
        </template>
      </template>
    </div>

    <!-- ── Component Dialog ─────────────────────────────────────────────── -->
    <teleport to="body">
      <div v-if="dialogOpen" class="dtp-overlay" @click.self="closeDialog">
        <div class="dtp-dialog">
          <!-- Header -->
          <div class="dtp-dlg-header">
            <span class="dtp-dlg-icon">{{ activeNode?.icon }}</span>
            <div>
              <div class="dtp-dlg-title">{{ activeNode?.label }}</div>
              <div class="dtp-dlg-sub" v-if="activeNode?.refDes">
                Ref: <strong>{{ activeNode.refDes }}</strong>
                <span v-if="currentComp" class="dtp-dlg-part"> · {{ currentComp.part }}</span>
              </div>
            </div>
            <button class="dtp-dlg-close" @click="closeDialog">✕</button>
          </div>

          <!-- Tabs -->
          <div class="dtp-dlg-tabs">
            <button v-for="t in dialogTabs" :key="t"
              class="dtp-dlg-tab" :class="{'dtp-dlg-tab--active': dlgTab===t}"
              @click="dlgTab=t">{{ t }}</button>
          </div>

          <!-- Tab: Component DB -->
          <div v-if="dlgTab==='Component DB'" class="dtp-dlg-body">
            <div class="dtp-db-toolbar">
              <input class="dtp-db-search" v-model="dbSearch" placeholder="Search parts…"/>
              <select class="dtp-db-sub" v-model="dbSubtype">
                <option value="">All subtypes</option>
                <option v-for="s in availableSubtypes" :key="s" :value="s">{{ s }}</option>
              </select>
              <span class="dtp-db-count">{{ filteredDb.length }} parts</span>
            </div>
            <div class="dtp-db-table-wrap">
              <table class="dtp-db-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Part #</th><th>Manufacturer</th>
                    <th>Value / Capacitance</th><th>Rated Voltage</th>
                    <th>ESR / Tol</th><th>Package</th>
                    <th>Temp (°C)</th><th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="dbLoading">
                    <td colspan="9" class="dtp-db-loading">Loading from database…</td>
                  </tr>
                  <tr v-else-if="filteredDb.length===0">
                    <td colspan="9" class="dtp-db-empty">No matching components found</td>
                  </tr>
                  <tr v-for="row in filteredDb" :key="row.id"
                    class="dtp-db-row"
                    :class="{'dtp-db-row--sel': selectedDbId===row.id}"
                    @click="selectedDbId=row.id">
                    <td><input type="radio" :checked="selectedDbId===row.id" @change="selectedDbId=row.id"/></td>
                    <td class="dtp-part">{{ row.part }}</td>
                    <td>{{ row.mfr || '—' }}</td>
                    <td>{{ fmtValue(row) }}</td>
                    <td>{{ fmtVoltage(row) }}</td>
                    <td>{{ fmtEsrTol(row) }}</td>
                    <td>{{ row.package || '—' }}</td>
                    <td>{{ row.rated_temp != null ? row.rated_temp+'°C' : row.temp != null ? row.temp+'°C' : '—' }}</td>
                    <td>{{ row.cost ? '$'+Number(row.cost).toFixed(2) : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="selectedDbPart" class="dtp-db-preview">
              <span class="dtp-preview-pn">{{ selectedDbPart.part }}</span>
              <span class="dtp-preview-sep">—</span>
              <span>{{ selectedDbPart.mfr }}</span>
              <span v-if="selectedDbPart.rated_voltage||selectedDbPart.voltage" class="dtp-preview-chip">{{ (selectedDbPart.rated_voltage||selectedDbPart.voltage) }}V</span>
              <span v-if="selectedDbPart.capacitance||selectedDbPart.value" class="dtp-preview-chip">{{ selectedDbPart.capacitance||selectedDbPart.value }}{{ selectedDbPart.uom||selectedDbPart.unit }}</span>
              <span v-if="selectedDbPart.esr" class="dtp-preview-chip">ESR {{ selectedDbPart.esr }}Ω</span>
              <span v-if="selectedDbPart.package" class="dtp-preview-chip">{{ selectedDbPart.package }}</span>
              <span v-if="selectedDbPart.cost" class="dtp-preview-chip">${{ Number(selectedDbPart.cost).toFixed(2) }}</span>
              <span v-if="selectedDbPart.notes" class="dtp-preview-note">{{ selectedDbPart.notes }}</span>
            </div>
          </div>

          <!-- Tab: Parameters -->
          <div v-if="dlgTab==='Parameters'" class="dtp-dlg-body dtp-params">
            <template v-if="currentComp">
              <div v-for="(val, key) in editablePrams" :key="key" class="dtp-param-row">
                <label class="dtp-param-label">{{ key }}</label>
                <input class="dtp-param-input"
                  :type="typeof val === 'number' ? 'number' : 'text'"
                  v-model="editablePrams[key]"
                  :step="typeof val === 'number' ? 'any' : undefined"/>
              </div>
              <div class="dtp-param-row">
                <label class="dtp-param-label">Frozen</label>
                <input type="checkbox" v-model="editFrozen" class="dtp-param-check"/>
                <span class="dtp-param-hint">Frozen parts keep blue ref designators</span>
              </div>
            </template>
            <div v-else class="dtp-params-empty">No component assigned to this node.</div>
          </div>

          <!-- Tab: Notes -->
          <div v-if="dlgTab==='Notes'" class="dtp-dlg-body">
            <textarea class="dtp-notes-area" v-model="editNotes" placeholder="Add design notes…"></textarea>
          </div>

          <!-- Tab: Compatible Parts -->
          <div v-if="dlgTab==='Compatible'" class="dtp-dlg-body">
            <p class="dtp-compat-hint">
              These parts are compatible with <strong>{{ currentComp?.part }}</strong>. Click one to apply it instead.
            </p>
            <div v-if="loadingCompat" class="dtp-db-loading">Loading…</div>
            <div v-else-if="compatParts.length===0" class="dtp-db-empty">
              No compatible parts linked. Use the Components Manager to add compatible relationships.
            </div>
            <div v-else class="dtp-compat-list">
              <div v-for="cp in compatParts" :key="cp.id"
                class="dtp-compat-row"
                :class="{'dtp-compat-row--sel': selectedCompatId===cp.id}"
                @click="selectedCompatId=cp.id">
                <input type="radio" :checked="selectedCompatId===cp.id" @change="selectedCompatId=cp.id"/>
                <span class="dtp-part">{{ cp.part }}</span>
                <span style="color:#555;font-size:.75rem">{{ cp.mfr }}</span>
                <span style="color:#777;font-size:.72rem">{{ cp.value != null ? cp.value+' '+(cp.unit||'') : '' }}</span>
                <span style="color:#aaa;font-size:.7rem;font-style:italic">{{ cp.reason }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="dtp-dlg-footer">
            <button class="dtp-btn-cancel" @click="closeDialog">Cancel</button>
            <button v-if="dlgTab==='Component DB' && selectedDbId" class="dtp-btn-use" @click="applyDbPart">
              Use {{ selectedDbPart?.part }}
            </button>
            <button v-if="dlgTab==='Compatible' && selectedCompatId" class="dtp-btn-use dtp-btn-compat" @click="applyCompatPart">
              Use {{ compatParts.find(p=>p.id===selectedCompatId)?.part }}
            </button>
            <button class="dtp-btn-apply" @click="applyChanges">Apply</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { applyDbComponent } from '../data/udsSchema.js';
import { api } from '../api/index.js';

const props = defineProps({ uds: Object });
const emit  = defineEmits(['update:uds']);

// ── Tree definition ─────────────────────────────────────────────────────────
const TREE = [
  { id:'specs', icon:'📋', label:'Specifications', nodes:[
    { id:'input',   icon:'⚡', label:'Input',           refDes:null },
    { id:'outputs', icon:'🔌', label:'Outputs',          refDes:null },
    { id:'safety',  icon:'🛡️', label:'Safety and Thermal', refDes:null },
  ]},
  { id:'design', icon:'⚙️', label:'Design', nodes:[
    { id:'options', icon:'🔧', label:'Options',     refDes:null },
    { id:'keyparams',icon:'📊', label:'Key Parameters', refDes:null },
  ]},
  { id:'input_section', icon:'🔌', label:'Input Section', nodes:[
    { id:'F1',  icon:'⚡', label:'Fuse / Surge',    refDes:'F1',  dbType:'fuse',      dbSubtype:'fuse' },
    { id:'RT1', icon:'🌡️', label:'Thermistor',       refDes:'RT1', dbType:'resistor',  dbSubtype:'thermistor' },
    { id:'L1',  icon:'〰️', label:'EMI Filter',       refDes:'L1',  dbType:'inductor',  dbSubtype:'emi_differential' },
    { id:'BR1', icon:'🔲', label:'Bridge Rectifier', refDes:'BR1', dbType:'diode',     dbSubtype:'bridge' },
    { id:'C1',  icon:'⚡', label:'Input Cap (C1)',   refDes:'C1',  dbType:'capacitor', dbSubtype:'electrolytic_bulk' },
    { id:'C2',  icon:'⚡', label:'Bus Cap (C2)',      refDes:'C2',  dbType:'capacitor', dbSubtype:'electrolytic_bulk' },
    { id:'C3',  icon:'⚡', label:'EMI Cap (C3)',      refDes:'C3',  dbType:'capacitor', dbSubtype:'emi_x2' },
    { id:'VR1', icon:'⚡', label:'Varistor (VR1)',    refDes:'VR1', dbType:'fuse',      dbSubtype:'varistor' },
  ]},
  { id:'pi_device', icon:'🔧', label:'PI Device', nodes:[
    { id:'U1',  icon:'🔵', label:'PI Device (U1)',    refDes:'U1',  dbType:'ic',        dbSubtype:'topswitch' },
    { id:'R4',  icon:'📎', label:'Startup R4',         refDes:'R4',  dbType:'resistor',  dbSubtype:'startup' },
    { id:'R5',  icon:'📎', label:'Startup R5',         refDes:'R5',  dbType:'resistor',  dbSubtype:'startup' },
    { id:'R6',  icon:'📎', label:'ILIM R6',            refDes:'R6',  dbType:'resistor',  dbSubtype:'feedback' },
    { id:'C4',  icon:'⚡', label:'Bypass C4',          refDes:'C4',  dbType:'capacitor', dbSubtype:'ceramic' },
    { id:'C5',  icon:'⚡', label:'Bypass C5',          refDes:'C5',  dbType:'capacitor', dbSubtype:'ceramic' },
  ]},
  { id:'transformer', icon:'〰️', label:'Transformer', nodes:[
    { id:'T1',  icon:'🔁', label:'Core (T1)',          refDes:'T1',  dbType:'inductor',  dbSubtype:'transformer_core' },
    { id:'D1',  icon:'➡️', label:'Clamp Diode (D1)',   refDes:'D1',  dbType:'diode',     dbSubtype:'clamp' },
    { id:'R3',  icon:'📎', label:'Clamp Resistor R3',  refDes:'R3',  dbType:'resistor',  dbSubtype:'snubber' },
  ]},
  { id:'output', icon:'🔌', label:'Output Stage', nodes:[
    { id:'D3',  icon:'➡️', label:'Output Diode (D3)',  refDes:'D3',  dbType:'diode',     dbSubtype:'schottky_output' },
    { id:'D2',  icon:'➡️', label:'Aux Diode (D2)',     refDes:'D2',  dbType:'diode',     dbSubtype:'schottky_output' },
    { id:'C9',  icon:'⚡', label:'Output Cap C9',      refDes:'C9',  dbType:'capacitor', dbSubtype:'electrolytic_output' },
    { id:'C10', icon:'⚡', label:'Output Cap C10',     refDes:'C10', dbType:'capacitor', dbSubtype:'electrolytic_output' },
    { id:'C11', icon:'⚡', label:'Output Cap C11',     refDes:'C11', dbType:'capacitor', dbSubtype:'electrolytic_output' },
    { id:'C7',  icon:'⚡', label:'Snubber Cap C7',     refDes:'C7',  dbType:'capacitor', dbSubtype:'film_snubber' },
    { id:'R10', icon:'📎', label:'Snubber R10',        refDes:'R10', dbType:'resistor',  dbSubtype:'snubber' },
  ]},
  { id:'feedback', icon:'🔄', label:'Feedback', nodes:[
    { id:'U3',  icon:'🔵', label:'TL431 (U3)',         refDes:'U3',  dbType:'ic',        dbSubtype:'tl431' },
    { id:'U2A', icon:'💡', label:'Optocoupler (U2A)',  refDes:'U2A', dbType:'ic',        dbSubtype:'optocoupler' },
    { id:'R11', icon:'📎', label:'Upper FB R11',       refDes:'R11', dbType:'resistor',  dbSubtype:'feedback' },
    { id:'R12', icon:'📎', label:'Lower FB R12',       refDes:'R12', dbType:'resistor',  dbSubtype:'feedback' },
    { id:'R13', icon:'📎', label:'Opto R13',           refDes:'R13', dbType:'resistor',  dbSubtype:'feedback' },
    { id:'C12', icon:'⚡', label:'FB Cap C12',         refDes:'C12', dbType:'capacitor', dbSubtype:'ceramic' },
    { id:'C13', icon:'⚡', label:'Bias Cap C13',       refDes:'C13', dbType:'capacitor', dbSubtype:'bias' },
  ]},
];

// ── State ───────────────────────────────────────────────────────────────────
const search     = ref('');
const openGroups = ref(new Set(TREE.map(g => g.id)));
const activeNode = ref(null);
const dialogOpen = ref(false);
const dlgTab     = ref('Component DB');

// DB state
const dbComponents = ref([]);
const dbLoading    = ref(false);
const dbSearch     = ref('');
const dbSubtype    = ref('');
const selectedDbId   = ref(null);

// Compatible tab state
const compatParts      = ref([]);
const loadingCompat    = ref(false);
const selectedCompatId = ref(null);

// Edit state (Parameters tab)
const editablePrams = ref({});
const editFrozen    = ref(false);
const editNotes     = ref('');

// ── Computed ─────────────────────────────────────────────────────────────────
const filteredTree = computed(() => {
  if (!search.value) return TREE;
  const q = search.value.toLowerCase();
  return TREE.map(g => ({
    ...g,
    nodes: g.nodes.filter(n => n.label.toLowerCase().includes(q) || (n.refDes||'').toLowerCase().includes(q)),
  })).filter(g => g.nodes.length > 0);
});

const currentComp = computed(() => {
  const ref = activeNode.value?.refDes;
  return ref ? props.uds?.components?.[ref] : null;
});

const dialogTabs = computed(() => {
  if (activeNode.value?.refDes) return ['Component DB', 'Compatible', 'Parameters', 'Notes'];
  return ['Parameters', 'Notes'];
});

const availableSubtypes = computed(() => {
  const s = new Set(dbComponents.value.map(r => r.subtype).filter(Boolean));
  return [...s].sort();
});

const filteredDb = computed(() => {
  return dbComponents.value.filter(r => {
    if (dbSubtype.value && r.subtype !== dbSubtype.value) return false;
    if (dbSearch.value) {
      const q = dbSearch.value.toLowerCase();
      return (r.part||'').toLowerCase().includes(q) ||
             (r.mfr||'').toLowerCase().includes(q) ||
             (r.notes||'').toLowerCase().includes(q);
    }
    return true;
  });
});

const selectedDbPart = computed(() => filteredDb.value.find(r => r.id === selectedDbId.value));

// ── Methods ──────────────────────────────────────────────────────────────────
function toggleGroup(id) {
  const s = new Set(openGroups.value);
  s.has(id) ? s.delete(id) : s.add(id);
  openGroups.value = s;
}

async function openDialog(node) {
  activeNode.value = node;
  dialogOpen.value = true;
  dlgTab.value = node.refDes ? 'Component DB' : 'Parameters';
  dbSearch.value  = '';
  dbSubtype.value = node.dbSubtype || '';
  selectedDbId.value = null;

  // Pre-fill editable params from current UDS component
  const c = props.uds?.components?.[node.refDes];
  if (c) {
    editablePrams.value = {
      part: c.part || '',
      value: c.value ?? '',
      unit: c.unit || '',
      voltage: c.voltage ?? '',
      current: c.current ?? '',
      esr: c.esr ?? '',
      package: c.package || '',
    };
    editFrozen.value = !!c.frozen;
    editNotes.value  = c.notes || '';
  }

  // Watch tab switch to load compatible
  const stopWatch = watch(dlgTab, async (tab) => {
    if (tab === 'Compatible' && activeNode.value?.refDes) {
      const comp = props.uds?.components?.[activeNode.value.refDes];
      if (comp) {
        loadingCompat.value = true;
        try {
          // Find the DB component by part number to get its id
          const matches = dbComponents.value.filter(r => r.part === comp.part);
          if (matches.length > 0) {
            compatParts.value = await api.getCompatible(matches[0].id);
          } else {
            // Load all from type/subtype and find match
            const all = await api.getComponents({ type: node.dbType });
            const match = all.find(r => r.part === comp.part);
            if (match) compatParts.value = await api.getCompatible(match.id);
          }
        } catch { compatParts.value = []; }
        finally { loadingCompat.value = false; }
      }
    }
  });
  // Clean up watch when dialog closes - handled in closeDialog

  // Load DB components — fetch whole type so user can browse all subtypes
  if (node.dbType) {
    dbLoading.value = true;
    try {
      // Load all components of this type; subtype dropdown lets user filter
      dbComponents.value = await api.getComponents({ type: node.dbType });
      // Pre-select the node's own subtype in the filter
      dbSubtype.value = node.dbSubtype || '';
    } catch {
      dbComponents.value = [];
    } finally {
      dbLoading.value = false;
    }
  }
}

// ── Display helpers ──────────────────────────────────────────────────────────
function fmtValue(row) {
  // Use capacitance field first (new schema), fall back to value+unit
  const v = row.capacitance ?? row.value;
  const u = row.uom || row.unit || '';
  if (v != null) return v + (u ? ' ' + u : '');
  if (row.power != null) return row.power + ' W';
  if (row.current != null) return row.current + ' A';
  return '—';
}
function fmtVoltage(row) {
  if (row.rated_voltage != null) return row.rated_voltage + 'V';
  if (row.voltage != null) return row.voltage + 'V';
  if (row.voltage_ac != null) return row.voltage_ac + 'Vac';
  if (row.vf != null) return 'Vf ' + row.vf + 'V';
  return '—';
}
function fmtEsrTol(row) {
  if (row.esr != null) return row.esr + ' Ω';
  if (row.tol != null) return '±' + row.tol + '%';
  if (row.dcr != null) return row.dcr + ' Ω DCR';
  if (row.ctr != null) return 'CTR ' + row.ctr + '%';
  return '—';
}

function applyCompatPart() {
  if (!selectedCompatId.value || !activeNode.value?.refDes) return;
  const cp = compatParts.value.find(p => p.id === selectedCompatId.value);
  if (!cp) return;
  const ref = activeNode.value.refDes;
  const existing = props.uds?.components?.[ref] || { ref };
  const updated = applyDbComponent(existing, cp);
  emitComponentUpdate(ref, updated);
  // Sync editable params
  editablePrams.value = {
    part: updated.part || '', value: updated.value ?? '',
    unit: updated.unit || '', voltage: updated.voltage ?? '',
    current: updated.current ?? '', esr: updated.esr ?? '', package: updated.package || '',
  };
  dlgTab.value = 'Parameters';
}

function closeDialog() {
  dialogOpen.value = false;
  activeNode.value = null;
}

function applyDbPart() {
  if (!selectedDbPart.value || !activeNode.value?.refDes) return;
  const ref = activeNode.value.refDes;
  const existing = props.uds?.components?.[ref] || { ref, role: ref };
  const updated = applyDbComponent(existing, selectedDbPart.value);
  emitComponentUpdate(ref, updated);
  dlgTab.value = 'Parameters';
  // Sync editable params
  editablePrams.value = {
    part: updated.part || '',
    value: updated.value ?? '',
    unit: updated.unit || '',
    voltage: updated.voltage ?? '',
    current: updated.current ?? '',
    esr: updated.esr ?? '',
    package: updated.package || '',
  };
}

function applyChanges() {
  const ref = activeNode.value?.refDes;
  if (ref) {
    const existing = props.uds?.components?.[ref] || { ref };
    const updated = {
      ...existing,
      ...editablePrams.value,
      frozen: editFrozen.value,
      notes: editNotes.value,
    };
    emitComponentUpdate(ref, updated);
  }
  closeDialog();
}

function emitComponentUpdate(refDes, comp) {
  const newUds = {
    ...props.uds,
    components: {
      ...props.uds?.components,
      [refDes]: comp,
    },
  };
  emit('update:uds', newUds);
}
// Expose openByRefDes for external calls (e.g. from schematic click)
function openByRefDes(refDes) {
  // Find the node in TREE that matches refDes
  for (const group of TREE) {
    const node = group.nodes.find(n => n.refDes === refDes);
    if (node) {
      // Expand the group
      openGroups.value = new Set([...openGroups.value, group.id]);
      openDialog(node);
      return;
    }
  }
}

defineExpose({ openByRefDes });
</script>

<style scoped>
.dtp-wrap { display:flex; flex-direction:column; width:210px; min-width:210px; border-right:1px solid #e2e4ea; background:#fafbfd; overflow:hidden; }
.dtp-search-wrap { padding:.4rem .5rem; border-bottom:1px solid #e8eaf0; }
.dtp-search { width:100%; box-sizing:border-box; padding:.3rem .5rem; border:1px solid #d0d3de; border-radius:4px; font-size:.75rem; }
.dtp-tree { flex:1; overflow-y:auto; padding:.3rem 0; }
.dtp-group { display:flex; align-items:center; gap:.3rem; padding:.3rem .6rem; cursor:pointer; user-select:none; font-size:.78rem; font-weight:700; color:#444; }
.dtp-group:hover { background:#f0f3ff; }
.dtp-caret { font-size:.65rem; color:#888; width:10px; }
.dtp-grp-icon { font-size:.85rem; }
.dtp-node { display:flex; align-items:center; gap:.3rem; padding:.25rem .6rem .25rem 1.4rem; cursor:pointer; font-size:.74rem; color:#555; }
.dtp-node:hover { background:#eef2ff; color:#0066A6; }
.dtp-node--active { background:#eef2ff; color:#0066A6; font-weight:600; }
.dtp-node-icon { font-size:.78rem; }
.dtp-ref-badge { margin-left:auto; background:#e8eeff; color:#0066A6; border-radius:3px; padding:0 .3rem; font-size:.65rem; font-weight:700; font-family:monospace; }

/* ── Dialog ── */
.dtp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:9000; display:flex; align-items:center; justify-content:center; }
.dtp-dialog { background:#fff; border-radius:10px; width:680px; max-width:95vw; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.22); overflow:hidden; }
.dtp-dlg-header { display:flex; align-items:flex-start; gap:.6rem; padding:.85rem 1rem; background:#f4f6fb; border-bottom:1px solid #e2e4ea; }
.dtp-dlg-icon { font-size:1.4rem; }
.dtp-dlg-title { font-size:.95rem; font-weight:700; color:#1a1a2e; }
.dtp-dlg-sub { font-size:.75rem; color:#888; margin-top:.1rem; }
.dtp-dlg-part { color:#0066A6; }
.dtp-dlg-close { margin-left:auto; background:none; border:none; font-size:1.1rem; cursor:pointer; color:#888; }
.dtp-dlg-tabs { display:flex; border-bottom:1px solid #e2e4ea; }
.dtp-dlg-tab { padding:.5rem 1rem; border:none; background:none; cursor:pointer; font-size:.8rem; color:#888; border-bottom:2px solid transparent; }
.dtp-dlg-tab--active { color:#0066A6; border-bottom-color:#0066A6; font-weight:600; }
.dtp-dlg-body { flex:1; overflow:auto; padding:.75rem 1rem; }

/* DB table */
.dtp-db-toolbar { display:flex; gap:.5rem; margin-bottom:.5rem; align-items:center; }
.dtp-db-search { flex:1; padding:.3rem .5rem; border:1px solid #d0d3de; border-radius:4px; font-size:.78rem; }
.dtp-db-sub { padding:.3rem .4rem; border:1px solid #d0d3de; border-radius:4px; font-size:.75rem; }
.dtp-db-count { font-size:.72rem; color:#888; white-space:nowrap; }
.dtp-db-table-wrap { max-height:260px; overflow-y:auto; border:1px solid #e2e4ea; border-radius:5px; }
.dtp-db-table { width:100%; border-collapse:collapse; font-size:.75rem; }
.dtp-db-table th { position:sticky; top:0; background:#24467A; padding:.35rem .55rem; text-align:left; font-size:.72rem; color:#e8ecff; font-weight:700; letter-spacing:.03em; border-bottom:2px solid #3d4570; }
.dtp-db-table td { padding:.3rem .55rem; border-bottom:1px solid #e8eaf0; color:#1a1a2e; font-size:.78rem; }
.dtp-db-row:hover { background:#f0f4ff; cursor:pointer; }
.dtp-db-row--sel { background:#eef2ff; }
.dtp-db-loading,.dtp-db-empty { text-align:center; padding:1rem; color:#aaa; font-size:.8rem; }
.dtp-part { font-family:monospace; font-weight:700; color:#1a1a2e; }
.dtp-db-preview { margin-top:.5rem; padding:.4rem .6rem; background:#f0f4ff; border-radius:5px; font-size:.75rem; color:#444; }

/* Parameters tab */
.dtp-params { display:flex; flex-direction:column; gap:.4rem; }
.dtp-param-row { display:flex; align-items:center; gap:.5rem; }
.dtp-param-label { width:90px; font-size:.75rem; color:#666; flex-shrink:0; }
.dtp-param-input { flex:1; padding:.28rem .5rem; border:1px solid #d0d3de; border-radius:4px; font-size:.78rem; }
.dtp-param-check { width:16px; height:16px; }
.dtp-param-hint { font-size:.7rem; color:#aaa; }
.dtp-params-empty { color:#aaa; font-size:.82rem; text-align:center; padding:1.5rem; }

/* Notes */
.dtp-preview-pn   { font-weight:700; color:#1a3ab0; font-family:monospace; }
.dtp-preview-sep  { color:#aaa; margin:0 .25rem; }
.dtp-preview-chip { display:inline-block; background:#eef2ff; color:#2d4080; border:1px solid #c8d4ff; border-radius:3px; padding:.05rem .35rem; font-size:.7rem; font-weight:600; margin-left:.3rem; }
.dtp-preview-note { display:block; color:#555; font-size:.72rem; font-style:italic; margin-top:.2rem; }
.dtp-compat-hint { font-size:.75rem; color:#444; margin-bottom:.7rem; padding:.4rem .6rem; background:#f0f4ff; border-radius:5px; border-left:3px solid #0066A6; }
.dtp-compat-list { display:flex; flex-direction:column; gap:.25rem; max-height:280px; overflow-y:auto; border:1px solid #e2e4ea; border-radius:5px; padding:.35rem; }
.dtp-compat-row { display:flex; align-items:center; gap:.5rem; padding:.3rem .5rem; border-radius:4px; cursor:pointer; font-size:.78rem; }
.dtp-compat-row:hover { background:#f0f4ff; }
.dtp-compat-row--sel { background:#eef2ff; outline:1.5px solid #0066A6; }
.dtp-btn-compat { background:#38A169; border-color:#047857; }
.dtp-btn-compat:hover { background:#047857; }
.dtp-notes-area { width:100%; min-height:180px; padding:.5rem; border:1px solid #d0d3de; border-radius:5px; font-size:.82rem; resize:vertical; box-sizing:border-box; }

/* Footer */
.dtp-dlg-footer { display:flex; justify-content:flex-end; gap:.5rem; padding:.65rem 1rem; border-top:1px solid #e2e4ea; background:#f8f9fb; }
.dtp-btn-cancel { padding:.38rem .9rem; border:1px solid #d0d3de; border-radius:5px; background:#fff; font-size:.8rem; cursor:pointer; }
.dtp-btn-use { padding:.38rem .9rem; border:none; border-radius:5px; background:#38A169; color:#fff; font-size:.8rem; cursor:pointer; font-weight:600; }
.dtp-btn-apply { padding:.38rem 1.1rem; border:none; border-radius:5px; background:#0066A6; color:#fff; font-size:.8rem; cursor:pointer; font-weight:600; }
</style>

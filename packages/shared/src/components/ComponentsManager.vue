<template>
  <div class="cdb-root">
    <!-- ══ Title Bar ══════════════════════════════════════════════════════════ -->
    <div class="cdb-title-bar">
      <span class="cdb-title">Component Database</span>
    </div>

    <!-- ══ Category Tabs — Row 1 ═════════════════════════════════════════════ -->
    <div class="cdb-tabs-wrap">
      <div class="cdb-tabs-row">
        <button v-for="cat in CATEGORIES_ROW1" :key="cat.key"
          class="cdb-tab" :class="{'cdb-tab--active': activeCat===cat.key}"
          @click="selectCat(cat.key)">{{ cat.label }}</button>
      </div>
      <div class="cdb-tabs-row cdb-tabs-row2">
        <button v-for="cat in CATEGORIES_ROW2" :key="cat.key"
          class="cdb-tab" :class="{'cdb-tab--active': activeCat===cat.key}"
          @click="selectCat(cat.key)">{{ cat.label }}</button>
      </div>
    </div>

    <!-- ══ Table ══════════════════════════════════════════════════════════════ -->
    <div class="cdb-table-outer">
      <table class="cdb-table">
        <thead>
          <tr class="cdb-thead-row">
            <th class="cdb-th cdb-th-sel"></th>
            <th class="cdb-th" v-for="col in visibleColumns" :key="col.key"
              @click="sortBy(col.key)">
              {{ col.label }}
              <span class="cdb-sort-icon">{{ sortKey===col.key ? (sortAsc?'▲':'▼') : '' }}</span>
            </th>
          </tr>
          <!-- Column filter row -->
          <tr class="cdb-filter-row">
            <td class="cdb-td-sel"></td>
            <td v-for="col in visibleColumns" :key="'f-'+col.key" class="cdb-td-filter">
              <template v-if="col.filterable">
                <select v-if="colOptions(col.key).length" class="cdb-col-sel"
                  v-model="colFilters[col.key]">
                  <option value="">▾</option>
                  <option v-for="opt in colOptions(col.key)" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-else class="cdb-col-inp" v-model="colFilters[col.key]" placeholder="▾"/>
              </template>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td :colspan="visibleColumns.length+1" class="cdb-state">Loading…</td></tr>
          <tr v-else-if="paginated.length===0"><td :colspan="visibleColumns.length+1" class="cdb-state">No matching components</td></tr>
          <tr v-for="row in paginated" :key="row.id"
            class="cdb-row" :class="{'cdb-row--sel': selectedId===row.id}"
            @click="selectedId=row.id">
            <td class="cdb-td-sel">
              <input type="radio" :checked="selectedId===row.id" @change="selectedId=row.id"/>
            </td>
            <td v-for="col in visibleColumns" :key="'c-'+col.key" class="cdb-td"
              :class="col.key==='part'?'cdb-td-part':''">
              {{ fmtCell(row, col) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ Bottom toolbar ═════════════════════════════════════════════════════ -->
    <div class="cdb-bottom">
      <div class="cdb-bottom-left">
        <span class="cdb-count">{{ filtered.length }} records</span>
        <div class="cdb-pagination">
          <button class="cdb-pg-btn" :disabled="page===1" @click="page--">◀</button>
          <span class="cdb-pg-info">{{ page }} / {{ totalPages }}</span>
          <button class="cdb-pg-btn" :disabled="page>=totalPages" @click="page++">▶</button>
          <select class="cdb-pg-sel" v-model.number="pageSize">
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>
      <div class="cdb-bottom-row">
        <button class="cdb-btn cdb-btn-blue" @click="openFields">Fields</button>
        <button class="cdb-btn cdb-btn-blue" @click="doImport">Import</button>
        <button class="cdb-btn cdb-btn-blue" @click="doExport">Export</button>
        <button class="cdb-btn cdb-btn-mid" @click="openSetAssign">Assign Components to a Set</button>
        <button class="cdb-btn cdb-btn-blue" @click="openAdd">Add…</button>
        <button class="cdb-btn cdb-btn-blue" @click="openView">View</button>
      </div>
      <div class="cdb-bottom-row2">
        <button class="cdb-btn cdb-btn-mid" :disabled="!selectedId" @click="confirmDelete">Delete</button>
        <button class="cdb-btn cdb-btn-mid" @click="closeAll">Close</button>
        <button class="cdb-btn cdb-btn-mid" @click="openHelp">Help</button>
      </div>
    </div>

    <!-- ══ ADD / EDIT DIALOG ═════════════════════════════════════════════════ -->
    <teleport to="body">
      <div v-if="editOpen" class="cdb-overlay" @click.self="editOpen=false">
        <div class="cdb-dlg cdb-dlg--edit">
          <div class="cdb-dlg-hd">
            <span>{{ editMode==='create' ? '＋ Add New Component' : '✎ Edit Component' }}</span>
            <button class="cdb-dlg-x" @click="editOpen=false">✕</button>
          </div>
          <div class="cdb-edit-layout">
            <!-- Left: form fields -->
            <div class="cdb-dlg-body cdb-dlg-scroll">
              <!-- Validation errors -->
              <div v-if="saveError" class="cdb-save-error">⚠ {{ saveError }}</div>

              <div class="cdb-section-hd">Identity</div>
              <div class="cdb-form cdb-form--2col">
                <div class="cdb-field" v-for="f in EDIT_FIELDS.filter(x=>['library','qualification','type','subtype','part','mfr','mount_type','package'].includes(x.key))" :key="f.key">
                  <label :class="{'cdb-req': f.key==='part'||f.key==='type'}">{{ f.label }}</label>
                  <select v-if="f.opts" class="cdb-finp" v-model="draft[f.key]">
                    <option value="">— select —</option>
                    <option v-for="o in f.opts" :key="o">{{ o }}</option>
                  </select>
                  <input v-else class="cdb-finp"
                    :class="{'cdb-finp--err': (f.key==='part'||f.key==='type') && !draft[f.key]}"
                    :placeholder="f.key==='part'?'e.g. HPFC-1-001':f.key==='mfr'?'e.g. Generic':''"
                    type="text" v-model="draft[f.key]"/>
                </div>
              </div>

              <div class="cdb-section-hd">Electrical Parameters</div>
              <div class="cdb-form cdb-form--3col">
                <div class="cdb-field" v-for="f in EDIT_FIELDS.filter(x=>['capacitance','uom','tol','rated_voltage','voltage','ripple','esr','current','power','freq','vf','vce','vref'].includes(x.key))" :key="f.key">
                  <label>{{ f.label }}</label>
                  <select v-if="f.opts" class="cdb-finp" v-model="draft[f.key]">
                    <option value="">— select —</option>
                    <option v-for="o in f.opts" :key="o">{{ o }}</option>
                  </select>
                  <input v-else class="cdb-finp" type="number" step="any" v-model.number="draft[f.key]"/>
                </div>
              </div>

              <div class="cdb-section-hd">Physical & Thermal</div>
              <div class="cdb-form cdb-form--3col">
                <div class="cdb-field" v-for="f in EDIT_FIELDS.filter(x=>['temp_coeff','temp_min','rated_temp','rated_life','size_l','size_w'].includes(x.key))" :key="f.key">
                  <label>{{ f.label }}</label>
                  <select v-if="f.opts" class="cdb-finp" v-model="draft[f.key]">
                    <option value="">— select —</option>
                    <option v-for="o in f.opts" :key="o">{{ o }}</option>
                  </select>
                  <input v-else class="cdb-finp" :type="f.num?'number':'text'" step="any" v-model="draft[f.key]"/>
                </div>
              </div>

              <div class="cdb-section-hd">Cost & Notes</div>
              <div class="cdb-form cdb-form--2col">
                <div class="cdb-field">
                  <label>Cost ($)</label>
                  <input class="cdb-finp" type="number" step="0.001" v-model.number="draft.cost" placeholder="0.00"/>
                </div>
                <div class="cdb-field cdb-field--full">
                  <label>Notes</label>
                  <textarea class="cdb-finp cdb-ta" v-model="draft.notes" rows="2" placeholder="Optional notes…"/>
                </div>
              </div>
            </div>

            <!-- Right: live preview -->
            <div class="cdb-edit-preview">
              <div class="cdb-prev-title">Preview</div>
              <div class="cdb-prev-card">
                <div class="cdb-prev-pn">{{ draft.part || '—' }}</div>
                <div class="cdb-prev-type" v-if="draft.type">
                  <span class="cdb-type-badge" :class="'cdb-type-'+draft.type">{{ draft.subtype || draft.type }}</span>
                </div>
                <div class="cdb-prev-mfr">{{ draft.mfr || 'Manufacturer' }}</div>
                <div class="cdb-prev-pkg">{{ draft.package || 'Package' }}</div>
                <table class="cdb-prev-table">
                  <tr v-if="draft.capacitance"><td>Value</td><td>{{ draft.capacitance }} {{ draft.uom }}</td></tr>
                  <tr v-if="draft.rated_voltage"><td>Voltage</td><td>{{ draft.rated_voltage }} V</td></tr>
                  <tr v-if="draft.current"><td>Current</td><td>{{ draft.current }} A</td></tr>
                  <tr v-if="draft.rated_temp"><td>Max Temp</td><td>{{ draft.rated_temp }} °C</td></tr>
                  <tr v-if="draft.cost"><td>Cost</td><td>${{ Number(draft.cost).toFixed(3) }}</td></tr>
                </table>
                <div class="cdb-prev-valid" v-if="!draft.part || !draft.type">
                  <div class="cdb-prev-warn">⚠ Part # and Type are required</div>
                </div>
                <div class="cdb-prev-valid cdb-prev-ok" v-else>
                  ✓ Ready to {{ editMode==='create'?'add':'save' }}
                </div>
              </div>
            </div>
          </div>
          <div class="cdb-dlg-ft">
            <span class="cdb-req-note">* Required fields</span>
            <button class="cdb-btn cdb-btn-mid" @click="editOpen=false">Cancel</button>
            <button class="cdb-btn cdb-btn-blue" :disabled="!draft.part||!draft.type||saving" @click="saveComp">
              <span v-if="saving">Saving…</span>
              <span v-else>{{ editMode==='create' ? '＋ Add Component' : '💾 Save Changes' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- VIEW DIALOG -->
      <div v-if="viewOpen" class="cdb-overlay" @click.self="viewOpen=false">
        <div class="cdb-dlg cdb-dlg--wide">
          <div class="cdb-dlg-hd">
            <span>Component Details</span>
            <button class="cdb-dlg-x" @click="viewOpen=false">✕</button>
          </div>
          <div class="cdb-dlg-body" v-if="viewRecord">
            <div class="cdb-view-grid">
              <template v-for="f in ALL_VIEW_FIELDS" :key="f.key">
                <div class="cdb-view-label">{{ f.label }}</div>
                <div class="cdb-view-val">{{ viewRecord[f.key] ?? '—' }}</div>
              </template>
            </div>
          </div>
          <div class="cdb-dlg-ft">
            <button class="cdb-btn cdb-btn-blue" @click="openEdit(viewRecord); viewOpen=false">Edit</button>
            <button class="cdb-btn cdb-btn-mid" @click="viewOpen=false">Close</button>
          </div>
        </div>
      </div>

      <!-- FIELDS DIALOG (column visibility) -->
      <div v-if="fieldsOpen" class="cdb-overlay" @click.self="fieldsOpen=false">
        <div class="cdb-dlg cdb-dlg--sm">
          <div class="cdb-dlg-hd"><span>Toggle Columns</span><button class="cdb-dlg-x" @click="fieldsOpen=false">✕</button></div>
          <div class="cdb-dlg-body">
            <div class="cdb-fields-list">
              <label v-for="col in ALL_COLUMNS" :key="col.key" class="cdb-field-toggle">
                <input type="checkbox" :checked="hiddenCols.indexOf(col.key)===-1"
                  @change="toggleCol(col.key)"/>
                {{ col.label }}
              </label>
            </div>
          </div>
          <div class="cdb-dlg-ft"><button class="cdb-btn cdb-btn-blue" @click="fieldsOpen=false">Done</button></div>
        </div>
      </div>

      <!-- ASSIGN TO SET DIALOG -->
      <div v-if="setAssignOpen" class="cdb-overlay" @click.self="setAssignOpen=false">
        <div class="cdb-dlg cdb-dlg--sm">
          <div class="cdb-dlg-hd"><span>Assign to Set</span><button class="cdb-dlg-x" @click="setAssignOpen=false">✕</button></div>
          <div class="cdb-dlg-body">
            <p class="cdb-hint">Select a set to add <strong>{{ selectedRecord?.part }}</strong> to:</p>
            <div class="cdb-set-list">
              <div v-for="s in sets" :key="s.id" class="cdb-set-row"
                :class="{'cdb-set-row--sel': assignSetId===s.id}"
                @click="assignSetId=s.id">
                <strong>{{ s.name }}</strong>
                <span>{{ s.topology }}</span>
              </div>
            </div>
            <div class="cdb-field" style="margin-top:.6rem">
              <label>Role in set</label>
              <input class="cdb-finp" v-model="assignRole" placeholder="e.g. output_cap"/>
            </div>
          </div>
          <div class="cdb-dlg-ft">
            <button class="cdb-btn cdb-btn-mid" @click="setAssignOpen=false">Cancel</button>
            <button class="cdb-btn cdb-btn-blue" :disabled="!assignSetId" @click="doAssignToSet">Assign</button>
          </div>
        </div>
      </div>

      <!-- DELETE CONFIRM -->
      <div v-if="deleteTarget" class="cdb-overlay" @click.self="deleteTarget=null">
        <div class="cdb-dlg cdb-dlg--sm">
          <div class="cdb-dlg-hd"><span>Confirm Delete</span></div>
          <div class="cdb-dlg-body">
            <p>Delete <strong>{{ deleteTarget.part }}</strong>? This cannot be undone.</p>
          </div>
          <div class="cdb-dlg-ft">
            <button class="cdb-btn cdb-btn-mid" @click="deleteTarget=null">Cancel</button>
            <button class="cdb-btn cdb-btn-danger" @click="doDelete">Delete</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '../api/index.js';

// ── Category definitions ────────────────────────────────────────────────────
const CATEGORIES_ROW1 = [
  { key:'all',        label:'All Components' },
  { key:'capacitor',  label:'Capacitors' },
  { key:'diode_sch',  label:'Diodes' },
  { key:'diode_tvs',  label:'Zeners / TVS' },
  { key:'inductor',   label:'Inductors' },
  { key:'fuse_fuse',  label:'Fuses' },
  { key:'resistor_fb',label:'Fusible Resistors' },
  { key:'ic_opto',    label:'Optocouplers' },
  { key:'heatsink',   label:'Heatsinks' },
];
const CATEGORIES_ROW2 = [
  { key:'resistor_sr',label:'Shunt Regulators' },
  { key:'resistor_th',label:'Thermistors' },
  { key:'scr',        label:'Silicon Controlled Rectifiers' },
  { key:'transistor', label:'Transistors' },
  { key:'fuse_var',   label:'Varistors' },
  { key:'mosfet',     label:'MOSFET' },
  { key:'resistor',   label:'Resistors' },
];

// ── Column definitions ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key:'library',      label:'Library',          filterable:true  },
  { key:'qualification',label:'Qualification',     filterable:true  },
  { key:'subtype',      label:'Type',              filterable:true  },
  { key:'part',         label:'Part Number',       filterable:false },
  { key:'mfr',          label:'Manufacturer',      filterable:true  },
  { key:'mount_type',   label:'Mount Type',        filterable:true  },
  { key:'capacitance',  label:'Capacitance',       filterable:false },
  { key:'uom',          label:'UOM',               filterable:true  },
  { key:'tol',          label:'Tolerance',         filterable:false },
  { key:'rated_voltage',label:'Rated Voltage',     filterable:false },
  { key:'ripple',       label:'Ripple Current',    filterable:false },
  { key:'esr',          label:'ESR',               filterable:false },
  { key:'rated_life',   label:'Rated Life',        filterable:false },
  { key:'temp_coeff',   label:'Temp Coefficient',  filterable:true  },
  { key:'temp_min',     label:'Temp Min (°C)',      filterable:false },
  { key:'rated_temp',   label:'Rated Temp (°C)',    filterable:false },
  { key:'size_l',       label:'Size L (mm)',        filterable:false },
  { key:'size_w',       label:'Size W (mm)',        filterable:false },
  { key:'package',      label:'Package',           filterable:true  },
  { key:'cost',         label:'Cost ($)',          filterable:false },
  { key:'notes',        label:'Notes',             filterable:false },
];

const ALL_VIEW_FIELDS = ALL_COLUMNS;

const EDIT_FIELDS = [
  { key:'library',      label:'Library',       opts:['Default','Custom','Preferred'] },
  { key:'qualification',label:'Qualification', opts:['CE','AEC-Q200','MIL-STD','COTS'] },
  { key:'type',         label:'Type *',        opts:['capacitor','resistor','diode','ic','inductor','fuse'] },
  { key:'subtype',      label:'Subtype',       opts:null },
  { key:'part',         label:'Part Number *', opts:null },
  { key:'mfr',          label:'Manufacturer',  opts:null },
  { key:'mount_type',   label:'Mount Type',    opts:['Surface Mount','Through Hole'] },
  { key:'capacitance',  label:'Capacitance',   num:true },
  { key:'uom',          label:'UOM',           opts:['µF','nF','pF','mH','µH','Ω','kΩ','MΩ','A','V','W'] },
  { key:'tol',          label:'Tolerance (%)', num:true },
  { key:'rated_voltage',label:'Rated Voltage (V)', num:true },
  { key:'ripple',       label:'Ripple (mA)',   num:true },
  { key:'esr',          label:'ESR (Ω)',       num:true },
  { key:'rated_life',   label:'Rated Life (h)',num:true },
  { key:'temp_coeff',   label:'Temp Coefficient', opts:['X7R','X5R','C0G/NP0','X7S','Y5V','N/A','±50ppm','±100ppm','±75ppm'] },
  { key:'temp_min',     label:'Temp Min (°C)', num:true },
  { key:'rated_temp',   label:'Rated Temp (°C)',num:true },
  { key:'size_l',       label:'Size L (mm)',   num:true },
  { key:'size_w',       label:'Size W (mm)',   num:true },
  { key:'package',      label:'Package',       opts:null },
  { key:'current',      label:'Current (A)',   num:true },
  { key:'power',        label:'Power (W)',     num:true },
  { key:'cost',         label:'Cost ($)',      num:true },
  { key:'notes',        label:'Notes',         opts:null },
];

// ── State ───────────────────────────────────────────────────────────────────
const components  = ref([]);
const sets        = ref([]);
const loading     = ref(false);
const activeCat   = ref('all');
const selectedId  = ref(null);
const hiddenCols  = ref(['ripple','esr','rated_life','temp_coeff','temp_min','rated_temp','size_l','size_w','notes']);
const colFilters  = ref({});
const sortKey     = ref('part');
const sortAsc     = ref(true);
const page        = ref(1);
const pageSize    = ref(50);

// Dialogs
const editOpen      = ref(false);
const editMode      = ref('create');
const draft         = ref({});
const saving        = ref(false);
const saveError     = ref('');
const viewOpen      = ref(false);
const fieldsOpen    = ref(false);
const setAssignOpen = ref(false);
const assignSetId   = ref(null);
const assignRole    = ref('');
const deleteTarget  = ref(null);

// ── Category → type/subtype filter ──────────────────────────────────────────
const CAT_FILTER = {
  'all':         () => true,
  'capacitor':   r => r.type === 'capacitor',
  'diode_sch':   r => r.type === 'diode' && ['schottky_output','clamp','bridge'].includes(r.subtype),
  'diode_tvs':   r => r.type === 'diode' && ['tvs','zener'].includes(r.subtype),
  'inductor':    r => r.type === 'inductor',
  'fuse_fuse':   r => r.type === 'fuse' && r.subtype === 'fuse',
  'fuse_var':    r => r.type === 'fuse' && r.subtype === 'varistor',
  'resistor_fb': r => r.type === 'resistor' && ['feedback','current_sense'].includes(r.subtype),
  'resistor_sr': r => r.type === 'ic' && r.subtype === 'tl431',
  'resistor_th': r => r.type === 'resistor' && r.subtype === 'thermistor',
  'resistor':    r => r.type === 'resistor',
  'ic_opto':     r => r.type === 'ic' && r.subtype === 'optocoupler',
  'transistor':  r => r.type === 'ic' && ['topswitch','tinyswitch'].includes(r.subtype),
  'mosfet':      r => r.type === 'ic' && r.subtype === 'mosfet',
  'heatsink':    r => r.type === 'heatsink',
  'scr':         r => r.type === 'scr',
};

// ── Computed ─────────────────────────────────────────────────────────────────
const visibleColumns = computed(() =>
  ALL_COLUMNS.filter(c => hiddenCols.value.indexOf(c.key) === -1)
);

const catFiltered = computed(() => {
  const fn = CAT_FILTER[activeCat.value];
  if (!fn) return components.value;
  return components.value.filter(fn);
});

const filtered = computed(() => {
  let list = catFiltered.value;
  for (const [key, val] of Object.entries(colFilters.value)) {
    if (!val) continue;
    const v = String(val).toLowerCase();
    list = list.filter(r => String(r[key] ?? '').toLowerCase().includes(v));
  }
  return [...list].sort((a, b) => {
    const av = a[sortKey.value] ?? '', bv = b[sortKey.value] ?? '';
    if (av === bv) return 0;
    return sortAsc.value ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });
});

const totalPages    = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paginated     = computed(() => {
  const s = (page.value - 1) * pageSize.value;
  return filtered.value.slice(s, s + pageSize.value);
});
const selectedRecord = computed(() => components.value.find(r => r.id === selectedId.value) || null);
const viewRecord     = computed(() => selectedRecord.value);

watch([activeCat, colFilters], () => { page.value = 1; }, { deep: true });
watch(activeCat, () => { colFilters.value = {}; selectedId.value = null; });

// ── Helpers ──────────────────────────────────────────────────────────────────
function colOptions(key) {
  const vals = [...new Set(catFiltered.value.map(r => r[key]).filter(v => v != null && v !== ''))].sort();
  // Only offer dropdown if there are ≤30 distinct values — otherwise text search is better
  return vals.length <= 40 ? vals : [];
}

function fmtCell(row, col) {
  const v = row[col.key];
  if (v == null || v === '') return '';
  if (col.key === 'capacitance') return v + ' ' + (row.uom || '');
  if (col.key === 'cost') return '$' + Number(v).toFixed(2);
  if (col.key === 'tol') return v + '%';
  if (col.key === 'rated_voltage') return v + 'V';
  if (col.key === 'ripple') return v + 'mA';
  if (col.key === 'esr') return v + 'Ω';
  if (col.key === 'rated_life') return v + 'h';
  if (col.key === 'size_l' || col.key === 'size_w') return v + 'mm';
  return v;
}

function sortBy(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value;
  else { sortKey.value = key; sortAsc.value = true; }
}

function toggleCol(key) {
  const idx = hiddenCols.value.indexOf(key);
  if (idx >= 0) hiddenCols.value.splice(idx, 1);
  else hiddenCols.value.push(key);
}

function selectCat(key) { activeCat.value = key; }

// ── Data loading ─────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true;
  try {
    components.value = await api.getComponents();
    sets.value = await api.listSets().catch(() => []);
  } finally { loading.value = false; }
});

// ── CRUD ─────────────────────────────────────────────────────────────────────
const BLANK_DRAFT = () => ({
  library:'Default', qualification:'CE', type:'capacitor', subtype:'',
  part:'', mfr:'', mount_type:'Surface Mount', capacitance:null, uom:'µF',
  tol:null, rated_voltage:null, ripple:null, esr:null, rated_life:null,
  temp_coeff:'', temp_min:null, rated_temp:null, size_l:null, size_w:null,
  package:'', current:null, power:null, cost:null, notes:'',
});

function openAdd() { draft.value = BLANK_DRAFT(); editMode.value = 'create'; editOpen.value = true; }
function openEdit(r) { draft.value = { ...r }; editMode.value = 'edit'; editOpen.value = true; }
function openView() { if (selectedRecord.value) viewOpen.value = true; }
function openFields() { fieldsOpen.value = true; }
function openHelp() { alert('FluxForge Component Database\n\nSelect a category tab, then use column filters to narrow results.\nDouble-click a row to view details. Use Add… to create new components.'); }
function doImport() { alert('Import: Upload a CSV or Excel file (not yet implemented)'); }
function doExport() {
  if (!filtered.value.length) return;
  const cols = visibleColumns.value.map(c => c.key);
  const hdr  = visibleColumns.value.map(c => c.label);
  const csv  = [hdr.join(','), ...filtered.value.map(r =>
    cols.map(k => JSON.stringify(r[k] ?? '')).join(',')
  )].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `components_${activeCat.value}.csv`;
  a.click();
}
function closeAll() { /* handled by parent nav */ }

async function saveComp() {
  saveError.value = '';
  if (!draft.value.part?.trim()) { saveError.value = 'Part Number is required.'; return; }
  if (!draft.value.type?.trim()) { saveError.value = 'Type is required.'; return; }
  saving.value = true;
  try {
    if (editMode.value === 'create') {
      const created = await api.createComponent(draft.value);
      components.value.unshift(created);
      selectedId.value = created.id;
    } else {
      const updated = await api.updateComponent(draft.value.id, draft.value);
      const i = components.value.findIndex(x => x.id === draft.value.id);
      if (i >= 0) components.value[i] = updated;
    }
    editOpen.value = false;
  } catch(e) {
    saveError.value = 'Save failed: ' + (e.message || 'Unknown error');
  } finally {
    saving.value = false;
  }
}

function confirmDelete() { if (selectedRecord.value) deleteTarget.value = selectedRecord.value; }
async function doDelete() {
  try {
    await api.deleteComponent(deleteTarget.value.id);
    components.value = components.value.filter(c => c.id !== deleteTarget.value.id);
    selectedId.value = null;
    deleteTarget.value = null;
  } catch(e) { alert(e.message); }
}

function openSetAssign() {
  if (!selectedRecord.value) { alert('Select a component first'); return; }
  assignSetId.value = null; assignRole.value = '';
  setAssignOpen.value = true;
}
async function doAssignToSet() {
  try {
    await api.addToSet(assignSetId.value, selectedId.value, assignRole.value || null);
    setAssignOpen.value = false;
    alert('Added to set!');
  } catch(e) { alert(e.message); }
}
</script>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.cdb-root {
  display: flex; flex-direction: column;
  height: 100%; background: #fff;
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 13px; overflow: hidden;
  border: 1px solid #c8ccd8; border-radius: 4px;
}

/* ── Title bar ────────────────────────────────────────────────────────────── */
.cdb-title-bar {
  padding: .45rem .8rem .3rem;
  background: #f0f2f8;
  border-bottom: 1px solid #c8ccd8;
  flex-shrink: 0;
}
.cdb-title {
  font-size: .95rem; font-weight: 700; color: #1a1a2e;
  letter-spacing: .01em;
}

/* ── Category tabs ────────────────────────────────────────────────────────── */
.cdb-tabs-wrap {
  background: #e8ecf5; border-bottom: 2px solid #c0c8dc;
  flex-shrink: 0; padding: .25rem .4rem 0;
}
.cdb-tabs-row {
  display: flex; flex-wrap: wrap; gap: 2px; margin-bottom: 2px;
}
.cdb-tab {
  padding: .28rem .75rem;
  background: #dce1ef; border: 1px solid #b8c0d8;
  border-bottom: none; border-radius: 3px 3px 0 0;
  font-size: .78rem; font-weight: 500; color: #2a3060;
  cursor: pointer; white-space: nowrap; transition: background .1s;
}
.cdb-tab:hover { background: #cdd4ea; }
.cdb-tab--active {
  background: #fff; border-color: #4a7aff;
  color: #1a3ab0; font-weight: 700;
  position: relative; top: 1px;
}

/* ── Table outer ──────────────────────────────────────────────────────────── */
.cdb-table-outer {
  flex: 1; overflow: auto;
  border-bottom: 1px solid #c8ccd8;
}

/* ── Table ────────────────────────────────────────────────────────────────── */
.cdb-table {
  width: 100%; border-collapse: collapse;
  font-size: .78rem;
}
.cdb-table thead { position: sticky; top: 0; z-index: 5; }

/* Column header row */
.cdb-thead-row { background: #2d4080; }
.cdb-th {
  padding: .38rem .55rem;
  color: #e8ecff; font-weight: 700; font-size: .73rem;
  text-align: left; white-space: nowrap;
  border-right: 1px solid #3a5099;
  cursor: pointer; user-select: none;
}
.cdb-th:hover { background: #374fa0; }
.cdb-th-sel { width: 24px; padding: .38rem .35rem; cursor: default; }
.cdb-sort-icon { margin-left: 2px; font-size: .6rem; opacity: .8; }

/* Filter row */
.cdb-filter-row { background: #e8ecf8; border-bottom: 2px solid #b8c4e0; }
.cdb-td-filter { padding: .2rem .3rem; }
.cdb-col-sel, .cdb-col-inp {
  width: 100%; padding: .18rem .3rem;
  border: 1px solid #b0b8d0; border-radius: 2px;
  font-size: .72rem; background: #fff; color: #1a1a2e;
}
.cdb-td-sel { width: 24px; }

/* Data rows */
.cdb-row { cursor: pointer; }
.cdb-row:nth-child(even) { background: #f4f6fb; }
.cdb-row:hover td { background: #dce8ff !important; }
.cdb-row--sel td { background: #b8d0ff !important; }
.cdb-td {
  padding: .3rem .55rem;
  border-bottom: 1px solid #dde0ea;
  color: #1a1a2e; white-space: nowrap;
  border-right: 1px solid #eaecf4;
}
.cdb-td-part { font-weight: 700; color: #1a3ab0; font-family: 'Consolas','Courier New',monospace; }
.cdb-td-sel { text-align: center; }
.cdb-state { text-align: center; padding: 2rem; color: #666; }

/* ── Bottom bar ───────────────────────────────────────────────────────────── */
.cdb-bottom {
  flex-shrink: 0; padding: .45rem .65rem .5rem;
  background: #f0f2f8; border-top: 1px solid #c8ccd8;
  display: flex; flex-direction: column; gap: .35rem;
}
.cdb-bottom-left {
  display: flex; align-items: center; gap: .6rem;
}
.cdb-count { font-size: .75rem; color: #333; font-weight: 600; }
.cdb-pagination { display: flex; align-items: center; gap: .3rem; }
.cdb-pg-btn {
  width: 22px; height: 22px; padding: 0;
  border: 1px solid #a0a8c0; border-radius: 2px;
  background: #fff; font-size: .7rem; cursor: pointer; color: #2a3060;
}
.cdb-pg-btn:disabled { opacity: .4; cursor: not-allowed; }
.cdb-pg-info { font-size: .72rem; color: #444; min-width: 44px; text-align: center; }
.cdb-pg-sel {
  padding: .15rem .3rem; border: 1px solid #a0a8c0;
  border-radius: 2px; font-size: .72rem; background: #fff; color: #1a1a2e;
}
.cdb-bottom-row, .cdb-bottom-row2 { display: flex; gap: .4rem; flex-wrap: wrap; }
.cdb-btn {
  padding: .3rem .9rem; border-radius: 3px;
  font-size: .78rem; font-weight: 500; cursor: pointer;
  border: 1px solid transparent; white-space: nowrap;
}
.cdb-btn-blue { background: #0D7377; border-color: #1e55c0; color: #fff; }
.cdb-btn-blue:hover { background: #1e55c0; }
.cdb-btn-mid  { background: #e2e6f2; border-color: #a8b0cc; color: #2a3060; }
.cdb-btn-mid:hover { background: #cdd4ea; }
.cdb-btn-mid:disabled { opacity: .4; cursor: not-allowed; }
.cdb-btn-danger { background: #d03030; border-color: #a02020; color: #fff; }
.cdb-btn-danger:hover { background: #b02020; }

/* ── Dialogs ──────────────────────────────────────────────────────────────── */
.cdb-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  z-index: 9200; display: flex; align-items: center; justify-content: center;
}
.cdb-dlg {
  background: #fff; border-radius: 6px; width: 520px;
  max-width: 96vw; max-height: 88vh; display: flex; flex-direction: column;
  box-shadow: 0 12px 48px rgba(0,0,0,.3); overflow: hidden;
}
.cdb-dlg--wide { width: 700px; }
.cdb-dlg--sm   { width: 380px; }
.cdb-dlg-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: .65rem 1rem; background: #2d4080; color: #fff; font-weight: 700; font-size: .88rem; flex-shrink: 0;
}
.cdb-dlg-x { background: none; border: none; color: #aac; font-size: 1rem; cursor: pointer; }
.cdb-dlg-x:hover { color: #fff; }
.cdb-dlg-body { flex: 1; overflow-y: auto; padding: .9rem 1rem; }
.cdb-dlg-ft {
  display: flex; justify-content: flex-end; gap: .4rem;
  padding: .55rem .9rem; border-top: 1px solid #e0e4f0; background: #f6f8fc; flex-shrink: 0;
}
.cdb-hint { font-size: .8rem; color: #444; margin-bottom: .6rem; }

/* Form */
.cdb-form {
  display: grid; grid-template-columns: 1fr 1fr; gap: .45rem .8rem;
}
.cdb-field { display: flex; flex-direction: column; gap: .18rem; }
.cdb-field label { font-size: .7rem; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: .04em; }
.cdb-finp {
  padding: .3rem .45rem; border: 1px solid #b8bcd0; border-radius: 3px;
  font-size: .8rem; color: #1a1a2e; background: #fff; width: 100%; box-sizing: border-box;
}
.cdb-finp:focus { outline: none; border-color: #0D7377; box-shadow: 0 0 0 2px rgba(45,107,228,.18); }

/* View grid */
.cdb-view-grid {
  display: grid; grid-template-columns: 140px 1fr;
  gap: .3rem .5rem; font-size: .8rem;
}
.cdb-view-label { color: #555; font-weight: 600; }
.cdb-view-val   { color: #1a1a2e; }

/* Fields list */
.cdb-fields-list { display: grid; grid-template-columns: 1fr 1fr; gap: .3rem; }
.cdb-field-toggle {
  display: flex; align-items: center; gap: .4rem;
  font-size: .8rem; color: #1a1a2e; cursor: pointer;
}

/* Set list */
.cdb-set-list { display: flex; flex-direction: column; gap: .3rem; max-height: 200px; overflow-y: auto; }
.cdb-set-row {
  display: flex; justify-content: space-between; padding: .35rem .55rem;
  border: 1px solid #e0e4f0; border-radius: 4px; cursor: pointer; font-size: .8rem;
}
.cdb-set-row:hover { background: #eef2ff; }
.cdb-set-row--sel  { background: #d0e0ff; border-color: #0D7377; }

/* ── Enhanced Add/Edit Dialog ─────────────────────────────────────────────── */
.cdb-dlg--edit { width:820px; max-height:88vh; display:flex; flex-direction:column; }
.cdb-edit-layout { display:flex; flex:1; overflow:hidden; min-height:0; }
.cdb-dlg-scroll { flex:1; overflow-y:auto; padding:.75rem .9rem; min-width:0; }
.cdb-edit-preview { width:190px; flex-shrink:0; border-left:1px solid #e2e4ea; background:#f8f9fc; padding:.75rem; display:flex; flex-direction:column; gap:.5rem; overflow-y:auto; }
.cdb-section-hd { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#0D7377; padding:.4rem 0 .25rem; border-bottom:1px solid #e8eaf0; margin-bottom:.4rem; margin-top:.3rem; }
.cdb-form--2col { grid-template-columns:1fr 1fr !important; }
.cdb-form--3col { grid-template-columns:1fr 1fr 1fr !important; }
.cdb-field--full { grid-column:1/-1; }
.cdb-ta { resize:vertical; min-height:48px; }
.cdb-req::after { content:' *'; color:#0D7377; }
.cdb-finp--err { border-color:#0D7377 !important; background:#fff5f5; }
.cdb-save-error { background:#FFF5F5; border:1px solid #fca5a5; border-radius:5px; padding:.4rem .65rem; font-size:.78rem; color:#991b1b; margin-bottom:.5rem; }
.cdb-req-note { font-size:.72rem; color:#888; margin-right:auto; }
/* Live preview */
.cdb-prev-title { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:.4rem; }
.cdb-prev-card { background:#fff; border:1px solid #e2e4ea; border-radius:6px; padding:.65rem .75rem; display:flex; flex-direction:column; gap:.3rem; }
.cdb-prev-pn { font-family:monospace; font-weight:700; font-size:.9rem; color:#1a3ab0; }
.cdb-prev-mfr { font-size:.75rem; color:#555; }
.cdb-prev-pkg { font-size:.72rem; color:#888; font-style:italic; }
.cdb-prev-table { width:100%; border-collapse:collapse; font-size:.72rem; margin-top:.3rem; }
.cdb-prev-table td { padding:.15rem .2rem; border-bottom:1px solid #f0f0f0; color:#444; }
.cdb-prev-table td:last-child { text-align:right; font-weight:600; color:#1a1a2e; }
.cdb-prev-valid { font-size:.72rem; margin-top:.4rem; padding:.3rem .45rem; border-radius:4px; }
.cdb-prev-warn { color:#d97706; background:#fffbeb; padding:.3rem .45rem; border-radius:4px; }
.cdb-prev-ok { color:#38A169; background:#F0FFF4; padding:.3rem .45rem; border-radius:4px; font-weight:600; }
</style>

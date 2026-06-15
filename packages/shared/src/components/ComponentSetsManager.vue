<template>
  <div class="csm-root">
    <!-- Toolbar -->
    <div class="csm-toolbar">
      <span class="csm-title">⚙ Component Sets</span>
      <div class="csm-toolbar-right">
        <input class="csm-search" v-model="search" placeholder="Search sets…"/>
        <button class="csm-btn csm-btn-primary" @click="openCreate">+ New Set</button>
      </div>
    </div>

    <!-- Main layout: sets list | set detail -->
    <div class="csm-body">
      <!-- Left: sets list -->
      <div class="csm-list-panel">
        <div v-if="loading" class="csm-state">Loading…</div>
        <div v-else-if="filteredSets.length===0" class="csm-state">No component sets found</div>
        <div v-for="s in filteredSets" :key="s.id"
          class="csm-set-card"
          :class="{'csm-set-card--active': activeSet?.id===s.id}"
          @click="selectSet(s)">
          <div class="csm-set-name">{{ s.name }}</div>
          <div class="csm-set-meta">
            <span class="csm-set-topo">{{ s.topology || 'Any' }}</span>
            <span class="csm-set-count">{{ s._count || '…' }} parts</span>
            <span class="csm-set-date">{{ s.created_at?.slice(0,10) }}</span>
          </div>
          <div v-if="s.description" class="csm-set-desc">{{ s.description }}</div>
        </div>
      </div>

      <!-- Right: set detail / editor -->
      <div class="csm-detail-panel" v-if="activeSet">
        <!-- Set header editable -->
        <div class="csm-detail-hd">
          <div class="csm-detail-hd-row">
            <input class="csm-det-name" v-model="activeSet.name" placeholder="Set name"/>
            <input class="csm-det-topo" v-model="activeSet.topology" placeholder="Topology"/>
            <button class="csm-btn csm-btn-primary csm-btn-sm" @click="saveSet">💾 Save</button>
            <button class="csm-btn csm-btn-danger csm-btn-sm" @click="confirmDeleteSet">🗑 Delete</button>
          </div>
          <textarea class="csm-det-desc" v-model="activeSet.description" placeholder="Description…" rows="2"></textarea>
        </div>

        <!-- Components in this set -->
        <div class="csm-comps-section">
          <div class="csm-comps-hd">
            <span>Components in this set <span class="csm-count-badge">{{ setComponents.length }}</span></span>
            <input class="csm-search csm-search-sm" v-model="compSearch" placeholder="Filter components…"/>
          </div>
          <div class="csm-comps-table-wrap">
            <table class="csm-table">
              <thead>
                <tr class="csm-thead">
                  <th>Role</th><th>Part #</th><th>Type</th><th>Manufacturer</th>
                  <th>Value</th><th>Package</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="setComponents.length===0"><td colspan="7" class="csm-state">No components in this set yet</td></tr>
                <tr v-for="c in filteredSetComponents" :key="c.id" class="csm-comp-row">
                  <td>
                    <input class="csm-role-inp" :value="c.role||''" @change="updateRole(c,$event.target.value)" placeholder="role"/>
                  </td>
                  <td class="csm-td-pn">{{ c.part }}</td>
                  <td><span class="csm-type-badge" :class="'csm-type-'+c.type">{{ c.subtype || c.type }}</span></td>
                  <td>{{ c.mfr }}</td>
                  <td>{{ c.capacitance ?? c.value }}{{ c.uom || c.unit }}</td>
                  <td>{{ c.package }}</td>
                  <td><button class="csm-rm-btn" @click="removeComponent(c)" title="Remove">✕</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add component section -->
        <div class="csm-add-section">
          <div class="csm-add-hd">Add Component from Database</div>
          <div class="csm-add-toolbar">
            <input class="csm-search" v-model="addSearch" placeholder="Search by part #, manufacturer…"/>
            <select class="csm-fsel" v-model="addTypeFilter">
              <option value="">All Types</option>
              <option v-for="t in allTypes" :key="t">{{ t }}</option>
            </select>
          </div>
          <div class="csm-candidates-wrap">
            <table class="csm-table">
              <thead>
                <tr class="csm-thead">
                  <th>Part #</th><th>Type</th><th>Manufacturer</th><th>Value</th><th>Package</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="addSearch.length < 2 && !addTypeFilter" class="csm-hint-row">
                  <td colspan="6" class="csm-state">Type at least 2 characters or select a type to search</td>
                </tr>
                <tr v-else-if="addCandidates.length===0" class="csm-hint-row">
                  <td colspan="6" class="csm-state">No components found</td>
                </tr>
                <tr v-for="c in addCandidates" :key="c.id" class="csm-comp-row csm-comp-row--pick">
                  <td class="csm-td-pn">{{ c.part }}</td>
                  <td><span class="csm-type-badge" :class="'csm-type-'+c.type">{{ c.subtype || c.type }}</span></td>
                  <td>{{ c.mfr }}</td>
                  <td>{{ c.capacitance ?? c.value }}{{ c.uom || c.unit }}</td>
                  <td>{{ c.package }}</td>
                  <td>
                    <button class="csm-add-btn" @click="addComponent(c)">+ Add</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else class="csm-detail-panel csm-detail-empty">
        <div class="csm-empty-msg">
          <div class="csm-empty-icon">⚙</div>
          <div>Select a component set to view and edit it</div>
          <button class="csm-btn csm-btn-primary" @click="openCreate">Create New Set</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit dialog -->
    <teleport to="body">
      <div v-if="createOpen" class="csm-overlay" @click.self="createOpen=false">
        <div class="csm-dlg">
          <div class="csm-dlg-hd">New Component Set<button class="csm-dlg-x" @click="createOpen=false">✕</button></div>
          <div class="csm-dlg-body">
            <div class="csm-form-row"><label>Name *</label><input class="csm-dinp" v-model="newDraft.name" placeholder="e.g. Standard 65W Flyback"/></div>
            <div class="csm-form-row"><label>Topology</label><input class="csm-dinp" v-model="newDraft.topology" placeholder="e.g. Flyback"/></div>
            <div class="csm-form-row"><label>Description</label><textarea class="csm-dinp" v-model="newDraft.description" rows="3" placeholder="Optional description…"></textarea></div>
          </div>
          <div class="csm-dlg-ft">
            <button class="csm-btn" @click="createOpen=false">Cancel</button>
            <button class="csm-btn csm-btn-primary" :disabled="!newDraft.name" @click="createSet">Create</button>
          </div>
        </div>
      </div>
      <div v-if="deleteConfirmOpen" class="csm-overlay" @click.self="deleteConfirmOpen=false">
        <div class="csm-dlg csm-dlg--sm">
          <div class="csm-dlg-hd">Delete Set<button class="csm-dlg-x" @click="deleteConfirmOpen=false">✕</button></div>
          <div class="csm-dlg-body"><p>Delete <strong>{{ activeSet?.name }}</strong>? This cannot be undone.</p></div>
          <div class="csm-dlg-ft">
            <button class="csm-btn" @click="deleteConfirmOpen=false">Cancel</button>
            <button class="csm-btn csm-btn-danger" @click="doDeleteSet">Delete</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { useI18n } from '../composables/useI18n.js';
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '../api/index.js';

const sets          = ref([]);
const allComponents = ref([]);
const setComponents = ref([]);
const { t } = useI18n();
const loading       = ref(false);
const activeSet     = ref(null);
const search        = ref('');
const compSearch    = ref('');
const addSearch     = ref('');
const addTypeFilter = ref('');
const createOpen    = ref(false);
const deleteConfirmOpen = ref(false);
const newDraft      = ref({ name:'', topology:'', description:'' });

const allTypes = computed(() => [...new Set(allComponents.value.map(c=>c.type))].sort());

const filteredSets = computed(() => {
  if (!search.value) return sets.value;
  const q = search.value.toLowerCase();
  return sets.value.filter(s =>
    (s.name||'').toLowerCase().includes(q) || (s.topology||'').toLowerCase().includes(q)
  );
});

const filteredSetComponents = computed(() => {
  if (!compSearch.value) return setComponents.value;
  const q = compSearch.value.toLowerCase();
  return setComponents.value.filter(c =>
    (c.part||'').toLowerCase().includes(q) || (c.mfr||'').toLowerCase().includes(q) ||
    (c.role||'').toLowerCase().includes(q)
  );
});

const addCandidates = computed(() => {
  if (addSearch.value.length < 2 && !addTypeFilter.value) return [];
  const q = addSearch.value.toLowerCase();
  const existIds = new Set(setComponents.value.map(c=>c.id));
  return allComponents.value.filter(c => {
    if (existIds.has(c.id)) return false;
    if (addTypeFilter.value && c.type !== addTypeFilter.value) return false;
    if (q && !(c.part||'').toLowerCase().includes(q) && !(c.mfr||'').toLowerCase().includes(q)) return false;
    return true;
  }).slice(0, 30);
});

onMounted(async () => {
  loading.value = true;
  try {
    [sets.value, allComponents.value] = await Promise.all([
      api.listSets(), api.getComponents()
    ]);
    // Attach count
    sets.value.forEach(s => { s._count = '…'; });
    sets.value.forEach(async s => {
      try {
        const detail = await api.getSet(s.id);
        s._count = (detail.components||[]).length;
      } catch {}
    });
  } finally { loading.value = false; }
});

async function selectSet(s) {
  activeSet.value = { ...s };
  compSearch.value = ''; addSearch.value = '';
  try {
    const detail = await api.getSet(s.id);
    setComponents.value = detail.components || [];
    activeSet.value._count = setComponents.value.length;
  } catch { setComponents.value = []; }
}

function openCreate() { newDraft.value = { name:'', topology:'', description:'' }; createOpen.value = true; }

async function createSet() {
  try {
    const s = await api.createSet(newDraft.value);
    s._count = 0;
    sets.value.unshift(s);
    createOpen.value = false;
    await selectSet(s);
  } catch(e) { alert(e.message); }
}

async function saveSet() {
  try {
    const updated = await api.updateSet(activeSet.value.id, {
      name: activeSet.value.name,
      description: activeSet.value.description,
      topology: activeSet.value.topology,
    });
    const idx = sets.value.findIndex(s=>s.id===activeSet.value.id);
    if (idx>=0) { sets.value[idx] = { ...updated, _count: setComponents.value.length }; }
    activeSet.value = { ...updated, _count: setComponents.value.length };
  } catch(e) { alert(e.message); }
}

function confirmDeleteSet() { deleteConfirmOpen.value = true; }
async function doDeleteSet() {
  try {
    await api.deleteSet(activeSet.value.id);
    sets.value = sets.value.filter(s=>s.id!==activeSet.value.id);
    activeSet.value = null; setComponents.value = [];
    deleteConfirmOpen.value = false;
  } catch(e) { alert(e.message); }
}

async function addComponent(comp) {
  try {
    await api.addToSet(activeSet.value.id, comp.id, null);
    setComponents.value.push({ ...comp, role: '' });
    if (activeSet.value) activeSet.value._count = setComponents.value.length;
    const idx = sets.value.findIndex(s=>s.id===activeSet.value.id);
    if (idx>=0) sets.value[idx]._count = setComponents.value.length;
  } catch(e) { alert(e.message); }
}

async function removeComponent(comp) {
  try {
    await api.removeFromSet(activeSet.value.id, comp.id);
    setComponents.value = setComponents.value.filter(c=>c.id!==comp.id);
    if (activeSet.value) activeSet.value._count = setComponents.value.length;
  } catch(e) { alert(e.message); }
}

async function updateRole(comp, role) {
  comp.role = role;
  // Persist role update: remove and re-add with new role
  try {
    await api.removeFromSet(activeSet.value.id, comp.id);
    await api.addToSet(activeSet.value.id, comp.id, role);
  } catch {}
}
</script>

<style scoped>
.csm-root { display:flex; flex-direction:column; height:100%; background:#f8f9fc; overflow:hidden; }
.csm-toolbar { display:flex; align-items:center; justify-content:space-between; padding:.55rem 1rem; background:#24467A; color:#fff; flex-shrink:0; }
.csm-title { font-size:.9rem; font-weight:700; color:#e8ecff; }
.csm-toolbar-right { display:flex; gap:.5rem; align-items:center; }
.csm-body { display:flex; flex:1; overflow:hidden; }
.csm-list-panel { width:260px; flex-shrink:0; border-right:1px solid #d8dcee; overflow-y:auto; background:#fff; padding:.5rem; display:flex; flex-direction:column; gap:.4rem; }
.csm-set-card { padding:.5rem .7rem; border:1px solid #e2e4ee; border-radius:6px; cursor:pointer; background:#fff; }
.csm-set-card:hover { background:#f0f4ff; border-color:#b8c8ff; }
.csm-set-card--active { background:#eef2ff; border-color:#0066A6; }
.csm-set-name { font-size:.83rem; font-weight:700; color:#1a1a2e; }
.csm-set-meta { display:flex; gap:.4rem; align-items:center; margin-top:.2rem; }
.csm-set-topo { font-size:.7rem; background:#e8eeff; color:#2d4080; border-radius:3px; padding:.05rem .35rem; font-weight:600; }
.csm-set-count { font-size:.7rem; color:#888; }
.csm-set-date { font-size:.68rem; color:#aaa; margin-left:auto; }
.csm-set-desc { font-size:.72rem; color:#666; margin-top:.25rem; font-style:italic; }
.csm-detail-panel { flex:1; display:flex; flex-direction:column; overflow:hidden; }
.csm-detail-empty { align-items:center; justify-content:center; }
.csm-empty-msg { display:flex; flex-direction:column; align-items:center; gap:.8rem; color:#888; font-size:.88rem; }
.csm-empty-icon { font-size:2.5rem; }
.csm-detail-hd { padding:.65rem .9rem; background:#fff; border-bottom:1px solid #e2e4ee; flex-shrink:0; }
.csm-detail-hd-row { display:flex; gap:.5rem; align-items:center; margin-bottom:.4rem; }
.csm-det-name { flex:1; padding:.32rem .5rem; border:1px solid #c8cce0; border-radius:4px; font-size:.85rem; font-weight:700; color:#1a1a2e; }
.csm-det-topo { width:130px; padding:.32rem .5rem; border:1px solid #c8cce0; border-radius:4px; font-size:.82rem; color:#555; }
.csm-det-desc { width:100%; padding:.3rem .5rem; border:1px solid #c8cce0; border-radius:4px; font-size:.78rem; color:#555; resize:vertical; box-sizing:border-box; }
.csm-comps-section { flex:1; display:flex; flex-direction:column; overflow:hidden; border-bottom:1px solid #e2e4ee; }
.csm-comps-hd { display:flex; align-items:center; justify-content:space-between; padding:.4rem .9rem; background:#f4f6fb; border-bottom:1px solid #e2e4ee; font-size:.78rem; font-weight:700; color:#24467A; flex-shrink:0; }
.csm-count-badge { background:#0066A6; color:#fff; border-radius:10px; padding:.05rem .45rem; font-size:.68rem; margin-left:.3rem; }
.csm-comps-table-wrap { flex:1; overflow-y:auto; }
.csm-add-section { flex-shrink:0; border-top:2px solid #e2e4ee; background:#fafbfd; max-height:260px; display:flex; flex-direction:column; overflow:hidden; }
.csm-add-hd { padding:.35rem .9rem; font-size:.75rem; font-weight:700; color:#24467A; text-transform:uppercase; letter-spacing:.04em; background:#f0f3ff; border-bottom:1px solid #e2e4ee; flex-shrink:0; }
.csm-add-toolbar { display:flex; gap:.4rem; padding:.35rem .9rem; flex-shrink:0; }
.csm-candidates-wrap { flex:1; overflow-y:auto; }
.csm-table { width:100%; border-collapse:collapse; font-size:.77rem; }
.csm-thead { background:#24467A; }
.csm-thead th { padding:.32rem .55rem; color:#e8ecff; font-size:.72rem; font-weight:700; text-align:left; border-right:1px solid #3d4570; }
.csm-comp-row td { padding:.28rem .55rem; border-bottom:1px solid #e8eaf0; color:#1a1a2e; }
.csm-comp-row:hover td { background:#f0f4ff; }
.csm-comp-row--pick:hover td { background:#eef8ff; cursor:pointer; }
.csm-td-pn { font-weight:700; color:#1a3ab0; font-family:monospace; font-size:.76rem; }
.csm-type-badge { display:inline-block; padding:.05rem .35rem; border-radius:3px; font-size:.68rem; font-weight:700; text-transform:uppercase; }
.csm-type-capacitor { background:#dbeafe; color:#1e40af; }
.csm-type-resistor  { background:#FFFBEB; color:#92400e; }
.csm-type-diode     { background:#F0FFF4; color:#276749; }
.csm-type-ic        { background:#ede9fe; color:#5b21b6; }
.csm-type-inductor  { background:#fce7f3; color:#9d174d; }
.csm-type-fuse      { background:#FFF5F5; color:#991b1b; }
.csm-role-inp { width:100%; padding:.15rem .3rem; border:1px solid #dde0ea; border-radius:3px; font-size:.72rem; background:#fff; }
.csm-rm-btn { background:none; border:none; cursor:pointer; color:#0066A6; font-size:.8rem; padding:.1rem .3rem; border-radius:3px; }
.csm-rm-btn:hover { background:#FFF5F5; }
.csm-add-btn { padding:.2rem .55rem; background:#0066CC; color:#fff; border:none; border-radius:3px; font-size:.72rem; cursor:pointer; font-weight:600; white-space:nowrap; }
.csm-add-btn:hover { background:#1e55c0; }
.csm-search { padding:.32rem .55rem; border:1px solid #c8cce0; border-radius:4px; font-size:.78rem; color:#1a1a2e; }
.csm-search-sm { width:160px; }
.csm-fsel { padding:.3rem .4rem; border:1px solid #c8cce0; border-radius:4px; font-size:.78rem; color:#1a1a2e; }
.csm-state { text-align:center; padding:1.2rem; color:#888; font-size:.82rem; }
.csm-btn { padding:.3rem .8rem; border-radius:4px; font-size:.78rem; cursor:pointer; border:1px solid #b0b5c8; background:#fff; color:#1a1a2e; font-weight:500; }
.csm-btn:disabled { opacity:.4; cursor:not-allowed; }
.csm-btn-primary { background:#0066A6; border-color:#005490; color:#fff; }
.csm-btn-primary:hover:not(:disabled) { background:#005490; }
.csm-btn-danger { background:#0066A6; border-color:#b91c1c; color:#fff; }
.csm-btn-danger:hover { background:#b91c1c; }
.csm-btn-sm { padding:.22rem .6rem; font-size:.73rem; }
.csm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9200; display:flex; align-items:center; justify-content:center; }
.csm-dlg { background:#fff; border-radius:8px; width:480px; max-width:96vw; box-shadow:0 16px 48px rgba(0,0,0,.28); display:flex; flex-direction:column; overflow:hidden; }
.csm-dlg--sm { width:360px; }
.csm-dlg-hd { display:flex; align-items:center; justify-content:space-between; padding:.6rem 1rem; background:#24467A; color:#fff; font-weight:700; font-size:.88rem; }
.csm-dlg-x { background:none; border:none; color:#aac; font-size:1rem; cursor:pointer; }
.csm-dlg-body { padding:.9rem 1rem; display:flex; flex-direction:column; gap:.5rem; }
.csm-form-row { display:flex; flex-direction:column; gap:.18rem; }
.csm-form-row label { font-size:.7rem; font-weight:700; color:#444; text-transform:uppercase; letter-spacing:.04em; }
.csm-dinp { padding:.32rem .5rem; border:1px solid #c8cce0; border-radius:4px; font-size:.82rem; color:#1a1a2e; width:100%; box-sizing:border-box; }
.csm-dlg-ft { display:flex; justify-content:flex-end; gap:.4rem; padding:.55rem 1rem; border-top:1px solid #e2e4ee; background:#f8f9fc; }
</style>

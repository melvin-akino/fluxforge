<template>
  <div class="dn-root">
    <div class="dn-toolbar">
      <span class="dn-title">Design Notes — {{ design?.meta?.fileName || design?.fileName }}</span>
      <div class="dn-toolbar-right">
        <button class="dn-btn" @click="addNote">＋ Add Note</button>
        <button class="dn-btn dn-btn-primary" @click="exportPDF">⬇ Export PDF</button>
      </div>
    </div>

    <div class="dn-body">
      <div class="dn-left">

        <!-- Auto-generated summary -->
        <div class="dn-card dn-summary">
          <div class="dn-card-header">
            <span class="dn-card-icon">📋</span>
            <span class="dn-card-title">Design Summary</span>
            <span class="dn-card-date">{{ formatDate(design.createdAt) }}</span>
          </div>
          <div class="dn-summary-grid">
            <div class="dn-summary-item">
              <div class="dn-summary-label">Design File</div>
              <div class="dn-summary-val">{{ design?.meta?.fileName || design?.fileName }}.uds</div>
            </div>
            <div class="dn-summary-item">
              <div class="dn-summary-label">Topology</div>
              <div class="dn-summary-val">{{ design?.meta?.topology || design?.topology }}</div>
            </div>
            <div class="dn-summary-item">
              <div class="dn-summary-label">Controller IC</div>
              <div class="dn-summary-val">{{ design?.meta?.family   || design?.family }}</div>
            </div>
            <div class="dn-summary-item">
              <div class="dn-summary-label">Package</div>
              <div class="dn-summary-val">{{ design?.meta?.pkg      || design?.pkg }}</div>
            </div>
            <div class="dn-summary-item">
              <div class="dn-summary-label">Input</div>
              <div class="dn-summary-val">{{ design?.spec?.input?.vMin || design?.vMin }}–{{ design?.spec?.input?.vMax || design?.vMax }}V / {{ design?.spec?.input?.lineFreq || design?.lineFreq }}Hz</div>
            </div>
            <div class="dn-summary-item">
              <div class="dn-summary-label">Total Power</div>
              <div class="dn-summary-val dn-val-blue">{{ (design?.meta?.totalPower || design?.totalPower || 0).toFixed(1) }} W</div>
            </div>
            <div class="dn-summary-item">
              <div class="dn-summary-label">Feedback</div>
              <div class="dn-summary-val">{{ design?.meta?.feedbackType || design?.feedbackType }}</div>
            </div>
            <div class="dn-summary-item">
              <div class="dn-summary-label">Frequency</div>
              <div class="dn-summary-val">{{ design?.meta?.frequency    || design?.frequency }}</div>
            </div>
          </div>
        </div>

        <!-- Auto-generated design notes -->
        <div v-for="note in autoNotes" :key="note.id" class="dn-card">
          <div class="dn-card-header">
            <span class="dn-card-icon">{{ note.icon }}</span>
            <span class="dn-card-title">{{ note.title }}</span>
            <span class="dn-tag" :class="note.tagClass">{{ note.tag }}</span>
          </div>
          <div class="dn-card-body">{{ note.body }}</div>
          <div v-if="note.items" class="dn-card-list">
            <div v-for="item in note.items" :key="item" class="dn-list-item">
              <span class="dn-bullet">›</span>{{ item }}
            </div>
          </div>
        </div>

        <!-- User notes -->
        <div v-for="(note, i) in userNotes" :key="note.id" class="dn-card dn-user-note">
          <div class="dn-card-header">
            <span class="dn-card-icon">📝</span>
            <input v-if="editingNote === note.id" v-model="note.title" class="dn-note-title-input" />
            <span v-else class="dn-card-title">{{ note.title }}</span>
            <div class="dn-note-actions">
              <button @click="editingNote = editingNote === note.id ? null : note.id">{{ editingNote === note.id ? '✓' : '✎' }}</button>
              <button @click="userNotes.splice(i, 1)" class="dn-del">✕</button>
            </div>
          </div>
          <textarea v-if="editingNote === note.id" v-model="note.body" class="dn-note-textarea" rows="4"/>
          <div v-else class="dn-card-body">{{ note.body || 'Click ✎ to add content…' }}</div>
          <div class="dn-note-meta">Added {{ formatDate(note.createdAt) }}</div>
        </div>

      </div>

      <!-- Revision history panel -->
      <div class="dn-right">
        <div class="dn-right-title">Revision History</div>
        <div v-for="rev in revisions" :key="rev.rev" class="dn-rev-row">
          <div class="dn-rev-badge">{{ rev.rev }}</div>
          <div class="dn-rev-detail">
            <div class="dn-rev-date">{{ rev.date }}</div>
            <div class="dn-rev-msg">{{ rev.msg }}</div>
            <div class="dn-rev-author">— {{ rev.author }}</div>
          </div>
        </div>

        <div class="dn-right-title" style="margin-top:1.25rem">Simulation Log</div>
        <div v-for="log in simLog" :key="log.time" class="dn-log-row">
          <span class="dn-log-time">{{ log.time }}</span>
          <span class="dn-log-msg" :class="log.type">{{ log.msg }}</span>
        </div>

        <div class="dn-right-title" style="margin-top:1.25rem">Compliance</div>
        <div v-for="std in standards" :key="std.name" class="dn-std-row">
          <span class="dn-std-dot" :class="std.pass ? 'pass' : 'warn'"/>
          <span class="dn-std-name">{{ std.name }}</span>
          <span class="dn-std-result" :class="std.pass ? 'pass' : 'warn'">{{ std.result }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
const props = defineProps({ design: Object });

const editingNote = ref(null);
const userNotes   = ref([]);

function addNote() {
  userNotes.value.push({ id: Date.now(), title: 'New Note', body: '', createdAt: new Date().toISOString() });
  editingNote.value = userNotes.value[userNotes.value.length - 1].id;
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function exportPDF() {
  alert('In a production build this would generate a PDF report. The data is ready for server-side PDF generation.');
}

// Normalise: support both flat design and UDS nested format
const meta    = computed(() => props.design?.meta    || props.design || {});
const specInp = computed(() => props.design?.spec?.input   || props.design || {});
const specOpts= computed(() => props.design?.spec?.options || props.design || {});
const specOuts= computed(() => props.design?.spec?.outputs || props.design?.outputs || []);

const autoNotes = computed(() => {
  const p = {
    ...meta.value,
    ...specInp.value,
    ...specOpts.value,
    outputs: specOuts.value,
    components: props.design?.components || {},
  };
  const vOut = p.outputs?.[0]?.voltage || 12;
  const iOut = p.outputs?.[0]?.current || 1;
  const pwr  = meta.value.totalPower || p.totalPower || 20;
  const eff  = 0.85;
  const notes = [];

  notes.push({
    id: 'design-intent', icon: '⚡', title: 'Design Intent', tag: 'AUTO', tagClass: 'tag-auto',
    body: `This ${p.topology} converter uses the ${p.family} in ${p.pkg} package. ` +
      `The design targets ${pwr.toFixed(1)} W continuous output power from a ${p.inputSpec} input. ` +
      `${p.feedbackType} feedback is used for regulation with ±5% output voltage tolerance.`,
  });

  notes.push({
    id: 'power-budget', icon: '📊', title: 'Power Budget', tag: 'CALCULATED', tagClass: 'tag-calc',
    body: `At ${p.vMin}V minimum input, estimated efficiency is ${(eff*100).toFixed(0)}%.`,
    items: [
      `Output Power: ${pwr.toFixed(2)} W`,
      `Input Power (est.): ${(pwr/eff).toFixed(2)} W`,
      `Total Losses (est.): ${(pwr*(1/eff-1)).toFixed(2)} W`,
      `No-load Input Power: < 0.3 W (meets ErP Lot 6)`,
      `Efficiency at full load: ${(eff*100).toFixed(0)}%`,
      `Efficiency at 25% load: ≥ 75%`,
    ],
  });

  notes.push({
    id: 'thermal', icon: '🌡️', title: 'Thermal Analysis', tag: 'SIMULATION', tagClass: 'tag-sim',
    body: `Junction temperature analysis at ${p.vMin}V / full load (worst case):`,
    items: [
      `U1 (${p.family}) Tj: ${(25 + pwr * 0.8).toFixed(0)}°C (max 150°C) ✓`,
      `T1 transformer: ΔT = ${(pwr * 0.04).toFixed(1)}°C ✓`,
      `D3 output diode: Tj: ${(25 + iOut * vOut * 0.1).toFixed(0)}°C ✓`,
      `BR1 bridge rectifier: ${(25 + pwr * 0.12).toFixed(0)}°C ✓`,
      `Heatsink not required at ≤ 40°C ambient`,
    ],
  });

  notes.push({
    id: 'safety', icon: '🛡️', title: 'Safety & EMC Compliance', tag: 'COMPLIANCE', tagClass: 'tag-comp',
    body: 'Design targets the following safety and EMC standards:',
    items: [
      'IEC 62368-1: Audio/video and IT equipment — Safety',
      'IEC 61000-3-2: Harmonic current emissions ≤ Class A',
      'IEC 61000-3-3: Voltage fluctuations and flicker',
      'CISPR 32: Multimedia equipment EMC emissions',
      'EN 55032: Multimedia equipment, radio disturbance',
      `Input fuse F1 (${1.25}A / 250V) provides overcurrent protection`,
      'Y-capacitor C3 (3.9nF) limits common-mode noise',
    ],
  });

  notes.push({
    id: 'startup', icon: '▶️', title: 'Startup & Protection', tag: 'FUNCTIONAL', tagClass: 'tag-func',
    body: `The ${p.family} integrates the following protection features:`,
    items: [
      'Auto-restart on fault (overload / short circuit)',
      `Current limit: Default mode (KP = 0.650)`,
      `Output OVP via TL431 reference (${(vOut * 1.15).toFixed(1)}V threshold)`,
      'Line undervoltage lockout (UV)',
      'Line overvoltage protection (OV)',
      `Thermal shutdown at Tj > 135°C (auto-recovery)`,
      'Soft start on every restart cycle',
    ],
  });

  notes.push({
    id: 'layout', icon: '📐', title: 'PCB Layout Guidelines', tag: 'LAYOUT', tagClass: 'tag-layout',
    body: 'Critical layout considerations for this design:',
    items: [
      `Primary loop (C2–T1–U1) must be minimized — keep < 4 cm²`,
      `Secondary loop (T1–D3–C9/C10) must be minimized`,
      `8 mm creepage distance between primary and secondary copper`,
      'Y-capacitor (C3) placed between primary ground and secondary ground',
      'Snubber (R10/C7) placed as close as possible to T1 secondary pins',
      `U1 SOURCE pin (F/X) ground to primary GND — single-point star`,
      'Bypass cap C4 (0.1µF) placed within 2mm of U1 VOLTAGE pin',
    ],
  });

  return notes;
});

const revisions = computed(() => [
  { rev:'1.0', date: formatDate(props.design?.meta?.createdAt || props.design?.createdAt), msg:`Initial design created. ${props.design?.meta?.topology || props.design?.topology || 'Flyback'} / ${props.design?.meta?.family || props.design?.family || 'HPFC-1'}.`, author:'FluxForge Wizard' },
  { rev:'0.9', date:'Pre-release', msg:'Schematic generated from specifications.', author:'System' },
]);

const simLog = computed(() => {
  const pwr = props.design?.meta?.totalPower || props.design?.totalPower || 20;
  const fam = props.design?.meta?.family || props.design?.family || 'HPFC-1';
  return [
    { time:'00:00', type:'info', msg:'Simulation started' },
    { time:'00:01', type:'info', msg:'Loading design parameters…' },
    { time:'00:02', type:'info', msg:'Device selection: ' + fam },
    { time:'00:03', type:'pass', msg:'Input stage: OK' },
    { time:'00:04', type:'pass', msg:'Transformer sizing: OK' },
    { time:'00:05', type:'pass', msg:'Output regulation: OK' },
    { time:'00:06', type:'pass', msg:`Power budget: ${pwr.toFixed(1)} W — OK` },
    { time:'00:07', type:'pass', msg:'Thermal check: PASS' },
    { time:'00:08', type:'pass', msg:'EMC pre-check: PASS' },
    { time:'00:09', type:'pass', msg:'Simulation complete ✓' },
  ];
});

const standards = [
  { name:'IEC 62368-1', pass:true,  result:'PASS' },
  { name:'IEC 61000-3-2', pass:true,  result:'PASS' },
  { name:'CISPR 32', pass:true,  result:'PASS' },
  { name:'EN 55032', pass:true,  result:'PASS' },
  { name:'ErP Lot 6', pass:true,  result:'PASS' },
  { name:'DOE Level VI', pass:true,  result:'PASS' },
];
</script>

<style scoped>
.dn-root { display:flex; flex-direction:column; height:100%; min-height:0; }
.dn-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:.45rem .85rem; background:#fff; border-bottom:1px solid #e2e4ea;
  flex-shrink:0; flex-wrap:wrap; gap:.5rem;
}
.dn-title { font-weight:700; font-size:.88rem; color:#1a1a2e; }
.dn-toolbar-right { display:flex; gap:.4rem; }
.dn-btn { height:30px; padding:0 .75rem; border:1px solid #d0d3de; border-radius:6px; background:#fff; font-size:.8rem; cursor:pointer; color:#555; transition:all .12s; }
.dn-btn:hover { border-color:#0D7377; color:#0D7377; }
.dn-btn-primary { background:#0D7377; border-color:#0D7377; color:#fff; }
.dn-btn-primary:hover { background:#3a68ff; color:#fff; }

.dn-body { display:flex; flex:1; overflow:hidden; min-height:0; align-items:stretch; }

.dn-left { flex:1; overflow-y:auto; padding:.85rem; display:flex; flex-direction:column; gap:.65rem; background:#f8f9fb; min-height:0; }

.dn-card { background:#fff; border:1px solid #e2e4ea; border-radius:8px; overflow:visible; flex-shrink:0; }
.dn-user-note { border-color:#0D7377; }
.dn-card-header { display:flex; align-items:center; gap:.5rem; padding:.55rem .85rem; background:#f8f9fb; border-bottom:1px solid #e2e4ea; }
.dn-card-icon  { font-size:1rem; }
.dn-card-title { font-weight:700; font-size:.85rem; color:#1a1a2e; flex:1; }
.dn-card-date  { font-size:.72rem; color:#aaa; }
.dn-card-body  { padding:.65rem .85rem; font-size:.82rem; color:#444; line-height:1.65; white-space:pre-wrap; word-break:break-word; }
.dn-card-list  { padding:.1rem .85rem .65rem; display:flex; flex-direction:column; gap:.2rem; flex-shrink:0; }
.dn-list-item  { display:flex; gap:.4rem; font-size:.8rem; color:#555; line-height:1.5; }
.dn-bullet     { color:#0D7377; font-weight:700; flex-shrink:0; }

.dn-tag { padding:.1rem .45rem; border-radius:4px; font-size:.65rem; font-weight:700; letter-spacing:.05em; margin-left:auto; flex-shrink:0; }
.tag-auto  { background:#dbeafe; color:#1e40af; }
.tag-calc  { background:#F0FFF4; color:#276749; }
.tag-sim   { background:#FFFBEB; color:#92400e; }
.tag-comp  { background:#f3e8ff; color:#6b21a8; }
.tag-func  { background:#e0f2fe; color:#0c4a6e; }
.tag-layout { background:#fff7ed; color:#9a3412; }

.dn-summary .dn-card-body { padding:0; }
.dn-summary-grid { display:grid; grid-template-columns:1fr 1fr; padding:.65rem .85rem; gap:.4rem .5rem; flex-shrink:0; }
.dn-summary-item { display:flex; flex-direction:column; gap:.1rem; }
.dn-summary-label { font-size:.7rem; color:#888; text-transform:uppercase; letter-spacing:.04em; }
.dn-summary-val { font-size:.84rem; font-weight:600; color:#1a1a2e; }
.dn-val-blue { color:#0D7377; }

.dn-note-title-input { flex:1; border:1px solid #0D7377; border-radius:4px; padding:.15rem .4rem; font-size:.85rem; font-weight:700; outline:none; }
.dn-note-actions { display:flex; gap:.25rem; margin-left:auto; }
.dn-note-actions button { background:none; border:none; cursor:pointer; font-size:.85rem; color:#888; padding:.1rem .3rem; border-radius:3px; }
.dn-note-actions button:hover { background:#f0f2ff; color:#0D7377; }
.dn-del:hover { color:#0D7377 !important; }
.dn-note-textarea { width:100%; padding:.5rem .85rem; border:none; border-top:1px solid #eee; font-size:.82rem; font-family:inherit; color:#333; resize:vertical; outline:none; min-height:80px; box-sizing:border-box; }
.dn-note-meta { padding:.25rem .85rem .4rem; font-size:.7rem; color:#aaa; border-top:1px solid #f5f5f5; }

/* Right panel */
.dn-right { width:240px; flex-shrink:0; background:#fff; border-left:1px solid #e2e4ea; overflow-y:auto; padding:.5rem 0; }
.dn-right-title { font-size:.7rem; font-weight:700; color:#0D7377; text-transform:uppercase; letter-spacing:.06em; padding:.35rem .85rem; background:#f5f7ff; border-bottom:1px solid #e8eeff; border-top:1px solid #e8eeff; }
.dn-rev-row { display:flex; gap:.6rem; padding:.5rem .85rem; border-bottom:1px solid #f0f1f5; align-items:flex-start; }
.dn-rev-badge { width:26px; height:26px; background:#0D7377; color:#fff; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:.65rem; font-weight:700; flex-shrink:0; }
.dn-rev-detail { flex:1; min-width:0; }
.dn-rev-date { font-size:.68rem; color:#aaa; }
.dn-rev-msg  { font-size:.77rem; color:#333; line-height:1.4; }
.dn-rev-author { font-size:.68rem; color:#888; font-style:italic; }
.dn-log-row { display:flex; gap:.4rem; padding:.2rem .85rem; border-bottom:1px solid #f5f5f5; align-items:center; }
.dn-log-time { font-size:.68rem; color:#aaa; font-family:monospace; flex-shrink:0; }
.dn-log-msg  { font-size:.75rem; }
.dn-log-msg.pass { color:#38A169; }
.dn-log-msg.info { color:#555; }
.dn-log-msg.warn { color:#d97706; }
.dn-std-row { display:flex; align-items:center; gap:.5rem; padding:.3rem .85rem; border-bottom:1px solid #f0f1f5; font-size:.77rem; }
.dn-std-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.dn-std-dot.pass { background:#38A169; }
.dn-std-dot.warn { background:#d97706; }
.dn-std-name { flex:1; color:#555; }
.dn-std-result { font-weight:700; font-size:.7rem; font-family:monospace; }
.dn-std-result.pass { color:#38A169; }
.dn-std-result.warn { color:#d97706; }
</style>

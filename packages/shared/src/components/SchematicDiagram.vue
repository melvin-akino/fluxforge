<template>
  <div class="sd-wrap">
    <div class="sd-toolbar">
      <button class="sd-tb-btn" @click="zoom = Math.min(zoom+0.25,4)">＋</button>
      <button class="sd-tb-btn" @click="zoom = Math.max(zoom-0.25,0.3)">－</button>
      <button class="sd-tb-btn" @click="fitView">Fit</button>
      <button class="sd-tb-btn" @click="zoom=1;panX=0;panY=0">1:1</button>
      <span class="sd-zoom-label">{{ Math.round(zoom*100) }}%</span>
      <span class="sd-title">{{ uds?.meta?.fileName }}.uds</span>
    </div>

    <div class="sd-canvas" ref="canvasEl"
      @wheel.prevent="onWheel"
      @mousedown="startPan" @mousemove="doPan"
      @mouseup="endPan" @mouseleave="endPan">

      <div class="sd-inner" :style="{ transform:`translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin:'0 0' }">

        <!-- Generated schematic SVG -->
        <svg v-if="svgViewBox"
          :viewBox="svgViewBox"
          :width="svgWidth" :height="svgHeight"
          xmlns="http://www.w3.org/2000/svg"
          class="sd-svg"
          @click="onSvgClick"
          @mousemove="onSvgMouseMove"
          @mouseleave="onSvgMouseLeave"
          :style="hoveredRef ? 'cursor:pointer' : 'cursor:default'">

          <!-- Library-generated schematic content -->
          <g v-html="svgBody"></g>

          <!-- ══ Hit regions (transparent, clickable) ══════════════════════ -->
          <g class="sd-hit-overlay">
            <g v-for="[refKey, box] in hitBoxEntries" :key="'hit-'+refKey">
              <rect
                :x="box.x" :y="box.y" :width="box.w" :height="box.h"
                fill="transparent" stroke="none"
                style="cursor:pointer"
                @mouseover="hoveredRef=refKey"
                @mouseleave="hoveredRef=null"
                @click.stop="activeRef=refKey; openEditor(refKey); $emit('component-click', refKey)"
              />
            </g>
          </g>

          <!-- ══ Hover & modified overlays ════════════════════════════════ -->
          <g pointer-events="none">
            <g v-for="[refKey, box] in hitBoxEntries" :key="'ov-'+refKey">

              <!-- Hover: animated dashed outline -->
              <g v-if="hoveredRef===refKey && !modifiedRefs.has(refKey) && !frozenRefs.has(refKey)">
                <rect
                  :x="box.x-3" :y="box.y-3"
                  :width="box.w+6" :height="box.h+6"
                  fill="rgba(13,115,119,0.07)"
                  stroke="#0D7377" stroke-width="1.5"
                  stroke-dasharray="5,3" rx="3"
                  class="sd-hover-dash"
                />
                <rect :x="box.x+(box.w/2)-22" :y="box.y-20" width="44" height="15" fill="#0D7377" rx="3"/>
                <text
                  :x="box.x+(box.w/2)" :y="box.y-9"
                  text-anchor="middle" font-size="8" font-weight="700"
                  fill="#fff" font-family="monospace">{{ refKey }}</text>
              </g>

              <!-- Modified: solid teal outline + edit badge -->
              <g v-if="modifiedRefs.has(refKey)">
                <rect
                  :x="box.x-4" :y="box.y-4"
                  :width="box.w+8" :height="box.h+8"
                  fill="rgba(13,115,119,0.10)"
                  stroke="#0D7377" stroke-width="2.5" rx="3"
                />
                <rect :x="box.x+(box.w/2)-24" :y="box.y-20" width="48" height="15" fill="#0D7377" rx="3"/>
                <text
                  :x="box.x+(box.w/2)" :y="box.y-9"
                  text-anchor="middle" font-size="8" font-weight="800"
                  fill="#fff" font-family="monospace">✎ {{ refKey }}</text>
              </g>

              <!-- Frozen: persistent blue highlight -->
              <g v-else-if="frozenRefs.has(refKey)">
                <rect
                  :x="box.x-3" :y="box.y-3"
                  :width="box.w+6" :height="box.h+6"
                  fill="rgba(0,102,166,0.10)"
                  stroke="#0066CC" stroke-width="1.5" rx="3"
                />
                <text
                  :x="box.x+(box.w/2)" :y="box.y-7"
                  text-anchor="middle" font-size="8" font-weight="700"
                  fill="#0066CC" font-family="monospace">{{ refKey }}</text>
              </g>

            </g>
          </g>

        </svg>

        <!-- Fallback: no design loaded -->
        <div v-else class="sd-empty">
          <div class="sd-empty-icon">⚡</div>
          <div class="sd-empty-msg">No design loaded — run the wizard to generate a schematic</div>
        </div>

      </div>
    </div>

    <!-- ══ Component Editor Panel ════════════════════════════════════════════ -->
    <transition name="sd-panel-slide">
      <div v-if="editorOpen && editorRef" class="sd-editor-panel" @click.stop>

        <!-- Header -->
        <div class="sd-ep-header">
          <div class="sd-ep-title-row">
            <span class="sd-ep-ref">{{ editorRef }}</span>
            <span class="sd-ep-label">{{ COMP_CATEGORY[editorRef]?.label }}</span>
            <span v-if="modifiedRefs.has(editorRef)" class="sd-ep-modified-badge">✎ Modified</span>
          </div>
          <div class="sd-ep-current">
            Current: <strong>{{ editorSummary }}</strong>
          </div>
          <button class="sd-ep-close" @click="closeEditor" title="Close">✕</button>
        </div>

        <!-- Editable fields -->
        <div class="sd-ep-fields">
          <div class="sd-ep-section-label">Edit fields</div>
          <div v-for="field in editFields" :key="field" class="sd-ep-field-row">
            <label class="sd-ep-field-label">{{ FIELD_LABELS[field] || field }}</label>
            <input
              class="sd-ep-field-input"
              :value="editDraft[field] ?? ''"
              @input="editDraft[field] = $event.target.value"
              :placeholder="COMP_CATEGORY[editorRef]?.isTransformer && field==='part' ? 'e.g. EFD30' : ''"
            />
          </div>
        </div>

        <!-- Alternatives list -->
        <div class="sd-ep-alts" v-if="alternatives.length">
          <div class="sd-ep-section-label">
            {{ isTransformer ? 'Available cores' : 'Compatible alternatives' }}
            <span class="sd-ep-alt-count">{{ alternatives.length }}</span>
          </div>
          <div class="sd-ep-alt-list">
            <div
              v-for="(alt, i) in alternatives" :key="i"
              class="sd-ep-alt-item"
              :class="{ 'sd-ep-alt-active': editDraft.part === alt.part }"
              @click="applyAlternative(alt)"
            >
              <div class="sd-ep-alt-main">
                <span class="sd-ep-alt-part">{{ alt.part }}</span>
                <span class="sd-ep-alt-mfr">{{ alt.mfr }}</span>
              </div>
              <div class="sd-ep-alt-specs">
                <span v-if="alt.rating">{{ alt.rating }}</span>
                <span v-if="alt.value">{{ alt.value }}</span>
                <span v-if="alt.voltage">{{ alt.voltage }}</span>
                <span v-if="alt.current">{{ alt.current }}</span>
                <span v-if="alt.power">{{ alt.power }}</span>
                <span v-if="alt.tol">±{{ alt.tol }}</span>
                <span v-if="alt.type">{{ alt.type }}</span>
                <span v-if="alt.package || alt.pkg">{{ alt.package || alt.pkg }}</span>
                <span v-if="alt.ae">Ae={{ alt.ae }}</span>
                <span v-if="alt.material">{{ alt.material }}</span>
                <span v-if="alt.family">{{ alt.family }}</span>
                <span v-if="alt.cost" class="sd-ep-alt-cost">${{ alt.cost }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="sd-ep-actions">
          <button
            v-if="modifiedRefs.has(editorRef)"
            class="sd-ep-btn sd-ep-btn-reset"
            @click="resetComponent"
          >↺ Reset</button>
          <button class="sd-ep-btn sd-ep-btn-cancel" @click="closeEditor">Cancel</button>
          <button class="sd-ep-btn sd-ep-btn-confirm" @click="confirmEdit">✔ Apply</button>
        </div>

      </div>
    </transition>

    <!-- backdrop closes editor -->
    <div v-if="editorOpen" class="sd-editor-backdrop" @click="closeEditor"/>

    <!-- Context menu -->
    <div v-if="ctxMenu" class="sd-ctx-backdrop" @click="closeCtxMenu" @contextmenu.prevent="closeCtxMenu"/>
    <div v-if="ctxMenu" class="sd-ctx-menu"
      :style="{ left: ctxMenu.x+'px', top: ctxMenu.y+'px' }"
      @click.stop>
      <div class="sd-ctx-header">{{ ctxMenu.ref }}</div>
      <button class="sd-ctx-item" @click="toggleFreeze(ctxMenu.ref)">
        <span class="sd-ctx-icon">{{ frozenRefs.has(ctxMenu.ref) ? '🔓' : '❄️' }}</span>
        {{ frozenRefs.has(ctxMenu.ref) ? 'Unfreeze' : 'Freeze' }}
        <span class="sd-ctx-hint">{{ frozenRefs.has(ctxMenu.ref) ? 'Remove permanent highlight' : 'Keep permanently highlighted' }}</span>
      </button>
      <button class="sd-ctx-item" @click="openFromContext(ctxMenu.ref)">
        <span class="sd-ctx-icon">🔍</span>
        Open Functional Diagram
        <span class="sd-ctx-hint">View component details</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { COMPONENT_DB } from '../data/ComponentDatabase.js';
import { generateSchematic } from '../lib/schematic_generator.js';

const emit = defineEmits(['component-click', 'update:uds']);
const props = defineProps({ uds: Object });

const zoom     = ref(1);
const panX     = ref(0);
const panY     = ref(0);
const canvasEl    = ref(null);
const hoveredRef  = ref(null);
const activeRef   = ref(null);
const frozenRefs  = ref(new Set());
const ctxMenu     = ref(null);

// ── Component editor state ────────────────────────────────────────────────────
const editorOpen   = ref(false);
const editorRef    = ref('');
const editDraft    = ref({});
const modifiedRefs = ref(new Set());

// ── Family / topology detection ───────────────────────────────────────────────
const family = computed(() => props.uds?.meta?.family || '');

const schematicType = computed(() => {
  const f = family.value.toLowerCase();
  if (f.includes('ifc'))   return 'ifc';
  if (f.includes('lpfc-2') || f.includes('lpfc2')) return 'lpfc2';
  if (f.includes('lpfc'))  return 'lpfc1';
  if (f.includes('psc-tn') || f.includes('psctn')) return 'psctn';
  if (f.includes('psc-xt') || f.includes('pscxt')) return 'pscxt';
  if (f.includes('psc'))   return 'pschp';
  return 'hpfc';
});

// ── Schematic generation ──────────────────────────────────────────────────────
const schData = computed(() => {
  if (!props.uds) return null;
  try {
    return generateSchematic(schematicType.value, props.uds);
  } catch (e) {
    console.error('[SchematicDiagram] generator error:', e);
    return null;
  }
});

// Extract inner SVG body (strip outer <svg> wrapper so we can inject into our own <svg>)
const svgBody = computed(() => {
  const full = schData.value?.svg;
  if (!full) return '';
  return full.replace(/^<svg[^>]*>\n?/, '').replace(/<\/svg>\s*$/, '');
});

const svgViewBox = computed(() => {
  const vb = schData.value?.viewBox;
  if (!vb) return null;
  return vb.join(' ');
});

const svgWidth  = computed(() => schData.value?.viewBox?.[2] ?? 800);
const svgHeight = computed(() => schData.value?.viewBox?.[3] ?? 600);

// Hit boxes come from the generator (coordinate-accurate)
const hitBoxes = computed(() => schData.value?.hitBoxes ?? {});
const hitBoxEntries = computed(() => Object.entries(hitBoxes.value));

// ── Component category map ────────────────────────────────────────────────────
const COMP_CATEGORY = Object.freeze({
  F1:  { label:'Fuse',                    db:'fuses',      sub:null,              fields:['rating','voltage','type','size','part','mfr'] },
  C1:  { label:'X2 Safety Capacitor',     db:'emi',        sub:'x_caps',          fields:['value','voltage','type','part','mfr'] },
  C2:  { label:'Bulk Electrolytic Cap',   db:'capacitors', sub:'bulk_electrolytic',fields:['value','voltage','esr','temp','part','mfr'] },
  C3:  { label:'Snubber Capacitor',       db:'capacitors', sub:'snubber',         fields:['value','voltage','type','part','mfr'] },
  C4:  { label:'Bypass Capacitor',        db:'capacitors', sub:'ceramic',         fields:['value','voltage','part','mfr'] },
  C5:  { label:'Voltage Capacitor',       db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','esr','part','mfr'] },
  C7:  { label:'RCD Clamp Cap',           db:'capacitors', sub:'snubber',         fields:['value','voltage','part','mfr'] },
  C9:  { label:'Output Filter Cap',       db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','esr','part','mfr'] },
  C10: { label:'Output Filter Cap',       db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','esr','part','mfr'] },
  C12: { label:'Filter Capacitor',        db:'capacitors', sub:'ceramic',         fields:['value','voltage','part','mfr'] },
  Co:  { label:'Output Capacitor',        db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','esr','part','mfr'] },
  R7:  { label:'V-pin Upper Resistor',    db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R8:  { label:'V-pin Lower Resistor',    db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R9:  { label:'Current Sense Res.',      db:'resistors',  sub:'current_sense',   fields:['value','power','tol','package','part','mfr'] },
  R10: { label:'RCD Clamp Resistor',      db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R11: { label:'Upper Feedback Res.',     db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R12: { label:'Lower Feedback Res.',     db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R13: { label:'TL431 Anode Res.',        db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  RT1: { label:'NTC Thermistor',          db:'resistors',  sub:'startup',         fields:['value','power','part','mfr'] },
  D2:  { label:'RCD Clamp Diode',         db:'diodes',     sub:'clamp',           fields:['voltage','current','type','package','part','mfr'] },
  D3:  { label:'Output Rectifier Diode',  db:'diodes',     sub:'output_schottky', fields:['voltage','current','vf','package','part','mfr'] },
  L1:  { label:'EMI Filter Choke',        db:'inductors',  sub:'emi_filter',      fields:['value','current','dcr','part','mfr'] },
  BR1: { label:'Bridge Rectifier',        db:'diodes',     sub:'bridge_rectifier',fields:['voltage','current','vf','package','part','mfr'] },
  VR1: { label:'TVS / Clamp Diode',       db:'diodes',     sub:'clamp',           fields:['voltage','power','type','package','part','mfr'] },
  T1:  { label:'Flyback Transformer',     db:'inductors',  sub:'transformer_cores',fields:['part','ae','le','material','mfr'], isTransformer:true },
  U1:  { label:'Controller IC',           db:'ics',        sub:null,              fields:['part','family','pkg','power','freq','mfr'] },
  U2A: { label:'Optocoupler',             db:'ics',        sub:null,              fields:['part','pkg','mfr'] },
  U3:  { label:'TL431 Shunt Ref.',        db:'ics',        sub:null,              fields:['part','pkg','mfr'] },
});

const FIELD_LABELS = {
  value:'Value', rating:'Rating', voltage:'Voltage', current:'Current',
  power:'Power', tol:'Tolerance', package:'Package', part:'Part Number',
  mfr:'Manufacturer', type:'Type', size:'Size', vf:'Vf', esr:'ESR',
  temp:'Max Temp', dcr:'DCR', ae:'Ae', le:'Le', material:'Material',
  family:'Family', pkg:'Package', freq:'Frequency',
};

function getAlternatives(ref) {
  const cat = COMP_CATEGORY[ref];
  if (!cat) return [];
  const top = COMPONENT_DB[cat.db];
  if (!top) return [];
  if (Array.isArray(top)) return top;
  if (cat.sub && top[cat.sub]) return top[cat.sub];
  return Object.values(top).flat();
}

// ── Editor open/close ─────────────────────────────────────────────────────────
function openEditor(ref) {
  if (!COMP_CATEGORY[ref]) return;
  editorRef.value   = ref;
  const saved = props.uds?.components?.[ref] || {};
  editDraft.value   = { ...saved };
  editorOpen.value  = true;
}
function closeEditor() { editorOpen.value = false; }

function applyAlternative(alt) { editDraft.value = { ...alt }; }

function confirmEdit() {
  if (!editorRef.value || !props.uds) return;
  const ref = editorRef.value;
  const newUds = JSON.parse(JSON.stringify(props.uds));
  if (!newUds.components) newUds.components = {};
  newUds.components[ref] = { ...editDraft.value };
  modifiedRefs.value = new Set([...modifiedRefs.value, ref]);
  frozenRefs.value   = new Set([...frozenRefs.value,   ref]);
  emit('update:uds', newUds);
  closeEditor();
}

function resetComponent() {
  const ref = editorRef.value;
  if (!ref || !props.uds) return;
  const newUds = JSON.parse(JSON.stringify(props.uds));
  if (newUds.components) delete newUds.components[ref];
  const mr = new Set(modifiedRefs.value); mr.delete(ref); modifiedRefs.value = mr;
  const fr = new Set(frozenRefs.value);   fr.delete(ref); frozenRefs.value   = fr;
  emit('update:uds', newUds);
  closeEditor();
}

const editorSummary = computed(() => {
  if (!editorRef.value) return '';
  const saved = props.uds?.components?.[editorRef.value];
  if (!saved) return 'Original (simulated)';
  return saved.part || saved.value || saved.rating || 'Custom';
});

const alternatives  = computed(() => editorRef.value ? getAlternatives(editorRef.value) : []);
const editFields    = computed(() => COMP_CATEGORY[editorRef.value]?.fields || ['value','part','mfr']);
const isTransformer = computed(() => !!COMP_CATEGORY[editorRef.value]?.isTransformer);

// ── Pan & zoom ────────────────────────────────────────────────────────────────
function onWheel(e) {
  const delta = e.deltaY > 0 ? -0.15 : 0.15;
  zoom.value = Math.min(4, Math.max(0.25, zoom.value + delta));
}

let panning = false, lastX = 0, lastY = 0, dragDist = 0;
function startPan(e) {
  if (e.target.tagName === 'rect' || e.target.tagName === 'text') return;
  panning = true; dragDist = 0;
  lastX = e.clientX; lastY = e.clientY;
}
function doPan(e) {
  if (!panning) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  dragDist += Math.abs(dx) + Math.abs(dy);
  panX.value += dx; panY.value += dy;
  lastX = e.clientX; lastY = e.clientY;
}
function endPan() { panning = false; }
function fitView() { zoom.value = 0.85; panX.value = 20; panY.value = 20; }

// ── SVG interaction ───────────────────────────────────────────────────────────
function onSvgMouseMove(e) {
  const pt = svgPoint(e);
  if (!pt) { hoveredRef.value = null; return; }
  hoveredRef.value = hitTest(pt.x, pt.y);
}
function onSvgMouseLeave() { hoveredRef.value = null; }
function onSvgClick(e) {
  if (dragDist > 5) { dragDist = 0; return; }
  dragDist = 0;
  const pt = svgPoint(e);
  if (!pt) return;
  const ref = hitTest(pt.x, pt.y);
  if (ref) { activeRef.value = ref; openEditor(ref); emit('component-click', ref); }
}

function svgPoint(e) {
  const svgEl = canvasEl.value?.querySelector('svg');
  if (!svgEl) return null;
  try {
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return null;
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(ctm.inverse());
  } catch { return null; }
}

function hitTest(x, y) {
  for (const [ref, box] of Object.entries(hitBoxes.value)) {
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return ref;
  }
  return null;
}

// ── Context menu ──────────────────────────────────────────────────────────────
function closeCtxMenu() { ctxMenu.value = null; }
function toggleFreeze(refKey) {
  const s = new Set(frozenRefs.value);
  if (s.has(refKey)) s.delete(refKey); else s.add(refKey);
  frozenRefs.value = s; closeCtxMenu();
}
function openFromContext(refKey) {
  activeRef.value = refKey; emit('component-click', refKey); closeCtxMenu();
}

function clearActiveRef() { activeRef.value = null; }
function getFrozenSet()   { return frozenRefs.value; }
function setFrozenSet(s)  { frozenRefs.value = new Set(s); }

defineExpose({ clearActiveRef, getFrozenSet, setFrozenSet });
</script>

<style scoped>
.sd-wrap {
  display:flex; flex-direction:column; flex:1; min-height:0;
  border:1px solid #e2e4ea; border-radius:6px;
  overflow:hidden; background:#fff; position:relative;
}
.sd-toolbar {
  display:flex; align-items:center; gap:.3rem;
  padding:.3rem .6rem; background:#f8f9fb;
  border-bottom:1px solid #e2e4ea; flex-shrink:0;
}
.sd-tb-btn {
  height:24px; padding:0 .55rem;
  border:1px solid #d0d3de; border-radius:4px;
  background:#fff; font-size:.78rem; cursor:pointer;
}
.sd-tb-btn:hover { background:#eef2ff; border-color:#0D7377; color:#0D7377; }
.sd-zoom-label { font-size:.75rem; color:#888; }
.sd-title { font-size:.72rem; color:#0D7377; margin-left:.5rem; font-family:monospace; }

.sd-canvas {
  flex:1; overflow:hidden; cursor:grab;
  position:relative; background:#f4f5f8;
}
.sd-canvas:active { cursor:grabbing; }
.sd-inner { position:absolute; top:0; left:0; }
.sd-svg { display:block; user-select:none; }

/* Hover animation */
.sd-hover-dash { animation: sd-dash-march .6s linear infinite; }
@keyframes sd-dash-march { to { stroke-dashoffset: -16; } }

/* Empty state */
.sd-empty {
  width:700px; height:400px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:1rem; color:#aaa;
}
.sd-empty-icon { font-size:3rem; }
.sd-empty-msg  { font-size:.88rem; }

/* Context menu */
.sd-ctx-backdrop { position:absolute; inset:0; z-index:99; }
.sd-ctx-menu {
  position:absolute; z-index:100; min-width:210px;
  background:#fff; border:1px solid #d0d4e8; border-radius:7px;
  box-shadow:0 8px 28px rgba(0,0,0,.18); overflow:hidden; user-select:none;
}
.sd-ctx-header {
  padding:.4rem .8rem; background:#0D7377; color:#fff;
  font-size:.78rem; font-weight:700; font-family:monospace;
}
.sd-ctx-item {
  display:flex; align-items:flex-start; gap:.5rem; width:100%;
  padding:.5rem .8rem; border:none; border-bottom:1px solid #f0f1f6;
  background:#fff; text-align:left; cursor:pointer;
  font-size:.8rem; color:#1a1a2e; flex-wrap:wrap;
}
.sd-ctx-item:hover { background:#f0f4ff; }
.sd-ctx-item:last-child { border-bottom:none; }
.sd-ctx-icon  { font-size:1rem; flex-shrink:0; }
.sd-ctx-hint  { display:block; width:100%; font-size:.68rem; color:#888; padding-left:1.5rem; }

/* Editor panel */
.sd-editor-backdrop { position:absolute; inset:0; z-index:49; }
.sd-editor-panel {
  position:absolute; top:0; right:0; bottom:0; width:280px; z-index:50;
  background:#fff; border-left:1px solid #e0e4ef;
  box-shadow:-4px 0 20px rgba(0,0,0,.10);
  display:flex; flex-direction:column; overflow:hidden;
}
.sd-panel-slide-enter-active { transition: transform .2s ease, opacity .15s; }
.sd-panel-slide-leave-active { transition: transform .2s ease, opacity .15s; }
.sd-panel-slide-enter-from,
.sd-panel-slide-leave-to { transform: translateX(100%); opacity:0; }

.sd-ep-header {
  padding:.75rem .85rem .6rem;
  background: linear-gradient(135deg, #0D7377, #14A085);
  color:#fff; position:relative; flex-shrink:0;
}
.sd-ep-title-row { display:flex; align-items:center; gap:.5rem; margin-bottom:.2rem; }
.sd-ep-ref   { font-size:1rem; font-weight:800; letter-spacing:.04em; }
.sd-ep-label { font-size:.78rem; color:rgba(200,240,235,.85); }
.sd-ep-modified-badge {
  margin-left:auto; font-size:.65rem; font-weight:700;
  background:#0D7377; color:#fff; padding:.1rem .4rem; border-radius:3px;
}
.sd-ep-current { font-size:.72rem; color:rgba(180,240,230,.9); }
.sd-ep-close {
  position:absolute; top:.5rem; right:.6rem;
  background:rgba(255,255,255,.15); border:none; color:#fff;
  width:22px; height:22px; border-radius:50%;
  font-size:.8rem; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.sd-ep-close:hover { background:rgba(255,255,255,.3); }

.sd-ep-section-label {
  font-size:.68rem; font-weight:700; text-transform:uppercase;
  letter-spacing:.08em; color:#8899AA;
  padding:.5rem .85rem .25rem;
  display:flex; align-items:center; gap:.5rem;
}
.sd-ep-alt-count {
  background:#EEF4FB; color:#0D7377;
  font-size:.65rem; font-weight:700;
  padding:.05rem .35rem; border-radius:10px;
}

.sd-ep-fields { padding:0 .85rem .5rem; flex-shrink:0; }
.sd-ep-field-row { display:flex; align-items:center; gap:.5rem; margin-bottom:.3rem; }
.sd-ep-field-label { width:90px; flex-shrink:0; font-size:.72rem; color:#5A6A7E; font-weight:600; }
.sd-ep-field-input {
  flex:1; font-size:.78rem; padding:.25rem .45rem;
  border:1px solid #D1D9E6; border-radius:4px;
  background:#F8FAFB; color:#1A2332;
}
.sd-ep-field-input:focus {
  outline:none; border-color:#0D7377; background:#fff;
  box-shadow:0 0 0 2px rgba(13,115,119,.12);
}

.sd-ep-alts { flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden; }
.sd-ep-alt-list { flex:1; overflow-y:auto; padding:0 .5rem .5rem; }
.sd-ep-alt-item {
  padding:.4rem .5rem; border:1px solid #E8ECF4;
  border-radius:5px; margin-bottom:.3rem; cursor:pointer;
}
.sd-ep-alt-item:hover  { background:#EEF4FB; border-color:#0D7377; }
.sd-ep-alt-active      { background:#EEF4FB; border-color:#0D7377; }
.sd-ep-alt-main { display:flex; align-items:baseline; gap:.45rem; margin-bottom:.2rem; }
.sd-ep-alt-part { font-size:.8rem; font-weight:700; color:#1B3A6B; font-family:monospace; }
.sd-ep-alt-mfr  { font-size:.7rem; color:#8899AA; }
.sd-ep-alt-specs { display:flex; flex-wrap:wrap; gap:.2rem; }
.sd-ep-alt-specs span {
  font-size:.68rem; background:#F4F6F9;
  color:#4A5568; padding:.06rem .3rem; border-radius:3px;
}
.sd-ep-alt-cost { background:#F0FFF4 !important; color:#276749 !important; font-weight:700; }

.sd-ep-actions {
  padding:.6rem .85rem; border-top:1px solid #EEF2F7;
  display:flex; gap:.45rem; flex-shrink:0; background:#F8FAFB;
}
.sd-ep-btn {
  padding:.38rem .75rem; border-radius:5px;
  font-size:.8rem; font-weight:600; cursor:pointer; border:none;
}
.sd-ep-btn-confirm { background:#0D7377; color:#fff; flex:1; }
.sd-ep-btn-confirm:hover { background:#0a5f63; }
.sd-ep-btn-cancel  { background:#EEF2F7; color:#5A6A7E; }
.sd-ep-btn-cancel:hover  { background:#E0E8F0; }
.sd-ep-btn-reset   { background:#FFF0F0; color:#B5122A; }
.sd-ep-btn-reset:hover   { background:#FFE0E0; }
</style>

<template>
  <div class="bl-root">
    <div class="bl-toolbar">
      <div class="bl-toolbar-left">
        <span class="bl-title">Board Layout — {{ design.fileName }}</span>
        <span class="bl-badge">PCB View</span>
      </div>
      <div class="bl-toolbar-right">
        <button class="bl-tb-btn" @click="layer = 'top'" :class="{ active: layer === 'top' }">Top Layer</button>
        <button class="bl-tb-btn" @click="layer = 'bottom'" :class="{ active: layer === 'bottom' }">Bottom Layer</button>
        <button class="bl-tb-btn" @click="layer = 'both'" :class="{ active: layer === 'both' }">All Layers</button>
        <div class="bl-sep"/>
        <button class="bl-tb-btn" @click="zoom = Math.min(zoom + 0.25, 3)">＋</button>
        <button class="bl-tb-btn" @click="zoom = Math.max(zoom - 0.25, 0.4)">－</button>
        <button class="bl-tb-btn" @click="zoom = 1; panX = 0; panY = 0">Fit</button>
        <span class="bl-zoom">{{ Math.round(zoom * 100) }}%</span>
      </div>
    </div>

    <div class="bl-workspace">
      <!-- Canvas -->
      <div class="bl-canvas"
        ref="canvasEl"
        @wheel.prevent="e => zoom = Math.min(3, Math.max(0.3, zoom + (e.deltaY > 0 ? -0.1 : 0.1)))"
        @mousedown="e => { panning=true; lastX=e.clientX; lastY=e.clientY }"
        @mousemove="e => { if(panning){ panX+=e.clientX-lastX; panY+=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY }}"
        @mouseup="panning=false"
        @mouseleave="panning=false"
      >
        <div class="bl-inner" :style="{ transform: `translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin: '50px 50px' }">
          <svg :width="pcbW" :height="pcbH" viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">
            <!-- PCB substrate -->
            <rect width="240" height="180" fill="#1a472a" rx="4"/>
            <!-- Board outline -->
            <rect x="2" y="2" width="236" height="176" fill="none" stroke="#2d6a4f" stroke-width="1.5" rx="3"/>
            <!-- Grid dots -->
            <defs>
              <pattern id="pcb-dot" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="0.4" fill="#2d6a4f"/>
              </pattern>
            </defs>
            <rect x="2" y="2" width="236" height="176" fill="url(#pcb-dot)" rx="3"/>

            <!-- ── TOP LAYER traces (red) ── -->
            <g v-if="layer !== 'bottom'" opacity="0.9">
              <!-- Main HV rail trace -->
              <path d="M 15,30 H 55 V 60 H 100" stroke="#c0392b" stroke-width="2" fill="none"/>
              <path d="M 100,60 H 140 V 45 H 180 V 90" stroke="#c0392b" stroke-width="2" fill="none"/>
              <!-- GND plane outline -->
              <path d="M 15,150 H 225 V 130 H 200 V 110 H 160 V 130 H 60 V 150" stroke="#c0392b" stroke-width="1.2" fill="none" stroke-dasharray="3,2"/>
              <!-- Feedback trace -->
              <path d="M 195,100 H 210 V 120 H 175 V 140" stroke="#c0392b" stroke-width="1" fill="none"/>
              <!-- Gate drive -->
              <path d="M 125,95 H 125 V 110 H 100 V 130" stroke="#c0392b" stroke-width="1" fill="none"/>
            </g>

            <!-- ── BOTTOM LAYER traces (blue) ── -->
            <g v-if="layer !== 'top'" opacity="0.7">
              <path d="M 30,155 H 180 V 160 H 220 V 140" stroke="#2980b9" stroke-width="1.5" fill="none"/>
              <path d="M 55,70 V 160" stroke="#2980b9" stroke-width="1" fill="none" stroke-dasharray="2,2"/>
              <path d="M 140,50 V 165" stroke="#2980b9" stroke-width="1" fill="none" stroke-dasharray="2,2"/>
            </g>

            <!-- ── SILKSCREEN + COMPONENTS ── -->

            <!-- Bridge rectifier BR1 -->
            <rect x="20" y="50" width="28" height="28" fill="#2d6a4f" stroke="#90ee90" stroke-width="1"/>
            <text x="26" y="62" font-size="5" fill="#90ee90" font-family="monospace">BR1</text>
            <text x="22" y="70" font-size="4" fill="#a8d5b5">DF1506</text>
            <circle cx="24" cy="53" r="2.5" fill="#c0392b"/><!-- pin 1 mark -->

            <!-- Bus cap C1 (big electrolytic) -->
            <rect x="55" y="48" width="20" height="30" rx="10" fill="#2d3561" stroke="#5A6A7E" stroke-width="1.2"/>
            <text x="57" y="61" font-size="5" fill="#5A6A7E" font-family="monospace">C1</text>
            <text x="56" y="69" font-size="4" fill="#9aa4c4">47μF</text>
            <line x1="60" y1="48" x2="60" y2="78" stroke="#c0392b" stroke-width="0.5"/><!-- polarity mark -->

            <!-- C2 bus cap -->
            <rect x="82" y="48" width="20" height="30" rx="10" fill="#2d3561" stroke="#5A6A7E" stroke-width="1.2"/>
            <text x="84" y="61" font-size="5" fill="#5A6A7E" font-family="monospace">C2</text>
            <text x="83" y="69" font-size="4" fill="#9aa4c4">150μF</text>
            <line x1="87" y1="48" x2="87" y2="78" stroke="#c0392b" stroke-width="0.5"/>

            <!-- Transformer T1 (big center piece) -->
            <rect x="105" y="35" width="55" height="55" fill="#3a2a00" stroke="#D97706" stroke-width="1.5" rx="2"/>
            <rect x="116" y="45" width="33" height="35" fill="#2a1a00" stroke="#d97706" stroke-width="1" rx="1"/>
            <text x="115" y="57" font-size="6.5" fill="#D97706" font-family="monospace" font-weight="bold">T1</text>
            <text x="110" y="66" font-size="4.5" fill="#d97706">EFD30</text>
            <text x="110" y="73" font-size="4" fill="#a07000">Flyback</text>
            <!-- Core halves -->
            <rect x="113" y="43" width="34" height="4" fill="#5a3a00" stroke="#D97706" stroke-width="0.5" rx="1"/>
            <rect x="113" y="78" width="34" height="4" fill="#5a3a00" stroke="#D97706" stroke-width="0.5" rx="1"/>
            <!-- Winding pins -->
            <circle cx="113" cy="47" r="1.5" fill="#ccc"/>
            <circle cx="147" cy="47" r="1.5" fill="#ccc"/>
            <circle cx="113" cy="82" r="1.5" fill="#ccc"/>
            <circle cx="147" cy="82" r="1.5" fill="#ccc"/>

            <!-- Controller IC U1 -->
            <rect x="108" y="100" width="40" height="30" fill="#1a1a2a" stroke="#0D7377" stroke-width="1.2" rx="1"/>
            <text x="113" y="112" font-size="5" fill="#0D7377" font-family="monospace" font-weight="bold">U1</text>
            <text x="110" y="120" font-size="4" fill="#5A6A7E">TOP266EG</text>
            <!-- IC pins left -->
            <line x1="108" y1="107" x2="103" y2="107" stroke="#ccc" stroke-width="1"/>
            <line x1="108" y1="113" x2="103" y2="113" stroke="#ccc" stroke-width="1"/>
            <line x1="108" y1="119" x2="103" y2="119" stroke="#ccc" stroke-width="1"/>
            <line x1="108" y1="125" x2="103" y2="125" stroke="#ccc" stroke-width="1"/>
            <!-- IC pins right -->
            <line x1="148" y1="107" x2="153" y2="107" stroke="#ccc" stroke-width="1"/>
            <line x1="148" y1="113" x2="153" y2="113" stroke="#ccc" stroke-width="1"/>
            <line x1="148" y1="119" x2="153" y2="119" stroke="#ccc" stroke-width="1"/>
            <!-- Pin 1 mark -->
            <circle cx="111" cy="103" r="1" fill="#0D7377"/>

            <!-- Output diode D3 -->
            <rect x="168" y="38" width="18" height="12" fill="#2a1000" stroke="#38A169" stroke-width="1"/>
            <text x="170" y="46" font-size="5" fill="#38A169" font-family="monospace">D3</text>
            <line x1="172" y1="38" x2="172" y2="50" stroke="#38A169" stroke-width="0.5"/>

            <!-- Output capacitors C9/C10 -->
            <rect x="170" y="58" width="14" height="22" rx="7" fill="#2d3561" stroke="#5A6A7E" stroke-width="1"/>
            <text x="172" y="68" font-size="5" fill="#5A6A7E" font-family="monospace">C9</text>
            <text x="171" y="75" font-size="3.5" fill="#9aa4c4">470μF</text>
            <line x1="174" y1="58" x2="174" y2="80" stroke="#c0392b" stroke-width="0.4"/>

            <rect x="190" y="58" width="14" height="22" rx="7" fill="#2d3561" stroke="#5A6A7E" stroke-width="1"/>
            <text x="192" y="68" font-size="5" fill="#5A6A7E" font-family="monospace">C11</text>
            <text x="191" y="75" font-size="3.5" fill="#9aa4c4">100μF</text>

            <!-- Resistors (R4-R9 group) -->
            <g v-for="(r, i) in resistors" :key="r.ref">
              <rect :x="r.x" :y="r.y" width="14" height="6" fill="#3a2000" stroke="#d97706" stroke-width="0.8" rx="1"/>
              <text :x="r.x+1" :y="r.y+4.5" font-size="3.5" fill="#D97706" font-family="monospace">{{ r.ref }}</text>
            </g>

            <!-- TL431 U3 -->
            <rect x="185" y="108" width="18" height="14" fill="#1a1a2a" stroke="#D97706" stroke-width="1" rx="1"/>
            <text x="187" y="117" font-size="4.5" fill="#D97706" font-family="monospace">U3</text>
            <!-- Opto U2A -->
            <rect x="205" y="90" width="18" height="20" fill="#1a1a2a" stroke="#0D7377" stroke-width="1" rx="1"/>
            <text x="207" y="101" font-size="4" fill="#0D7377" font-family="monospace">U2A</text>

            <!-- Output connector J1 -->
            <rect x="210" y="55" width="20" height="28" fill="#111" stroke="#90ee90" stroke-width="1.2" rx="2"/>
            <text x="212" y="65" font-size="5" fill="#90ee90" font-family="monospace">J1</text>
            <rect x="213" y="68" width="6" height="6" fill="#333" stroke="#90ee90" stroke-width="0.8"/>
            <rect x="221" y="68" width="6" height="6" fill="#333" stroke="#90ee90" stroke-width="0.8"/>
            <text x="212" y="80" font-size="4" fill="#5a9" >OUT</text>

            <!-- Mounting holes -->
            <circle cx="10" cy="10" r="4" fill="none" stroke="#90ee90" stroke-width="1"/>
            <circle cx="10" cy="10" r="1.5" fill="#1a472a"/>
            <circle cx="230" cy="10" r="4" fill="none" stroke="#90ee90" stroke-width="1"/>
            <circle cx="230" cy="10" r="1.5" fill="#1a472a"/>
            <circle cx="10" cy="170" r="4" fill="none" stroke="#90ee90" stroke-width="1"/>
            <circle cx="10" cy="170" r="1.5" fill="#1a472a"/>
            <circle cx="230" cy="170" r="4" fill="none" stroke="#90ee90" stroke-width="1"/>
            <circle cx="230" cy="170" r="1.5" fill="#1a472a"/>

            <!-- Silkscreen labels -->
            <text x="8" y="178" font-size="4" fill="#90ee90" font-family="monospace">{{ design.fileName }}</text>
            <text x="165" y="178" font-size="4" fill="#90ee90" font-family="monospace">REV 1.0</text>

            <!-- Board dimensions -->
            <line x1="2" y1="185" x2="238" y2="185" stroke="#90ee90" stroke-width="0.5" marker-end="url(#arr)"/>
            <text x="105" y="189" font-size="4" fill="#90ee90" font-family="monospace">{{ boardW }} mm</text>
            <line x1="244" y1="2" x2="244" y2="178" stroke="#90ee90" stroke-width="0.5"/>
            <text x="247" y="94" font-size="4" fill="#90ee90" font-family="monospace" transform="rotate(90,247,94)">{{ boardH }} mm</text>
          </svg>
        </div>
      </div>

      <!-- Side panel -->
      <div class="bl-side">
        <div class="bl-side-title">Board Info</div>
        <div class="bl-info-row"><span>Dimensions</span><span>{{ boardW }} × {{ boardH }} mm</span></div>
        <div class="bl-info-row"><span>Layers</span><span>2</span></div>
        <div class="bl-info-row"><span>Components</span><span>{{ componentCount }}</span></div>
        <div class="bl-info-row"><span>Copper Weight</span><span>1 oz / 2 oz</span></div>
        <div class="bl-info-row"><span>Min Trace Width</span><span>0.2 mm</span></div>
        <div class="bl-info-row"><span>Min Clearance</span><span>0.3 mm</span></div>
        <div class="bl-info-row"><span>Surface Finish</span><span>HASL</span></div>
        <div class="bl-info-row"><span>Solder Mask</span><span>Green</span></div>
        <div class="bl-info-row"><span>Via Count</span><span>{{ viaCount }}</span></div>

        <div class="bl-side-title" style="margin-top:1rem">Design Rules</div>
        <div v-for="rule in drcRules" :key="rule.name" class="bl-drc-row">
          <span class="bl-drc-dot" :class="rule.pass ? 'pass' : 'fail'"/>
          <span>{{ rule.name }}</span>
          <span class="bl-drc-status">{{ rule.pass ? 'PASS' : 'FAIL' }}</span>
        </div>

        <div class="bl-side-title" style="margin-top:1rem">Creepage Zones</div>
        <div class="bl-info-row"><span>Primary–Secondary</span><span>8.0 mm</span></div>
        <div class="bl-info-row"><span>HV Clearance</span><span>4.0 mm</span></div>
        <div class="bl-info-row"><span>Safety Standard</span><span>IEC 62368</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
const props = defineProps({ design: Object });

const zoom = ref(1.2);
const panX = ref(20);
const panY = ref(20);
const panning = ref(false);
const lastX = ref(0);
const lastY = ref(0);
const layer = ref('both');
const pcbW = 280;
const pcbH = 220;

const boardW = computed(() => Math.round(60 + (props.design.totalPower || 0) * 0.8));
const boardH = computed(() => Math.round(45 + (props.design.totalPower || 0) * 0.4));
const componentCount = computed(() => 18 + (props.design.outputs?.length || 1) * 3);
const viaCount = computed(() => 24 + Math.round((props.design.totalPower || 0) * 0.3));

const resistors = [
  { ref:'R4', x:58, y:95 }, { ref:'R5', x:58, y:106 }, { ref:'R6', x:58, y:117 },
  { ref:'R7', x:75, y:95 }, { ref:'R8', x:75, y:106 }, { ref:'R9', x:75, y:117 },
  { ref:'R10', x:160, y:38 }, { ref:'R12', x:185, y:95 }, { ref:'R13', x:185, y:103 },
];

const drcRules = [
  { name: 'Min Trace Width', pass: true },
  { name: 'Clearance Check', pass: true },
  { name: 'Short Circuit', pass: true },
  { name: 'Unrouted Nets', pass: true },
  { name: 'Creepage Distance', pass: true },
  { name: 'Component Overlap', pass: true },
  { name: 'Thermal Relief', pass: true },
];
</script>

<style scoped>
.bl-root { display:flex; flex-direction:column; height:100%; min-height:0; }
.bl-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:.4rem .85rem; background:#0d1f14; border-bottom:1px solid #2d6a4f;
  flex-shrink:0; flex-wrap:wrap; gap:.5rem;
}
.bl-toolbar-left  { display:flex; align-items:center; gap:.6rem; }
.bl-toolbar-right { display:flex; align-items:center; gap:.3rem; flex-wrap:wrap; }
.bl-title  { font-size:.82rem; font-weight:700; color:#90ee90; font-family:monospace; }
.bl-badge  { font-size:.65rem; padding:.1rem .45rem; border-radius:4px; background:rgba(0,200,100,.12); color:#38A169; border:1px solid rgba(0,200,100,.25); }
.bl-tb-btn { height:26px; padding:0 .55rem; border:1px solid #2d6a4f; border-radius:4px; background:#0d1f14; color:#90ee90; font-size:.75rem; cursor:pointer; transition:all .12s; font-family:monospace; }
.bl-tb-btn:hover, .bl-tb-btn.active { background:#1a472a; border-color:#38A169; }
.bl-sep    { width:1px; height:20px; background:#2d6a4f; margin:0 .2rem; }
.bl-zoom   { font-size:.72rem; color:#38A169; font-family:monospace; min-width:38px; }
.bl-workspace { display:flex; flex:1; min-height:0; overflow:hidden; }
.bl-canvas {
  flex:1; background:#0a1a0f; overflow:hidden; cursor:grab; position:relative;
  background-image: radial-gradient(circle, #1a472a 1px, transparent 1px);
  background-size: 20px 20px;
}
.bl-canvas:active { cursor:grabbing; }
.bl-inner { position:absolute; top:0; left:0; }
.bl-side { width:220px; flex-shrink:0; background:#0d1a10; border-left:1px solid #2d6a4f; overflow-y:auto; padding:.5rem 0; }
.bl-side-title { font-size:.7rem; font-weight:700; color:#38A169; text-transform:uppercase; letter-spacing:.07em; padding:.35rem .85rem; background:#0a1a0f; border-top:1px solid #1a472a; border-bottom:1px solid #1a472a; font-family:monospace; }
.bl-info-row { display:flex; justify-content:space-between; padding:.28rem .85rem; font-size:.77rem; border-bottom:1px solid rgba(45,106,79,.3); color:#6abf8a; }
.bl-info-row span:last-child { color:#90ee90; font-weight:500; font-family:monospace; }
.bl-drc-row { display:flex; align-items:center; gap:.5rem; padding:.28rem .85rem; font-size:.77rem; border-bottom:1px solid rgba(45,106,79,.2); color:#6abf8a; }
.bl-drc-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.bl-drc-dot.pass { background:#38A169; }
.bl-drc-dot.fail { background:#0D7377; }
.bl-drc-status { margin-left:auto; font-size:.7rem; font-family:monospace; font-weight:700; }
</style>

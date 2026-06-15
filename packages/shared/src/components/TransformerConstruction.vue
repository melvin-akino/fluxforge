<template>
  <div class="tc-root">
    <div class="tc-toolbar">
      <span class="tc-title">Transformer Construction — {{ meta.fileName || design.fileName }}</span>
      <div class="tc-tabs">
        <button v-for="t in tabs" :key="t" class="tc-tab" :class="{ active: activeTab === t }" @click="activeTab = t">{{ t }}</button>
      </div>
    </div>

    <div class="tc-body">

      <!-- ── WINDING DATA ── -->
      <div v-if="activeTab === 'Winding Data'" class="tc-two-col">
        <div class="tc-section">
          <div class="tc-section-title">Core & Bobbin</div>
          <table class="tc-table">
            <tr><td>Core Type</td><td>EFD30</td></tr>
            <tr><td>Core Material</td><td>{{ meta.coreMaterial || d.coreMaterial || '3F3' || '3F3' }}</td></tr>
            <tr><td>Core Gap</td><td>{{ gap.toFixed(3) }} mm</td></tr>
            <tr><td>Effective Area (Ae)</td><td>60 mm²</td></tr>
            <tr><td>Window Area (Aw)</td><td>95 mm²</td></tr>
            <tr><td>Mean Length/Turn (MLT)</td><td>{{ mlt.toFixed(1) }} mm</td></tr>
            <tr><td>Bobbin</td><td>EFD30 Horizontal</td></tr>
            <tr><td>Transformer Type</td><td>{{ opts.transformerType || d.transformerType || 'Wire Wound' || 'Wire Wound' }}</td></tr>
            <tr><td>Shield Windings</td><td>{{ opts.shieldWindings ?? d.shieldWindings ? 'YES' : 'NO' }}</td></tr>
          </table>
        </div>

        <div class="tc-section">
          <div class="tc-section-title">Winding Summary</div>
          <table class="tc-table">
            <thead><tr><th>Winding</th><th>Turns</th><th>Wire AWG</th><th>Wire dia (mm)</th><th>Layers</th></tr></thead>
            <tbody>
              <tr v-for="w in windings" :key="w.name" :class="{ 'winding-primary': w.isPrimary, 'winding-bias': w.isBias }">
                <td><strong>{{ w.name }}</strong></td>
                <td class="tc-mono">{{ w.turns }}</td>
                <td class="tc-mono">{{ w.awg }}</td>
                <td class="tc-mono">{{ w.dia }}</td>
                <td class="tc-mono">{{ w.layers }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── WINDING DIAGRAM ── -->
      <div v-if="activeTab === 'Winding Diagram'" class="tc-diagram-wrap">
        <svg viewBox="0 0 500 360" xmlns="http://www.w3.org/2000/svg" class="tc-svg">
          <!-- Background -->
          <rect width="500" height="360" fill="#fafbfc"/>

          <!-- Bobbin cross-section title -->
          <text x="250" y="22" text-anchor="middle" font-size="11" font-weight="700" fill="#1a1a2e" font-family="sans-serif">Transformer Cross-Section — EFD30</text>

          <!-- Core (E-core shape) -->
          <!-- Left E-core half -->
          <path d="M 60,40 H 140 V 80 H 110 V 130 H 140 V 180 H 110 V 230 H 140 V 270 H 60 Z" fill="#dde8ff" stroke="#0066A6" stroke-width="2"/>
          <!-- Center leg of E -->
          <rect x="60" y="130" width="50" height="100" fill="#c0d4ff" stroke="#0066A6" stroke-width="1.5"/>
          <!-- Right E-core half -->
          <path d="M 360,40 H 440 V 270 H 360 V 230 H 390 V 180 H 360 V 130 H 390 V 80 H 360 V 40 Z" fill="#dde8ff" stroke="#0066A6" stroke-width="2"/>
          <!-- Center leg right -->
          <rect x="390" y="130" width="50" height="100" fill="#c0d4ff" stroke="#0066A6" stroke-width="1.5"/>

          <!-- Bobbin body -->
          <rect x="140" y="55" width="220" height="200" fill="#f5e6d0" stroke="#d97706" stroke-width="1.5" rx="3"/>
          <rect x="145" y="60" width="210" height="190" fill="#fff8f0" stroke="#D97706" stroke-width="1" rx="2"/>

          <!-- Gap indicator -->
          <line x1="109" y1="155" x2="109" y2="175" stroke="#0066A6" stroke-width="2.5"/>
          <text x="68" y="168" font-size="8" fill="#0066A6" font-family="monospace">GAP</text>
          <text x="58" y="178" font-size="8" fill="#0066A6" font-family="monospace">{{ gap.toFixed(3) }}mm</text>

          <!-- Winding layers (bottom to top) -->
          <!-- Primary P1 (innermost) -->
          <rect x="150" y="75" width="200" height="36" fill="#fbbf24" stroke="#d97706" stroke-width="1" rx="2" opacity="0.85"/>
          <text x="250" y="96" text-anchor="middle" font-size="9" fill="#7c2d12" font-weight="600" font-family="monospace">PRIMARY (P) — {{ windings[0]?.turns || 74 }} turns AWG {{ windings[0]?.awg || 26 }}</text>

          <!-- Insulation tape -->
          <rect x="150" y="111" width="200" height="5" fill="#e5e7eb" stroke="#9ca3af" stroke-width="0.5" opacity="0.7"/>
          <text x="360" y="116" font-size="7" fill="#888" font-family="monospace">Ins.</text>

          <!-- Bias winding -->
          <rect x="150" y="116" width="200" height="18" fill="#86efac" stroke="#38A169" stroke-width="1" rx="1" opacity="0.8"/>
          <text x="250" y="128" text-anchor="middle" font-size="8" fill="#064e3b" font-weight="600" font-family="monospace">BIAS (B) — {{ windings[2]?.turns || 8 }} turns AWG {{ windings[2]?.awg || 30 }}</text>

          <!-- Insulation -->
          <rect x="150" y="134" width="200" height="5" fill="#e5e7eb" stroke="#9ca3af" stroke-width="0.5" opacity="0.7"/>

          <!-- Secondary S1 -->
          <rect x="150" y="139" width="200" height="28" fill="#93c5fd" stroke="#2563eb" stroke-width="1" rx="1" opacity="0.85"/>
          <text x="250" y="156" text-anchor="middle" font-size="9" fill="#1e3a8a" font-weight="600" font-family="monospace">SECONDARY (S1) — {{ windings[1]?.turns || 6 }} turns AWG {{ windings[1]?.awg || 18 }}</text>

          <!-- Optional shield -->
          <rect v-if="opts.shieldWindings ?? d.shieldWindings" x="150" y="167" width="200" height="8" fill="#c084fc" stroke="#7c3aed" stroke-width="1" opacity="0.7" rx="1"/>
          <text v-if="opts.shieldWindings ?? d.shieldWindings" x="250" y="174" text-anchor="middle" font-size="7" fill="#4c1d95" font-family="monospace">SHIELD</text>

          <!-- Insulation outer -->
          <rect x="150" y="175" width="200" height="5" fill="#e5e7eb" stroke="#9ca3af" stroke-width="0.5" opacity="0.7"/>

          <!-- Pin numbers -->
          <text x="152" y="255" font-size="8" fill="#555" font-family="monospace">Pin 1</text>
          <text x="152" y="266" font-size="8" fill="#0066A6" font-family="monospace">(Primary+)</text>
          <text x="340" y="255" font-size="8" fill="#555" font-family="monospace">Pin 5</text>
          <text x="338" y="266" font-size="8" fill="#38A169" font-family="monospace">(Secondary+)</text>

          <!-- Pin lines -->
          <line x1="158" y1="251" x2="158" y2="111" stroke="#0066A6" stroke-width="1.2" stroke-dasharray="3,2"/>
          <line x1="342" y1="251" x2="342" y2="139" stroke="#38A169" stroke-width="1.2" stroke-dasharray="3,2"/>

          <!-- Winding direction arrows -->
          <path d="M 165,90 Q 175,82 185,90" fill="none" stroke="#92400e" stroke-width="1.5" marker-end="url(#winding-arr)"/>
          <defs><marker id="winding-arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#92400e"/></marker></defs>

          <!-- Legend -->
          <rect x="60" y="295" width="12" height="8" fill="#fbbf24" stroke="#d97706" stroke-width="0.8"/>
          <text x="76" y="303" font-size="8" fill="#555" font-family="sans-serif">Primary</text>
          <rect x="140" y="295" width="12" height="8" fill="#93c5fd" stroke="#2563eb" stroke-width="0.8"/>
          <text x="156" y="303" font-size="8" fill="#555" font-family="sans-serif">Secondary</text>
          <rect x="240" y="295" width="12" height="8" fill="#86efac" stroke="#38A169" stroke-width="0.8"/>
          <text x="256" y="303" font-size="8" fill="#555" font-family="sans-serif">Bias</text>
          <rect x="310" y="295" width="12" height="8" fill="#dde8ff" stroke="#0066A6" stroke-width="0.8"/>
          <text x="326" y="303" font-size="8" fill="#555" font-family="sans-serif">Core</text>
          <rect v-if="opts.shieldWindings ?? d.shieldWindings" x="380" y="295" width="12" height="8" fill="#c084fc" stroke="#7c3aed" stroke-width="0.8"/>
          <text v-if="opts.shieldWindings ?? d.shieldWindings" x="396" y="303" font-size="8" fill="#555" font-family="sans-serif">Shield</text>

          <text x="250" y="340" text-anchor="middle" font-size="9" fill="#888" font-family="sans-serif" font-style="italic">
            Winding order: Primary → Bias → Secondary (Interleaved for low leakage)
          </text>
        </svg>
      </div>

      <!-- ── ELECTRICAL SPECS ── -->
      <div v-if="activeTab === 'Electrical Specs'" class="tc-two-col">
        <div class="tc-section">
          <div class="tc-section-title">Magnetism Parameters</div>
          <table class="tc-table">
            <tr><td>Primary Inductance (Lp)</td><td>{{ lp.toFixed(1) }} µH</td></tr>
            <tr><td>Turns Ratio (Np:Ns)</td><td>{{ turnsRatio }}</td></tr>
            <tr><td>Max Flux Density (Bmax)</td><td>{{ bmax.toFixed(0) }} mT</td></tr>
            <tr><td>Flux Swing (ΔB)</td><td>{{ (bmax * 0.6).toFixed(0) }} mT</td></tr>
            <tr><td>Peak Primary Current (Ipk)</td><td>{{ ipk.toFixed(3) }} A</td></tr>
            <tr><td>RMS Primary Current</td><td>{{ (ipk * 0.45).toFixed(3) }} A</td></tr>
            <tr><td>Operating Frequency</td><td>{{ meta.frequency || d.frequency || '132 kHz' || '132 kHz' }}</td></tr>
            <tr><td>Max Duty Cycle</td><td>{{ maxDuty.toFixed(1) }}%</td></tr>
          </table>
        </div>

        <div class="tc-section">
          <div class="tc-section-title">Loss Analysis</div>
          <table class="tc-table">
            <tr><td>Core Loss (Pfe)</td><td>{{ coreLoss.toFixed(2) }} W</td></tr>
            <tr><td>Primary Cu Loss</td><td>{{ priCuLoss.toFixed(2) }} W</td></tr>
            <tr><td>Secondary Cu Loss</td><td>{{ secCuLoss.toFixed(2) }} W</td></tr>
            <tr><td>Total Transformer Loss</td><td><strong>{{ totalLoss.toFixed(2) }} W</strong></td></tr>
            <tr><td>Efficiency Impact</td><td>{{ (totalLoss / (design.totalPower || 1) * 100).toFixed(1) }}%</td></tr>
            <tr><td>Temperature Rise (est.)</td><td>{{ tempRise.toFixed(0) }}°C</td></tr>
          </table>

          <div class="tc-section-title" style="margin-top:1rem">Safety Requirements</div>
          <table class="tc-table">
            <tr><td>Hi-Pot Primary–Secondary</td><td>3000 V AC</td></tr>
            <tr><td>Insulation Tape Layers</td><td>3 × 1.5 mil polyester</td></tr>
            <tr><td>Creepage (Pri–Sec)</td><td>8.0 mm (IEC 62368)</td></tr>
            <tr><td>Clearance (Pri–Sec)</td><td>4.0 mm</td></tr>
          </table>
        </div>
      </div>

      <!-- ── ASSEMBLY INSTRUCTIONS ── -->
      <div v-if="activeTab === 'Assembly'" class="tc-instructions">
        <div class="tc-section-title">Assembly Instructions</div>
        <ol class="tc-steps">
          <li v-for="(step, i) in assemblySteps" :key="i" class="tc-step">
            <div class="tc-step-num">{{ i + 1 }}</div>
            <div class="tc-step-text">
              <strong>{{ step.title }}</strong>
              <p>{{ step.detail }}</p>
            </div>
          </li>
        </ol>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
const props = defineProps({ design: Object });

const tabs = ['Winding Data', 'Winding Diagram', 'Electrical Specs', 'Assembly'];
const activeTab = ref('Winding Data');

// Normalise: support both UDS nested and flat design formats
const d    = computed(() => props.design || {});
const meta = computed(() => d.value.meta    || d.value || {});
const inp  = computed(() => d.value.spec?.input   || d.value || {});
const opts = computed(() => d.value.spec?.options || d.value || {});
const sim  = computed(() => d.value.simResult || null);

const vOut  = computed(() => d.value.spec?.outputs?.[0]?.voltage || d.value.outputs?.[0]?.voltage || 12);
const pwr   = computed(() => meta.value.totalPower || d.value.totalPower || 20);
const vMin  = computed(() => Number(inp.value.vMin  || d.value.vMin  || 85));
const vMax  = computed(() => Number(inp.value.vMax  || d.value.vMax  || 265));
const freq  = computed(() => parseInt(meta.value.frequency || d.value.frequency) || 132);

// Use simResult values when available, otherwise estimate
const Np_sim = computed(() => sim.value?.Np || 0);
const Ns_sim = computed(() => sim.value?.Ns || 0);
const Nb_sim = computed(() => sim.value?.Nb || 0);
const ipk    = computed(() => sim.value?.Ip_pk  || (pwr.value / (0.85 * vMin.value)));
const maxDuty= computed(() => sim.value?.D_max  || ((vMin.value / (vMin.value + vMax.value)) * 100));
const lp_uH  = computed(() => sim.value?.Lp_uH  || ((vMin.value * vMin.value) / (2 * pwr.value * freq.value * 1000 * 0.4) * 1e6));
const lp     = computed(() => lp_uH.value * 1e-6);
const mlt    = computed(() => 52 + pwr.value * 0.4);
const gap    = computed(() => Math.max(0.05, (lp.value * ipk.value * ipk.value) / (4 * pwr.value * 0.8)));
const bmax   = computed(() => sim.value ? (sim.value.Bmax_mT || 320) : Math.min(320, 200 + pwr.value * 1.5));
const coreLoss  = computed(() => sim.value?.losses?.core    || pwr.value * 0.012);
const priCuLoss = computed(() => sim.value?.losses?.copperPri || pwr.value * 0.018);
const secCuLoss = computed(() => sim.value?.losses?.copperSec || pwr.value * 0.015);
const totalLoss = computed(() => coreLoss.value + priCuLoss.value + secCuLoss.value);
const tempRise  = computed(() => sim.value?.thermal?.T1_ΔT || totalLoss.value * 8.5);
const turnsRatio = computed(() => {
  const np = Np_sim.value || Math.round(74 + (vMax.value - 265) * 0.1);
  const ns = Ns_sim.value || Math.round(np * (vOut.value + 1) / (vMax.value * maxDuty.value / 100));
  return np + ':' + ns;
});

const windings = computed(() => {
  const np = Np_sim.value || Math.round(74 + (vMax.value - 265) * 0.1);
  const ns = Ns_sim.value || Math.round(np * (vOut.value + 1) / (vMax.value * maxDuty.value / 100));
  const nb = Nb_sim.value || Math.round(8 + (vMin.value - 85) * 0.02);
  const wireByCurrentMap = cur => {
    if (cur > 5) return { awg: 14, dia: '1.628' };
    if (cur > 3) return { awg: 16, dia: '1.291' };
    if (cur > 2) return { awg: 18, dia: '1.024' };
    if (cur > 1) return { awg: 20, dia: '0.812' };
    if (cur > 0.5) return { awg: 22, dia: '0.644' };
    return { awg: 26, dia: '0.404' };
  };
  const priWire = wireByCurrentMap(ipk.value * 0.45);
  const secWire = wireByCurrentMap(props.design.outputs?.[0]?.current || 1);
  return [
    { name:'Primary (P)',   turns:np, awg:priWire.awg, dia:priWire.dia, layers:Math.ceil(np/40), isPrimary:true },
    { name:'Secondary (S1)',turns:ns, awg:secWire.awg, dia:secWire.dia, layers:Math.ceil(ns/20) },
    { name:'Bias (B)',      turns:nb, awg:30, dia:'0.255', layers:1, isBias:true },
  ];
});

const assemblySteps = [
  { title: 'Prepare Bobbin', detail: 'Verify EFD30 bobbin orientation. Mark pin 1 with a dot. Clean with isopropyl alcohol.' },
  { title: 'Wind Primary (P)', detail: `Wind ${windings.value[0]?.turns} turns of AWG ${windings.value[0]?.awg} wire on the primary section. Wind in a single direction (CW from pin 1). Fill evenly across ${windings.value[0]?.layers} layers. Secure start lead to pin 1.` },
  { title: 'Apply Insulation Tape', detail: 'Apply 3 layers of 1.5 mil polyester tape over primary winding. Ensure full coverage with 5 mm overlap at each end to meet creepage requirements.' },
  { title: 'Wind Bias Winding (B)', detail: `Wind ${windings.value[2]?.turns} turns of AWG 30 wire for the bias winding. This provides the auxiliary supply voltage. Secure end to bias pin.` },
  { title: 'Apply Insulation Tape', detail: 'Apply 2 layers of insulation tape between bias and secondary windings.' },
  { title: 'Wind Secondary (S1)', detail: `Wind ${windings.value[1]?.turns} turns of AWG ${windings.value[1]?.awg} wire. Use multi-strand (Litz) wire if available. Bifilar wind if secondary current exceeds 3 A.` },
  { title: 'Apply Outer Insulation', detail: 'Apply 3 layers of tape over the secondary. Trim any exposed wire ends to prevent shorting.' },
  { title: 'Assemble Core Halves', detail: `Insert pre-gapped EFD30 core halves. Apply ${gap.value.toFixed(3)} mm gap on center leg only. Secure with nylon clips or epoxy. Verify gap with feeler gauge.` },
  { title: 'Hi-Pot Test', detail: 'Apply 3000 V AC between primary and secondary for 1 second. Leakage current must be < 5 mA. Test all secondary pins together vs all primary pins.' },
  { title: 'Inductance Verification', detail: `Measure primary inductance at 10 kHz. Required: ${lp.value.toFixed(1)} µH ± 10%. Adjust gap if needed. Record measured value on work order.` },
];
</script>

<style scoped>
.tc-root { display:flex; flex-direction:column; height:100%; min-height:0; }
.tc-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:.4rem .85rem; background:#fff; border-bottom:1px solid #e2e4ea;
  flex-shrink:0; flex-wrap:wrap; gap:.5rem;
}
.tc-title { font-weight:700; font-size:.85rem; color:#1a1a2e; }
.tc-tabs  { display:flex; gap:.2rem; }
.tc-tab   { height:28px; padding:0 .75rem; border:1px solid #d0d3de; border-radius:5px; background:#fff; font-size:.77rem; cursor:pointer; color:#555; transition:all .12s; }
.tc-tab:hover, .tc-tab.active { background:#eef2ff; border-color:#0066A6; color:#0066A6; font-weight:600; }
.tc-body { flex:1; overflow:auto; padding:.85rem; min-height:0; background:#f8f9fb; }
.tc-two-col { display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
.tc-section { background:#fff; border:1px solid #e2e4ea; border-radius:8px; padding:.75rem .9rem; }
.tc-section-title { font-size:.72rem; font-weight:700; color:#0066A6; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; padding-bottom:.35rem; border-bottom:1px solid #eef2ff; }
.tc-table { width:100%; border-collapse:collapse; font-size:.8rem; }
.tc-table th { padding:.3rem .5rem; background:#f5f7ff; font-size:.72rem; font-weight:700; color:#555; text-align:left; border-bottom:1px solid #e2e4ea; }
.tc-table td { padding:.3rem .5rem; border-bottom:1px solid #f0f1f5; color:#1a1a2e; }
.tc-table td:first-child { color:#666; }
.tc-table tr:last-child td { border-bottom:none; }
.tc-table tr.winding-primary td { background:#fffbeb; }
.tc-table tr.winding-bias td { background:#f0fdf4; }
.tc-mono { font-family:monospace; text-align:right; }
.tc-diagram-wrap { display:flex; justify-content:center; padding:.5rem; background:#fff; border-radius:8px; border:1px solid #e2e4ea; }
.tc-svg { max-width:100%; height:auto; }
.tc-instructions { background:#fff; border:1px solid #e2e4ea; border-radius:8px; padding:.85rem 1rem; }
.tc-steps { list-style:none; display:flex; flex-direction:column; gap:.65rem; margin-top:.5rem; }
.tc-step  { display:flex; gap:.75rem; align-items:flex-start; }
.tc-step-num { width:26px; height:26px; border-radius:50%; background:#0066A6; color:#fff; display:flex; align-items:center; justify-content:center; font-size:.78rem; font-weight:700; flex-shrink:0; margin-top:.1rem; }
.tc-step-text strong { font-size:.84rem; color:#1a1a2e; }
.tc-step-text p { font-size:.79rem; color:#555; margin-top:.2rem; line-height:1.5; }
</style>

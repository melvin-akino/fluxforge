<template>
  <div class="drp">
    <h3 class="drp-title">Design Results — {{ d.meta?.fileName || d.fileName }}</h3>

    <div class="drp-grid">

      <!-- Input Parameters -->
      <div class="drp-card">
        <div class="drp-card-title">Input Parameters</div>
        <table class="drp-table">
          <tbody>
            <tr><td>Input Voltage Range</td><td>{{ inp.vMin }}–{{ inp.vMax }} V</td></tr>
            <tr><td>Input Type</td><td>{{ inp.inputType || d.inputType }}</td></tr>
            <tr><td>Line Frequency</td><td>{{ inp.lineFreq || d.lineFreq }} Hz</td></tr>
            <tr><td>Specification</td><td>{{ d.meta?.inputSpec || d.inputSpec }}</td></tr>
            <tr><td>Topology</td><td>{{ d.meta?.topology || d.topology }}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Output Parameters -->
      <div class="drp-card">
        <div class="drp-card-title">Output Parameters</div>
        <table class="drp-table">
          <tbody>
            <tr v-for="(o,i) in outputs" :key="i">
              <td>Output {{ i+1 }}</td>
              <td>{{ o.voltage }}V / {{ o.current }}A
                <span class="drp-badge">{{ (o.voltage*o.current).toFixed(1) }} W</span>
              </td>
            </tr>
            <tr><td>Total Power</td><td><strong>{{ totalPwr.toFixed(2) }} W</strong></td></tr>
            <tr><td>Operation Mode</td><td>{{ d.meta ? opts.operationMode : d.operationMode }}</td></tr>
            <tr v-if="outputs.length"><td>Peak Load</td><td>{{ opts.peakLoads || d.peakLoads || 'NO' }}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Device Selection -->
      <div class="drp-card">
        <div class="drp-card-title">Device Selection</div>
        <table class="drp-table">
          <tbody>
            <tr><td>Product Family</td><td>{{ d.meta?.family || d.family }}</td></tr>
            <tr><td>Package</td><td>{{ d.meta?.pkg || d.pkg }}</td></tr>
            <tr><td>Switching Frequency</td><td>{{ d.meta?.frequency || d.frequency }}</td></tr>
            <tr><td>Feedback Type</td><td>{{ d.meta?.feedbackType || d.feedbackType }}</td></tr>
            <tr><td>Enclosure</td><td>{{ d.meta?.enclosure || d.enclosure || '—' }}</td></tr>
            <tr><td>Variant</td><td><span class="drp-badge drp-badge-blue">{{ d.meta?.variant || d._variant || 'Standard' }}</span></td></tr>
          </tbody>
        </table>
      </div>

      <!-- Transformer -->
      <div class="drp-card">
        <div class="drp-card-title">Transformer Design</div>
        <table class="drp-table">
          <tbody>
            <tr><td>Winding Type</td><td>{{ opts.transformerType || d.transformerType }}</td></tr>
            <tr><td>Core Material</td><td>{{ opts.coreMaterial || d.coreMaterial }}</td></tr>
            <tr><td>Shield Windings</td><td>{{ (opts.shieldWindings ?? d.shieldWindings) ? 'YES' : 'NO' }}</td></tr>
            <tr><td>Component Set</td><td>{{ d.meta?.componentSet || d.componentSet || 'All Records' }}</td></tr>
            <tr><td>T1 Core</td><td>{{ d.components?.T1?.part || '—' }}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Calculated Parameters -->
      <div class="drp-card drp-card-full">
        <div class="drp-card-title">Calculated Parameters</div>
        <div class="drp-calc-grid">
          <div class="drp-calc-item" v-for="p in calcParams" :key="p.label">
            <div class="drp-calc-label">{{ p.label }}</div>
            <div class="drp-calc-val" :class="p.highlight ? 'drp-calc-hi' : ''">{{ p.value }}</div>
          </div>
        </div>
      </div>

      <!-- Component Summary -->
      <div class="drp-card drp-card-full" v-if="d.components && Object.keys(d.components).length">
        <div class="drp-card-title">Key Components</div>
        <div class="drp-comp-grid">
          <div class="drp-comp-row" v-for="(comp, ref) in keyComponents" :key="ref">
            <span class="drp-comp-ref">{{ ref }}</span>
            <span class="drp-comp-part">{{ comp.part || '—' }}</span>
            <span class="drp-comp-note">{{ comp.notes || comp.mfr || '' }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ design: Object });

// Normalise: support both flat and UDS nested format
const d    = computed(() => props.design || {});
const inp  = computed(() => d.value.spec?.input  || d.value);
const opts = computed(() => d.value.spec?.options || d.value);
const outputs = computed(() => d.value.spec?.outputs || d.value.outputs || []);
const totalPwr = computed(() => {
  const t = d.value.meta?.totalPower ?? d.value.totalPower;
  if (t) return Number(t);
  return outputs.value.reduce((s, o) => s + (o.voltage||0)*(o.current||0), 0);
});

const vMin = computed(() => Number(inp.value.vMin || 85));
const vMax = computed(() => Number(inp.value.vMax || 265));
const freq = computed(() => {
  const f = d.value.meta?.frequency || d.value.frequency || '132 kHz';
  return parseFloat(f) * 1000 || 132000;
});
const pwr  = computed(() => totalPwr.value || 1);

// Pull from simResult (stored in UDS) when available, otherwise estimate
const sim = computed(() => d.value.simResult || null);

const calcParams = computed(() => {
  const s = sim.value;
  const η = s ? (s.η_percent || s.η_calc || 85) : 85;
  const Ip_pk  = s ? s.Ip_pk  : (pwr.value / (0.85 * vMin.value));
  const Ip_rms = s ? s.Ip_rms : (Ip_pk * 0.45);
  const D_max  = s ? s.D_max  : ((vMin.value / (vMin.value + vMax.value)) * 100);
  const D_min  = s ? s.D_min  : (D_max * 0.5);
  const Lp_uH  = s ? s.Lp_uH : ((vMin.value * vMin.value) / (2 * pwr.value * freq.value * 0.4));
  const KP     = s ? (s.KP || 0.65) : 0.65;
  const Np     = s ? s.Np : '—';
  const Ns     = s ? s.Ns : '—';
  const n_ps   = s ? s.n_ps : '—';
  const core   = s ? s.coreName : (d.value.meta?.coreName || '—');
  const Vdc_min= s ? s.Vdc_min : (vMin.value * 1.35);
  const VOR    = s ? s.VOR : '—';

  return [
    { label:'Peak Primary Current', value: Ip_pk + ' A',          highlight:true },
    { label:'RMS Primary Current',  value: Ip_rms + ' A' },
    { label:'Max Duty Cycle (Dmax)',value: D_max + ' %',           highlight:true },
    { label:'Min Duty Cycle (Dmin)',value: D_min + ' %' },
    { label:'Primary Inductance Lp',value: Lp_uH + ' µH',         highlight:true },
    { label:'Ripple Ratio (KP)',    value: KP },
    { label:'DC Bus Voltage (min)', value: Vdc_min + ' V' },
    { label:'Reflected Voltage VOR',value: VOR + ' V' },
    { label:'Turns Ratio (Np:Ns)',  value: Np && Ns ? Np+':'+Ns : '—' },
    { label:'Primary Turns (Np)',   value: Np },
    { label:'Secondary Turns (Ns)', value: Ns },
    { label:'Selected Core',        value: core,                   highlight:true },
    { label:'Efficiency (η)',       value: η + ' %',               highlight:true },
    { label:'Input Power (Pin)',    value: s ? s.Pin + ' W' : (pwr.value / 0.85).toFixed(2) + ' W' },
    { label:'Switching Frequency',  value: d.value.meta?.frequency || d.value.frequency || '132 kHz' },
  ];
});

const KEY_REFS = ['U1','T1','D3','D1','C1','C2','U3','U2A','F1'];
const keyComponents = computed(() => {
  const comps = d.value.components || {};
  const result = {};
  KEY_REFS.forEach(ref => { if (comps[ref]) result[ref] = comps[ref]; });
  return result;
});
</script>

<style scoped>
.drp { padding: .65rem; height: 100%; overflow-y: auto; box-sizing: border-box; }
.drp-title { font-size: .95rem; font-weight: 700; color: #1a1a2e; margin: 0 0 .85rem; }
.drp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.drp-card { background: #fff; border: 1px solid #e2e4ea; border-radius: 7px; padding: .75rem .9rem; }
.drp-card-full { grid-column: 1 / -1; }
.drp-card-title { font-size: .72rem; font-weight: 700; color: #0066A6; text-transform: uppercase; letter-spacing: .06em; margin-bottom: .5rem; border-bottom: 1px solid #eef2ff; padding-bottom: .3rem; }
.drp-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
.drp-table td { padding: .26rem .3rem; border-bottom: 1px solid #f0f1f5; color: #1a1a2e; }
.drp-table td:first-child { color: #444; font-weight: 500; width: 58%; }
.drp-table td:last-child  { font-weight: 600; text-align: right; }
.drp-table tr:last-child td { border-bottom: none; }
.drp-badge { display: inline-block; background: #f0f4ff; color: #2d4080; border-radius: 3px; padding: .05rem .35rem; font-size: .72rem; font-weight: 700; margin-left: .3rem; }
.drp-badge-blue { background: #dbeafe; color: #1e40af; }
/* Calculated params grid */
.drp-calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .55rem; }
.drp-calc-item { background: #f8f9fc; border: 1px solid #e8eaf4; border-radius: 6px; padding: .5rem .65rem; }
.drp-calc-label { font-size: .68rem; color: #666; font-weight: 500; margin-bottom: .2rem; line-height: 1.3; }
.drp-calc-val { font-size: .88rem; font-weight: 700; color: #1a1a2e; font-family: 'Consolas', monospace; }
.drp-calc-hi  { color: #0066CC; }
/* Component grid */
.drp-comp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; }
.drp-comp-row { display: flex; align-items: baseline; gap: .4rem; padding: .28rem .5rem; background: #f8f9fc; border: 1px solid #e8eaf4; border-radius: 4px; }
.drp-comp-ref  { font-family: monospace; font-weight: 700; color: #1a3ab0; font-size: .75rem; min-width: 28px; flex-shrink: 0; }
.drp-comp-part { font-weight: 600; color: #1a1a2e; font-size: .75rem; flex: 1; }
.drp-comp-note { color: #888; font-size: .7rem; }
</style>

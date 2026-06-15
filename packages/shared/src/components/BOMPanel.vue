<template>
  <div class="bom-root">
    <div class="bom-toolbar">
      <div class="bom-title">Bill of Materials — {{ design?.meta?.fileName || design?.fileName }}</div>
      <div class="bom-toolbar-right">
        <input v-model="search" class="bom-search" placeholder="🔍  Search components…" />
        <select v-model="filterCat" class="bom-filter">
          <option value="">All Categories</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
        <button class="bom-export-btn" @click="exportCSV">⬇ Export CSV</button>
      </div>
    </div>

    <div class="bom-summary-bar">
      <div class="bom-stat"><span class="bom-stat-n">{{ filteredBOM.length }}</span><span>Components</span></div>
      <div class="bom-stat"><span class="bom-stat-n">{{ uniqueValues }}</span><span>Unique Values</span></div>
      <div class="bom-stat"><span class="bom-stat-n">${{ totalCost.toFixed(2) }}</span><span>Est. BOM Cost</span></div>
      <div class="bom-stat"><span class="bom-stat-n">{{ inStockCount }}</span><span>In Stock</span></div>
      <div class="bom-stat" v-if="design?.meta?.totalPower || design?.totalPower"><span class="bom-stat-n">{{ design?.meta?.totalPower || design?.totalPower.toFixed(0) }}W</span><span>Rated Power</span></div>
    </div>

    <div class="bom-table-wrap">
      <table class="bom-table">
        <thead>
          <tr>
            <th @click="sortBy('ref')">Ref <span class="sort">{{ sa('ref') }}</span></th>
            <th @click="sortBy('qty')">Qty <span class="sort">{{ sa('qty') }}</span></th>
            <th @click="sortBy('description')">Description <span class="sort">{{ sa('description') }}</span></th>
            <th @click="sortBy('value')">Value <span class="sort">{{ sa('value') }}</span></th>
            <th @click="sortBy('package')">Package <span class="sort">{{ sa('package') }}</span></th>
            <th @click="sortBy('manufacturer')">Manufacturer <span class="sort">{{ sa('manufacturer') }}</span></th>
            <th @click="sortBy('mpn')">MPN <span class="sort">{{ sa('mpn') }}</span></th>
            <th @click="sortBy('rating')">Rating <span class="sort">{{ sa('rating') }}</span></th>
            <th @click="sortBy('unitCost')">Unit Cost <span class="sort">{{ sa('unitCost') }}</span></th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredBOM" :key="item.ref"
            class="bom-row"
            :class="{ 'bom-ic': item.isControllerIC, selected: selectedRef === item.ref }"
            @click="selectedRef = item.ref">
            <td class="bom-ref"><span :class="{ 'ref-ic': item.isControllerIC }">{{ item.ref }}</span></td>
            <td class="bom-center">{{ item.qty }}</td>
            <td>{{ item.description }}</td>
            <td class="bom-value">{{ item.value }}</td>
            <td class="bom-mono">{{ item.package }}</td>
            <td>{{ item.manufacturer }}</td>
            <td class="bom-mono bom-mpn">{{ item.mpn }}</td>
            <td class="bom-mono">{{ item.rating }}</td>
            <td class="bom-cost">${{ item.unitCost.toFixed(3) }}</td>
            <td>
              <span class="bom-status-badge" :class="item.status">{{ item.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="bom-footer">
      <span>{{ filteredBOM.length }} of {{ bom.length }} items shown</span>
      <span>Total estimated cost: <strong>${{ totalCost.toFixed(2) }}</strong></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
const props = defineProps({ design: Object });

const search    = ref('');
const filterCat = ref('');
const sortCol   = ref('ref');
const sortDir   = ref(1);
const selectedRef = ref(null);

// ── Generate BOM from design params ──────────────────────────────────────────
const bom = computed(() => {
  const p    = props.design;
  const meta = p.meta    || p;
  const inp  = p.spec?.input   || p;
  const opts = p.spec?.options || p;
  const comps= p.components || {};      // actual components from UDS
  const sim  = p.simResult  || null;
  const vOut = p.spec?.outputs?.[0]?.voltage  || p.outputs?.[0]?.voltage  || 12;
  const iOut = p.spec?.outputs?.[0]?.current  || p.outputs?.[0]?.current  || 1;
  const pwr  = meta.totalPower || p.totalPower || 20;
  const fam  = meta.family  || p.family  || 'HPFC-1';
  const pkg  = meta.pkg     || p.pkg     || 'eSIP-7C';
  const freq = parseInt(meta.frequency || p.frequency) || 132;
  const core = sim?.coreName || comps?.T1?.part || 'EFD30';
  const Np   = sim?.Np;
  const Ns   = sim?.Ns;

  // Build BOM from UDS components if available, else generate defaults
  function udsComp(ref, fallback) {
    const c = comps[ref];
    if (!c || !c.part) return fallback;
    return {
      ref, qty:1,
      category: c.type || fallback.category,
      description: c.notes || c.type || fallback.description,
      value: c.value ? c.value + (c.unit||'') : (c.capacitance ? c.capacitance + (c.uom||'µF') : fallback.value),
      package: c.package || fallback.package,
      manufacturer: c.mfr || fallback.manufacturer,
      mpn: c.part,
      rating: c.rated_voltage ? c.rated_voltage+'V' : fallback.rating,
      unitCost: c.cost || fallback.unitCost,
      status: 'stock',
      isControllerIC: fallback.isControllerIC,
    };
  }

  return [
    // Controller IC
    udsComp('U1', { ref:'U1', qty:1, category:'IC', description:'Power IC – '+fam,
      value:fam, package:pkg,
      manufacturer:'Generic', mpn:fam,
      rating:Math.ceil(pwr*1.3)+' W', unitCost:2.85, status:'stock', isControllerIC:true }),

    // Transformer
    udsComp('T1', { ref:'T1', qty:1, category:'Magnetics', description:'Flyback Transformer '+(opts.transformerType||p.transformerType||'Wire Wound'),
      value:core, package:core, manufacturer:'TDK', mpn:'B66363G-X187',
      rating:pwr.toFixed(0)+' W / '+(inp.lineFreq||p.lineFreq||50)+' Hz'+(Np?` (${Np}:${Ns}t)`:'')+' ', unitCost:3.20, status:'stock', isControllerIC:false }),

    // Bridge Rectifier
    { ref:'BR1', qty:1, category:'Diode', description:'Bridge Rectifier',
      value:'DF1506S', package:'D-70 (SIP4)', manufacturer:'Diodes Inc.', mpn:'DF1506S-G',
      rating:'600V / 15A', unitCost:0.42, status:'stock', isControllerIC:false },

    // Input caps
    { ref:'C1', qty:1, category:'Capacitor', description:'Input Bulk Cap',
      value:'47 nF 250V', package:'Radial 5mm', manufacturer:'Panasonic', mpn:'ECE-A2ET470',
      rating:'250V', unitCost:0.18, status:'stock', isControllerIC:false },
    { ref:'C2', qty:1, category:'Capacitor', description:'Bus Capacitor',
      value:'150 µF 400V', package:'Radial 25x45', manufacturer:'Nichicon', mpn:'UVZ2G151MRD',
      rating:'400V', unitCost:1.85, status:'stock', isControllerIC:false },
    { ref:'C3', qty:1, category:'Capacitor', description:'EMI Cap',
      value:'3.9 nF 1kV', package:'Radial 5mm', manufacturer:'KEMET', mpn:'C320C392K1R5TA',
      rating:'1kV', unitCost:0.22, status:'stock', isControllerIC:false },

    // Output caps
    { ref:'C9', qty:1, category:'Capacitor', description:'Output Filter Cap',
      value:`470 µF ${Math.ceil(vOut*1.5)}V`, package:'Radial 12.5x25', manufacturer:'Nichicon', mpn:'UVR1V471MED',
      rating:`${Math.ceil(vOut*1.5)}V`, unitCost:0.95, status:'stock', isControllerIC:false },
    { ref:'C10', qty:1, category:'Capacitor', description:'Output Filter Cap',
      value:`470 µF ${Math.ceil(vOut*1.5)}V`, package:'Radial 12.5x25', manufacturer:'Nichicon', mpn:'UVR1V471MED',
      rating:`${Math.ceil(vOut*1.5)}V`, unitCost:0.95, status:'stock', isControllerIC:false },
    { ref:'C11', qty:1, category:'Capacitor', description:'Output Decoupling Cap',
      value:`100 µF ${Math.ceil(vOut*2)}V`, package:'Radial 8x11.5', manufacturer:'Panasonic', mpn:'EEU-FC1E101',
      rating:`${Math.ceil(vOut*2)}V`, unitCost:0.38, status:'stock', isControllerIC:false },
    { ref:'C4', qty:1, category:'Capacitor', description:'Bypass Cap',
      value:'0.1 µF 16V', package:'0805', manufacturer:'Murata', mpn:'GCM21BR71C104KA37L',
      rating:'16V', unitCost:0.04, status:'stock', isControllerIC:false },
    { ref:'C5', qty:1, category:'Capacitor', description:'Bypass Cap',
      value:'47 µF 10V', package:'Radial 5mm', manufacturer:'Nichicon', mpn:'UWT1A470MCL1GS',
      rating:'10V', unitCost:0.12, status:'stock', isControllerIC:false },
    { ref:'C6', qty:1, category:'Capacitor', description:'Snubber Cap',
      value:'0.68 nF 250V', package:'0805', manufacturer:'KEMET', mpn:'C0805C681K2RAC',
      rating:'250V', unitCost:0.06, status:'stock', isControllerIC:false },
    { ref:'C7', qty:1, category:'Capacitor', description:'Snubber Cap',
      value:'470 pF 200V', package:'Radial 5mm', manufacturer:'Vishay', mpn:'K471K15X7RF5TH5',
      rating:'200V', unitCost:0.08, status:'stock', isControllerIC:false },
    { ref:'C13', qty:1, category:'Capacitor', description:'Bias Cap',
      value:'100 nF 16V', package:'0805', manufacturer:'Murata', mpn:'GRM21BR71C104KA01',
      rating:'16V', unitCost:0.04, status:'stock', isControllerIC:false },

    // Diodes
    { ref:'D3', qty:1, category:'Diode', description:'Output Rectifier Diode',
      value:'V10D60C', package:'TO-220AC', manufacturer:'Vishay', mpn:'V10D60C-E3/4W',
      rating:'600V / 10A', unitCost:0.68, status:'stock', isControllerIC:false },
    { ref:'D2', qty:1, category:'Diode', description:'Auxiliary Diode',
      value:'FDLL4448', package:'LL-34', manufacturer:'ON Semi', mpn:'FDLL4448',
      rating:'100V / 0.15A', unitCost:0.08, status:'stock', isControllerIC:false },
    { ref:'D1', qty:1, category:'Diode', description:'TVS Diode',
      value:'R507K', package:'DO-41', manufacturer:'Vishay', mpn:'R507K-GS08',
      rating:'600V', unitCost:0.35, status:'stock', isControllerIC:false },

    // Resistors
    { ref:'R1,R2', qty:2, category:'Resistor', description:'Input Bleed Resistor',
      value:'51 kΩ 2W', package:'Axial 6.3mm', manufacturer:'Vishay', mpn:'AC02000005109JAC00',
      rating:'2W / 250V', unitCost:0.15, status:'stock', isControllerIC:false },
    { ref:'R4', qty:1, category:'Resistor', description:'Bias Resistor',
      value:'3.9 MΩ 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-073M9L',
      rating:'0.125W', unitCost:0.04, status:'stock', isControllerIC:false },
    { ref:'R5', qty:1, category:'Resistor', description:'Bias Resistor',
      value:'7.32 MΩ 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-077M32L',
      rating:'0.125W', unitCost:0.05, status:'stock', isControllerIC:false },
    { ref:'R6', qty:1, category:'Resistor', description:'Bias Resistor',
      value:'7.68 kΩ 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-077K68L',
      rating:'0.125W', unitCost:0.03, status:'stock', isControllerIC:false },
    { ref:'R7', qty:1, category:'Resistor', description:'Feedback Resistor',
      value:'7.32 MΩ 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-077M32L',
      rating:'0.125W', unitCost:0.05, status:'stock', isControllerIC:false },
    { ref:'R8', qty:1, category:'Resistor', description:'Feedback Resistor',
      value:'2 MΩ 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-072ML',
      rating:'0.125W', unitCost:0.04, status:'stock', isControllerIC:false },
    { ref:'R9', qty:1, category:'Resistor', description:'Current Sense Resistor',
      value:`6.8 Ω 1%`, package:'2512', manufacturer:'Vishay', mpn:'CRCW25126R80FKEG',
      rating:'1W', unitCost:0.18, status:'stock', isControllerIC:false },
    { ref:'R10', qty:1, category:'Resistor', description:'Snubber Resistor',
      value:'22 Ω', package:'0805', manufacturer:'Yageo', mpn:'RC0805JR-0722RL',
      rating:'0.125W', unitCost:0.02, status:'stock', isControllerIC:false },
    { ref:'R11', qty:1, category:'Resistor', description:'Inrush Limiter',
      value:'8 Ω', package:'Axial', manufacturer:'Bourns', mpn:'CRS3-8RJ',
      rating:'3W', unitCost:0.55, status:'stock', isControllerIC:false },
    { ref:'R12', qty:1, category:'Resistor', description:'Feedback Resistor',
      value:'5190 Ω 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-075K19L',
      rating:'0.125W', unitCost:0.04, status:'stock', isControllerIC:false },
    { ref:'R13', qty:1, category:'Resistor', description:'Feedback Resistor',
      value:'1 kΩ 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-071KL',
      rating:'0.125W', unitCost:0.03, status:'stock', isControllerIC:false },
    { ref:'R14', qty:1, category:'Resistor', description:'TL431 Resistor',
      value:'43.2 kΩ 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-0743K2L',
      rating:'0.125W', unitCost:0.04, status:'stock', isControllerIC:false },
    { ref:'R15', qty:1, category:'Resistor', description:'TL431 Resistor',
      value:'11.3 kΩ 1%', package:'0805', manufacturer:'Yageo', mpn:'RC0805FR-0711K3L',
      rating:'0.125W', unitCost:0.04, status:'stock', isControllerIC:false },

    // Opto + TL431
    { ref:'U2A,U2B', qty:2, category:'IC', description:'Optocoupler',
      value:'LTV-817D', package:'SO-4', manufacturer:'Lite-On', mpn:'LTV-817D',
      rating:'50V / 50mA CTR>300%', unitCost:0.32, status:'stock', isControllerIC:false },
    { ref:'U3', qty:1, category:'IC', description:'Precision Shunt Reference',
      value:'TL431CD 2%', package:'SOT-23', manufacturer:'TI', mpn:'TL431AIDBZR',
      rating:'2.5–36V', unitCost:0.18, status:'stock', isControllerIC:false },

    // TVS / VR
    { ref:'VR1', qty:1, category:'Diode', description:'Transient Voltage Suppressor',
      value:'160V 5%', package:'DO-41', manufacturer:'Littelfuse', mpn:'1.5KE160A',
      rating:'160V / 1500W', unitCost:0.45, status:'stock', isControllerIC:false },

    // Inductor + Fuse
    { ref:'L1', qty:1, category:'Magnetics', description:'Common Mode Choke',
      value:'6 mH', package:'Radial', manufacturer:'Bourns', mpn:'SRR1260-6R0Y',
      rating:'6mH / 1.5A', unitCost:1.10, status:'stock', isControllerIC:false },
    { ref:'F1', qty:1, category:'Protection', description:'Input Fuse',
      value:'1.25A 250V Slow', package:'5×20mm', manufacturer:'Littelfuse', mpn:'0215001.MXP',
      rating:'1.25A / 250V', unitCost:0.22, status:'stock', isControllerIC:false },
  ];
});

const categories = computed(() => [...new Set(bom.value.map(b => b.category))]);

const filteredBOM = computed(() => {
  let items = bom.value;
  if (filterCat.value) items = items.filter(i => i.category === filterCat.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    items = items.filter(i =>
      i.ref.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.value.toLowerCase().includes(q) ||
      i.mpn.toLowerCase().includes(q) ||
      i.manufacturer.toLowerCase().includes(q)
    );
  }
  return [...items].sort((a, b) => {
    const av = a[sortCol.value] ?? '';
    const bv = b[sortCol.value] ?? '';
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * sortDir.value;
  });
});

const totalCost    = computed(() => filteredBOM.value.reduce((s, i) => s + i.unitCost * i.qty, 0));
const uniqueValues = computed(() => new Set(filteredBOM.value.map(i => i.value)).size);
const inStockCount = computed(() => filteredBOM.value.filter(i => i.status === 'stock').length);

function sortBy(col) {
  sortDir.value = sortCol.value === col ? sortDir.value * -1 : 1;
  sortCol.value = col;
}
function sa(col) {
  if (sortCol.value !== col) return '↕';
  return sortDir.value > 0 ? '↑' : '↓';
}

function exportCSV() {
  const header = 'Ref,Qty,Description,Value,Package,Manufacturer,MPN,Rating,Unit Cost,Status';
  const rows   = bom.value.map(i =>
    `"${i.ref}",${i.qty},"${i.description}","${i.value}","${i.package}","${i.manufacturer}","${i.mpn}","${i.rating}",${i.unitCost},${i.status}`
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${props.design.fileName}_BOM.csv`;
  a.click();
}
</script>

<style scoped>
.bom-root { display:flex; flex-direction:column; height:100%; min-height:0; font-size:.82rem; }
.bom-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:.45rem .85rem; background:#f8f9fb; border-bottom:1px solid #e2e4ea;
  flex-shrink:0; flex-wrap:wrap; gap:.5rem;
}
.bom-title { font-weight:700; color:#1a1a2e; font-size:.88rem; }
.bom-toolbar-right { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
.bom-search { height:30px; padding:0 .6rem 0 .6rem; border:1px solid #d0d3de; border-radius:6px; font-size:.8rem; outline:none; width:200px; }
.bom-search:focus { border-color:#0D7377; }
.bom-filter { height:30px; padding:0 .5rem; border:1px solid #d0d3de; border-radius:6px; font-size:.8rem; outline:none; background:#fff; }
.bom-export-btn { height:30px; padding:0 .75rem; background:#0D7377; border:none; border-radius:6px; color:#fff; font-size:.8rem; font-weight:600; cursor:pointer; white-space:nowrap; }
.bom-export-btn:hover { background:#3a68ff; }
.bom-summary-bar { display:flex; gap:0; border-bottom:1px solid #e2e4ea; flex-shrink:0; }
.bom-stat { flex:1; display:flex; flex-direction:column; align-items:center; padding:.45rem .5rem; border-right:1px solid #e2e4ea; }
.bom-stat:last-child { border-right:none; }
.bom-stat-n { font-size:1.1rem; font-weight:700; color:#0D7377; line-height:1.2; }
.bom-stat span:last-child { font-size:.7rem; color:#888; text-transform:uppercase; letter-spacing:.04em; }
.bom-table-wrap { flex:1; overflow:auto; min-height:0; }
.bom-table { width:100%; border-collapse:collapse; font-size:.79rem; white-space:nowrap; }
.bom-table thead tr { position:sticky; top:0; z-index:5; background:#f8f9fb; }
.bom-table th { padding:.4rem .65rem; text-align:left; font-size:.7rem; font-weight:700; color:#666; border-bottom:2px solid #e2e4ea; cursor:pointer; user-select:none; }
.bom-table th:hover { color:#1a1a2e; }
.sort { font-size:.65rem; opacity:.6; }
.bom-row td { padding:.35rem .65rem; border-bottom:1px solid #f0f1f5; vertical-align:middle; }
.bom-row:hover td { background:#f5f7ff; }
.bom-row.selected td { background:#eef1ff; }
.bom-row.bom-ic td { background:#fffbeb; }
.bom-ref { font-weight:600; }
.ref-ic { color:#d97706; font-weight:700; }
.bom-center { text-align:center; }
.bom-value { font-weight:500; color:#1a1a2e; }
.bom-mono { font-family:monospace; font-size:.75rem; }
.bom-mpn { color:#0D7377; }
.bom-cost { text-align:right; font-family:monospace; font-weight:600; color:#38A169; }
.bom-status-badge { display:inline-block; padding:.1rem .45rem; border-radius:4px; font-size:.68rem; font-weight:700; text-transform:uppercase; }
.bom-status-badge.stock   { background:#F0FFF4; color:#276749; }
.bom-status-badge.order   { background:#FFFBEB; color:#92400e; }
.bom-status-badge.sample  { background:#dbeafe; color:#1e40af; }
.bom-footer { display:flex; justify-content:space-between; padding:.3rem .85rem; background:#f8f9fb; border-top:1px solid #e2e4ea; font-size:.75rem; color:#888; flex-shrink:0; }
.bom-footer strong { color:#1a1a2e; }
</style>

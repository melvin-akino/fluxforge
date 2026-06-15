/**
 * UDS (Unified Design State) schema helpers.
 *
 * A .uds file is a JSON object with this top-level structure:
 * {
 *   meta:       { fileName, createdAt, variant, topology, family, ... },
 *   spec:       { input, outputs, options },
 *   components: { <refDes>: ComponentEntry, ... },
 *   schematic:  { frozen: [refDes, ...] },
 *   notes:      string
 * }
 *
 * ComponentEntry:
 * {
 *   ref:    string   (e.g. "C1")
 *   role:   string   (e.g. "input_bulk_cap")
 *   type:   string   (e.g. "capacitor")
 *   subtype:string
 *   part:   string   (part number)
 *   mfr:    string
 *   value:  number
 *   unit:   string
 *   voltage:number
 *   // ...any other DB fields
 *   frozen: boolean
 *   notes:  string
 * }
 */

/** Build a default UDS from wizard form + variant data */
export function buildUds(form, variant) {
  const base = { ...form, ...variant.mods };
  const now  = new Date().toISOString();

  return {
    meta: {
      fileName:    base.fileName || 'Design1',
      createdAt:   now,
      variant:     variant.label,
      topology:    base.topology,
      family:      base.family,
      pkg:         base.pkg,
      frequency:   base.frequency,
      feedbackType:base.feedbackType,
      inputSpec:   base.inputSpec,
      enclosure:   base.enclosure,
      totalPower:  base.totalPower,
      siUnits:     base.siUnits,
      componentSet:base.componentSet,
    },
    spec: {
      input: {
        vMin:      base.vMin,
        vMax:      base.vMax,
        lineFreq:  base.lineFreq,
        inputType: base.inputType,
      },
      outputs: base.outputs || [],
      options: {
        peakLoads:       base.peakLoads,
        ledDriver:       base.ledDriver,
        operationMode:   base.operationMode,
        ccThreshold:     base.ccThreshold,
        transformerType: base.transformerType,
        coreMaterial:    base.coreMaterial,
        shieldWindings:  base.shieldWindings,
      },
    },
    components: buildDefaultComponents(base),
    schematic: { frozen: [] },
    notes: '',
  };
}

/** Default component map generated from design parameters */
function buildDefaultComponents(base) {
  const vOut  = base.outputs?.[0]?.voltage ?? 12;
  const iOut  = base.outputs?.[0]?.current ?? 1;
  const pOut  = base.totalPower || (vOut * iOut);
  const vBus  = base.vMax > 200 ? 400 : 200;
  const isUniversal = base.vMin <= 90;

  return {
    // ── Input Section ─────────────────────────────────────────────
    F1: {
      ref:'F1', role:'input_fuse', type:'fuse', subtype:'fuse',
      part:'BEL-5HT 1-R', mfr:'Bel Fuse', value: pOut < 30 ? 1 : 2,
      unit:'A', voltage:250, package:'5x20mm', frozen:false, notes:'AC line fuse',
    },
    RT1: {
      ref:'RT1', role:'inrush_thermistor', type:'resistor', subtype:'thermistor',
      part:'NTCLE101E3103JB0', mfr:'Vishay', value:8, unit:'Ω',
      package:'Radial', frozen:false, notes:'Inrush current limiter',
    },
    VR1: {
      ref:'VR1', role:'input_varistor', type:'fuse', subtype:'varistor',
      part:'B72210S0271K101', mfr:'TDK/EPCOS', vaclamp:270,
      package:'10mm', frozen:false, notes:'Input surge protection',
    },
    L1: {
      ref:'L1', role:'emi_choke', type:'inductor', subtype:'emi_differential',
      part:'LPF3225V6R8MF', mfr:'TDK', value:6, unit:'mH',
      package:'3225', frozen:false, notes:'EMI differential choke',
    },
    BR1: {
      ref:'BR1', role:'bridge_rectifier', type:'diode', subtype:'bridge',
      part:'DF1506S', mfr:'Diodes Inc', voltage:600, current:1.5,
      package:'SOP-4', frozen:false, notes:'Bridge rectifier',
    },
    C1: {
      ref:'C1', role:'input_bulk_cap', type:'capacitor', subtype:'electrolytic_bulk',
      part:'UHE2G470MPD', mfr:'Nichicon', value:47, unit:'µF',
      voltage:vBus, esr:0.85, package:'Radial 16x25', frozen:false, notes:'',
    },
    R1: {
      ref:'R1', role:'hv_bleeder', type:'resistor', subtype:'general',
      part:'RC0805FR-0751KL', mfr:'Yageo', value:51, unit:'kΩ',
      power:0.125, package:'0805', frozen:false, notes:'HV divider/bleeder',
    },
    R2: {
      ref:'R2', role:'hv_bleeder', type:'resistor', subtype:'general',
      part:'RC0805FR-0751KL', mfr:'Yageo', value:51, unit:'kΩ',
      power:0.125, package:'0805', frozen:false, notes:'HV divider/bleeder',
    },
    C2: {
      ref:'C2', role:'bus_cap', type:'capacitor', subtype:'electrolytic_bulk',
      part:'EEU-EB2G470', mfr:'Panasonic', value:150, unit:'µF',
      voltage:vBus, esr:0.78, package:'Radial 16x25', frozen:false, notes:'Main bus cap',
    },
    C3: {
      ref:'C3', role:'emi_x2_cap', type:'capacitor', subtype:'emi_x2',
      part:'ECQ-U2A223ML', mfr:'Panasonic', value:3.9, unit:'nF',
      voltage_ac:275, package:'Radial', frozen:false, notes:'X2 EMI cap',
    },
    // ── PI Device ─────────────────────────────────────────────────
    U1: {
      ref:'U1', role:'pi_device', type:'ic', subtype:'topswitch',
      part: pOut <= 65 ? 'TOP256EG' : pOut <= 105 ? 'TOP262EG' : 'TOP266EG',
      mfr:'Generic', family:'HPFC-1',
      package: base.pkg || 'EG (eSIP-7C)', frozen:false, notes:'PWM controller',
    },
    R4: {
      ref:'R4', role:'startup_resistor', type:'resistor', subtype:'startup',
      part:'RC1210FR-072M2L', mfr:'Yageo', value:2.2, unit:'MΩ',
      power:0.5, package:'1210', frozen:false, notes:'Startup/bias resistor',
    },
    R5: {
      ref:'R5', role:'startup_resistor', type:'resistor', subtype:'startup',
      part:'RC2010FK-073M9L', mfr:'Yageo', value:3.9, unit:'MΩ',
      power:0.75, package:'2010', frozen:false, notes:'',
    },
    R6: {
      ref:'R6', role:'ilim_resistor', type:'resistor', subtype:'feedback',
      part:'RC0805FR-071KL', mfr:'Yageo', value:7.68, unit:'kΩ',
      power:0.125, package:'0805', frozen:false, notes:'ILIM pin resistor',
    },
    C4: {
      ref:'C4', role:'bypass_cap', type:'capacitor', subtype:'ceramic',
      part:'C1608X7R1H104K', mfr:'TDK', value:100, unit:'nF',
      voltage:50, package:'0603', frozen:false, notes:'Bypass cap V pin',
    },
    C5: {
      ref:'C5', role:'bypass_cap', type:'capacitor', subtype:'ceramic',
      part:'C1608X7R1H104K', mfr:'TDK', value:47, unit:'nF',
      voltage:50, package:'0603', frozen:false, notes:'Bypass cap X pin',
    },
    // ── Transformer ───────────────────────────────────────────────
    T1: {
      ref:'T1', role:'transformer', type:'inductor', subtype:'transformer_core',
      part:'EFD30/15/9', mfr:'TDK/Ferroxcube',
      ae:0.600, le:6.72, al:2200, material:'N87/3F3',
      frozen:false, notes:'EFD30 transformer core',
    },
    // ── Clamp Network ─────────────────────────────────────────────
    D1: {
      ref:'D1', role:'clamp_diode', type:'diode', subtype:'clamp',
      part:'UF4007', mfr:'Vishay', voltage:1000, current:1,
      vf:1.7, package:'DO-41', frozen:false, notes:'Primary clamp diode',
    },
    R3: {
      ref:'R3', role:'clamp_resistor', type:'resistor', subtype:'snubber',
      part:'RC0805FR-0722RL', mfr:'Yageo', value:0.1, unit:'Ω',
      power:0.125, package:'0805', frozen:false, notes:'Clamp resistor',
    },
    // ── Output Section ────────────────────────────────────────────
    D3: {
      ref:'D3', role:'output_diode', type:'diode', subtype:'schottky_output',
      part:'V10D60C', mfr:'Vishay', voltage:60, current:10,
      vf:0.55, package:'TO-220AC', frozen:false, notes:'Main output rectifier',
    },
    D2: {
      ref:'D2', role:'aux_diode', type:'diode', subtype:'schottky_output',
      part:'FDLL4448', mfr:'Fairchild', voltage:100, current:0.2,
      vf:1.0, package:'SOD-80', frozen:false, notes:'Auxiliary winding diode',
    },
    C7: {
      ref:'C7', role:'snubber_cap', type:'capacitor', subtype:'film_snubber',
      part:'ECQ-E6474KF', mfr:'Panasonic', value:470, unit:'pF',
      voltage:200, package:'Radial', frozen:false, notes:'Output diode snubber',
    },
    R10: {
      ref:'R10', role:'snubber_resistor', type:'resistor', subtype:'snubber',
      part:'RC0805FR-0722RL', mfr:'Yageo', value:22, unit:'Ω',
      power:0.125, package:'0805', frozen:false, notes:'Snubber resistor',
    },
    C9: {
      ref:'C9', role:'output_cap', type:'capacitor', subtype:'electrolytic_output',
      part:'UPS1E471MED', mfr:'Nichicon', value:470, unit:'µF',
      voltage:Math.ceil(vOut * 1.5 / 10) * 10, esr:0.045,
      package:'Radial 10x16', frozen:false, notes:'Output filter cap',
    },
    C10: {
      ref:'C10', role:'output_cap', type:'capacitor', subtype:'electrolytic_output',
      part:'UPS1E471MED', mfr:'Nichicon', value:470, unit:'µF',
      voltage:Math.ceil(vOut * 1.5 / 10) * 10, esr:0.045,
      package:'Radial 10x16', frozen:false, notes:'Output filter cap',
    },
    C11: {
      ref:'C11', role:'output_cap_final', type:'capacitor', subtype:'electrolytic_output',
      part:'UPS1V101MED', mfr:'Nichicon', value:100, unit:'µF',
      voltage:Math.ceil(vOut * 1.5 / 10) * 10, esr:0.09,
      package:'Radial 8x12', frozen:false, notes:'Final output cap',
    },
    // ── Feedback ──────────────────────────────────────────────────
    U3: {
      ref:'U3', role:'voltage_reference', type:'ic', subtype:'tl431',
      part:'TL431CD', mfr:'TI', vref:'2.495', package:'SO-8',
      frozen:false, notes:'Precision voltage reference',
    },
    U2A: {
      ref:'U2A', role:'optocoupler', type:'ic', subtype:'optocoupler',
      part:'LTV-817D', mfr:'Lite-On', ctr:'200', vce:35,
      package:'DIP-4', frozen:false, notes:'Feedback optocoupler',
    },
    R11: {
      ref:'R11', role:'feedback_resistor', type:'resistor', subtype:'feedback',
      part:'RK73H2ATTD4991F', mfr:'KOA', value:5190, unit:'Ω',
      power:0.25, tol:1, package:'0805', frozen:false, notes:'Upper feedback divider',
    },
    R12: {
      ref:'R12', role:'feedback_resistor', type:'resistor', subtype:'feedback',
      part:'RC0805FR-071KL', mfr:'Yageo', value:1, unit:'kΩ',
      power:0.125, tol:1, package:'0805', frozen:false, notes:'Lower feedback divider',
    },
    R13: {
      ref:'R13', role:'opto_resistor', type:'resistor', subtype:'feedback',
      part:'RC0805FR-071KL', mfr:'Yageo', value:1, unit:'kΩ',
      power:0.125, package:'0805', frozen:false, notes:'Opto LED resistor',
    },
    C12: {
      ref:'C12', role:'feedback_cap', type:'capacitor', subtype:'ceramic',
      part:'C0805C472K5RAC', mfr:'KEMET', value:22, unit:'nF',
      voltage:100, package:'0805', frozen:false, notes:'Feedback compensation cap',
    },
    C13: {
      ref:'C13', role:'bias_cap', type:'capacitor', subtype:'bias',
      part:'EEE-FC1A101P', mfr:'Panasonic', value:100, unit:'nF',
      voltage:16, package:'SMD 6.3x7.7', frozen:false, notes:'Bias supply cap',
    },
  };
}

/** Extract display label for a component (part + value) */
export function compLabel(c) {
  if (!c) return '?';
  if (c.value != null && c.unit) return `${c.value} ${c.unit}`;
  if (c.part) return c.part;
  return c.ref || '?';
}

/** Merge a DB component record into the UDS component entry */
export function applyDbComponent(existing, dbRecord) {
  return {
    ...existing,
    part:    dbRecord.part    ?? existing.part,
    mfr:     dbRecord.mfr     ?? existing.mfr,
    value:   dbRecord.value   ?? existing.value,
    unit:    dbRecord.unit    ?? existing.unit,
    voltage: dbRecord.voltage ?? existing.voltage,
    current: dbRecord.current ?? existing.current,
    esr:     dbRecord.esr     ?? existing.esr,
    dcr:     dbRecord.dcr     ?? existing.dcr,
    vf:      dbRecord.vf      ?? existing.vf,
    package: dbRecord.package ?? existing.package,
    family:  dbRecord.family  ?? existing.family,
    ctr:     dbRecord.ctr     ?? existing.ctr,
    vref:    dbRecord.vref    ?? existing.vref,
    power:   dbRecord.power   ?? existing.power,
    tol:     dbRecord.tol     ?? existing.tol,
    temp:    dbRecord.temp    ?? existing.temp,
    cost:    dbRecord.cost    ?? existing.cost,
  };
}

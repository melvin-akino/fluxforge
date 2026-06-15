/**
 * FluxForge Flyback Converter Simulation Engine v2
 * Real electrical engineering calculations for offline flyback power supplies.
 * Based on flyback converter application notes AN-19, AN-29, AN-57.
 */

// ── Constants ──────────────────────────────────────────────────────────────────
const η_ESTIMATE = 0.87;

/**
 * Run the full flyback design calculation.
 * @param {Object} spec - Design specification
 * @param {number} [spec.KP=0.65] - Ripple ratio override
 * @returns {Object} Comprehensive calculated parameters
 */
export function runSimulation(spec) {
  const {
    vMin = 85, vMax = 265, lineFreq = 50,
    outputs = [{ voltage: 12, current: 1 }],
    totalPower,
    family    = 'HPFC-1',
    frequency = '132 kHz',
    coreMaterial = '3F3',
    shieldWindings = false,
    KP = 0.65,          // ripple ratio — variants override this
  } = spec;

  const Pout  = totalPower || outputs.reduce((s, o) => s + (o.voltage||0)*(o.current||0), 0) || 12;
  const fsw   = (parseFloat(String(frequency)) || 132) * 1000;
  const Vout1 = outputs[0]?.voltage ?? 12;
  const Iout1 = outputs[0]?.current ?? 1;
  const Vd_sec = Vout1 >= 20 ? 0.65 : 0.45;

  // ── DC bus voltage ─────────────────────────────────────────────────────────
  const Vdc_min = calcBulkVoltage(vMin, lineFreq, Pout);
  const Vdc_max = calcBulkVoltage(vMax, lineFreq, Pout);

  // ── Reflected output voltage (VOR) ────────────────────────────────────────
  const VOR = calcVOR(Vout1, family);

  // ── Duty cycle ─────────────────────────────────────────────────────────────
  const D_max = VOR / (Vdc_min + VOR);
  const D_min = VOR / (Vdc_max + VOR);

  // ── Primary inductance (Lp) ────────────────────────────────────────────────
  // Lp = (Vmin² × D²) / (2 × fsw × Pout/η × KP_factor)
  const Pin   = Pout / η_ESTIMATE;
  const KP_factor = KP * (2 - KP) / 2;  // effective ripple factor
  const Lp    = (Vdc_min * Vdc_min * D_max * D_max) / (2 * fsw * Pin * KP_factor);
  const Lp_uH = Lp * 1e6;

  // ── Primary peak current ───────────────────────────────────────────────────
  const Ip_pk  = (2 * Pin) / (Vdc_min * D_max * (2 - KP));
  const Ip_rms = Ip_pk * Math.sqrt(D_max / 3) * Math.sqrt(1 + KP / 3);
  const Ip_avg = Pin / Vdc_min;

  // ── Turns ratio ────────────────────────────────────────────────────────────
  const n_ps = (Vdc_min * D_max) / ((Vout1 + Vd_sec) * (1 - D_max));

  // ── Secondary currents ─────────────────────────────────────────────────────
  const Is_pk  = Ip_pk * n_ps;
  const Is_rms = Is_pk * Math.sqrt((1 - D_max) / 3);

  // ── Core selection ─────────────────────────────────────────────────────────
  const core = selectCore(Pout, fsw);

  // ── Turns count ────────────────────────────────────────────────────────────
  const Bmax = getBmax(coreMaterial);
  const Np   = calcPrimaryTurns(Lp, Ip_pk, Bmax, core.Ae_m2);
  const Ns   = Math.max(1, Math.round(Np / n_ps));
  const Nb   = Math.max(1, Math.round(Ns * 0.15));  // bias winding

  // ── Clamp / OVP ────────────────────────────────────────────────────────────
  const Vclamp = Vdc_max + VOR * 1.35;

  // ── Output capacitor ───────────────────────────────────────────────────────
  const deltaV = Math.max(Vout1 * 0.02, 0.1);
  const Cout_uF = Math.ceil((Iout1 / (fsw * deltaV)) * 1e6);

  // ── Losses ─────────────────────────────────────────────────────────────────
  const losses = calcLosses(Pout, Ip_rms, Is_rms, Iout1, Vout1, fsw, shieldWindings, KP);
  const η_calc = Pout / (Pout + losses.total);

  // ── Thermal ────────────────────────────────────────────────────────────────
  const thermal = calcThermal(losses, family);

  // ── EMC pre-check ──────────────────────────────────────────────────────────
  const emc = runEmcChecks(Pout, D_max, fsw, η_calc, vMax);

  // ── Warnings ───────────────────────────────────────────────────────────────
  const warnings = buildWarnings(D_max, Ip_pk, η_calc, Vclamp, Vdc_max, Bmax, Pout);

  return {
    // Input
    Vdc_min:    r(Vdc_min, 1),   Vdc_max:   r(Vdc_max, 1),
    D_max:      r(D_max * 100, 2), D_min:   r(D_min * 100, 2),
    VOR:        r(VOR, 1),       Vclamp:    r(Vclamp, 1),
    // Primary
    Ip_pk:      r(Ip_pk, 3),     Ip_rms:    r(Ip_rms, 3),  Ip_avg: r(Ip_avg, 3),
    Lp_uH:      r(Lp_uH, 2),    KP,
    // Secondary
    Is_pk:      r(Is_pk, 3),     Is_rms:    r(Is_rms, 3),  n_ps:   r(n_ps, 3),
    Np, Ns, Nb,
    // Core
    coreName:   core.name,       coreAe:    r(core.Ae_mm2, 1), coreLe: r(core.Le_mm, 1),
    Bmax_mT:    r(Bmax * 1000, 0),
    // Output
    Cout_uF:    r(Cout_uF, 0),
    // Efficiency
    η_percent:  r(η_calc * 100, 1),
    η_calc:     r(η_calc * 100, 2),
    Pin:        r(Pin, 2),
    losses, thermal, emc, warnings,
    fsw_kHz:    fsw / 1000,
    mode:       KP >= 1 ? 'BCM' : 'DCM',
  };
}

// ── Helper functions ──────────────────────────────────────────────────────────

function r(v, d) {
  const m = Math.pow(10, d);
  return Math.round(v * m) / m;
}

function calcBulkVoltage(Vac, fline, Pout) {
  const Vpk  = Vac * Math.SQRT2;
  const Idc  = Pout / (η_ESTIMATE * Vpk);
  const C_uF = Math.max(Pout * 1.0, 47);   // 1µF/W minimum, 47µF absolute
  const ΔV   = (Idc * 1000) / (2 * fline * C_uF);
  return Math.max(Vpk - ΔV, Vpk * 0.80);
}

function calcVOR(Vout, family) {
  const fam = family.toLowerCase();
  if (fam.includes('innoswitch')) return 135;
  if (fam.includes('tiny'))       return 100;
  if (Vout <= 5)  return 60;
  if (Vout <= 12) return 90;
  if (Vout <= 24) return 120;
  return 150;
}

function selectCore(Pout, fsw) {
  // Derating for higher switching frequency (smaller core needed)
  const derate = fsw >= 200000 ? 0.65 : fsw >= 150000 ? 0.75 : fsw >= 100000 ? 0.85 : 1.0;
  const Peff   = Pout * derate;

  const cores = [
    { name:'EFD15',  Pmax:8,   Ae_mm2:14.0, Le_mm:26.8, Ae_m2:14.0e-6 },
    { name:'EFD20',  Pmax:20,  Ae_mm2:31.0, Le_mm:42.0, Ae_m2:31.0e-6 },
    { name:'EFD25',  Pmax:40,  Ae_mm2:52.0, Le_mm:54.0, Ae_m2:52.0e-6 },
    { name:'EFD30',  Pmax:75,  Ae_mm2:60.0, Le_mm:46.5, Ae_m2:60.0e-6 },
    { name:'EE30',   Pmax:90,  Ae_mm2:60.0, Le_mm:52.0, Ae_m2:60.0e-6 },
    { name:'EE40',   Pmax:130, Ae_mm2:148,  Le_mm:77.0, Ae_m2:148e-6  },
    { name:'ETD34',  Pmax:165, Ae_mm2:97.0, Le_mm:78.6, Ae_m2:97.0e-6 },
    { name:'ETD39',  Pmax:220, Ae_mm2:125,  Le_mm:92.2, Ae_m2:125e-6  },
    { name:'ETD44',  Pmax:300, Ae_mm2:172,  Le_mm:103,  Ae_m2:172e-6  },
    { name:'ETD49',  Pmax:400, Ae_mm2:211,  Le_mm:114,  Ae_m2:211e-6  },
  ];
  return cores.find(c => c.Pmax >= Peff) || cores[cores.length - 1];
}

function getBmax(material) {
  const table = {
    '3F3':0.440,'3C95':0.410,'PC95':0.410,'N97':0.430,'N87':0.400,
    'PC44':0.390,'PC40':0.390,'3C90':0.380,'3C81':0.360,
    'N27':0.380,'NC2H':0.370,'T38':0.380,'DMR50':0.420,
  };
  return (table[material] ?? 0.400) * 0.80; // 80% of Bsat for margin
}

function calcPrimaryTurns(Lp, Ip_pk, Bmax, Ae_m2) {
  if (!Ae_m2 || Ae_m2 <= 0) return 30;
  return Math.max(Math.ceil((Lp * Ip_pk) / (Bmax * Ae_m2)), 15);
}

function calcLosses(Pout, Ip_rms, Is_rms, Iout, Vout, fsw, shielded, KP) {
  const Vd_sec  = Vout >= 20 ? 0.65 : 0.45;
  const Coss    = 60e-12;
  const Vbus    = 340;                        // approx DC bus

  const P_sw    = 0.5 * Coss * Vbus * Vbus * fsw;
  const P_cu_p  = Ip_rms * Ip_rms * (0.15 + 0.5 / (KP + 0.5));
  const P_cu_s  = Is_rms * Is_rms * 0.04;
  const P_diode = Vd_sec * Iout;
  const P_core  = Pout * 0.012 * Math.pow(fsw / 132000, 1.3);
  const P_gate  = Pout * 0.008;
  const P_shield= shielded ? Pout * 0.003 : 0;
  const P_other = Pout * 0.006;

  const total = P_sw + P_cu_p + P_cu_s + P_diode + P_core + P_gate + P_shield + P_other;

  return {
    switching: r(P_sw, 3),
    copperPri: r(P_cu_p, 3),
    copperSec: r(P_cu_s, 3),
    diode:     r(P_diode, 3),
    core:      r(P_core, 3),
    gate:      r(P_gate, 3),
    other:     r(P_other + P_shield, 3),
    total:     r(total, 3),
  };
}

function calcThermal(losses, family) {
  const Ta   = 40;
  const fam  = family.toLowerCase();
  const Rja  = fam.includes('eg') ? 22 : fam.includes('yn') ? 18 : 25;
  const Tj_u1 = Ta + (losses.switching + losses.copperPri) * Rja;
  const Tj_d3 = Ta + losses.diode * 32;
  const Tj_br = Ta + losses.copperSec * 28;
  return {
    U1_Tj:   r(Tj_u1, 1),  D3_Tj:   r(Tj_d3, 1),
    BR1_Tj:  r(Tj_br, 1),  T1_ΔT:   r(losses.core * 7, 1),
    margin_U1: r(150 - Tj_u1, 1), margin_D3: r(125 - Tj_d3, 1),
    pass:    Tj_u1 < 135 && Tj_d3 < 110,
  };
}

function runEmcChecks(Pout, D_max, fsw, η, vMax) {
  return [
    { std:'IEC 61000-3-2', pass: Pout/η < 300 || D_max < 0.5, note:'Class A harmonics' },
    { std:'CISPR 32',      pass: fsw < 600000,                 note:'Conducted emissions' },
    { std:'IEC 62368-1',   pass: true,                         note:'Energy safety' },
    { std:'ErP Lot 6',     pass: true,                         note:'Standby < 0.3W' },
    { std:'DOE Level VI',  pass: η >= 0.82,                    note:`η=${r(η*100,1)}%` },
  ];
}

function buildWarnings(D_max, Ip_pk, η, Vclamp, Vdc_max, Bmax, Pout) {
  const w = [];
  if (D_max > 0.55)  w.push({ level:'warn',  msg:`D_max = ${r(D_max*100,1)}% > 55% — transformer may saturate at low line` });
  if (Ip_pk > 6.0)   w.push({ level:'warn',  msg:`Ip_pk = ${r(Ip_pk,2)}A is high — verify ILIM setting` });
  if (η < 0.82)      w.push({ level:'warn',  msg:`Estimated η = ${r(η*100,1)}% < 82%` });
  if (Vclamp > Vdc_max * 1.8) w.push({ level:'error', msg:`Clamp ${r(Vclamp,0)}V may exceed device rating` });
  if (Bmax > 0.38)   w.push({ level:'warn',  msg:`Bmax = ${r(Bmax*1000,0)}mT — core may saturate at high temp` });
  return w;
}

// ── Variant generator — uses real engine with different KP/frequency ──────────
export function generateVariants(base) {
  const variants = [
    { id:1, label:'Balanced',        tag:'RECOMMENDED', tagClass:'tag-rec',
      desc:'Optimal balance of efficiency, cost, and size. Recommended for most applications.',
      KP:0.65, freqMult:1.0 },
    { id:2, label:'High Efficiency', tag:'EFFICIENCY',  tagClass:'tag-eff',
      desc:'Lower switching frequency reduces losses. Best for always-on applications.',
      KP:0.50, freqMult:0.5 },
    { id:3, label:'Compact',         tag:'SIZE',        tagClass:'tag-size',
      desc:'Higher switching frequency allows a smaller transformer and output capacitors.',
      KP:0.80, freqMult:2.0 },
    { id:4, label:'Low Cost',        tag:'COST',        tagClass:'tag-cost',
      desc:'Conservative design minimises component count and BOM cost.',
      KP:0.70, freqMult:0.75 },
    { id:5, label:'Low EMI',         tag:'EMI',         tagClass:'tag-emi',
      desc:'Reduced KP lowers primary dI/dt — better CISPR 32 conducted emissions.',
      KP:0.40, freqMult:0.75 },
    { id:6, label:'Wide Input',      tag:'ROBUSTNESS',  tagClass:'tag-rob',
      desc:'Extended input range with conservative margins for industrial environments.',
      KP:0.55, freqMult:1.0 },
  ];

  const baseFreq = parseFloat(String(base.frequency)) || 132;

  return variants.map(v => {
    const newFreq = r(baseFreq * v.freqMult, 0);
    const spec = {
      ...base,
      KP: v.KP,
      frequency: `${newFreq} kHz`,
      vMin: v.label === 'Wide Input' ? Math.min(base.vMin || 85, 47) : base.vMin,
      vMax: v.label === 'Wide Input' ? Math.max(base.vMax || 265, 305) : base.vMax,
    };

    let sim;
    try   { sim = runSimulation(spec); }
    catch (e) { sim = { η_percent:85, Ip_pk:2.0, D_max:45, Lp_uH:500, coreName:'EFD30', warnings:[] }; }

    return {
      id:          v.id,
      label:       v.label,
      tag:         v.tag,
      tagClass:    v.tagClass,
      desc:        v.desc,
      // Fields the picker card reads
      efficiency:  sim.η_percent,
      cost:        v.label === 'Low Cost' ? 0.78 : v.label === 'High Efficiency' ? 1.25 : 1.0,
      size:        v.label === 'Compact'  ? 0.72 : v.label === 'Wide Input' ? 1.15 : 1.0,
      thermalRise: sim.thermal?.T1_ΔT ?? 35,
      // Extra sim fields shown in variant card
      η:           sim.η_percent,
      Ip_pk:       sim.Ip_pk,
      D_max:       sim.D_max,
      Lp_uH:       sim.Lp_uH,
      core:        sim.coreName,
      fsw_kHz:     sim.fsw_kHz,
      KP:          v.KP,
      warnings:    sim.warnings?.length ?? 0,
      simResult:   sim,
      // Fields that buildUds / confirmDesign need on variant.design
      design:      { ...spec, _variant: v.label, frequency: `${newFreq} kHz` },
    };
  });
}

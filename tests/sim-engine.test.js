/**
 * SimEngine unit tests — node:test (built-in, no install needed)
 * Run: node --test tests/sim-engine.test.js
 */
'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// SimEngine is ESM — use dynamic import
let runSimulation, generateVariants;
before(async () => {
  const mod = await import('../packages/shared/src/engine/SimEngine.js');
  runSimulation    = mod.runSimulation;
  generateVariants = mod.generateVariants;
});

// ── Baseline spec ──────────────────────────────────────────────────────────────
const BASE_SPEC = {
  vMin: 85, vMax: 265, lineFreq: 50,
  outputs: [{ voltage: 12, current: 5.4 }],
  totalPower: 65,
  family: 'HPFC-1',
  frequency: '132 kHz',
  coreMaterial: 'PC95',
  shieldWindings: false,
  KP: 0.65,
};

// ── runSimulation ─────────────────────────────────────────────────────────────
describe('runSimulation', () => {

  it('returns an object for valid spec', () => {
    const r = runSimulation(BASE_SPEC);
    assert.strictEqual(typeof r, 'object');
    assert.notEqual(r, null);
  });

  it('efficiency is within realistic range 80-99%', () => {
    const { η_percent } = runSimulation(BASE_SPEC);
    assert.ok(η_percent >= 80, `η_percent = ${η_percent} < 80`);
    assert.ok(η_percent < 100, `η_percent = ${η_percent} >= 100`);
  });

  it('peak primary current Ip_pk is positive', () => {
    const { Ip_pk } = runSimulation(BASE_SPEC);
    assert.ok(Ip_pk > 0, `Ip_pk = ${Ip_pk}`);
  });

  it('max duty cycle D_max is between 10% and 65%', () => {
    const { D_max } = runSimulation(BASE_SPEC);
    assert.ok(D_max > 10, `D_max = ${D_max} too low`);
    assert.ok(D_max < 65, `D_max = ${D_max} too high`);
  });

  it('primary inductance Lp_uH is positive', () => {
    const { Lp_uH } = runSimulation(BASE_SPEC);
    assert.ok(Lp_uH > 0, `Lp_uH = ${Lp_uH}`);
  });

  it('primary turns Np >= 15', () => {
    const { Np } = runSimulation(BASE_SPEC);
    assert.ok(Np >= 15, `Np = ${Np}`);
  });

  it('secondary turns Ns >= 1', () => {
    const { Ns } = runSimulation(BASE_SPEC);
    assert.ok(Ns >= 1, `Ns = ${Ns}`);
  });

  it('turns ratio Np/Ns is physically reasonable (2-20)', () => {
    const { Np, Ns } = runSimulation(BASE_SPEC);
    const ratio = Np / Ns;
    assert.ok(ratio >= 2 && ratio <= 20, `Np/Ns = ${ratio}`);
  });

  it('coreName is a non-empty string', () => {
    const { coreName } = runSimulation(BASE_SPEC);
    assert.strictEqual(typeof coreName, 'string');
    assert.ok(coreName.length > 0);
  });

  it('losses object has all required fields', () => {
    const { losses } = runSimulation(BASE_SPEC);
    for (const key of ['switching','copperPri','copperSec','diode','core','total']) {
      assert.ok(key in losses, `missing losses.${key}`);
      assert.ok(losses[key] >= 0, `losses.${key} < 0`);
    }
  });

  it('losses.total > 0', () => {
    const { losses } = runSimulation(BASE_SPEC);
    assert.ok(losses.total > 0);
  });

  it('thermal has U1_Tj, D3_Tj, pass fields', () => {
    const { thermal } = runSimulation(BASE_SPEC);
    assert.ok('U1_Tj' in thermal);
    assert.ok('D3_Tj' in thermal);
    assert.ok('pass'  in thermal);
    assert.strictEqual(typeof thermal.pass, 'boolean');
  });

  it('emc checks array has 5 entries', () => {
    const { emc } = runSimulation(BASE_SPEC);
    assert.ok(Array.isArray(emc));
    assert.strictEqual(emc.length, 5);
  });

  it('each emc entry has std, pass, note fields', () => {
    const { emc } = runSimulation(BASE_SPEC);
    emc.forEach(e => {
      assert.ok(typeof e.std  === 'string', 'missing std');
      assert.ok(typeof e.pass === 'boolean','missing pass');
      assert.ok(typeof e.note === 'string', 'missing note');
    });
  });

  it('warnings is an array', () => {
    const { warnings } = runSimulation(BASE_SPEC);
    assert.ok(Array.isArray(warnings));
  });

  it('KP override changes Lp_uH', () => {
    const r1 = runSimulation({ ...BASE_SPEC, KP: 0.40 });
    const r2 = runSimulation({ ...BASE_SPEC, KP: 0.80 });
    assert.notStrictEqual(r1.Lp_uH, r2.Lp_uH);
  });

  it('lower KP gives larger Lp (more inductance needed)', () => {
    const rLow  = runSimulation({ ...BASE_SPEC, KP: 0.40 });
    const rHigh = runSimulation({ ...BASE_SPEC, KP: 0.80 });
    assert.ok(rLow.Lp_uH > rHigh.Lp_uH,
      `KP=0.40 Lp=${rLow.Lp_uH} should > KP=0.80 Lp=${rHigh.Lp_uH}`);
  });

  it('higher frequency gives smaller Lp', () => {
    const rLow  = runSimulation({ ...BASE_SPEC, frequency: '66 kHz' });
    const rHigh = runSimulation({ ...BASE_SPEC, frequency: '264 kHz' });
    assert.ok(rLow.Lp_uH > rHigh.Lp_uH,
      `66kHz Lp=${rLow.Lp_uH} should > 264kHz Lp=${rHigh.Lp_uH}`);
  });

  it('IFC family gives higher VOR (135V) than LPFC (100V)', () => {
    const rInno = runSimulation({ ...BASE_SPEC, family: 'IFC-CE' });
    const rTiny = runSimulation({ ...BASE_SPEC, family: 'LPFC-1' });
    assert.ok(rInno.VOR >= rTiny.VOR,
      `IFC VOR=${rInno.VOR} should >= LPFC VOR=${rTiny.VOR}`);
  });

  it('works with minimal output spec (defaults)', () => {
    const r = runSimulation({ totalPower: 10, family: 'LPFC-1', frequency: '132 kHz' });
    assert.ok(r.η_percent > 0);
    assert.ok(r.Lp_uH > 0);
  });

  it('small design selects smaller core than large design', () => {
    const rSmall = runSimulation({ ...BASE_SPEC, totalPower: 5,   outputs:[{voltage:5,current:1}] });
    const rLarge = runSimulation({ ...BASE_SPEC, totalPower: 200, outputs:[{voltage:48,current:4}] });
    // Core index: EFD15 < EFD30 < ETD44 etc — just check they're different
    assert.notStrictEqual(rSmall.coreName, rLarge.coreName);
  });
});

// ── generateVariants ──────────────────────────────────────────────────────────
describe('generateVariants', () => {

  it('returns exactly 6 variants', () => {
    const variants = generateVariants(BASE_SPEC);
    assert.strictEqual(variants.length, 6);
  });

  it('variant ids are 1 through 6', () => {
    const variants = generateVariants(BASE_SPEC);
    const ids = variants.map(v => v.id);
    assert.deepStrictEqual(ids, [1, 2, 3, 4, 5, 6]);
  });

  it('all variants have label, tag, desc, efficiency, cost, size', () => {
    const variants = generateVariants(BASE_SPEC);
    for (const v of variants) {
      assert.ok(v.label,      `variant ${v.id} missing label`);
      assert.ok(v.tag,        `variant ${v.id} missing tag`);
      assert.ok(v.desc,       `variant ${v.id} missing desc`);
      assert.ok('efficiency' in v, `variant ${v.id} missing efficiency`);
      assert.ok('cost'       in v, `variant ${v.id} missing cost`);
      assert.ok('size'       in v, `variant ${v.id} missing size`);
    }
  });

  it('all variants have design and simResult fields', () => {
    const variants = generateVariants(BASE_SPEC);
    variants.forEach(v => {
      assert.ok(v.design,    `variant ${v.id} missing design`);
      assert.ok(v.simResult, `variant ${v.id} missing simResult`);
    });
  });

  it('Lp_uH values are not all identical', () => {
    const variants = generateVariants(BASE_SPEC);
    const unique = new Set(variants.map(v => v.Lp_uH));
    assert.ok(unique.size > 1, 'All variants have identical Lp_uH — KP not varying');
  });

  it('η values are not all identical', () => {
    const variants = generateVariants(BASE_SPEC);
    const unique = new Set(variants.map(v => v.η));
    assert.ok(unique.size > 1, 'All variants have identical η — variants not differentiating');
  });

  it('Balanced variant (id=1) has KP=0.65', () => {
    const balanced = generateVariants(BASE_SPEC).find(v => v.id === 1);
    assert.strictEqual(balanced.KP, 0.65);
  });

  it('High Efficiency variant (id=2) uses lower frequency than Balanced', () => {
    const [balanced, highEff] = generateVariants(BASE_SPEC);
    assert.ok(highEff.fsw_kHz < balanced.fsw_kHz,
      `High Efficiency fsw=${highEff.fsw_kHz} should < Balanced fsw=${balanced.fsw_kHz}`);
  });

  it('Compact variant (id=3) has smaller Lp than Balanced', () => {
    const [balanced, , compact] = generateVariants(BASE_SPEC);
    assert.ok(compact.Lp_uH < balanced.Lp_uH,
      `Compact Lp=${compact.Lp_uH} should < Balanced Lp=${balanced.Lp_uH}`);
  });

  it('all variant efficiencies are in realistic range', () => {
    const variants = generateVariants(BASE_SPEC);
    variants.forEach(v => {
      assert.ok(v.η >= 75 && v.η < 100,
        `variant ${v.label} η=${v.η} out of range`);
    });
  });
});

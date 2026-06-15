/**
 * UDS Schema unit tests — node:test
 * Run: node --test tests/uds-schema.test.js
 */
'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

let buildUds, applyDbComponent, compLabel;

before(async () => {
  const mod = await import('../packages/shared/src/data/udsSchema.js');
  buildUds         = mod.buildUds;
  applyDbComponent = mod.applyDbComponent;
  compLabel        = mod.compLabel;
});

const BASE_FORM = {
  topology: 'Flyback', family: 'HPFC-1', pkg: 'eSIP-7C',
  frequency: '132 kHz', feedbackType: 'Secondary TL431',
  vMin: 85, vMax: 265, lineFreq: 50,
  inputSpec: 'Universal (85-265V)',
  totalPower: 65, outputs: [{ voltage: 12, current: 5.4 }],
  fileName: 'TestDesign', coreMaterial: 'PC95',
  shieldWindings: false, transformerType: 'Wire Wound',
  componentSet: 'All Records',
};

const BASE_VARIANT = {
  id: 1, label: 'Balanced', tag: 'RECOMMENDED',
  mods: {}, design: { ...BASE_FORM, _variant: 'Balanced' },
};

describe('buildUds', () => {

  it('returns an object with meta, spec, components, notes keys', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.ok('meta'       in uds, 'missing meta');
    assert.ok('spec'       in uds, 'missing spec');
    assert.ok('components' in uds, 'missing components');
    assert.ok('notes'      in uds, 'missing notes');
  });

  it('meta.fileName matches form.fileName', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.strictEqual(uds.meta.fileName, 'TestDesign');
  });

  it('meta.topology matches form.topology', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.strictEqual(uds.meta.topology, 'Flyback');
  });

  it('meta.family matches form.family', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.strictEqual(uds.meta.family, 'HPFC-1');
  });

  it('meta.totalPower matches form.totalPower', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.strictEqual(uds.meta.totalPower, 65);
  });

  it('meta.variant matches variant.label', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.strictEqual(uds.meta.variant, 'Balanced');
  });

  it('meta.createdAt is a valid ISO date string', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    const d = new Date(uds.meta.createdAt);
    assert.ok(!isNaN(d.getTime()), `createdAt=${uds.meta.createdAt} is not a valid date`);
  });

  it('spec.input.vMin == 85', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.strictEqual(uds.spec.input.vMin, 85);
  });

  it('spec.input.vMax == 265', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.strictEqual(uds.spec.input.vMax, 265);
  });

  it('spec.outputs is an array matching form.outputs', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.ok(Array.isArray(uds.spec.outputs));
    assert.strictEqual(uds.spec.outputs.length, 1);
    assert.strictEqual(uds.spec.outputs[0].voltage, 12);
  });

  it('components object is non-empty (has U1, T1 at minimum)', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.ok('U1' in uds.components, 'missing U1');
    assert.ok('T1' in uds.components, 'missing T1');
  });

  it('U1 component has family set', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.ok(uds.components.U1.family, 'U1 missing family');
  });

  it('variant.mods override form fields', () => {
    const variantWithMods = {
      ...BASE_VARIANT,
      mods: { frequency: '66 kHz' },
      design: { ...BASE_FORM, frequency: '66 kHz', _variant: 'High Efficiency' },
    };
    const uds = buildUds(BASE_FORM, variantWithMods);
    assert.strictEqual(uds.meta.frequency, '66 kHz');
  });

  it('notes field is a string', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    assert.strictEqual(typeof uds.notes, 'string');
  });
});

describe('buildUds components output', () => {
  it('components from buildUds all have a type field', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    for (const [ref, comp] of Object.entries(uds.components)) {
      assert.ok(comp.type, `component ${ref} missing type`);
    }
  });

  it('buildUds components include standard reference designators', () => {
    const uds = buildUds(BASE_FORM, BASE_VARIANT);
    const keys = Object.keys(uds.components);
    // Should have at least U1, T1, D3, C1
    ['U1','T1'].forEach(r => assert.ok(keys.includes(r), `missing ${r}`));
  });
});

describe('applyDbComponent', () => {
  it('overwrites fields from db record onto existing component', () => {
    const existing = { ref:'U1', type:'ic', family:'HPFC-1', part:'HPFC-1-001', mfr:'Generic' };
    const dbRecord = { part:'HPFC-1-002', mfr:'Generic', package:'eSIP-7C', rated_voltage:'700' };
    const result = applyDbComponent(existing, dbRecord);
    assert.strictEqual(result.part, 'HPFC-1-002');
    assert.strictEqual(result.mfr,  'Generic');
    // Original fields preserved if not in dbRecord
    assert.strictEqual(result.ref,  'U1');
  });
});

describe('compLabel', () => {
  it('returns a non-empty string for a typical component', () => {
    const comp = { ref:'C1', type:'capacitor', part:'EEE-FK1E471P', mfr:'Panasonic' };
    const label = compLabel(comp);
    assert.strictEqual(typeof label, 'string');
    assert.ok(label.length > 0);
  });
});

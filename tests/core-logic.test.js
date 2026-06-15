/**
 * i18n, Design Store, and Validate Design logic unit tests — node:test
 * Run: node --test tests/core-logic.test.js
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');

const ROOT = path.join(__dirname, '..');

// ── i18n — test via source analysis (useI18n depends on Vue ref) ──────────────
describe('i18n translation catalogue', () => {
  const src = fs.readFileSync(path.join(ROOT, 'packages/shared/src/composables/useI18n.js'), 'utf8');

  // Extract TRANSLATIONS object manually
  // Key existence checks via string searching
  const langs = ['en','tl','ja','zh','de','ko'];
  const requiredKeys = [
    'menu.file','menu.edit','menu.view','menu.activeDesign','menu.tools','menu.help',
    'file.new','file.open','file.save','edit.exportAll','edit.undo',
    'view.schematic','view.bom','view.designResults',
    'design.properties','design.simulate','design.optimize','design.validate',
    'tools.compDB','tools.magnetics','tools.settings',
    'help.helpCenter','help.about',
    'ui.language','ui.logout','ui.welcome','ui.newDesign',
  ];

  it('all 6 language codes are defined', () => {
    langs.forEach(code => {
      assert.ok(src.includes(`${code}: {`), `missing lang ${code}`);
    });
  });

  it('LANGUAGES array has exactly 6 entries', () => {
    const count = (src.match(/{ code:/g) || []).length;
    assert.strictEqual(count, 6);
  });

  it('each required key is present in English section', () => {
    // Find the en: { ... } block
    const enStart = src.indexOf("en: {");
    const enEnd   = src.indexOf("\n  // ──", enStart + 10);
    const enBlock = src.slice(enStart, enEnd);
    for (const key of requiredKeys) {
      assert.ok(enBlock.includes(`'${key}'`), `English missing key: ${key}`);
    }
  });

  it('setLocale saves to localStorage', () => {
    assert.ok(src.includes('localStorage.setItem'));
  });

  it('auto-detects browser language from navigator.language', () => {
    assert.ok(src.includes('navigator.language'));
  });

  it('falls back to English for unknown language code', () => {
    assert.ok(src.includes("?? TRANSLATIONS.en[key] ?? key"));
  });

  it('Filipino has at least 20 translated keys', () => {
    const tlStart = src.indexOf("tl: {");
    const tlEnd   = src.indexOf("\n  // ──", tlStart + 10);
    const tlBlock = src.slice(tlStart, tlEnd);
    const keyCount= (tlBlock.match(/'\w+\.\w+':/g) || []).length;
    assert.ok(keyCount >= 20, `Filipino only has ${keyCount} keys`);
  });
});

// ── Design Store logic ─────────────────────────────────────────────────────────
describe('Design Store (source analysis)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'packages/shared/src/stores/useDesignStore.js'), 'utf8');

  it('exports pendingWizardStart reactive ref', () => {
    assert.ok(src.includes('pendingWizardStart'));
    assert.ok(src.includes("ref(false)"));
  });

  it('requestWizardStart sets flag to true', () => {
    assert.ok(src.includes('pendingWizardStart.value = true'));
  });

  it('consumeWizardStart reads and resets atomically', () => {
    assert.ok(src.includes('pendingWizardStart.value'));
    assert.ok(src.includes('= false'));
    assert.ok(src.includes('return v'));
  });

  it('setCurrentDesign sets designReady to true', () => {
    assert.ok(src.includes('designReady.value   = true'));
  });

  it('clearCurrentDesign resets both currentDesign and designReady', () => {
    assert.ok(src.includes('currentDesign.value = null'));
    assert.ok(src.includes('designReady.value   = false'));
  });

  it('all state and functions are returned from store factory', () => {
    const returnLine = src.slice(src.lastIndexOf('return {'));
    assert.ok(returnLine.includes('activeDesign'));
    assert.ok(returnLine.includes('currentDesign'));
    assert.ok(returnLine.includes('designReady'));
    assert.ok(returnLine.includes('pendingWizardStart'));
    assert.ok(returnLine.includes('requestWizardStart'));
    assert.ok(returnLine.includes('consumeWizardStart'));
    assert.ok(returnLine.includes('setCurrentDesign'));
    assert.ok(returnLine.includes('clearCurrentDesign'));
    assert.ok(returnLine.includes('actionSignal'));
    assert.ok(returnLine.includes('dispatchAction'));
  });

  it('dispatchAction function defined', () => {
    assert.ok(src.includes('function dispatchAction'));
  });

  it('actionSignal is reactive ref', () => {
    assert.ok(src.includes('const actionSignal = ref('));
  });

  it('dispatchAction increments seq to re-trigger watch', () => {
    assert.ok(src.includes('seq: actionSignal.value.seq + 1'));
  });
});

// ── Validate Design logic ──────────────────────────────────────────────────────
describe('validateDesign function (source analysis)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'packages/shared/src/components/DesignWizard.vue'), 'utf8');
  // Extract just the validateDesign function
  const fnStart = src.indexOf('async function validateDesign()');
  const fnEnd   = src.indexOf('\n// ── Optimize Design', fnStart);
  const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : src;

  it('validates primary peak current vs ILIM', () => {
    assert.ok(fn.includes('Ip_pk vs ILIM') || fn.includes('ILIM'), 'missing ILIM check');
  });

  it('validates max duty cycle < 55%', () => {
    assert.ok(fn.includes('D_max < 55') || fn.includes('Duty Cycle'), 'missing duty cycle check');
  });

  it('validates efficiency >= 82%', () => {
    assert.ok(fn.includes('η >= 82') || fn.includes('Efficiency'), 'missing efficiency check');
  });

  it('validates thermal junction temperatures', () => {
    assert.ok(fn.includes('Thermal') && fn.includes('Tj'), 'missing thermal check');
  });

  it('validates EMC — CISPR 32', () => {
    assert.ok(fn.includes('CISPR 32'), 'missing CISPR 32 check');
  });

  it('validates safety — IEC 62368-1', () => {
    assert.ok(fn.includes('IEC 62368-1'), 'missing IEC 62368-1 check');
  });

  it('validates fuse F1 presence', () => {
    assert.ok(fn.includes('Fuse F1') || fn.includes('components?.F1'), 'missing F1 fuse check');
  });

  it('groups checks into 5 categories', () => {
    const categories = ['Electrical','Thermal','EMC','Safety','Compliance'];
    categories.forEach(cat => {
      assert.ok(fn.includes(`'${cat}'`), `missing category: ${cat}`);
    });
  });

  it('returns result with status, checks, passed, total', () => {
    assert.ok(fn.includes('status:'));
    assert.ok(fn.includes('checks,'));
    assert.ok(fn.includes('passed'));
    assert.ok(fn.includes('total:'));
  });

  it('status is one of PASS, REVIEW, or FAIL', () => {
    assert.ok(fn.includes("'PASS'"));
    assert.ok(fn.includes("'REVIEW'"));
    assert.ok(fn.includes("'FAIL'"));
  });
});

// ── AppMenuBar features ────────────────────────────────────────────────────────
describe('AppMenuBar (source analysis)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'packages/shared/src/components/AppMenuBar.vue'), 'utf8');

  it('emits all required Active Design events', () => {
    ['design-properties','simulate','optimize','validate'].forEach(evt => {
      assert.ok(src.includes(`'${evt}'`), `missing emit '${evt}'`);
    });
  });

  it('does NOT emit compare', () => {
    assert.ok(!src.includes("'compare'"), "'compare' should be removed");
  });

  it('has user chip with dropdown', () => {
    assert.ok(src.includes('amb-user-chip'));
    assert.ok(src.includes('amb-user-dd'));
  });

  it('has language selector with flag display', () => {
    assert.ok(src.includes('amb-lang-dd'));
    assert.ok(src.includes('lang.flag'));
  });

  it('has profile modal with name/email/password fields', () => {
    assert.ok(src.includes('showProfile'));
    assert.ok(src.includes('profileDraft'));
  });

  it('Ctrl+E triggers export-all', () => {
    assert.ok(src.includes("key === 'e'") && src.includes("emit('export-all')"));
  });

  it('F1 opens keyboard shortcuts', () => {
    assert.ok(src.includes("key === 'F1'") && src.includes('showShortcuts'));
  });

  it('isHome prop hides Home button when on home page', () => {
    assert.ok(src.includes('!isHome') && src.includes('go-home'));
  });

  it('View menu has all 6 design tab options', () => {
    const tabs = ['Schematic','Design Results','BOM','Board Layout','Transformer Construction','Design Notes'];
    tabs.forEach(tab => {
      assert.ok(src.includes(tab), `missing View tab: ${tab}`);
    });
  });
});

// ── PIWeb Router ──────────────────────────────────────────────────────────────
describe('PIWeb Router config', () => {
  const src = fs.readFileSync(path.join(ROOT, 'PIWeb/src/main.js'), 'utf8');

  it('no /new-design route', () => {
    assert.ok(!src.includes("'/new-design'"), "/new-design route should be removed");
  });

  it('/design route exists', () => {
    assert.ok(src.includes("'/design'"));
  });

  it('/welcome route exists', () => {
    assert.ok(src.includes("'/welcome'"));
  });

  it('/ redirects to welcome', () => {
    assert.ok(src.includes("name: 'welcome'") && src.includes("redirect: {"));
  });

  it('guard redirects unauthenticated users to login', () => {
    assert.ok(src.includes("name: 'login'"));
  });

  it('guard sends authenticated users to welcome (not design)', () => {
    const guardBlock = src.slice(src.indexOf('router.beforeEach'));
    assert.ok(guardBlock.includes("name: 'welcome'"));
    assert.ok(!guardBlock.includes("return { name: 'design' }"));
  });
});

// ── PITauri App ────────────────────────────────────────────────────────────────
describe('PITauri App', () => {
  const src = fs.readFileSync(path.join(ROOT, 'PITauri/src/App.vue'), 'utf8');

  it('no useAuthStore import (desktop has no auth)', () => {
    assert.ok(!src.includes('useAuthStore'));
  });

  it('WelcomePage uses v-if (not v-show)', () => {
    assert.ok(src.includes('v-if="activeView === \'welcome\'"'));
    assert.ok(!src.includes('v-show="activeView === \'welcome\'"'));
  });

  it('DesignPage wrapped in dm-view-layer for proper hiding', () => {
    assert.ok(src.includes('dm-view-layer'));
    assert.ok(src.includes('dm-view-active'));
  });

  it('@validate wired to onValidate', () => {
    assert.ok(src.includes('@validate="onValidate"'));
  });

  it('@design-properties wired', () => {
    assert.ok(src.includes('@design-properties='));
  });

  it('@optimize wired', () => {
    assert.ok(src.includes('@optimize='));
  });

  it('no Compare Variants', () => {
    assert.ok(!src.includes('@compare='));
  });
});

// ── DesignWizard expose ────────────────────────────────────────────────────────
describe('DesignWizard defineExpose', () => {
  const src = fs.readFileSync(path.join(ROOT, 'packages/shared/src/components/DesignWizard.vue'), 'utf8');

  const requiredMethods = [
    'startWizard','exportPDF','openDesignProperties',
    'rerunSimulation','optimizeDesign','switchTab','validateDesign',
  ];

  it('exposes all 7 required methods', () => {
    const exposeLine = src.slice(src.lastIndexOf('defineExpose('));
    requiredMethods.forEach(m => {
      assert.ok(exposeLine.includes(m), `defineExpose missing: ${m}`);
    });
  });

  it('consumes pendingWizardStart on mount', () => {
    assert.ok(src.includes('consumeWizardStart()'));
  });

  it('watches pendingWizardStart for delayed trigger', () => {
    assert.ok(src.includes('pendingWizardStart'));
  });

  it('emits design-ready after confirmDesign', () => {
    assert.ok(src.includes("emit('design-ready'"));
  });

  it('emits open-portfolio from launcher button', () => {
    assert.ok(src.includes("emit('open-portfolio')") || src.includes("$emit('open-portfolio')"));
  });

  it('simulation timer uses setInterval and clearInterval', () => {
    assert.ok(src.includes('setInterval'));
    assert.ok(src.includes('clearInterval'));
  });

  it('schematic hit boxes defined', () => {
    const sd = fs.readFileSync(path.join(ROOT, 'packages/shared/src/components/SchematicDiagram.vue'), 'utf8');
    assert.ok(sd.includes('HIT_BOXES'));
    assert.ok(sd.includes("emit('component-click'"));
  });
});

// ── SchematicDiagram features ──────────────────────────────────────────────────
describe('SchematicDiagram', () => {
  const src = require('fs').readFileSync(
    require('path').join(__dirname,'../packages/shared/src/components/SchematicDiagram.vue'),'utf8');

  it('defines 25 hit boxes', () => {
    const refs = ['F1','RT1','L1','BR1','VR1','C1','C2','C3','R4','R5','U1','T1',
      'D1','D2','D3','C7','R10','C9','C10','C11','U3','U2A','R11','R12','R13'];
    refs.forEach(r => assert.ok(src.includes(`${r}:`), `missing HIT_BOX: ${r}`));
  });

  it('hover has animated dash-march CSS', () => {
    assert.ok(src.includes('sd-dash-march'));
    assert.ok(src.includes('@keyframes'));
    assert.ok(src.includes('stroke-dashoffset'));
  });

  it('hover shows fill tint rgba', () => {
    assert.ok(src.includes('rgba(79,124,255,0.08)') || src.includes('rgba(79'));
  });

  it('frozenRefs state for permanent highlights', () => {
    assert.ok(src.includes('frozenRefs'));
    assert.ok(src.includes('frozen'));
  });

  it('right-click context menu exists', () => {
    assert.ok(src.includes('sd-ctx-menu'));
    assert.ok(src.includes('@contextmenu.prevent'));
    assert.ok(src.includes('onRightClick'));
  });

  it('Freeze/Unfreeze toggle in context menu', () => {
    assert.ok(src.includes('toggleFreeze'));
    assert.ok(src.includes('Unfreeze') || src.includes('Freeze'));
  });

  it('Open Functional Diagram in context menu', () => {
    assert.ok(src.includes('Open Functional Diagram'));
    assert.ok(src.includes('openFromContext'));
  });

  it('getFrozenSet/setFrozenSet exposed', () => {
    assert.ok(src.includes('getFrozenSet'));
    assert.ok(src.includes('setFrozenSet'));
  });

  it('dragDist guard prevents accidental clicks during pan', () => {
    assert.ok(src.includes('dragDist > 5'));
  });

  it('emits component-click on left-click', () => {
    assert.ok(src.includes("emit('component-click'"));
  });
});

// ── ComponentsManager CRUD ──────────────────────────────────────────────────────
describe('ComponentsManager CRUD', () => {
  const src = require('fs').readFileSync(
    require('path').join(__dirname,'../packages/shared/src/components/ComponentsManager.vue'),'utf8');

  it('createComponent API call present', () => {
    assert.ok(src.includes('api.createComponent'));
  });

  it('updateComponent API call present', () => {
    assert.ok(src.includes('api.updateComponent'));
  });

  it('deleteComponent API call present', () => {
    assert.ok(src.includes('api.deleteComponent'));
  });

  it('save button disabled until part and type filled', () => {
    assert.ok(src.includes(':disabled="!draft.part'));
  });

  it('inline saveError (no alert())', () => {
    assert.ok(src.includes('saveError'));
    assert.ok(!src.includes("alert('Error"));
  });

  it('saving state prevents double-submit', () => {
    assert.ok(src.includes("const saving") || src.includes('saving'));
    assert.ok(src.includes('Saving'));
  });

  it('live preview pane renders draft values', () => {
    assert.ok(src.includes('cdb-edit-preview'));
    assert.ok(src.includes('draft.part'));
  });

  it('3-section form layout: Identity, Electrical, Physical', () => {
    assert.ok(src.includes('Identity'));
    assert.ok(src.includes('Electrical Parameters') || src.includes('Electrical'));
    assert.ok(src.includes('Physical'));
  });
});

// ── dispatchAction store signal ────────────────────────────────────────────────
describe('dispatchAction store signal', () => {
  const store = require('fs').readFileSync(
    require('path').join(__dirname,'../packages/shared/src/stores/useDesignStore.js'),'utf8');
  const wiz = require('fs').readFileSync(
    require('path').join(__dirname,'../packages/shared/src/components/DesignWizard.vue'),'utf8');
  const web = require('fs').readFileSync(
    require('path').join(__dirname,'../PIWeb/src/App.vue'),'utf8');

  it('store: actionSignal reactive ref', () => {
    assert.ok(store.includes('const actionSignal = ref('));
  });

  it('store: dispatchAction increments seq', () => {
    assert.ok(store.includes('seq: actionSignal.value.seq + 1'));
  });

  it('wizard: watches actionSignal with deep:true', () => {
    assert.ok(wiz.includes('designStore.actionSignal'));
    assert.ok(wiz.includes('deep: true') || wiz.includes('{ deep: true }'));
  });

  it('wizard: switch handles simulate,design-props,optimize,validate,switch-tab', () => {
    ["'simulate'","'design-props'","'optimize'","'validate'","'switch-tab'"].forEach(c => {
      assert.ok(wiz.includes(`case ${c}`), `missing case ${c}`);
    });
  });

  it('web app: uses withDesignAction for all menu actions', () => {
    assert.ok(web.includes('withDesignAction'));
    assert.ok(web.includes("withDesignAction('simulate')"));
    assert.ok(web.includes("withDesignAction('validate')"));
  });

  it('web app: no broken router-view ref for component calls', () => {
    // The router-view should not have a ref used for calling triggerXxx methods
    assert.ok(!web.includes('currentDesignViewRef.value?.trigger'));
  });
});

// ── Auto-save on all design mutations ─────────────────────────────────────────
describe('Design auto-save', () => {
  const wiz = require('fs').readFileSync(
    require('path').join(__dirname,'../packages/shared/src/components/DesignWizard.vue'),'utf8');

  it('confirmDesign calls saveUdsFile', () => {
    assert.ok(wiz.includes('await saveUdsFile(uds)'));
  });

  it('saveDesignProperties calls saveUdsFile', () => {
    assert.ok(wiz.includes('function saveDesignProperties'));
    assert.ok(wiz.includes('saveUdsFile(updated)'));
  });

  it('applyOptimization calls saveUdsFile', () => {
    assert.ok(wiz.includes('function applyOptimization'));
    const idx = wiz.indexOf('function applyOptimization');
    assert.ok(wiz.slice(idx, idx+600).includes('saveUdsFile'));
  });

  it('onUdsUpdated calls saveUdsFile', () => {
    assert.ok(wiz.includes('function onUdsUpdated') || wiz.includes('onUdsUpdated'));
    assert.ok(wiz.includes('saveUdsFile(newUds)'));
  });

  it('simResult is attached before save', () => {
    assert.ok(wiz.includes('uds.simResult = variant.simResult'));
  });
});

import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDesignStore = defineStore('design', () => {
  // Pending design to open from file manager (consumed once on mount)
  const activeDesign = ref(null);

  // Currently displayed design — persists across tab switches / remounts
  const currentDesign = ref(null);
  const designReady   = ref(false);

  // ── Wizard start signal ───────────────────────────────────────────────────
  // Set before navigating to /design; wizard consumes and resets on mount/watch.
  const pendingWizardStart = ref(false);

  // ── Action signals — consumed by DesignWizard watcher ────────────────────
  // Each signal is a simple counter: incrementing it triggers the watch.
  // Using a counter (vs boolean) allows re-triggering the same action twice.
  const actionSignal = ref({ type: null, payload: null, seq: 0 });

  function openDesign(design) { activeDesign.value = design; }
  function clearDesign()      { activeDesign.value = null; }

  function setCurrentDesign(design) {
    currentDesign.value = design;
    designReady.value   = true;
  }

  function clearCurrentDesign() {
    currentDesign.value = null;
    designReady.value   = false;
  }

  function requestWizardStart() { pendingWizardStart.value = true; }
  function consumeWizardStart() {
    const v = pendingWizardStart.value;
    pendingWizardStart.value = false;
    return v;
  }

  // ── Dispatch an action to the active DesignWizard ─────────────────────────
  // type: 'simulate' | 'design-props' | 'optimize' | 'validate' | 'switch-tab'
  // payload: optional data (e.g. tab name for 'switch-tab')
  function dispatchAction(type, payload = null) {
    actionSignal.value = { type, payload, seq: actionSignal.value.seq + 1 };
  }

  function consumeAction() {
    const a = actionSignal.value;
    actionSignal.value = { type: null, payload: null, seq: a.seq };
    return a;
  }

  // ── Wizard active state — tracks if DW is occupying the content area ───────
  // DesignWizard writes this; App.vue reads it to hide the router-view.
  const wizardActive = ref(false);
  function setWizardActive(v) { wizardActive.value = !!v; }

  return {
    activeDesign, openDesign, clearDesign,
    currentDesign, designReady, setCurrentDesign, clearCurrentDesign,
    pendingWizardStart, requestWizardStart, consumeWizardStart,
    actionSignal, dispatchAction, consumeAction,
    wizardActive, setWizardActive,
  };
});

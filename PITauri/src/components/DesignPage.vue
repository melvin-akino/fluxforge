<template>
  <div style="height:100%;display:flex;flex-direction:column;min-height:0">
    <DesignWizard ref="wizardRef" :initial-mode="mode"
      @open-portfolio="$emit('open-portfolio')"
      @design-ready="$emit('design-ready', $event)"
    />
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { DesignWizard } from '@fluxforge/shared';
defineProps({ mode: { type: String, default: 'new' } });
defineEmits(['open-portfolio', 'design-ready']);
const wizardRef = ref(null);
function triggerStartWizard(payload)  { wizardRef.value?.startWizard(payload || {}); }
function triggerDesignProps()    { wizardRef.value?.openDesignProperties(); }
function triggerRerunSim()       { wizardRef.value?.rerunSimulation(); }
function triggerOptimize()       { wizardRef.value?.optimizeDesign(); }
function triggerSwitchTab(tab)   { wizardRef.value?.switchTab(tab); }
function triggerValidate()       { wizardRef.value?.validateDesign(); }
function triggerExportCAD()      { wizardRef.value?.exportCAD(); }
defineExpose({ triggerStartWizard, triggerExportCAD, triggerDesignProps, triggerRerunSim, triggerOptimize, triggerSwitchTab, triggerValidate });
</script>

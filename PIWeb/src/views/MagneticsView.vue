<template>
  <div class="mag-shell">
    <div class="mag-tabs">
      <button class="mag-tab" :class="{active: activeTab==='database'}" @click="activeTab='database'">
        📦 Magnetics Database
      </button>
      <button class="mag-tab" :class="{active: activeTab==='designer'}" @click="activeTab='designer'">
        ⚡ Transformer Designer
      </button>
    </div>
    <div class="mag-content">
      <MagneticsDatabase v-if="activeTab==='database'"/>
      <MagneticsDesigner v-if="activeTab==='designer'"/>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { MagneticsDatabase, MagneticsDesigner } from '@fluxforge/shared';
const activeTab = ref('designer');
</script>
<style scoped>
.mag-shell { height:calc(100vh - 56px); display:flex; flex-direction:column; overflow:hidden; }
.mag-tabs  { display:flex; gap:.25rem; padding:.4rem .6rem; background:#1B3A6B; flex-shrink:0; }
.mag-tab   { padding:.28rem .75rem; border:1px solid rgba(255,255,255,.15); border-radius:4px;
             background:rgba(255,255,255,.07); color:#c0c8f0; font-size:.78rem; cursor:pointer; font-weight:600; }
.mag-tab.active { background:#0066A6; border-color:#005490; color:#fff; }
.mag-content { flex:1; overflow:hidden; display:flex; flex-direction:column; }
</style>

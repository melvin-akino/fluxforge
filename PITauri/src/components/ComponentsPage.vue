<template>
  <div class="cp-wrap">
    <ComponentsManager />
  </div>
</template>

<script setup>
import { ComponentsManager } from '@fluxforge/shared';
</script>

<style scoped>
.cp-wrap { display:flex; flex-direction:column; height:100%; overflow:hidden; }
</style>

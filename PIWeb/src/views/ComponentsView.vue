<template>
  <div class="cv-wrap">
    <ComponentsManager />
  </div>
</template>

<script setup>
import { ComponentsManager } from '@fluxforge/shared';
</script>

<style scoped>
.cv-wrap { display:flex; flex-direction:column; height:100%; overflow:hidden; }
</style>

<template>
  <WelcomeScreen
    @new-design="onNewDesign"
    @open-design="$emit('go', 'files')"
    @component-library="showLibMenu=true"
    @help="$emit('go','help')"
    @preferences="showPrefs=true"
    @getting-started="$emit('go','help')"
    @about="showAbout=true"
    @feedback="showFeedback=true"
  />
  <ProductPortfolio v-if="showPortfolio"
    @cancel="showPortfolio=false"
    @launch="onLaunch"
    @launch-xls="onLaunch"
  />
  <teleport to="body">
    <div v-if="showLibMenu" class="wlp-overlay" @click.self="showLibMenu=false">
      <div class="wlp-menu">
        <div class="wlp-menu-title">Component Library</div>
        <button class="wlp-menu-btn" @click="showLibMenu=false; $emit('go','components')">🗄 Components</button>
        <button class="wlp-menu-btn" @click="showLibMenu=false; $emit('go','component-sets')">⚙ Component Sets</button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref } from 'vue';
import { WelcomeScreen, ProductPortfolio } from '@fluxforge/shared';

const emit = defineEmits(['go','new-design']);
const showPortfolio = ref(false);
const showLibMenu   = ref(false);
const showPrefs     = ref(false);
const showAbout     = ref(false);
const showFeedback  = ref(false);

function onNewDesign() { showPortfolio.value = true; }
function onLaunch(app) { showPortfolio.value = false; emit('new-design', app); }
</script>

<style scoped>
.wlp-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9100;display:flex;align-items:center;justify-content:center; }
.wlp-menu { background:#fff;border-radius:8px;width:280px;box-shadow:0 16px 48px rgba(0,0,0,.3);overflow:hidden; }
.wlp-menu-title { padding:.65rem 1rem;background:#2d3555;color:#fff;font-weight:700;font-size:.9rem; }
.wlp-menu-btn { display:block;width:100%;padding:.75rem 1rem;border:none;border-bottom:1px solid #e2e4ee;background:#fff;text-align:left;font-size:.88rem;cursor:pointer;color:#1a1a2e; }
.wlp-menu-btn:hover { background:#f0f4ff; }
.wlp-menu-btn:last-child { border-bottom:none; }
</style>

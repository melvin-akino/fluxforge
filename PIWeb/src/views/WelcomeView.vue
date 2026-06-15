<template>
  <div style="height:100%;overflow-y:auto">
    <WelcomeScreen
      @new-design="$emit('new-design')"
      @open-design="router.push('/files')"
      @component-library="showLibMenu = true"
      @help="router.push('/help')"
      @getting-started="router.push('/help')"
    />

    <teleport to="body">
      <div v-if="showLibMenu" class="wv-overlay" @click.self="showLibMenu = false">
        <div class="wv-menu">
          <div class="wv-menu-title">Component Library</div>
          <button class="wv-menu-btn" @click="showLibMenu=false; router.push('/components')">🗄 Components</button>
          <button class="wv-menu-btn" @click="showLibMenu=false; router.push('/component-sets')">⚙ Component Sets</button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { WelcomeScreen } from '@fluxforge/shared';

defineEmits(['new-design', 'open-portfolio']);

const router      = useRouter();
const showLibMenu = ref(false);
</script>

<style scoped>
.wv-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9100;display:flex;align-items:center;justify-content:center; }
.wv-menu { background:#fff;border-radius:8px;width:280px;box-shadow:0 16px 48px rgba(0,0,0,.3);overflow:hidden; }
.wv-menu-title { padding:.65rem 1rem;background:#24467A;color:#fff;font-weight:700;font-size:.9rem; }
.wv-menu-btn { display:block;width:100%;padding:.75rem 1rem;border:none;border-bottom:1px solid #e2e4ee;background:#fff;text-align:left;font-size:.88rem;cursor:pointer;color:#1a1a2e; }
.wv-menu-btn:hover { background:#f0f4ff; }
</style>

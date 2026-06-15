<template>
  <div class="app-shell">

    <!-- AppMenuBar — only shown when logged in -->
    <AppMenuBar v-if="auth.isLoggedIn"
      :username="auth.user?.name || auth.user?.username || ''"
      :has-design="hasActiveDesign"
      :design-warning="false"
      :active-tab="activeTab"
      :is-home="$route.name === 'welcome'"
      @new-design="openPortfolio"
      @open-design="router.push('/files')"
      @save="onSave"
      @save-as="onSaveAs"
      @export-all="onExportAll"
      @export-cad="onExportCAD"
      @undo="onUndo"
      @redo="onRedo"
      @switch-tab="tab => { activeTab = tab; designWizardRef?.switchTab(tab); }"
      @simulate="designWizardRef?.rerunSimulation()"
      @design-properties="designWizardRef?.openDesignProperties()"
      @optimize="designWizardRef?.optimizeDesign()"
      @validate="designWizardRef?.validateDesign()"
      @goto="v => router.push('/'+v)"
      @logout="logout"
      @preferences="router.push('/welcome')"
      @go-home="router.push('/welcome')"
      @open-portfolio="openPortfolio"
      @update-profile="updateProfile"
      @close-design="designStore.clearCurrentDesign()"
    />

    <!-- Portfolio modal — rendered at app level so it works from anywhere -->
    <ProductPortfolio v-if="showPortfolio"
      @cancel="showPortfolio = false"
      @launch="onPortfolioLaunch"
      @launch-xls="onPortfolioLaunch"
    />

    <!-- DesignWizard — fills the content area when active (result/sim/picker).
         When idle (dw-root v-if is false) it renders nothing, so main-content
         gets full height. The v-show on main-content hides it when DesignWizard
         is showing a design so the welcome/files page never bleeds through. -->
    <DesignWizard v-if="auth.isLoggedIn"
      ref="designWizardRef"
      initial-mode="active"
      class="dw-content-slot"
      @open-portfolio="openPortfolio"
      @design-ready="onDesignReady"
    />

    <main class="main-content" v-show="!designWizardActive">
      <router-view
        @open-portfolio="openPortfolio"
        @new-design="openPortfolio"
      />
    </main>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { AppMenuBar, ProductPortfolio, DesignWizard, useDesignStore } from '@fluxforge/shared';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/useAuthStore.js';

const auth        = useAuthStore();
const router      = useRouter();
const designStore = useDesignStore();

const activeTab       = ref('Schematic');
const showPortfolio   = ref(false);
const designWizardRef = ref(null);

// ── Portfolio ─────────────────────────────────────────────────────────────────
function openPortfolio() {
  showPortfolio.value = true;
}

function onPortfolioLaunch(payload) {
  showPortfolio.value = false;
  designStore.clearCurrentDesign();
  // Pass the portfolio selection (family, topology, inputSpec) into the wizard
  import('vue').then(({ nextTick }) => nextTick(() => {
    designWizardRef.value?.startWizard(payload || {});
  }));
}

// ── Design events ─────────────────────────────────────────────────────────────
function onDesignReady() {
  // Design is done — stay on current route (welcome or files).
  // The DesignWizard already shows the result tabs inline as an overlay.
  activeTab.value = 'Schematic';
}

// ── Menu bar actions ──────────────────────────────────────────────────────────
function onSave()    {}
function onSaveAs()  {}
function onExportAll() { window.dispatchEvent(new CustomEvent('ff-export-pdf')); }
function onExportCAD() { designWizardRef.value?.exportCAD(); }
function onUndo()    {}
function onRedo()    {}

async function updateProfile(payload) {
  const res = await fetch('/api/auth/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    const data = await res.json();
    auth.user = data.user;
    if (typeof localStorage !== 'undefined') localStorage.setItem('ff_user', JSON.stringify(data.user));
  }
}

async function logout() {
  await auth.logout();
  router.push('/login');
}

const hasActiveDesign    = computed(() => designStore.designReady && !!designStore.currentDesign);

// Reads wizardActive from the Pinia store — fully reactive, no ref-chain issues
const designWizardActive = computed(() => designStore.wizardActive);

// ── Session restore ───────────────────────────────────────────────────────────
onMounted(() => auth.checkSession());

// Close any stray menus on outside click
const chipEl = ref(null);
function onDocClick() {}
onMounted(()    => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));
</script>

<style>
/* ══ FluxForge Brand Theme — base resets (tokens come from brand.css) ════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--ff-primary); text-decoration: none; }
a:hover { color: var(--ff-secondary-mid); }
</style>

<style scoped>
.app-shell { min-height: 100vh; display: flex; flex-direction: column; }
.main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
/* DesignWizard takes flex slot when it has content to show */
.dw-content-slot { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
</style>

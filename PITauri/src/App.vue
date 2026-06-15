<template>
  <div class="desktop-shell">
    <div class="title-bar" data-tauri-drag-region>
      <span class="app-title">⚡ FluxForge Desktop</span>
      <span class="desktop-badge">DESKTOP</span>
    </div>
    <AppMenuBar
      :username="auth.username"
      :has-design="hasActiveDesign"
      :design-warning="designWarning"
      :active-tab="activeTab"
      :is-home="activeView === 'welcome'"
      :hide-brand="true"
      @new-design="goNewDesign"
      @open-design="activeView='files'"
      @save="onSave"
      @save-as="onSaveAs"
      @export="onExport"
      @export-all="onExportAll"
      @export-cad="onExportCAD"
      @undo="onUndo"
      @redo="onRedo"
      @switch-tab="onSwitchTab"
      @simulate="onSimulate"
      @design-properties="onDesignProps"
      @optimize="onOptimize"
      @validate="onValidate"
      @goto="v => activeView=v"
      @logout="onLogout"
      @preferences="activeView='settings'"
      @open-portfolio="showPortfolio=true"
      @go-home="activeView='welcome'"
      @update-profile="updateProfile"
      @close-design="designStore.clearCurrentDesign()"
    />
    <!-- Product Portfolio dialog -->
    <ProductPortfolio v-if="showPortfolio"
      @cancel="showPortfolio=false"
      @launch="onPortfolioLaunch"
      @launch-xls="onPortfolioLaunch"
    />
    <div class="workspace">
      <aside class="sidebar">
        <nav class="side-nav">
          <div class="nav-section-label">Design</div>
          <button class="nav-item" :class="{ active: activeView === 'welcome' }" @click="activeView='welcome'">
            <span class="nav-icon">🏠</span><span>Home</span>
          </button>
          <button class="nav-item" :class="{ active: activeView === 'new-design' }" @click="showPortfolio=true">
            <span class="nav-icon">＋</span><span>New Design</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeView === 'active-design', disabled: !hasActiveDesign }"
            :disabled="!hasActiveDesign"
            @click="hasActiveDesign && (activeView = 'active-design')"
          >
            <span class="nav-icon">⚡</span>
            <span>Active Design</span>
            <span v-if="hasActiveDesign" class="nav-badge">●</span>
          </button>
          <div class="nav-section-label" style="margin-top:.75rem">Manage</div>
          <button class="nav-item" :class="{ active: activeView === 'files' }" @click="activeView = 'files'">
            <span class="nav-icon">📁</span><span>Files</span>
          </button>
          <button class="nav-item" :class="{ active: activeView === 'components' }" @click="activeView = 'components'">
            <span class="nav-icon">🗄️</span><span>Components</span>
          </button>
          <button class="nav-item" :class="{ active: activeView === 'magnetics' }" @click="activeView = 'magnetics'">
            <span class="nav-icon">🧲</span><span>Magnetics</span>
          </button>
          <button class="nav-item" :class="{ active: activeView === 'component-sets' }" @click="activeView = 'component-sets'">
            <span class="nav-icon">📦</span><span>Component Sets</span>
          </button>
          <button class="nav-item" :class="{ active: activeView === 'help' }" @click="activeView = 'help'">
            <span class="nav-icon">❓</span><span>Help</span>
          </button>
          <button class="nav-item" :class="{ active: activeView === 'settings' }" @click="activeView = 'settings'">
            <span class="nav-icon">⚙️</span><span>Settings</span>
          </button>
        </nav>
        <div class="sidebar-footer"><span class="version">v1.0.0</span></div>
      </aside>
      <main class="desktop-main">
        <!-- Design pages use v-show to preserve wizard state, but are visually hidden properly -->
        <div class="dm-view-layer" :class="{'dm-view-active': activeView === 'new-design'}">
          <DesignPage ref="newDesignPageRef" mode="new" :key="newDesignKey"
            @open-portfolio="showPortfolio=true" />
        </div>
        <div class="dm-view-layer" :class="{'dm-view-active': activeView === 'active-design'}">
          <DesignPage ref="activeDesignPageRef" mode="active"
            @open-portfolio="showPortfolio=true"
            @design-ready="activeView='active-design'" />
        </div>
        <!-- Non-design views: v-if so they fully unmount -->
        <FilesPage         v-if="activeView === 'files'"          class="dm-view-active" @navigate="v => activeView = v" @design-opened="onDesignOpened" />
        <ComponentsPage    v-if="activeView === 'components'"     class="dm-view-active" />
        <MagneticsPage     v-if="activeView === 'magnetics'"      class="dm-view-active" />
        <WelcomePage       v-if="activeView === 'welcome'"        class="dm-view-active" @go="v => activeView=v" @new-design="startNewDesignWithApp" />
        <ComponentSetsPage v-if="activeView === 'component-sets'" class="dm-view-active" />
        <HelpPage          v-if="activeView === 'help'"           class="dm-view-active" />
        <SettingsPage      v-if="activeView === 'settings'"       class="dm-view-active" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useDesignStore } from '@fluxforge/shared';
import DesignPage   from './components/DesignPage.vue';
import FilesPage    from './components/FilesPage.vue';
import SettingsPage      from './components/SettingsPage.vue';
import ComponentsPage    from './components/ComponentsPage.vue';
import MagneticsPage     from './components/MagneticsPage.vue';
import WelcomePage        from './components/WelcomePage.vue';
import ComponentSetsPage  from './components/ComponentSetsPage.vue';
import HelpPage           from './components/HelpPage.vue';
import { AppMenuBar, ProductPortfolio } from '@fluxforge/shared';

const designStore = useDesignStore();
const auth = { username: '' }; // desktop: no auth needed
const designWarning = computed(() => {
  const d = designStore.currentDesign;
  return !!(d?.simResult?.warnings?.length);
});
const activeTab = ref('Schematic');
const showPortfolio = ref(false);
const activeView  = ref('welcome');
const newDesignKey = ref(0);

function onSave() {}
function onSaveAs() {}
function onExport() {}
function onExportAll() {
  window.dispatchEvent(new CustomEvent('ff-export-pdf'));
}
function onExportCAD() {
  // Forward to active design page's DesignWizard ref
  activeDesignPageRef.value?.triggerExportCAD?.() ||
  newDesignPageRef.value?.triggerExportCAD?.();
}
function onUndo() {}
function onRedo() {}
function onSwitchTab(tab) {
  activeTab.value = tab;
  // Forward to wizard
  newDesignPageRef.value?.triggerSwitchTab(tab);
  // Also try active-design page if it's the active view
  activeDesignPageRef.value?.triggerSwitchTab(tab);
}
function onSimulate() { newDesignPageRef.value?.triggerRerunSim() || activeDesignPageRef.value?.triggerRerunSim(); }
function onDesignProps() { newDesignPageRef.value?.triggerDesignProps() || activeDesignPageRef.value?.triggerDesignProps(); }
function onOptimize() { newDesignPageRef.value?.triggerOptimize() || activeDesignPageRef.value?.triggerOptimize(); }
function onValidate() { newDesignPageRef.value?.triggerValidate() || activeDesignPageRef.value?.triggerValidate(); }
function onLogout() { /* desktop - no auth */ }
function updateProfile(payload) {
  // Desktop: no persistent auth, just a no-op
  console.log('Profile update (desktop):', payload);
}

function onPortfolioLaunch(payload) {
  showPortfolio.value = false;
  newDesignKey.value++;
  activeView.value = 'new-design';
  import('vue').then(({ nextTick }) => {
    nextTick(() => { newDesignPageRef.value?.triggerStartWizard(payload || {}); });
  });
}

function goNewDesign() {
  // Always go straight to Product Portfolio — no standalone wizard launcher
  showPortfolio.value = true;
}
const newDesignPageRef     = ref(null);
const activeDesignPageRef  = ref(null);
async function startNewDesignWithApp(app) {
  designStore.clearCurrentDesign();
  designStore.clearDesign();
  designStore.requestWizardStart();
  newDesignKey.value++;
  activeView.value = 'new-design';
  await nextTick();
  await nextTick();
  newDesignPageRef.value?.triggerStartWizard();
}
const hasActiveDesign = computed(() => designStore.designReady && !!designStore.currentDesign);

function onDesignOpened() {
  // When user opens a .uds from files, switch to Active Design tab
  activeView.value = 'active-design';
}
</script>

<style>
/* FluxForge Desktop — base resets (tokens come from brand.css via @shared) */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#app{height:100%;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow:hidden;}
</style>

<style scoped>
.desktop-shell{display:flex;flex-direction:column;height:100vh;user-select:none;}
.title-bar{height:40px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 1rem;gap:.75rem;cursor:default;flex-shrink:0;}
.app-title{font-size:.85rem;font-weight:700;}
.desktop-badge{font-size:.6rem;font-weight:700;padding:.1rem .45rem;border-radius:999px;letter-spacing:.1em;background:rgba(124,131,255,.15);color:var(--accent);border:1px solid rgba(124,131,255,.3);}
.workspace{display:flex;flex:1;overflow:hidden;}
.sidebar{width:200px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:.75rem .5rem;}
.side-nav{display:flex;flex-direction:column;gap:.25rem;flex:1;}
.nav-item{display:flex;align-items:center;gap:.6rem;padding:.55rem .75rem;border-radius:var(--radius);background:none;border:none;color:var(--text-muted);font-size:.875rem;cursor:pointer;text-align:left;transition:all .15s;width:100%;}
.nav-item:hover{background:rgba(124,131,255,.08);color:var(--text);}
.nav-item.active{background:rgba(124,131,255,.15);color:var(--accent);font-weight:600;}
.nav-icon{font-size:1rem;}
.nav-section-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);padding:.3rem .75rem .1rem;opacity:.6;}
.nav-badge{margin-left:auto;width:7px;height:7px;border-radius:50%;background:#56d48a;flex-shrink:0;}
.nav-item.disabled{opacity:.35;cursor:not-allowed;}
.nav-item.disabled:hover{background:none;color:var(--text-muted);}
.sidebar-footer{padding:.5rem .75rem;font-size:.72rem;color:var(--text-muted);}
.desktop-main{flex:1;overflow:hidden;display:flex;flex-direction:column;position:relative;}
.dm-view-layer{position:absolute;inset:0;display:none;flex-direction:column;overflow:hidden;}
.dm-view-active{display:flex;}
</style>

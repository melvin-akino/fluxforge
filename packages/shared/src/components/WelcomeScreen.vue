<template>
  <div class="ws-root">
    <!-- FluxForge Logo -->
    <div class="ws-logo-wrap">
      <svg width="220" height="52" viewBox="0 0 220 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Transformer symbol (primary winding) -->
        <line x1="4" y1="26" x2="14" y2="26" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
        <path d="M14 14 Q20 14 20 26 Q20 38 14 38" stroke="rgba(255,255,255,0.9)" stroke-width="2" fill="none"/>
        <path d="M20 14 Q26 14 26 26 Q26 38 20 38" stroke="rgba(255,255,255,0.9)" stroke-width="2" fill="none"/>
        <!-- Core -->
        <line x1="29" y1="12" x2="29" y2="40" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/>
        <line x1="32" y1="12" x2="32" y2="40" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/>
        <!-- Secondary winding -->
        <path d="M35 14 Q41 14 41 26 Q41 38 35 38" stroke="rgba(255,255,255,0.9)" stroke-width="2" fill="none"/>
        <path d="M41 14 Q47 14 47 26 Q47 38 41 38" stroke="rgba(255,255,255,0.9)" stroke-width="2" fill="none"/>
        <line x1="47" y1="26" x2="57" y2="26" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
        <!-- Spark accent -->
        <path d="M61 14 L55 27 L61 27 L57 40 L69 23 L63 23 Z" fill="#2ECC71"/>
        <!-- FluxForge wordmark -->
        <text x="76" y="31" font-family="'Segoe UI',Arial,sans-serif" font-size="24" font-weight="800" fill="#FFFFFF" letter-spacing="1">FluxForge</text>
      </svg>
    </div>

    <!-- Welcome heading -->
    <h1 class="ws-title">{{ t('ui.welcome') }}</h1>

    <!-- Main action tiles -->
    <div class="ws-tiles">
      <button class="ws-tile" @click="$emit('new-design')">
        <svg class="ws-tile-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="8" y="14" width="28" height="24" rx="2"/>
          <path d="M16 14V10a2 2 0 012-2h12a2 2 0 012 2v4"/>
          <line x1="24" y1="22" x2="24" y2="30"/><line x1="20" y1="26" x2="28" y2="26"/>
          <line x1="36" y1="10" x2="40" y2="10"/><line x1="38" y1="8" x2="38" y2="12"/>
        </svg>
        <span class="ws-tile-label">{{ t('ui.newDesign') }}</span>
      </button>

      <button class="ws-tile" @click="$emit('open-design')">
        <svg class="ws-tile-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M8 18a2 2 0 012-2h10l4 4h14a2 2 0 012 2v12a2 2 0 01-2 2H10a2 2 0 01-2-2V18z"/>
          <path d="M8 22h32"/>
        </svg>
        <span class="ws-tile-label">{{ t('ui.openDesign') }}</span>
      </button>

      <button class="ws-tile" @click="$emit('component-library')">
        <svg class="ws-tile-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="10" y="10" width="28" height="6" rx="1"/>
          <rect x="10" y="20" width="28" height="6" rx="1"/>
          <rect x="10" y="30" width="28" height="6" rx="1"/>
        </svg>
        <span class="ws-tile-label">{{ t('ui.compLibrary') }}</span>
      </button>

      <button class="ws-tile" @click="$emit('help')">
        <svg class="ws-tile-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="6" y="10" width="32" height="22" rx="2"/>
          <circle cx="36" cy="36" r="8" fill="#1b4f72" stroke="none"/>
          <text x="36" y="40" text-anchor="middle" font-size="10" fill="white" font-family="serif" stroke="none">?</text>
          <line x1="10" y1="17" x2="30" y2="17"/>
          <line x1="10" y1="22" x2="30" y2="22"/>
          <line x1="10" y1="27" x2="22" y2="27"/>
        </svg>
        <span class="ws-tile-label">{{ t('ui.helpDocs') }}</span>
      </button>
    </div>
    <div class="ws-links">
      <button class="ws-link" @click="$emit('preferences')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/>
        </svg>
        Preferences
      </button>
      <button class="ws-link" @click="$emit('getting-started')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/>
        </svg>
        Getting Started with FluxForge
      </button>
      <button class="ws-link" @click="$emit('about')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <circle cx="10" cy="10" r="8"/><line x1="10" y1="9" x2="10" y2="14"/><circle cx="10" cy="6.5" r="0.5" fill="currentColor"/>
        </svg>
        About FluxForge
      </button>
      <button class="ws-link" @click="$emit('feedback')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 4V4z"/>
        </svg>
        Feedback
      </button>
    </div>

    <!-- About dialog -->
    <teleport to="body">
      <div v-if="showAbout" class="ws-overlay" @click.self="showAbout=false">
        <div class="ws-about-dlg">
          <div class="ws-about-hd">
            <span>⚡ About FluxForge</span>
            <button @click="showAbout=false" class="ws-dlg-x">✕</button>
          </div>
          <div class="ws-about-body">
            <div class="ws-about-logo">⚡ FluxForge</div>
            <p class="ws-about-ver">Version 2.0.0 — Beta</p>
            <p>FluxForge is an open-source power supply design tool for flyback converter families (HPFC, IFC, LPFC, PSC).</p>
            <p style="margin-top:.6rem">A single Vue 3 + Tauri codebase that deploys as both a desktop application (Windows/macOS/Linux) and a web application — sharing 95%+ of all UI components and business logic through a unified <code>@fluxforge/shared</code> package.</p>
            <p style="margin-top:.6rem; font-size:.75rem; color:#888">Stack: Vue 3 · Tauri (Rust) · Express.js · SQLite · Vite · Pinia · Vue Router</p>
          </div>
          <div class="ws-dlg-ft"><button class="ws-dlg-ok" @click="showAbout=false">OK</button></div>
        </div>
      </div>

      <div v-if="showPrefs" class="ws-overlay" @click.self="showPrefs=false">
        <div class="ws-about-dlg">
          <div class="ws-about-hd"><span>⚙ Preferences</span><button @click="showPrefs=false" class="ws-dlg-x">✕</button></div>
          <div class="ws-about-body">
            <div class="ws-pref-row">
              <label>Theme</label>
              <select class="ws-pref-sel" v-model="prefs.theme">
                <option>System Default</option><option>Light</option><option>Dark</option>
              </select>
            </div>
            <div class="ws-pref-row">
              <label>Default Units</label>
              <select class="ws-pref-sel" v-model="prefs.units">
                <option>SI (metric)</option><option>Imperial</option>
              </select>
            </div>
            <div class="ws-pref-row">
              <label>Auto-save designs</label>
              <input type="checkbox" v-model="prefs.autosave"/>
            </div>
            <div class="ws-pref-row">
              <label>Default topology</label>
              <select class="ws-pref-sel" v-model="prefs.topology">
                <option>Flyback</option><option>Forward</option><option>Buck</option>
              </select>
            </div>
          </div>
          <div class="ws-dlg-ft"><button class="ws-dlg-ok" @click="showPrefs=false">Save</button></div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from '../composables/useI18n.js';
defineEmits(['new-design','open-design','component-library','help','preferences','getting-started','about','feedback']);

const { t } = useI18n();
const showAbout = ref(false);
const showPrefs = ref(false);
const prefs = ref({ theme:'System Default', units:'SI (metric)', autosave:true, topology:'Flyback' });
</script>

<style scoped>
.ws-logo-wrap { margin-bottom:.5rem; }
.ws-root {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100%; background: linear-gradient(160deg, #0D7377 0%, #11876F 60%, #14A085 100%);
  padding: 3rem 2rem; gap: 3rem; box-sizing: border-box;
}
.ws-title {
  font-size: 2.2rem; font-weight: 300; color: #fff;
  letter-spacing: -.01em; text-align: center; margin: 0;
}
.ws-tiles {
  display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center;
}
.ws-tile {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1rem; width: 148px; height: 148px;
  background: rgba(255,255,255,.12); border: 1.5px solid rgba(255,255,255,.22);
  border-radius: 8px; cursor: pointer; color: #fff;
  transition: background .18s, transform .12s;
  padding: 1.2rem;
}
.ws-tile:hover { background: rgba(255,255,255,.22); border-color:rgba(46,204,113,.7); transform: translateY(-2px); }
.ws-tile:active { transform: translateY(0); }
.ws-tile-icon { width: 48px; height: 48px; color: rgba(255,255,255,.9); flex-shrink: 0; }
.ws-tile-label { font-size: .82rem; font-weight: 500; color: rgba(255,255,255,.95); text-align: center; line-height: 1.3; }
.ws-links {
  display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;
}
.ws-link {
  display: flex; align-items: center; gap: .45rem;
  padding: .45rem 1rem; background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.2); border-radius: 5px;
  color: rgba(255,255,255,.9); font-size: .8rem; cursor: pointer;
  transition: background .15s;
}
.ws-link:hover { background: rgba(46,204,113,.2); border-color:rgba(46,204,113,.5); color: #fff; }

/* Dialogs */
.ws-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9500; display:flex; align-items:center; justify-content:center; }
.ws-about-dlg { background:#fff; border-radius:8px; width:420px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,.3); overflow:hidden; }
.ws-about-hd { display:flex; align-items:center; justify-content:space-between; padding:.75rem 1.1rem; background:#0D7377; color:#fff; font-weight:700; font-size:.9rem; }
.ws-dlg-x { background:none; border:none; color:#acd; font-size:1rem; cursor:pointer; }
.ws-dlg-x:hover { color:#fff; }
.ws-about-body { padding:1.2rem 1.4rem; font-size:.85rem; color:#333; line-height:1.6; }
.ws-about-logo { font-size:1.5rem; font-weight:700; color:#0D7377; margin-bottom:.3rem; }
.ws-about-ver { color:#888; font-size:.78rem; margin-bottom:.7rem; }
.ws-dlg-ft { display:flex; justify-content:flex-end; padding:.7rem 1.1rem; border-top:1px solid #eee; background:#f8f9fb; }
.ws-dlg-ok { padding:.38rem 1.2rem; background:#0D7377; color:#fff; border:none; border-radius:5px; font-size:.82rem; cursor:pointer; font-weight:600; }
.ws-pref-row { display:flex; align-items:center; justify-content:space-between; padding:.4rem 0; border-bottom:1px solid #f0f0f0; font-size:.83rem; color:#333; gap:1rem; }
.ws-pref-sel { padding:.28rem .5rem; border:1px solid #d0d3de; border-radius:4px; font-size:.82rem; }
</style>

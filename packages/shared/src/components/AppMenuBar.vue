<template>
  <div class="amb-root">
    <!-- ── Top bar: brand + utility links ──────────────────────────────────── -->
    <div class="amb-top">
      <div v-if="!hideBrand" class="amb-brand">
        <!-- FluxForge Logo: transformer symbol + spark -->
        <svg width="120" height="30" viewBox="0 0 120 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="amb-ff-logo">
          <!-- Transformer core (two coupled inductors) -->
          <line x1="4" y1="15" x2="10" y2="15" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
          <path d="M10 10 Q13 10 13 15 Q13 20 10 20" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" fill="none"/>
          <path d="M13 10 Q16 10 16 15 Q16 20 13 20" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" fill="none"/>
          <!-- Core gap lines -->
          <line x1="18" y1="9" x2="18" y2="21" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
          <line x1="20" y1="9" x2="20" y2="21" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
          <!-- Secondary winding -->
          <path d="M22 10 Q25 10 25 15 Q25 20 22 20" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" fill="none"/>
          <path d="M25 10 Q28 10 28 15 Q28 20 25 20" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" fill="none"/>
          <line x1="28" y1="15" x2="34" y2="15" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
          <!-- Spark accent -->
          <path d="M37 9 L34 15.5 L37 15.5 L34 21 L41 13 L38 13 Z" fill="#2ECC71"/>
          <!-- FLUXFORGE wordmark -->
          <text x="46" y="18" font-family="'Segoe UI',Arial,sans-serif" font-size="11" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">FluxForge</text>
        </svg>
        <span class="amb-beta">{{ t('ui.beta') }}</span>
      </div>
      <div class="amb-top-right">
        <button v-if="showHomeLink && !isHome" class="amb-top-link amb-home-btn" @click="$emit('go-home')" title="Go to Home">
          🏠 Home
        </button>
        <button class="amb-top-link" @click="$emit('tech-support')">{{ t('ui.getTechSupport') }}</button>
        <!-- Language selector -->
        <div class="amb-lang-wrap" ref="langWrapRef">
          <button class="amb-top-link amb-lang-btn" @click="langOpen=!langOpen">
            {{ t('ui.language') }}
            <span class="amb-lang-cur">{{ currentLangObj?.flag }}</span>
          </button>
          <div v-if="langOpen" class="amb-lang-dd" @click.stop>
            <div v-for="lang in LANGUAGES" :key="lang.code"
              class="amb-lang-item"
              :class="{'amb-lang-item--active': locale===lang.code}"
              @click="selectLang(lang.code)">
              <span class="amb-lang-flag">{{ lang.flag }}</span>
              <span class="amb-lang-label">{{ lang.label }}</span>
              <span v-if="locale===lang.code" class="amb-lang-check">✓</span>
            </div>
          </div>
        </div>
        <!-- User chip with dropdown -->
        <div class="amb-user-wrap" ref="userChipRef" v-if="username">
          <button class="amb-user-chip" @click.stop="userMenuOpen=!userMenuOpen">
            <span class="amb-user-avatar">{{ username.slice(0,2).toUpperCase() }}</span>
            <span class="amb-user-name">{{ username }}</span>
            <span class="amb-user-caret">▾</span>
          </button>
          <div v-if="userMenuOpen" class="amb-user-dd" @click.stop>
            <div class="amb-user-dd-header">
              <div class="amb-user-avatar-lg">{{ username.slice(0,2).toUpperCase() }}</div>
              <div class="amb-user-dd-name">{{ username }}</div>
            </div>
            <div class="amb-user-dd-sep"/>
            <button class="amb-user-dd-item" @click="userMenuOpen=false; showProfile=true">
              👤 View / Edit Profile
            </button>
            <button class="amb-user-dd-item amb-user-dd-danger" @click="userMenuOpen=false; $emit('logout')">
              ⇥ Logout
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Main menu bar ───────────────────────────────────────────────────── -->
    <div class="amb-menubar">
      <div class="amb-menus">
        <!-- File -->
        <div class="amb-menu-item" :class="{'amb-menu-item--open':openMenu==='file'}"
          @click.stop="toggleMenu('file')">
          {{ t('menu.file') }}
          <div v-if="openMenu==='file'" class="amb-dropdown">
            <div class="amb-dd-item" @click="emit('new-design')">
              <span class="amb-dd-icon">📄</span>{{ t('file.new') }}<span class="amb-dd-kbd">Ctrl+N</span>
            </div>
            <div class="amb-dd-item" @click="emit('open-design')">
              <span class="amb-dd-icon">📂</span>{{ t('file.open') }}<span class="amb-dd-kbd">Ctrl+O</span>
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" :class="{'amb-dd-item--dis':!hasDesign}" @click="hasDesign&&emit('save')">
              <span class="amb-dd-icon">💾</span>{{ t('file.save') }}<span class="amb-dd-kbd">Ctrl+S</span>
            </div>
            <div class="amb-dd-item" :class="{'amb-dd-item--dis':!hasDesign}" @click="hasDesign&&emit('save-as')">
              <span class="amb-dd-icon">💾</span>{{ t('file.saveAs') }}<span class="amb-dd-kbd">Ctrl+Shift+S</span>
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="emit('recent')">
              <span class="amb-dd-icon">🕒</span>{{ t('file.recent') }}
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" :class="{'amb-dd-item--dis':!hasDesign}" @click="hasDesign&&emit('export')">
              <span class="amb-dd-icon">📤</span>{{ t('file.export') }}
            </div>
            <div class="amb-dd-item" :class="{'amb-dd-item--dis':!hasDesign}" @click="hasDesign&&emit('print')">
              <span class="amb-dd-icon">🖨</span>{{ t('file.print') }}
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item amb-dd-item--danger" @click="emit('close-design')">
              <span class="amb-dd-icon">✕</span>{{ t('file.close') }}
            </div>
          </div>
        </div>

        <!-- Edit -->
        <div class="amb-menu-item" :class="{'amb-menu-item--open':openMenu==='edit'}"
          @click.stop="toggleMenu('edit')">
          {{ t('menu.edit') }}
          <div v-if="openMenu==='edit'" class="amb-dropdown">
            <div class="amb-dd-item" @click="emit('undo')">
              <span class="amb-dd-icon">↩</span>{{ t('edit.undo') }}<span class="amb-dd-kbd">Ctrl+Z</span>
            </div>
            <div class="amb-dd-item" @click="emit('redo')">
              <span class="amb-dd-icon">↪</span>{{ t('edit.redo') }}<span class="amb-dd-kbd">Ctrl+Y</span>
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="emit('cut')">
              <span class="amb-dd-icon">✂</span>{{ t('edit.cut') }}<span class="amb-dd-kbd">Ctrl+X</span>
            </div>
            <div class="amb-dd-item" @click="emit('copy')">
              <span class="amb-dd-icon">📋</span>{{ t('edit.copy') }}<span class="amb-dd-kbd">Ctrl+C</span>
            </div>
            <div class="amb-dd-item" @click="emit('paste')">
              <span class="amb-dd-icon">📌</span>{{ t('edit.paste') }}<span class="amb-dd-kbd">Ctrl+V</span>
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item amb-dd-item--highlight" :class="{'amb-dd-item--dis':!hasDesign}"
              @click="hasDesign&&emit('export-all')">
              <span class="amb-dd-icon">📑</span>{{ t('edit.exportAll') }}<span class="amb-dd-kbd">Ctrl+E</span>
            </div>
            <div class="amb-dd-item" :class="{'amb-dd-item--dis':!hasDesign}"
              @click="hasDesign&&(openMenu='',emit('export-cad'))">
              <span class="amb-dd-icon">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" width="13" height="13" style="vertical-align:middle">
                  <rect x="1" y="1" width="4" height="4" rx="0.8"/>
                  <rect x="9" y="1" width="4" height="4" rx="0.8"/>
                  <rect x="1" y="9" width="4" height="4" rx="0.8"/>
                  <rect x="9" y="9" width="4" height="4" rx="0.8"/>
                  <line x1="3" y1="5" x2="3" y2="9"/><line x1="11" y1="5" x2="11" y2="9"/>
                  <line x1="5" y1="3" x2="9" y2="3"/><line x1="5" y1="11" x2="9" y2="11"/>
                </svg>
              </span>
              Export to CAD
              <span class="amb-dd-badge">KiCad</span>
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="emit('preferences')">
              <span class="amb-dd-icon">⚙</span>{{ t('edit.preferences') }}
            </div>
          </div>
        </div>

        <!-- View -->
        <div class="amb-menu-item" :class="{'amb-menu-item--open':openMenu==='view'}"
          @click.stop="toggleMenu('view')">
          {{ t('menu.view') }}
          <div v-if="openMenu==='view'" class="amb-dropdown">
            <div class="amb-dd-sub-hd">Design Tabs</div>
            <div v-for="tab in VIEW_TABS" :key="tab.key"
              class="amb-dd-item" :class="{'amb-dd-item--dis':!hasDesign}"
              @click="hasDesign&&emit('switch-tab', tab.key)">
              <span class="amb-dd-icon">{{ tab.icon }}</span>{{ t(tab.label) }}
              <span v-if="activeTab===tab.key" class="amb-dd-check">✓</span>
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="emit('zoom-in')">
              <span class="amb-dd-icon">🔍</span>{{ t('view.zoomIn') }}<span class="amb-dd-kbd">Ctrl++</span>
            </div>
            <div class="amb-dd-item" @click="emit('zoom-out')">
              <span class="amb-dd-icon">🔍</span>{{ t('view.zoomOut') }}<span class="amb-dd-kbd">Ctrl+-</span>
            </div>
            <div class="amb-dd-item" @click="emit('fit-all')">
              <span class="amb-dd-icon">⊡</span>{{ t('view.fitAll') }}<span class="amb-dd-kbd">Ctrl+0</span>
            </div>
          </div>
        </div>

        <!-- Active Design -->
        <div class="amb-menu-item" :class="{'amb-menu-item--open':openMenu==='design','amb-menu-item--dis':!hasDesign}"
          @click.stop="hasDesign&&toggleMenu('design')">
          {{ t('menu.activeDesign') }}
          <div v-if="openMenu==='design'" class="amb-dropdown">
            <div class="amb-dd-item" @click="emit('design-properties')">
              <span class="amb-dd-icon">📋</span>{{ t('design.properties') }}
            </div>
            <div class="amb-dd-item" @click="emit('simulate')">
              <span class="amb-dd-icon">▶</span>{{ t('design.simulate') }}
            </div>
            <div class="amb-dd-item" @click="emit('optimize')">
              <span class="amb-dd-icon">⚡</span>{{ t('design.optimize') }}
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="emit('validate')">
              <span class="amb-dd-icon">✔</span>{{ t('design.validate') }}
            </div>

          </div>
        </div>

        <!-- Tools -->
        <div class="amb-menu-item" :class="{'amb-menu-item--open':openMenu==='tools'}"
          @click.stop="toggleMenu('tools')">
          {{ t('menu.tools') }}
          <div v-if="openMenu==='tools'" class="amb-dropdown">
            <div class="amb-dd-item" @click="emit('goto','components')">
              <span class="amb-dd-icon">🗄</span>{{ t('tools.compDB') }}
            </div>
            <div class="amb-dd-item" @click="emit('goto','component-sets')">
              <span class="amb-dd-icon">📦</span>{{ t('tools.compSets') }}
            </div>
            <div class="amb-dd-item" @click="emit('goto','magnetics')">
              <span class="amb-dd-icon">🧲</span>{{ t('tools.magnetics') }}
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="showCalc('lp')">
              <span class="amb-dd-icon">𝐿</span>{{ t('tools.calcLp') }}
            </div>
            <div class="amb-dd-item" @click="showCalc('thermal')">
              <span class="amb-dd-icon">🌡</span>{{ t('tools.calcThermal') }}
            </div>
            <div class="amb-dd-item" @click="showCalc('efficiency')">
              <span class="amb-dd-icon">η</span>{{ t('tools.calcEfficiency') }}
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="emit('goto','settings')">
              <span class="amb-dd-icon">⚙</span>{{ t('tools.settings') }}
            </div>
          </div>
        </div>

        <!-- Help -->
        <div class="amb-menu-item" :class="{'amb-menu-item--open':openMenu==='help'}"
          @click.stop="toggleMenu('help')">
          {{ t('menu.help') }}
          <div v-if="openMenu==='help'" class="amb-dropdown">
            <div class="amb-dd-item" @click="emit('goto','help')">
              <span class="amb-dd-icon">❓</span>{{ t('help.helpCenter') }}
            </div>
            <div class="amb-dd-item" @click="emit('goto','help'); emit('help-article','welcome')">
              <span class="amb-dd-icon">🚀</span>{{ t('help.gettingStarted') }}
            </div>
            <div class="amb-dd-item" @click="showShortcuts=true">
              <span class="amb-dd-icon">⌨</span>{{ t('help.keyboardShortcuts') }}<span class="amb-dd-kbd">F1</span>
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="emit('tech-support')">
              <span class="amb-dd-icon">🛠</span>{{ t('help.techSupport') }}
            </div>
            <div class="amb-dd-item" @click="emit('feedback')">
              <span class="amb-dd-icon">💬</span>{{ t('help.feedback') }}
            </div>
            <div class="amb-dd-sep"/>
            <div class="amb-dd-item" @click="showAbout=true">
              <span class="amb-dd-icon">ℹ</span>{{ t('help.about') }}
            </div>
          </div>
        </div>
      </div>

      <!-- ── Right icon toolbar ──────────────────────────────────────────── -->
      <div class="amb-icon-bar">
        <!-- New Design → opens Product Portfolio -->
        <button class="amb-icon-btn" :title="t('file.new')" @click="emit('open-portfolio')">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16">
            <rect x="4" y="3" width="12" height="14" rx="1.5"/>
            <path d="M10 8v4M8 10h4"/>
          </svg>
        </button>
        <!-- Open Design -->
        <button class="amb-icon-btn" :title="t('file.open')" @click="emit('open-design')">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16">
            <path d="M3 7a1 1 0 011-1h4l2 2h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V7z"/>
          </svg>
        </button>
        <!-- Undo -->
        <button class="amb-icon-btn" :title="t('edit.undo')" :disabled="!hasDesign" @click="emit('undo')">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16">
            <path d="M4 9L8 5M4 9L8 13M4 9h8a4 4 0 010 8H8"/>
          </svg>
        </button>
        <!-- Redo -->
        <button class="amb-icon-btn" :title="t('edit.redo')" :disabled="!hasDesign" @click="emit('redo')">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16">
            <path d="M16 9L12 5M16 9L12 13M16 9H8a4 4 0 000 8h4"/>
          </svg>
        </button>
        <!-- Simulate / Run -->
        <button class="amb-icon-btn" :title="t('design.simulate')" :disabled="!hasDesign" @click="emit('simulate')">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16">
            <circle cx="10" cy="10" r="7"/>
            <path d="M8 7l5 3-5 3V7z" fill="currentColor" stroke="none"/>
          </svg>
        </button>
        <!-- Help -->
        <button class="amb-icon-btn" :title="t('help.helpCenter')" @click="emit('goto','help')">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16">
            <circle cx="10" cy="10" r="7"/>
            <path d="M7.5 8a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M10 15v.5"/>
          </svg>
        </button>

        <!-- Design warning badge -->
        <div v-if="hasDesign && designWarning" class="amb-warning-badge" @click="emit('show-warnings')">
          <svg viewBox="0 0 16 16" fill="#1a1a2e" width="14" height="14">
            <path d="M8 1L15 14H1L8 1z" fill="#D97706" stroke="none"/>
            <text x="8" y="12" text-anchor="middle" font-size="8" font-weight="bold" fill="#1a1a2e">!</text>
          </svg>
          {{ t('ui.designWarning') }}
        </div>
      </div>
    </div>

    <!-- ── Calculators dialog ──────────────────────────────────────────────── -->
    <teleport to="body">
      <div v-if="calcOpen" class="amb-overlay" @click.self="calcOpen=false">
        <div class="amb-calc-dlg">
          <div class="amb-dlg-hd">
            {{ calcType==='lp' ? t('tools.calcLp') : calcType==='thermal' ? t('tools.calcThermal') : t('tools.calcEfficiency') }}
            <button class="amb-dlg-x" @click="calcOpen=false">✕</button>
          </div>
          <div class="amb-calc-body">
            <!-- Inductance calculator -->
            <template v-if="calcType==='lp'">
              <div class="amb-calc-form">
                <div class="amb-cf-row"><label>Vin_min (V)</label><input type="number" v-model.number="calc.Vmin" class="amb-ci"/></div>
                <div class="amb-cf-row"><label>Pout (W)</label><input type="number" v-model.number="calc.Pout" class="amb-ci"/></div>
                <div class="amb-cf-row"><label>fsw (kHz)</label><input type="number" v-model.number="calc.fsw" class="amb-ci"/></div>
                <div class="amb-cf-row"><label>KP (ripple)</label><input type="number" step="0.01" v-model.number="calc.KP" class="amb-ci"/></div>
              </div>
              <div class="amb-calc-result">
                <div class="amb-cr-label">Primary Inductance (Lp)</div>
                <div class="amb-cr-val">{{ calcLp.toFixed(2) }} µH</div>
                <div class="amb-cr-label">Peak Primary Current</div>
                <div class="amb-cr-val">{{ calcIpk.toFixed(3) }} A</div>
              </div>
            </template>
            <!-- Thermal calculator -->
            <template v-else-if="calcType==='thermal'">
              <div class="amb-calc-form">
                <div class="amb-cf-row"><label>Power Loss (W)</label><input type="number" step="0.1" v-model.number="calc.Ploss" class="amb-ci"/></div>
                <div class="amb-cf-row"><label>Rθja (°C/W)</label><input type="number" step="0.1" v-model.number="calc.Rja" class="amb-ci"/></div>
                <div class="amb-cf-row"><label>Ta (°C)</label><input type="number" v-model.number="calc.Ta" class="amb-ci"/></div>
              </div>
              <div class="amb-calc-result">
                <div class="amb-cr-label">Junction Temperature</div>
                <div class="amb-cr-val" :class="calcTj>125?'amb-cr-over':''">{{ calcTj.toFixed(1) }} °C</div>
                <div class="amb-cr-label">Thermal Margin</div>
                <div class="amb-cr-val">{{ (150-calcTj).toFixed(1) }} °C</div>
              </div>
            </template>
            <!-- Efficiency estimator -->
            <template v-else>
              <div class="amb-calc-form">
                <div class="amb-cf-row"><label>Pin (W)</label><input type="number" v-model.number="calc.Pin" class="amb-ci"/></div>
                <div class="amb-cf-row"><label>Pout (W)</label><input type="number" v-model.number="calc.Pout2" class="amb-ci"/></div>
              </div>
              <div class="amb-calc-result">
                <div class="amb-cr-label">Efficiency</div>
                <div class="amb-cr-val">{{ calcEff.toFixed(2) }} %</div>
                <div class="amb-cr-label">Total Losses</div>
                <div class="amb-cr-val">{{ (calc.Pin - calc.Pout2).toFixed(2) }} W</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Keyboard shortcuts -->
      <div v-if="showShortcuts" class="amb-overlay" @click.self="showShortcuts=false">
        <div class="amb-calc-dlg">
          <div class="amb-dlg-hd">⌨ Keyboard Shortcuts <button class="amb-dlg-x" @click="showShortcuts=false">✕</button></div>
          <div class="amb-shortcuts-body">
            <div v-for="s in SHORTCUTS" :key="s.key" class="amb-sc-row">
              <span class="amb-sc-key">{{ s.key }}</span>
              <span class="amb-sc-desc">{{ s.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile modal -->
      <div v-if="showProfile" class="amb-overlay" @click.self="showProfile=false">
        <div class="amb-calc-dlg">
          <div class="amb-dlg-hd">👤 My Profile <button class="amb-dlg-x" @click="showProfile=false">✕</button></div>
          <div class="amb-profile-body">
            <div class="amb-pf-row">
              <label>Display Name</label>
              <input class="amb-pf-inp" v-model="profileDraft.name" placeholder="Your name"/>
            </div>
            <div class="amb-pf-row">
              <label>Email</label>
              <input class="amb-pf-inp" v-model="profileDraft.email" placeholder="your@email.com"/>
            </div>
            <div class="amb-pf-row">
              <label>New Password</label>
              <input class="amb-pf-inp" type="password" v-model="profileDraft.password" placeholder="Leave blank to keep current"/>
            </div>
            <div v-if="profileMsg" class="amb-pf-msg" :class="profileMsg.ok?'amb-pf-ok':'amb-pf-err'">
              {{ profileMsg.text }}
            </div>
          </div>
          <div class="amb-dlg-ft">
            <button class="amb-btn" @click="showProfile=false">Cancel</button>
            <button class="amb-btn amb-btn-primary" @click="saveProfile" :disabled="savingProfile">
              {{ savingProfile ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- About dialog -->
      <div v-if="showAbout" class="amb-overlay" @click.self="showAbout=false">
        <div class="amb-calc-dlg">
          <div class="amb-dlg-hd">ℹ About FluxForge <button class="amb-dlg-x" @click="showAbout=false">✕</button></div>
          <div class="amb-about-body">
            <div class="amb-about-logo">⚡ FluxForge Desktop</div>
            <div class="amb-about-ver">Version 2.0.0 — Beta</div>
            <p>Open-source power supply design tool for flyback converter families.</p>
            <p>Component database: 111 parts · Magnetics: 40 cores, 15 materials</p>
            <p>Simulation engine: Real electrical engineering calculations (Flyback DCM/BCM)</p>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '../composables/useI18n.js';

const props = defineProps({
  username:      { type: String, default: '' },
  hasDesign:     { type: Boolean, default: false },
  designWarning: { type: Boolean, default: false },
  activeTab:     { type: String, default: '' },
  showHomeLink:  { type: Boolean, default: true },
  isHome:        { type: Boolean, default: false },
  hideBrand:     { type: Boolean, default: false },
});
const emit = defineEmits([
  'new-design','open-design','open-portfolio','go-home','save','save-as','export','print','close-design','recent','update-profile',
  'undo','redo','cut','copy','paste','export-all','export-cad','preferences',
  'switch-tab','zoom-in','zoom-out','fit-all',
  'design-properties','simulate','optimize','validate',
  'goto','help-article','tech-support','feedback','logout','show-warnings',
]);

const { t, locale, setLocale, LANGUAGES } = useI18n();
const currentLangObj = computed(() => LANGUAGES.find(l => l.code === locale.value));

const openMenu      = ref('');
const langOpen      = ref(false);
const userMenuOpen  = ref(false);
const userChipRef   = ref(null);
const showProfile   = ref(false);
const profileDraft  = ref({ name:'', email:'', password:'' });
const profileMsg    = ref(null);
const savingProfile = ref(false);
const langWrapRef  = ref(null);
const showShortcuts= ref(false);
const showAbout    = ref(false);
const calcOpen     = ref(false);
const calcType     = ref('lp');
const calc         = ref({ Vmin:85, Pout:65, fsw:132, KP:0.65, Ploss:2, Rja:22, Ta:40, Pin:75, Pout2:65 });

const VIEW_TABS = [
  { key:'Schematic',               label:'view.schematic',     icon:'📐' },
  { key:'Design Results',          label:'view.designResults', icon:'📊' },
  { key:'BOM',                     label:'view.bom',           icon:'📋' },
  { key:'Board Layout',            label:'view.boardLayout',   icon:'🔲' },
  { key:'Transformer Construction',label:'view.transformer',   icon:'🔁' },
  { key:'Design Notes',            label:'view.notes',         icon:'📝' },
];

const SHORTCUTS = [
  { key:'Ctrl+N',  desc:'New Design' },
  { key:'Ctrl+O',  desc:'Open Design' },
  { key:'Ctrl+S',  desc:'Save' },
  { key:'Ctrl+E',  desc:'Export All Tabs to PDF' },
  { key:'Ctrl+Z',  desc:'Undo' },
  { key:'Ctrl+Y',  desc:'Redo' },
  { key:'Ctrl++',  desc:'Zoom In (Schematic)' },
  { key:'Ctrl+-',  desc:'Zoom Out (Schematic)' },
  { key:'Ctrl+0',  desc:'Fit All (Schematic)' },
  { key:'F1',      desc:'Help / Keyboard Shortcuts' },
  { key:'Escape',  desc:'Close dialog / Cancel' },
];

// Computed calculator results
const calcLp  = computed(() => {
  const { Vmin, Pout, fsw, KP } = calc.value;
  if (!Pout || !fsw) return 0;
  return (Vmin**2 * 0.5 * KP * 0.5) / (Pout / 0.87 * (fsw * 1000)) * 1e6;
});
const calcIpk = computed(() => {
  const { Vmin, Pout, fsw, KP } = calc.value;
  if (!Pout || !fsw) return 0;
  const D = 0.45; const n = Pout / 0.87 / Vmin;
  return (2 * n) / (D * (1 + KP / 2));
});
const calcTj  = computed(() => calc.value.Ta + calc.value.Ploss * calc.value.Rja);
const calcEff = computed(() => calc.value.Pin > 0 ? (calc.value.Pout2 / calc.value.Pin) * 100 : 0);

function toggleMenu(name) {
  openMenu.value = openMenu.value === name ? '' : name;
  langOpen.value = false;
}
function selectLang(code) { setLocale(code); langOpen.value = false; }

async function saveProfile() {
  savingProfile.value = true;
  profileMsg.value = null;
  try {
    emit('update-profile', { ...profileDraft.value });
    profileMsg.value = { ok: true, text: 'Profile saved successfully.' };
    setTimeout(() => { showProfile.value = false; profileMsg.value = null; }, 1200);
  } catch (e) {
    profileMsg.value = { ok: false, text: e.message || 'Save failed.' };
  } finally {
    savingProfile.value = false;
  }
}

// Populate profile draft when opening
function openProfile() {
  profileDraft.value = { name: props.username || '', email: '', password: '' };
  showProfile.value = true;
}
function showCalc(type) { calcType.value = type; calcOpen.value = true; openMenu.value = ''; }

// Close menus on outside click
function onOutsideClick(e) {
  const uc = userChipRef.value;
  if (uc && !uc.contains(e.target)) userMenuOpen.value = false;
  const el = langWrapRef.value;
  if (el && !el.contains(e.target)) langOpen.value = false;
  if (!e.target.closest('.amb-menu-item')) openMenu.value = '';
}

// Keyboard shortcuts
function onKeydown(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'n') { e.preventDefault(); emit('new-design'); }
    else if (e.key === 'o') { e.preventDefault(); emit('open-design'); }
    else if (e.key === 's' && e.shiftKey) { e.preventDefault(); emit('save-as'); }
    else if (e.key === 's') { e.preventDefault(); emit('save'); }
    else if (e.key === 'e') { e.preventDefault(); if (props.hasDesign) emit('export-all'); }
    else if (e.key === 'z') { e.preventDefault(); emit('undo'); }
    else if (e.key === 'y') { e.preventDefault(); emit('redo'); }
  }
  if (e.key === 'F1') { e.preventDefault(); showShortcuts.value = true; }
  if (e.key === 'Escape') { openMenu.value = ''; langOpen.value = false; }
}

onMounted(() => {
  document.addEventListener('click', onOutsideClick);
  document.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────────────────── */
.amb-root { display:flex; flex-direction:column; flex-shrink:0; }

/* ── Top bar ──────────────────────────────────────────────────────────────── */
.amb-top {
  display:flex; align-items:center; justify-content:space-between;
  padding:.25rem .9rem; background:#0D7377; height:28px; font-size:.72rem;
}
.amb-brand { display:flex; align-items:center; gap:.6rem; }
.amb-ff-logo { flex-shrink:0; }



.amb-beta  { background:#0A5C60; color:#fff; font-size:.62rem; font-weight:700; padding:.08rem .35rem; border-radius:3px; text-transform:uppercase; letter-spacing:.08em; }
.amb-top-right { display:flex; align-items:center; gap:.9rem; }
.amb-top-link { background:none; border:none; color:#A8C8E8; font-size:.7rem; font-weight:600; cursor:pointer; letter-spacing:.04em; text-decoration:none; }
.amb-top-link:hover { color:#FFFFFF; }
.amb-home-btn { border:1px solid rgba(255,255,255,.2); border-radius:4px; padding:.1rem .5rem; }
.amb-top-user { color:#a0b4c8; font-size:.7rem; }

/* Language dropdown */
.amb-lang-wrap { position:relative; }
.amb-lang-btn  { display:flex; align-items:center; gap:.3rem; }
.amb-lang-cur  { font-size:.85rem; }
.amb-lang-dd   { position:absolute; right:0; top:calc(100% + 4px); background:#fff; border:1px solid #d0d4e8; border-radius:5px; box-shadow:0 8px 24px rgba(0,0,0,.18); z-index:9999; min-width:160px; overflow:hidden; }
.amb-lang-item { display:flex; align-items:center; gap:.5rem; padding:.38rem .7rem; font-size:.8rem; color:#1a1a2e; cursor:pointer; }
.amb-lang-item:hover { background:#f0f4ff; }
.amb-lang-item--active { background:#eef2ff; }
.amb-lang-flag { font-size:.95rem; }
.amb-lang-label { flex:1; }
.amb-lang-check { color:#0D7377; font-weight:700; }

/* ── Menu bar ─────────────────────────────────────────────────────────────── */
.amb-menubar {
  display:flex; align-items:center; justify-content:space-between;
  background:#fff; border-bottom:1px solid #dde0ea; height:32px; padding:0 .5rem;
  font-size:.8rem; position:relative; z-index:200;
}
.amb-menus { display:flex; align-items:stretch; height:100%; }
.amb-menu-item {
  position:relative; display:flex; align-items:center;
  padding:0 .85rem; cursor:pointer; color:#1a1a2e; height:100%;
  user-select:none; font-size:.8rem; white-space:nowrap;
}
.amb-menu-item:hover { background:#f0f3ff; }
.amb-menu-item--open { background:#E8F7F7; color:#0D7377; font-weight:600; }
.amb-menu-item--dis  { opacity:.4; cursor:not-allowed; }

/* Dropdown */
.amb-dropdown {
  position:absolute; top:100%; left:0; min-width:220px;
  background:#fff; border:1px solid #d0d4e8; border-radius:0 4px 4px 4px;
  box-shadow:0 8px 24px rgba(0,0,0,.14); z-index:9000; padding:.3rem 0;
}
.amb-dd-sep  { height:1px; background:#e8eaf0; margin:.25rem 0; }
.amb-dd-sub-hd { padding:.25rem .75rem .15rem; font-size:.68rem; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.06em; }
.amb-dd-item {
  display:flex; align-items:center; gap:.5rem; padding:.32rem .75rem;
  font-size:.8rem; color:#1a1a2e; cursor:pointer;
}
.amb-dd-item:hover { background:#f0f4ff; }
.amb-dd-item--dis  { opacity:.4; cursor:not-allowed; }
.amb-dd-item--dis:hover { background:none; }
.amb-dd-item--highlight { color:#0D7377; font-weight:600; }
.amb-dd-item--danger { color:#C0392B; font-weight:600; }
.amb-dd-icon { width:18px; text-align:center; font-size:.85rem; flex-shrink:0; }
.amb-dd-kbd  { margin-left:auto; color:#aaa; font-size:.7rem; font-family:monospace; }
.amb-dd-check{ margin-left:auto; color:#0D7377; font-weight:700; }
.amb-dd-badge{ margin-left:auto; font-size:.62rem; font-weight:700; padding:.05rem .3rem; border-radius:3px; background:#0D7377; color:#fff; letter-spacing:.04em; flex-shrink:0; }

/* ── Icon toolbar ─────────────────────────────────────────────────────────── */
.amb-icon-bar { display:flex; align-items:center; gap:1px; }
.amb-icon-btn {
  width:28px; height:28px; display:flex; align-items:center; justify-content:center;
  border:none; background:#0D7377; color:#fff; cursor:pointer; border-radius:3px;
  transition:background .12s;
}
.amb-icon-btn:hover { background:#0A5C60; }
.amb-icon-btn:disabled { background:#95a5a6; cursor:not-allowed; opacity:.6; }
.amb-icon-btn + .amb-icon-btn { margin-left:1px; }
.amb-warning-badge {
  display:flex; align-items:center; gap:.4rem;
  background:#D97706; color:#1a1a2e; font-size:.72rem; font-weight:700;
  padding:.25rem .7rem; border-radius:3px; cursor:pointer; margin-left:.4rem;
}
.amb-warning-badge:hover { background:#d97706; }

/* ── Calculators ──────────────────────────────────────────────────────────── */
.amb-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:9800; display:flex; align-items:center; justify-content:center; }
.amb-calc-dlg { background:#fff; border-radius:8px; width:420px; max-width:96vw; box-shadow:0 16px 48px rgba(0,0,0,.28); display:flex; flex-direction:column; overflow:hidden; }
.amb-dlg-hd  { display:flex; align-items:center; justify-content:space-between; padding:.6rem 1rem; background:#11876F; color:#fff; font-weight:700; font-size:.88rem; flex-shrink:0; }
.amb-dlg-x   { background:none; border:none; color:#aac; font-size:1rem; cursor:pointer; }
.amb-calc-body, .amb-about-body, .amb-shortcuts-body { padding:1rem 1.1rem; }
.amb-calc-form { display:flex; flex-direction:column; gap:.45rem; margin-bottom:.8rem; }
.amb-cf-row  { display:flex; align-items:center; justify-content:space-between; font-size:.82rem; color:#444; }
.amb-ci      { width:110px; padding:.28rem .45rem; border:1px solid #c8cce0; border-radius:4px; font-size:.82rem; text-align:right; }
.amb-calc-result { background:#f4f6fb; border-radius:6px; padding:.65rem .8rem; display:grid; grid-template-columns:1fr 1fr; gap:.25rem .5rem; }
.amb-cr-label { font-size:.72rem; color:#666; }
.amb-cr-val   { font-size:.95rem; font-weight:700; color:#0D7377; font-family:monospace; text-align:right; }
.amb-cr-over  { color:#C0392B; }
.amb-shortcuts-body { display:flex; flex-direction:column; gap:.3rem; max-height:50vh; overflow-y:auto; }
.amb-sc-row  { display:flex; align-items:center; gap:1rem; font-size:.8rem; padding:.2rem 0; border-bottom:1px solid #f0f0f0; }
.amb-sc-key  { background:#f0f3ff; border:1px solid #c8d4ff; border-radius:4px; padding:.12rem .45rem; font-family:monospace; font-size:.75rem; font-weight:700; color:#2d4080; min-width:72px; text-align:center; flex-shrink:0; }
.amb-sc-desc { color:#444; }
.amb-about-body { text-align:center; padding:1.5rem; }
.amb-about-logo { font-size:1.4rem; font-weight:700; color:#1b4f72; margin-bottom:.3rem; }
.amb-about-ver  { color:#888; font-size:.78rem; margin-bottom:.8rem; }
.amb-about-body p { font-size:.82rem; color:#555; line-height:1.6; margin:.25rem 0; }
/* User chip */
.amb-user-wrap { position:relative; }
.amb-user-chip { display:flex;align-items:center;gap:.35rem;padding:.15rem .5rem;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:4px;cursor:pointer;color:#fff;font-size:.75rem; }
.amb-user-chip:hover { background:rgba(255,255,255,.18); }
.amb-user-avatar { width:22px;height:22px;background:#0D7377;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;color:#fff;flex-shrink:0; }
.amb-user-name { color:rgba(255,255,255,.9);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.amb-user-caret { font-size:.6rem;color:rgba(255,255,255,.6); }
.amb-user-dd { position:absolute;right:0;top:calc(100% + 5px);background:#fff;border:1px solid #d0d4e8;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:9999;min-width:180px;overflow:hidden; }
.amb-user-dd-header { display:flex;align-items:center;gap:.5rem;padding:.6rem .8rem;background:#f4f6fb;border-bottom:1px solid #e2e4ea; }
.amb-user-avatar-lg { width:32px;height:32px;background:#0D7377;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:#fff;flex-shrink:0; }
.amb-user-dd-name { font-size:.82rem;font-weight:700;color:#1a1a2e; }
.amb-user-dd-sep { height:1px;background:#e8eaf0; }
.amb-user-dd-item { display:block;width:100%;padding:.45rem .8rem;border:none;background:#fff;text-align:left;font-size:.8rem;cursor:pointer;color:#1a1a2e; }
.amb-user-dd-item:hover { background:#f0f4ff; }
.amb-user-dd-danger { color:#C0392B; }
.amb-user-dd-danger:hover { background:#FFF5F5; }
/* Profile modal */
.amb-profile-body { padding:.9rem 1.1rem;display:flex;flex-direction:column;gap:.55rem; }
.amb-pf-row { display:flex;flex-direction:column;gap:.15rem; }
.amb-pf-row label { font-size:.72rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.04em; }
.amb-pf-inp { padding:.35rem .5rem;border:1px solid #c8cce0;border-radius:4px;font-size:.82rem;color:#1a1a2e;width:100%;box-sizing:border-box; }
.amb-pf-msg { padding:.35rem .6rem;border-radius:4px;font-size:.8rem;font-weight:600; }
.amb-pf-ok  { background:#F0FFF4;color:#276749; }
.amb-pf-err { background:#FFF5F5;color:#991b1b; }
.amb-btn { padding:.32rem .8rem;border-radius:4px;font-size:.78rem;cursor:pointer;border:1px solid #b0b5c8;background:#fff;color:#1a1a2e; }
.amb-btn-primary { background:#0D7377;border-color:#0A5C60;color:#fff; }
.amb-btn-primary:hover:not(:disabled) { background:#0A5C60; }
.amb-btn:disabled { opacity:.4;cursor:not-allowed; }
</style>

<template>
  <div class="md-root">

    <!-- ══ TOP TOOLBAR ══════════════════════════════════════════════════════ -->
    <div class="md-topbar">
      <span class="md-brand">⚡ FluxForge Magnetics Designer</span>
      <span class="md-topbar-sep"></span>

      <div class="md-qi"><label>Vin min (V)</label><input class="md-inp" type="number" v-model.number="form.vMin" min="47" max="305"/></div>
      <div class="md-qi"><label>Vin max (V)</label><input class="md-inp" type="number" v-model.number="form.vMax" min="85" max="380"/></div>
      <div class="md-qi"><label>Pout (W)</label><input class="md-inp md-inp-sm" type="number" v-model.number="form.Pout" min="1" max="500"/></div>
      <div class="md-qi"><label>Vout (V)</label><input class="md-inp md-inp-sm" type="number" v-model.number="form.outputs[0].voltage" step="0.1"/></div>
      <div class="md-qi"><label>Iout (A)</label><input class="md-inp md-inp-sm" type="number" v-model.number="form.outputs[0].current" step="0.01"/></div>
      <div class="md-qi"><label>fsw (kHz)</label><input class="md-inp md-inp-sm" type="number" v-model.number="form.fsw_kHz" min="30" max="500"/></div>
      <div class="md-qi"><label>KP</label><input class="md-inp md-inp-xs" type="number" v-model.number="form.KP" min="0.2" max="1" step="0.05"/></div>
      <div class="md-qi"><label>Material</label>
        <select class="md-inp md-inp-md" v-model="form.coreMaterial">
          <option v-for="m in MATERIALS" :key="m.name" :value="m.name">{{ m.name }}</option>
        </select>
      </div>
      <div class="md-qi"><label>Core</label>
        <select class="md-inp md-inp-md" v-model="form.coreOverride">
          <option value="">Auto</option>
          <option v-for="c in CORES" :key="c.name" :value="c.name">{{ c.name }}</option>
        </select>
      </div>
      <div class="md-qi"><label>Isolation</label>
        <select class="md-inp" v-model="form.isolationClass">
          <option value="basic">Basic</option>
          <option value="supplementary">Suppl.</option>
          <option value="reinforced">Reinf.</option>
        </select>
      </div>
      <span class="md-topbar-sep"></span>
      <div class="md-qi"><label>Preset</label>
        <select class="md-inp md-inp-md" v-model="selectedPreset" @change="applyPreset(selectedPreset)">
          <option value="">— Select —</option>
          <option v-for="p in PRESETS" :key="p.label" :value="p.label">{{ p.label }}</option>
        </select>
      </div>
      <span class="md-topbar-sep"></span>
      <button class="md-tb-run" :disabled="!canDesign" @click="runDesign">▶ Run Design</button>
      <button v-if="result" class="md-tb-btn" @click="exportReport">⬇ Report</button>
      <button class="md-tb-btn" @click="resetForm">↺ Reset</button>
    </div>

    <!-- ══ 6-PANEL WORKSPACE ════════════════════════════════════════════════ -->
    <div class="md-workspace" v-if="result">

      <!-- ROW 1: Mechanical Diagram (2 cols wide) + Windings Info ────────── -->
      <div class="md-workspace-row md-row-top">

      <!-- Panel 1: Mechanical Diagram -->
      <div class="md-panel p-mech">
        <div class="md-panel-title md-title-cyan">
          <span>Mechanical Diagram</span>
          <div class="md-mech-tabs">
            <button class="md-mech-tab" :class="{'mmt-active': mechView==='cross'}"        @click="mechView='cross'">Cross-Section</button>
            <button class="md-mech-tab" :class="{'mmt-active': mechView==='spiral'}"       @click="mechView='spiral'">Spiral</button>
            <button class="md-mech-tab" :class="{'mmt-active': mechView==='construction'}" @click="mechView='construction'">Construction</button>
            <button class="md-mech-tab" :class="{'mmt-active': mechView==='designer'}"     @click="mechView='designer'">Designer</button>
            <button class="md-mech-tab" :class="{'mmt-active': mechView==='foundry'}"      @click="mechView='foundry'">Foundry</button>
            <button class="md-mech-tab" :class="{'mmt-active': mechView==='thermal'}"      @click="mechView='thermal'">Thermal</button>
            <button class="md-mech-tab" :class="{'mmt-active': mechView==='dimensions'}"  @click="mechView='dimensions'">Dimensions</button>
          </div>
          <div class="md-title-btns">
            <button class="md-titlebtn">📌</button>
            <button class="md-titlebtn">⬜</button>
          </div>
        </div>
        <div class="md-panel-body mech-body">
          <svg v-if="mechView==='cross'" :viewBox="'0 0 ' + MSVG.w + ' ' + MSVG.h"
               class="mech-svg" xmlns="http://www.w3.org/2000/svg">

            <!-- Left flange — vertical purple bar -->
            <rect :x="MSVG.lf_x" :y="MSVG.top - 8"
                  :width="MSVG.flange_w" :height="MSVG.total_h + 16"
                  fill="#9b59b6" stroke="#7d3c98" stroke-width="1"/>

            <!-- Right flange -->
            <rect :x="MSVG.rf_x" :y="MSVG.top - 8"
                  :width="MSVG.flange_w" :height="MSVG.total_h + 16"
                  fill="#d5d8dc" stroke="#aaa" stroke-width="1"/>

            <!-- Bobbin horizontal rails (top and bottom) -->
            <line :x1="MSVG.lf_x + MSVG.flange_w" :y1="MSVG.top - 2"
                  :x2="MSVG.rf_x" :y2="MSVG.top - 2"
                  stroke="#888" stroke-width="1.5"/>
            <line :x1="MSVG.lf_x + MSVG.flange_w" :y1="MSVG.top + MSVG.total_h + 2"
                  :x2="MSVG.rf_x" :y2="MSVG.top + MSVG.total_h + 2"
                  stroke="#888" stroke-width="1.5"/>

            <!-- Winding rows — bottom to top (layer 0 = bottom) -->
            <g v-for="(layer, li) in mechLayers" :key="'lay-' + li">

              <!-- Tape line above layer (if layer.tapeBefore) -->
              <line v-if="layer.tapeBefore"
                :x1="MSVG.lf_x + MSVG.flange_w + 2"
                :y1="layer.y - 1"
                :x2="MSVG.rf_x - 2"
                :y2="layer.y - 1"
                stroke="#e8c84a" stroke-width="2" opacity="0.85"/>

              <!-- Wire circles for this layer -->
              <g v-for="(circ, ci) in layer.circles" :key="'c-' + ci">
                <circle
                  :cx="MSVG.lf_x + MSVG.flange_w + 6 + ci * (MSVG.wd + 1) + MSVG.wd / 2"
                  :cy="layer.y + MSVG.wd / 2"
                  :r="MSVG.wd / 2 - 0.8"
                  :fill="circ.fill"
                  :stroke="circ.stroke"
                  stroke-width="1.2"
                  opacity="0.95"/>
              </g>

              <!-- Row number label — left of flange, inside -->
              <text v-if="layer.rowNum"
                :x="MSVG.lf_x + MSVG.flange_w - 18"
                :y="layer.y + MSVG.wd / 2 + 4"
                font-size="9" fill="#333" font-family="monospace" text-anchor="end">
                {{ layer.rowNum }}
              </text>

              <!-- FL label left (outside left flange) -->
              <text v-if="layer.flLeft"
                :x="MSVG.lf_x - 4"
                :y="layer.y + MSVG.wd / 2 + 4"
                font-size="9" fill="#333" font-family="sans-serif" text-anchor="end">
                {{ layer.flLeft }}
              </text>

              <!-- FL label right (outside right flange) -->
              <text v-if="layer.flRight"
                :x="MSVG.rf_x + MSVG.flange_w + 4"
                :y="layer.y + MSVG.wd / 2 + 4"
                font-size="9" fill="#333" font-family="sans-serif">
                {{ layer.flRight }}
              </text>
            </g>

            <!-- Gap annotation line (centre-post gap) -->
            <line :x1="MSVG.lf_x + MSVG.flange_w"
                  :y1="MSVG.top + MSVG.total_h / 2"
                  :x2="MSVG.rf_x"
                  :y2="MSVG.top + MSVG.total_h / 2"
                  stroke="#e74c3c" stroke-width="0.8" stroke-dasharray="3,2"/>
            <text :x="MSVG.lf_x + MSVG.flange_w + 12"
                  :y="MSVG.top + MSVG.total_h / 2 - 6"
                  font-size="8" fill="#e74c3c" font-family="monospace" font-weight="600">
              gap = {{ result.gap_mm }} mm
            </text>

          </svg>

          <!-- ─── SPIRAL VIEW ────────────────────────────────────────────── -->
          <div v-if="mechView==='spiral'" class="spiral-wrap">
            <svg :viewBox="'0 0 420 340'" class="spiral-svg"
                 xmlns="http://www.w3.org/2000/svg">

              <!-- Background -->
              <rect x="0" y="0" width="420" height="420" fill="#f9f9f9"/>

              <!-- Title -->
              <text x="210" y="28" text-anchor="middle"
                font-size="11" fill="#333" font-family="monospace" font-weight="600">
                Bobbin Cross-Section — {{ result.core.name }} ({{ result.core.material }})
              </text>

              <!-- Core outline (outermost square) -->
              <rect :x="210 - spiralData.core_half"
                    :y="210 - spiralData.core_half"
                    :width="spiralData.core_half * 2"
                    :height="spiralData.core_half * 2"
                    fill="none" stroke="#8b6914" stroke-width="3" rx="3"/>

              <!-- Core label -->
              <text x="210" :y="210 - spiralData.core_half - 6"
                font-size="9" fill="#8b6914" text-anchor="middle" font-family="monospace">
                Core: {{ result.core.name }}
              </text>

              <!-- Bobbin wall (inner boundary) -->
              <rect :x="210 - spiralData.bobbin_half"
                    :y="210 - spiralData.bobbin_half"
                    :width="spiralData.bobbin_half * 2"
                    :height="spiralData.bobbin_half * 2"
                    fill="none" stroke="#c8a84a" stroke-width="1.5"
                    stroke-dasharray="4,2" rx="2"/>

              <!-- Centre post (ferrite core centre, filled) -->
              <rect :x="210 - spiralData.post_half"
                    :y="210 - spiralData.post_half"
                    :width="spiralData.post_half * 2"
                    :height="spiralData.post_half * 2"
                    fill="#c8a84a" opacity="0.35" rx="2"/>
              <text x="210" y="214" text-anchor="middle"
                font-size="8" fill="#7a5c10" font-family="monospace">Centre post</text>

              <!-- Winding rings — one concentric ring per winding layer -->
              <g v-for="(ring, ri) in spiralData.rings" :key="'ring-'+ri">

                <!-- Ring fill (coloured band) -->
                <rect :x="210 - ring.outer"
                      :y="210 - ring.outer"
                      :width="ring.outer * 2"
                      :height="ring.outer * 2"
                      :fill="ring.color" :fill-opacity="ring.alpha"
                      :stroke="ring.color" :stroke-width="1" rx="2"/>

                <!-- Inner cutout to make it a ring (white box) -->
                <rect :x="210 - ring.inner"
                      :y="210 - ring.inner"
                      :width="ring.inner * 2"
                      :height="ring.inner * 2"
                      fill="#f9f9f9" rx="1"/>

                <!-- Wire dots on top edge of ring -->
                <g v-for="(dot, di) in ring.topDots" :key="'td-'+ri+'-'+di">
                  <circle :cx="dot.x" :cy="dot.y" :r="dot.r"
                    :fill="ring.color" :stroke="ring.strokeColor" stroke-width="0.8"
                    opacity="0.9"/>
                </g>

                <!-- Ring dimension annotation (right side) -->
                <line :x1="210 + ring.outer + 4" :y1="210"
                      :x2="210 + ring.outer + 22" :y2="210"
                      stroke="#aaa" stroke-width="0.8"/>
                <text :x="210 + ring.outer + 24" :y="214"
                  font-size="8" fill="#555" font-family="monospace">
                  {{ ring.label }}
                </text>

                <!-- Tape indicator (if insulation layer between windings) -->
                <rect v-if="ring.tape"
                  :x="210 - ring.outer - 2"
                  :y="210 - ring.outer - 2"
                  :width="(ring.outer + 2) * 2"
                  :height="(ring.outer + 2) * 2"
                  fill="none" stroke="#e8c84a" stroke-width="2"
                  stroke-dasharray="3,2" opacity="0.7" rx="3"/>
              </g>

              <!-- Winding spiral paths (illustrative clockwise spiral per winding) -->
              <g v-for="(sp, si) in spiralData.spirals" :key="'sp-'+si">
                <path :d="sp.path" fill="none"
                  :stroke="sp.color" :stroke-width="sp.width"
                  stroke-linecap="round" opacity="0.55"/>
                <!-- Polarity dot (start of winding) -->
                <circle :cx="sp.dotX" :cy="sp.dotY" r="4"
                  :fill="sp.color" opacity="0.85"/>
                <!-- Polarity text -->
                <text :x="sp.dotX + 6" :y="sp.dotY + 4"
                  font-size="7.5" :fill="sp.color" font-family="monospace">●</text>
              </g>

              <!-- Legend -->
              <!-- Legend moved outside SVG -->

              <!-- Fill factor arc indicator (bottom right) -->
              <text x="380" y="360" text-anchor="end"
                font-size="8.5" fill="#555" font-family="monospace">
                Fill: {{ result.fill_pct }}%
              </text>
              <text x="380" y="374" text-anchor="end"
                font-size="8" fill="#888" font-family="monospace">
                Ku = {{ result.Ku }}
              </text>
              <text x="380" y="388" text-anchor="end"
                font-size="8" fill="#888" font-family="monospace">
                Wa = {{ result.window_area_mm2 }} mm²
              </text>
              <text x="380" y="402" text-anchor="end"
                font-size="8" fill="#888" font-family="monospace">
                Gap: {{ result.gap_mm }} mm
              </text>

              <!-- Dimension lines -->
              <!-- Outer core dimension arrow -->
              <line :x1="210 - spiralData.core_half" y1="405"
                    :x2="210 + spiralData.core_half" y2="405"
                    stroke="#8b6914" stroke-width="1"
                    marker-start="url(#arrow-left)" marker-end="url(#arrow-right)"/>
              <text x="210" y="415" text-anchor="middle"
                font-size="8" fill="#8b6914" font-family="monospace">
                {{ result.core.name }} outer
              </text>

              <!-- Arrow markers -->
              <defs>
                <marker id="arrow-right" markerWidth="6" markerHeight="6"
                  refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#8b6914"/>
                </marker>
                <marker id="arrow-left" markerWidth="6" markerHeight="6"
                  refX="1" refY="3" orient="auto-start-reverse">
                  <path d="M0,3 L6,0 L6,6 Z" fill="#8b6914"/>
                </marker>
              </defs>

            </svg>
              <!-- ─ Legend row outside SVG ─────────────────────── -->
              <div class="spiral-legend">
                <div class="spiral-legend-items">
                  <div v-for="(leg, li) in spiralData.legend" :key="'leg-'+li" class="spiral-leg-item">
                    <span class="spiral-leg-swatch" :style="{background: leg.color}"></span>
                    <span class="spiral-leg-label">{{ leg.label }}</span>
                  </div>
                </div>
                <div class="spiral-stats">
                  <span :class="result.fill_ok ? 'ss-ok' : 'ss-warn'">Fill: {{ result.fill_pct }}%</span>
                  <span class="ss-dim">Ku = {{ result.Ku }}</span>
                  <span class="ss-dim">Wa = {{ result.window_area_mm2 }} mm²</span>
                  <span class="ss-dim">Gap: {{ result.gap_mm }} mm</span>
                </div>
              </div>
          </div><!-- end spiral-wrap -->


          <!-- ─── CONSTRUCTION DIAGRAM ──────────────────────────────────────── -->
          <div v-if="mechView==='construction'" class="constr-wrap">
            <svg viewBox="0 0 760 560" class="constr-svg" xmlns="http://www.w3.org/2000/svg">

              <!-- Background -->
              <rect x="0" y="0" width="760" height="480" fill="#fdfdfd"/>

              <!-- ── Title ─────────────────────────────────────────────────── -->
              <text x="380" y="28" text-anchor="middle"
                font-size="12" fill="#1a1a2e" font-family="sans-serif" font-weight="700">
                Constructional Diagram — {{ result.core.name }} ({{ result.core.material }}) &nbsp;·&nbsp;
                Np={{ result.Np }}T &nbsp;Ns={{ result.Ns }}T &nbsp;Nb={{ result.Nb }}T
              </text>

              <!-- ================================================================
                   MAIN CROSS-SECTION VIEW
                   Shows the bobbin window in side-view with winding layers as
                   horizontal coloured bands.  Left flange = purple.  Right = grey.
                   ================================================================ -->
              <g transform="translate(60, 40)">

                <!-- ── Ferrite core halves (top and bottom E-shape) ─────────── -->
                <!-- Top E-core half -->
                <rect x="0" y="0" :width="cd.bobbinW + cd.flangeW*2" height="25"
                  fill="#8b7840" stroke="#6b5820" stroke-width="1.5" rx="2"/>
                <text :x="(cd.bobbinW + cd.flangeW*2)/2" y="16" text-anchor="middle"
                  font-size="9" fill="#fff" font-family="monospace">
                  {{ result.core.material }} Core (top half)
                </text>

                <!-- Top E-core centre limb (goes DOWN into bobbin window) -->
                <rect :x="cd.flangeW + cd.bobbinW/2 - cd.postW/2" y="25"
                  :width="cd.postW" :height="cd.corePostH"
                  fill="#c8a84a" stroke="#8b6914" stroke-width="1" rx="1"/>
                <!-- Gap marker on centre limb -->
                <line :x1="cd.flangeW + cd.bobbinW/2 - cd.postW/2 - 4"
                      :y1="25 + cd.corePostH"
                      :x2="cd.flangeW + cd.bobbinW/2 + cd.postW/2 + 4"
                      :y2="25 + cd.corePostH"
                      stroke="#e74c3c" stroke-width="2"/>
                <text :x="cd.flangeW + cd.bobbinW/2 + cd.postW/2 + 8"
                      :y="25 + cd.corePostH + 4"
                  font-size="8" fill="#e74c3c" font-family="monospace">
                  ← gap {{ result.gap_mm }}mm →
                </text>

                <!-- ── Bobbin flanges (left = purple, right = grey) ────────── -->
                <!-- Left flange (purple) -->
                <rect x="0" :y="25" :width="cd.flangeW" :height="cd.winH + cd.tapeZones"
                  fill="#9b59b6" stroke="#7d3c98" stroke-width="1.5"/>
                <!-- Left flange face highlights -->
                <rect x="0" :y="25" :width="cd.flangeW" height="4"
                  fill="rgba(255,255,255,0.25)"/>

                <!-- Right flange (light grey) -->
                <rect :x="cd.flangeW + cd.bobbinW" :y="25" :width="cd.flangeW"
                  :height="cd.winH + cd.tapeZones"
                  fill="#d5d8dc" stroke="#9aa0b0" stroke-width="1.5"/>

                <!-- Bobbin base insulation (thin tan line) -->
                <rect :x="cd.flangeW" :y="25" :width="cd.bobbinW" height="3"
                  fill="#c8a84a" opacity="0.6"/>

                <!-- ── Winding layers stacked bottom→top ─────────────────── -->
                <g v-for="(layer, li) in cd.layers" :key="'cl-'+li">

                  <!-- Tape layer (yellow/gold band) -->
                  <rect v-if="layer.isTape"
                    :x="cd.flangeW" :y="25 + layer.y"
                    :width="cd.bobbinW" :height="layer.h"
                    fill="#f0c840" opacity="0.75"
                    stroke="#c8a020" stroke-width="0.5"/>
                  <text v-if="layer.isTape"
                    :x="cd.flangeW + cd.bobbinW/2" :y="25 + layer.y + layer.h/2 + 3"
                    font-size="7" fill="#7a5c10" text-anchor="middle" font-family="monospace">
                    {{ layer.tapeLabel }}
                  </text>

                  <!-- Winding layer band -->
                  <rect v-if="!layer.isTape"
                    :x="cd.flangeW" :y="25 + layer.y"
                    :width="cd.bobbinW" :height="layer.h"
                    :fill="layer.color" :fill-opacity="0.35"
                    :stroke="layer.color" stroke-width="1"/>

                  <!-- Individual wire circles (cross-section dots) in the band -->
                  <g v-if="!layer.isTape" v-for="(dot, di) in layer.wireDots" :key="'wd-'+li+'-'+di">
                    <circle :cx="cd.flangeW + dot.x" :cy="25 + layer.y + dot.y"
                      :r="dot.r"
                      :fill="layer.color" :stroke="layer.color"
                      :fill-opacity="dot.filled ? 0.9 : 0"
                      :stroke-opacity="0.8"
                      stroke-width="0.9"/>
                  </g>

                  <!-- Layer label (right side outside flange) -->
                  <text v-if="!layer.isTape"
                    :x="cd.flangeW + cd.bobbinW + cd.flangeW + 8"
                    :y="25 + layer.y + layer.h/2 + 4"
                    font-size="8.5" :fill="layer.color"
                    font-family="sans-serif" font-weight="600">
                    {{ layer.label }}
                  </text>

                  <!-- Layer row number (inside left flange) -->
                  <text v-if="!layer.isTape"
                    :x="cd.flangeW - 6"
                    :y="25 + layer.y + layer.h/2 + 4"
                    font-size="8" fill="#fff"
                    text-anchor="end" font-family="monospace">
                    {{ layer.rowNum }}
                  </text>

                  <!-- Pin connection line from layer end to flange pin -->
                  <line v-if="layer.pinSide==='left' && !layer.isTape"
                    :x1="cd.flangeW" :y1="25 + layer.y + layer.h/2"
                    x2="0" :y2="25 + layer.y + layer.h/2"
                    stroke="rgba(255,255,255,0.4)" stroke-width="1"
                    stroke-dasharray="2,2"/>

                </g><!-- end layers -->

                <!-- Bottom E-core half -->
                <rect x="0" :y="25 + cd.winH + cd.tapeZones" :width="cd.bobbinW + cd.flangeW*2" height="25"
                  fill="#8b7840" stroke="#6b5820" stroke-width="1.5" rx="2"/>
                <!-- Bottom E-core centre limb (goes UP into bobbin) -->
                <rect :x="cd.flangeW + cd.bobbinW/2 - cd.postW/2"
                      :y="25 + cd.winH + cd.tapeZones - cd.corePostH"
                  :width="cd.postW" :height="cd.corePostH"
                  fill="#c8a84a" stroke="#8b6914" stroke-width="1" rx="1"/>

                <!-- Bottom core label -->
                <text :x="(cd.bobbinW + cd.flangeW*2)/2"
                      :y="25 + cd.winH + cd.tapeZones + 16"
                  text-anchor="middle" font-size="9" fill="#fff" font-family="monospace">
                  {{ result.core.material }} Core (bottom half)
                </text>

                <!-- ── Dimension annotations ────────────────────────────────── -->
                <!-- Total height arrow -->
                <line :x1="-20" y1="25" :x2="-20" :y2="25 + cd.winH + cd.tapeZones"
                  stroke="#555" stroke-width="1"
                  marker-start="url(#c-arr-up)" marker-end="url(#c-arr-down)"/>
                <text x="-22" :y="25 + (cd.winH + cd.tapeZones)/2 + 4"
                  font-size="8" fill="#555" text-anchor="end" font-family="monospace">
                  BW {{ result.core.Wa_mm2 ? (result.core.Wa_mm2/10).toFixed(1) : '?' }}mm
                </text>

                <!-- Bobbin width arrow -->
                <line :x1="cd.flangeW" :y1="25 + cd.winH + cd.tapeZones + 38"
                  :x2="cd.flangeW + cd.bobbinW" :y2="25 + cd.winH + cd.tapeZones + 38"
                  stroke="#555" stroke-width="1"
                  marker-start="url(#c-arr-up)" marker-end="url(#c-arr-down)"/>
                <text :x="cd.flangeW + cd.bobbinW/2"
                      :y="25 + cd.winH + cd.tapeZones + 50"
                  text-anchor="middle" font-size="8" fill="#555" font-family="monospace">
                  Le {{ result.core.Le_mm }}mm
                </text>

                <!-- Total width arrow -->
                <line x1="0" :y1="25 + cd.winH + cd.tapeZones + 62"
                  :x2="cd.bobbinW + cd.flangeW*2" :y2="25 + cd.winH + cd.tapeZones + 62"
                  stroke="#8b7840" stroke-width="1"
                  marker-start="url(#c-arr-gold)" marker-end="url(#c-arr-gold-r)"/>
                <text :x="(cd.bobbinW + cd.flangeW*2)/2"
                      :y="25 + cd.winH + cd.tapeZones + 74"
                  text-anchor="middle" font-size="8" fill="#8b7840" font-family="monospace">
                  {{ result.core.name }} (A = {{ result.core.Le_mm }}mm)
                </text>

                <!-- SVG arrow markers -->
                <defs>
                  <marker id="c-arr-up" markerWidth="5" markerHeight="5" refX="2.5" refY="5" orient="auto">
                    <path d="M0,5 L2.5,0 L5,5 Z" fill="#555"/>
                  </marker>
                  <marker id="c-arr-down" markerWidth="5" markerHeight="5" refX="2.5" refY="0" orient="auto">
                    <path d="M0,0 L2.5,5 L5,0 Z" fill="#555"/>
                  </marker>
                  <marker id="c-arr-gold" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto">
                    <path d="M0,0 L5,2.5 L0,5 Z" fill="#8b7840"/>
                  </marker>
                  <marker id="c-arr-gold-r" markerWidth="5" markerHeight="5" refX="0" refY="2.5" orient="auto">
                    <path d="M5,0 L0,2.5 L5,5 Z" fill="#8b7840"/>
                  </marker>
                </defs>

              </g><!-- end main cross-section -->

              <!-- ================================================================
                   PIN DIAGRAM  (right side of SVG)
                   Shows pin numbering on left and right flange
                   ================================================================ -->
              <g transform="translate(50, 370)">

                <text x="180" y="14" text-anchor="middle"
                  font-size="10" fill="#1a1a2e" font-family="sans-serif" font-weight="700">
                  Pin Assignments
                </text>

                <!-- Left pins (primary side) -->
                <g v-for="(pin, pi) in cd.pins.left" :key="'lpin-'+pi">
                  <circle cx="20" :cy="20 + pi*26" r="9"
                    :fill="pin.color" stroke="#555" stroke-width="1"/>
                  <text x="20" :y="25 + pi*26" text-anchor="middle"
                    font-size="9" fill="#fff" font-family="monospace" font-weight="700">
                    {{ pin.num }}
                  </text>
                  <line x1="30" :y1="20 + pi*26" x2="55" :y2="20 + pi*26"
                    :stroke="pin.color" stroke-width="1.5"/>
                  <text x="58" :y="24 + pi*26"
                    font-size="8" :fill="pin.color" font-family="monospace">
                    {{ pin.label }}
                  </text>
                </g>

                <!-- Right pins (secondary side) -->
                <g v-for="(pin, pi) in cd.pins.right" :key="'rpin-'+pi">
                  <circle cx="340" :cy="20 + pi*26" r="9"
                    :fill="pin.color" stroke="#555" stroke-width="1"/>
                  <text x="340" :y="25 + pi*26" text-anchor="middle"
                    font-size="9" fill="#fff" font-family="monospace" font-weight="700">
                    {{ pin.label }}
                  </text>
                  <line x1="300" :y1="20 + pi*26" x2="328" :y2="20 + pi*26"
                    :stroke="pin.color" stroke-width="1.5"/>
                  <text x="296" :y="24 + pi*26" text-anchor="end"
                    font-size="8" :fill="pin.color" font-family="monospace">
                    {{ pin.winding }}
                  </text>
                </g>

              </g><!-- end pin diagram -->

              <!-- ================================================================
                   LAYER LEGEND  (bottom of SVG)
                   ================================================================ -->
              <g transform="translate(60, 440)">
                <g v-for="(leg, li) in cd.legend" :key="'cleg-'+li">
                  <rect :x="li * 200" y="0" width="16" height="12"
                    :fill="leg.color" rx="2" :fill-opacity="0.7"
                    :stroke="leg.color" stroke-width="1"/>
                  <text :x="li * 200 + 22" y="10"
                    font-size="9" fill="#333" font-family="sans-serif">
                    {{ leg.label }}
                  </text>
                </g>
                <!-- Key: insulation tape -->
                <rect x="600" y="0" width="16" height="12" fill="#f0c840" rx="2" opacity="0.75"/>
                <text x="622" y="10" font-size="9" fill="#333" font-family="sans-serif">
                  Insulation tape ({{ form.isolationClass }})
                </text>
              </g>

            </svg>
          </div><!-- end constr-wrap -->


          <!-- ═══════════════════════════════════════════════════════════════
               DESIGNER VIEW — Professional schematic-style winding diagram
               Shows every winding as a labeled block with dimensions,
               wire spec, current density, and a complete dimensional
               drawing matching what an engineer submits to the magnetics
               vendor.
               ═══════════════════════════════════════════════════════════ -->
          <div v-if="mechView==='designer'" class="dsgn-wrap">
            <svg viewBox="0 0 820 600" class="dsgn-svg" xmlns="http://www.w3.org/2000/svg">

              <!-- White background + border -->
              <rect x="0" y="0" width="820" height="520" fill="#fff" stroke="#ccc" stroke-width="1"/>

              <!-- Title block (bottom-right, engineering drawing style) -->
              <rect x="10" y="510" width="420" height="80" fill="#f5f5f5" stroke="#888" stroke-width="1"/>
              <line x1="10" y1="534" x2="430" y2="534" stroke="#888" stroke-width="0.8"/>
              <line x1="10" y1="552" x2="430" y2="552" stroke="#888" stroke-width="0.8"/>
              <line x1="10" y1="568" x2="430" y2="568" stroke="#888" stroke-width="0.8"/>
              <line x1="220" y1="510" x2="220" y2="590" stroke="#888" stroke-width="0.8"/>
              <text x="18" y="528" font-size="8" fill="#555" font-family="monospace">COMPONENT</text>
              <text x="228" y="528" font-size="8" fill="#555" font-family="monospace">REVISION</text>
              <text x="18" y="547" font-size="9" fill="#1a1a2e" font-family="monospace" font-weight="700">{{ result.core.material }}{{ result.core.name }}</text>
              <text x="228" y="547" font-size="9" fill="#1a1a2e" font-family="monospace">A0</text>
              <text x="18" y="563" font-size="8" fill="#555" font-family="monospace">DRAWN BY</text>
              <text x="228" y="563" font-size="8" fill="#555" font-family="monospace">DATE</text>
              <text x="18" y="580" font-size="9" fill="#1a1a2e" font-family="monospace">FluxForge</text>
              <text x="228" y="580" font-size="9" fill="#1a1a2e" font-family="monospace">{{ new Date().toLocaleDateString() }}</text>
              <text x="18" y="592" font-size="7.5" fill="#888" font-family="monospace">{{ result.core.name }} · Lp={{ result.Lp_uH }}µH · Gap={{ result.gap_mm }}mm</text>

              <!-- Main winding stack diagram (centre) -->
              <!-- Outer core boundary -->
              <rect x="60" y="30" :width="dvData.coreW" height="350"
                fill="none" stroke="#8b7840" stroke-width="2.5" rx="3"/>
              <text :x="60 + dvData.coreW/2" y="24" text-anchor="middle"
                font-size="9" fill="#8b7840" font-family="monospace" font-weight="600">
                CORE: {{ result.core.name }} / {{ result.core.material }}
              </text>

              <!-- Left flange (primary side) -->
              <rect x="60" y="30" :width="dvData.flangeW" height="350"
                fill="#d4b0e8" stroke="#7d3c98" stroke-width="1.2" rx="1"/>
              <text x="63" y="215" font-size="7" fill="#5a1a7a"
                font-family="monospace" writing-mode="tb">PRIMARY SIDE</text>

              <!-- Right flange (secondary side) -->
              <rect :x="60 + dvData.coreW - dvData.flangeW" y="30"
                :width="dvData.flangeW" height="350"
                fill="#d8dce4" stroke="#7a8090" stroke-width="1.2" rx="1"/>
              <text :x="60 + dvData.coreW - dvData.flangeW + 2" y="215"
                font-size="7" fill="#555" font-family="monospace" writing-mode="tb">SECONDARY SIDE</text>

              <!-- Winding stack blocks -->
              <g v-for="(blk, bi) in dvData.blocks" :key="'blk-'+bi">

                <!-- Tape block (gold) -->
                <rect v-if="blk.isTape"
                  :x="60 + dvData.flangeW" :y="blk.y"
                  :width="dvData.windW" :height="blk.h"
                  fill="#f0e050" stroke="#b8a020" stroke-width="0.8" fill-opacity="0.75"/>
                <text v-if="blk.isTape"
                  :x="60 + dvData.flangeW + dvData.windW/2" :y="blk.y + blk.h/2 + 3"
                  text-anchor="middle" font-size="7.5" fill="#7a5c10" font-family="monospace">
                  {{ blk.tapeLabel }}
                </text>

                <!-- Winding block -->
                <rect v-if="!blk.isTape"
                  :x="60 + dvData.flangeW" :y="blk.y"
                  :width="dvData.windW" :height="blk.h"
                  :fill="blk.color" fill-opacity="0.22"
                  :stroke="blk.color" stroke-width="1.2"/>

                <!-- Hatching lines inside winding block -->
                <g v-if="!blk.isTape" v-for="hi in blk.hatchLines" :key="'h'+bi+'-'+hi">
                  <line :x1="60 + dvData.flangeW + hi*14"
                        :y1="blk.y + 2"
                        :x2="60 + dvData.flangeW + hi*14 - 12"
                        :y2="blk.y + blk.h - 2"
                        :stroke="blk.color" stroke-width="0.6" opacity="0.35"/>
                </g>

                <!-- Winding label (left side, outside flange) -->
                <text v-if="!blk.isTape"
                  x="52" :y="blk.y + blk.h/2 + 4"
                  font-size="8" :fill="blk.color"
                  text-anchor="end" font-family="sans-serif" font-weight="600">
                  {{ blk.shortLabel }}
                </text>

                <!-- Dimension tick + height annotation (right side) -->
                <line v-if="!blk.isTape"
                  :x1="60 + dvData.coreW + 5" :y1="blk.y"
                  :x2="60 + dvData.coreW + 20" :y2="blk.y"
                  stroke="#555" stroke-width="0.8"/>
                <line v-if="!blk.isTape"
                  :x1="60 + dvData.coreW + 5" :y1="blk.y + blk.h"
                  :x2="60 + dvData.coreW + 20" :y2="blk.y + blk.h"
                  stroke="#555" stroke-width="0.8"/>
                <line v-if="!blk.isTape"
                  :x1="60 + dvData.coreW + 14" :y1="blk.y"
                  :x2="60 + dvData.coreW + 14" :y2="blk.y + blk.h"
                  stroke="#555" stroke-width="0.8"/>
                <text v-if="!blk.isTape"
                  :x="60 + dvData.coreW + 28" :y="blk.y + blk.h/2 + 4"
                  font-size="7.5" fill="#333" font-family="monospace">
                  {{ blk.heightMm }}mm
                </text>
              </g>

              <!-- Spec table (right of diagram) -->
              <g transform="translate(445, 30)">
                <rect x="0" y="0" width="365" height="380" fill="#f9f9fa" stroke="#ccc" stroke-width="1" rx="3"/>
                <text x="182" y="18" text-anchor="middle" font-size="10" fill="#1a1a2e" font-family="sans-serif" font-weight="700">WINDING SPECIFICATION</text>
                <line x1="0" y1="24" x2="365" y2="24" stroke="#ccc" stroke-width="1"/>

                <!-- Column headers -->
                <text x="6"   y="38" font-size="7.5" fill="#555" font-family="monospace" font-weight="700">WINDING</text>
                <text x="82"  y="38" font-size="7.5" fill="#555" font-family="monospace" font-weight="700">TURNS</text>
                <text x="116" y="38" font-size="7.5" fill="#555" font-family="monospace" font-weight="700">AWG</text>
                <text x="148" y="38" font-size="7.5" fill="#555" font-family="monospace" font-weight="700">×STR</text>
                <text x="178" y="38" font-size="7.5" fill="#555" font-family="monospace" font-weight="700">IRMS(A)</text>
                <text x="228" y="38" font-size="7.5" fill="#555" font-family="monospace" font-weight="700">DCR(mΩ)</text>
                <line x1="0" y1="44" x2="270" y2="44" stroke="#ccc" stroke-width="0.8"/>

                <g v-for="(w, wi) in result.windings" :key="'ws-'+wi">
                  <rect x="0" :y="48 + wi*24" width="270" height="24"
                    :fill="wi%2===0 ? '#fff' : '#f4f6fc'" stroke="none"/>
                  <rect x="0" :y="48 + wi*24" width="4" height="24" :fill="w.color"/>
                  <text x="10"  :y="64 + wi*24" font-size="8" fill="#1a1a2e" font-family="sans-serif">{{ w.name }}</text>
                  <text x="82"  :y="64 + wi*24" font-size="8.5" fill="#1a1a2e" font-family="monospace" font-weight="700">{{ w.turns }}</text>
                  <text x="116" :y="64 + wi*24" font-size="8" fill="#1a1a2e" font-family="monospace">{{ w.awg }}</text>
                  <text x="148" :y="64 + wi*24" font-size="8" fill="#1a1a2e" font-family="monospace">{{ w.strands }}</text>
                  <text x="178" :y="64 + wi*24" font-size="8" fill="#1a1a2e" font-family="monospace">{{ w.Irms }}</text>
                  <text x="228" :y="64 + wi*24" font-size="8" fill="#1a1a2e" font-family="monospace">{{ w.DCR_mohm }}</text>
                </g>

                <line x1="0" :y1="52 + result.windings.length*24" x2="270" :y2="52 + result.windings.length*24" stroke="#ccc" stroke-width="1"/>

                <!-- Core parameters -->
                <g v-for="(row, ri) in dvData.coreParams" :key="'cp-'+ri">
                  <text x="6"   :y="66 + result.windings.length*24 + ri*16" font-size="8" fill="#555" font-family="monospace">{{ row.label }}</text>
                  <text x="160" :y="66 + result.windings.length*24 + ri*16" font-size="8" fill="#1a1a2e" font-family="monospace" font-weight="600">{{ row.value }}</text>
                </g>
              </g>

              <!-- Dimension line: total window height (left of diagram) -->
              <line x1="42" y1="30" x2="42" y2="380" stroke="#555" stroke-width="1"
                marker-start="url(#dv-arr)" marker-end="url(#dv-arr-d)"/>
              <text x="6" y="210" font-size="8" fill="#555" font-family="monospace"
                writing-mode="tb">BW = {{ dvData.bwMm }}mm</text>

              <!-- Dimension line: core width -->
              <line :x1="60" y1="395" :x2="60 + dvData.coreW" y2="395" stroke="#8b7840" stroke-width="1"
                marker-start="url(#dv-arr-g)" marker-end="url(#dv-arr-gd)"/>
              <text :x="60 + dvData.coreW/2" y="408" text-anchor="middle"
                font-size="8" fill="#8b7840" font-family="monospace">{{ result.core.name }} (Le={{ result.core.Le_mm }}mm)</text>

              <defs>
                <marker id="dv-arr"   markerWidth="5" markerHeight="5" refX="2.5" refY="5" orient="auto"><path d="M0,5 L2.5,0 L5,5 Z" fill="#555"/></marker>
                <marker id="dv-arr-d" markerWidth="5" markerHeight="5" refX="2.5" refY="0" orient="auto"><path d="M0,0 L2.5,5 L5,0 Z" fill="#555"/></marker>
                <marker id="dv-arr-g" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#8b7840"/></marker>
                <marker id="dv-arr-gd" markerWidth="5" markerHeight="5" refX="0" refY="2.5" orient="auto"><path d="M5,0 L0,2.5 L5,5 Z" fill="#8b7840"/></marker>
              </defs>

            </svg>
          </div><!-- end dsgn-wrap -->

          <!-- ═══════════════════════════════════════════════════════════════
               FOUNDRY VIEW — Manufacturing drawing with tolerances,
               materials spec, part numbers, and production notes.
               Format matches what is sent to a magnetics manufacturer.
               ═══════════════════════════════════════════════════════════ -->
          <div v-if="mechView==='foundry'" class="foundry-wrap">
            <svg viewBox="0 0 1060 580" class="foundry-svg" xmlns="http://www.w3.org/2000/svg">

              <!-- Drawing border (title block style) -->
              <rect x="2" y="2" width="816" height="576" fill="#fff" stroke="#222" stroke-width="2"/>
              <rect x="8" y="8" width="804" height="564" fill="#fff" stroke="#555" stroke-width="0.8"/>

              <!-- Title block -->
              <rect x="290" y="462" width="760" height="114" fill="#f0f0f0" stroke="#333" stroke-width="1.5"/>
              <line x1="290" y1="492" x2="1050" y2="492" stroke="#333" stroke-width="1"/>
              <line x1="290" y1="518" x2="1050" y2="518" stroke="#333" stroke-width="1"/>
              <line x1="290" y1="544" x2="1050" y2="544" stroke="#333" stroke-width="1"/>
              <line x1="670" y1="462" x2="670" y2="576" stroke="#333" stroke-width="1"/>
              <text x="298" y="482" font-size="7.5" fill="#333" font-family="monospace">TITLE</text>
              <text x="678" y="482" font-size="7.5" fill="#333" font-family="monospace">PART NUMBER</text>
              <text x="298" y="510" font-size="9.5" fill="#1a1a2e" font-family="sans-serif" font-weight="700">
                Flyback Transformer
              </text>
              <text x="678" y="510" font-size="9" fill="#1a1a2e" font-family="monospace">
                {{ result.core.material }}{{ result.core.name }}-{{ result.Al_eff_nH }}
              </text>
              <text x="298" y="530" font-size="7.5" fill="#333" font-family="monospace">MATERIAL</text>
              <text x="678" y="530" font-size="7.5" fill="#333" font-family="monospace">STANDARD</text>
              <text x="298" y="548" font-size="8.5" fill="#1a1a2e" font-family="monospace">{{ form.coreMaterial }} ferrite</text>
              <text x="678" y="548" font-size="8.5" fill="#1a1a2e" font-family="monospace">IEC 62368-1</text>
              <text x="298" y="566" font-size="7.5" fill="#555" font-family="monospace">
                FluxForge v1.0  ·  {{ new Date().toLocaleDateString() }}
              </text>

              <!-- GENERAL NOTES section -->
              <text x="14" y="480" font-size="9" fill="#1a1a2e" font-family="sans-serif" font-weight="700">GENERAL NOTES</text>
              <g v-for="(note, ni) in fdData.notes" :key="'fn-'+ni">
                <text :x="14" :y="496 + ni*16" font-size="8" fill="#333" font-family="monospace">
                  {{ ni+1 }}. {{ note }}
                </text>
              </g>

              <!-- Core assembly drawing (centre-left) -->
              <g transform="translate(14, 14)">

                <!-- Core outer boundary with phantom lines for hidden edges -->
                <rect x="40" y="10" :width="fdData.coreW" height="380"
                  fill="none" stroke="#1a1a2e" stroke-width="2" rx="2"/>

                <!-- Centre post (solid fill with cross-hatch) -->
                <rect :x="40 + fdData.flangeW + fdData.windW/2 - fdData.postW/2" y="10"
                  :width="fdData.postW" height="25"
                  fill="#e8d8a0" stroke="#8b7840" stroke-width="1.5"/>
                <rect :x="40 + fdData.flangeW + fdData.windW/2 - fdData.postW/2"
                      :y="10 + 380 - 25"
                  :width="fdData.postW" height="25"
                  fill="#e8d8a0" stroke="#8b7840" stroke-width="1.5"/>

                <!-- Core cross-hatch (ANSI material symbol for ferrite) -->
                <clipPath id="fd-core-clip">
                  <rect x="40" y="10" :width="fdData.flangeW" height="380"/>
                </clipPath>
                <clipPath id="fd-core-clip-r">
                  <rect :x="40 + fdData.coreW - fdData.flangeW" y="10" :width="fdData.flangeW" height="380"/>
                </clipPath>
                <g v-for="hi in 24" :key="'fch-'+hi" clip-path="url(#fd-core-clip)">
                  <line :x1="40 - 10 + hi*9" y1="10" :x2="40 - 10 + hi*9 - 35" y2="390"
                    stroke="#8b7840" stroke-width="0.7" opacity="0.5"/>
                </g>
                <g v-for="hi in 24" :key="'fch2-'+hi" clip-path="url(#fd-core-clip-r)">
                  <line :x1="40 + fdData.coreW - fdData.flangeW - 10 + hi*9" y1="10"
                        :x2="40 + fdData.coreW - fdData.flangeW - 10 + hi*9 - 35" y2="390"
                    stroke="#8b7840" stroke-width="0.7" opacity="0.5"/>
                </g>

                <!-- Winding blocks with ANSI hatching -->
                <g v-for="(blk, bi) in fdData.blocks" :key="'fblk-'+bi">
                  <rect v-if="blk.isTape"
                    :x="40 + fdData.flangeW" :y="blk.y + 10"
                    :width="fdData.windW" :height="blk.h"
                    fill="#fff8b0" stroke="#c8a020" stroke-width="0.8"/>
                  <text v-if="blk.isTape"
                    :x="40 + fdData.flangeW + fdData.windW/2" :y="blk.y + 10 + blk.h/2 + 3"
                    text-anchor="middle" font-size="7" fill="#7a5c10" font-family="monospace">
                    INSUL. TAPE {{ blk.tapeLabel }}
                  </text>

                  <rect v-if="!blk.isTape"
                    :x="40 + fdData.flangeW" :y="blk.y + 10"
                    :width="fdData.windW" :height="blk.h"
                    fill="#fff" stroke="#1a1a2e" stroke-width="1"/>
                  <!-- ANSI wire hatching (45° cross-hatch) -->
                  <clipPath v-if="!blk.isTape" :id="'fdwclip-'+bi">
                    <rect :x="40 + fdData.flangeW" :y="blk.y + 10"
                      :width="fdData.windW" :height="blk.h"/>
                  </clipPath>
                  <g v-if="!blk.isTape" v-for="hj in blk.hatchCount" :key="'fwh-'+bi+'-'+hj"
                    :clip-path="'url(#fdwclip-'+bi+')'">
                    <line :x1="40 + fdData.flangeW - 20 + hj*8" :y1="blk.y + 10"
                          :x2="40 + fdData.flangeW - 20 + hj*8 + blk.h" :y2="blk.y + 10 + blk.h"
                          :stroke="blk.color" stroke-width="0.6" opacity="0.4"/>
                  </g>

                  <!-- Callout circle + leader to spec table -->
                  <circle v-if="!blk.isTape"
                    :cx="40 + fdData.flangeW + fdData.windW + 12"
                    :cy="blk.y + 10 + blk.h/2"
                    r="9" fill="white" :stroke="blk.color" stroke-width="1.5"/>
                  <text v-if="!blk.isTape"
                    :x="40 + fdData.flangeW + fdData.windW + 12"
                    :y="blk.y + 10 + blk.h/2 + 4"
                    text-anchor="middle" font-size="8" :fill="blk.color"
                    font-family="monospace" font-weight="700">
                    {{ blk.callout }}
                  </text>
                  <line v-if="!blk.isTape"
                    :x1="40 + fdData.flangeW + fdData.windW + 21"
                    :y1="blk.y + 10 + blk.h/2"
                    x2="290" :y2="blk.y + 10 + blk.h/2"
                    :stroke="blk.color" stroke-width="0.8" stroke-dasharray="3,2"/>
                </g>

                <!-- Gap dimension detail -->
                <line :x1="40 + fdData.flangeW + fdData.windW/2 - fdData.postW/2 - 8" y1="35"
                      :x2="40 + fdData.flangeW + fdData.windW/2 + fdData.postW/2 + 8" y2="35"
                      stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="4,2"/>
                <text :x="40 + fdData.flangeW + fdData.windW/2" y="28"
                  text-anchor="middle" font-size="7.5" fill="#e74c3c" font-family="monospace" font-weight="700">
                  GAP = {{ result.gap_mm }}mm ±0.03mm
                </text>

                <!-- Height dimension -->
                <line x1="28" y1="10" x2="28" y2="390" stroke="#333" stroke-width="0.8"
                  marker-start="url(#fd-a1)" marker-end="url(#fd-a2)"/>
                <text x="6" y="205" font-size="8" fill="#333" font-family="monospace" writing-mode="tb">
                  BW = {{ fdData.bwMm }} mm
                </text>
                <!-- Width dimension -->
                <line :x1="40" y1="398" :x2="40 + fdData.coreW" y2="398" stroke="#333" stroke-width="0.8"
                  marker-start="url(#fd-a3)" marker-end="url(#fd-a4)"/>
                <text :x="40 + fdData.coreW/2" y="412" text-anchor="middle"
                  font-size="8" fill="#333" font-family="monospace">
                  {{ result.core.Le_mm }} mm
                </text>

                <defs>
                  <marker id="fd-a1" markerWidth="5" markerHeight="5" refX="2.5" refY="5" orient="auto"><path d="M0,5 L2.5,0 L5,5 Z" fill="#333"/></marker>
                  <marker id="fd-a2" markerWidth="5" markerHeight="5" refX="2.5" refY="0" orient="auto"><path d="M0,0 L2.5,5 L5,0 Z" fill="#333"/></marker>
                  <marker id="fd-a3" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#333"/></marker>
                  <marker id="fd-a4" markerWidth="5" markerHeight="5" refX="0" refY="2.5" orient="auto"><path d="M5,0 L0,2.5 L5,5 Z" fill="#333"/></marker>
                </defs>

              </g><!-- end core drawing group -->

              <!-- Materials & Spec table (right) -->
              <g transform="translate(290, 14)">
                <rect x="0" y="0" width="760" height="440" fill="#fafafa" stroke="#ccc" stroke-width="1" rx="2"/>
                <text x="380" y="18" text-anchor="middle" font-size="10" fill="#1a1a2e" font-family="sans-serif" font-weight="700">WINDING &amp; MATERIALS SPECIFICATION</text>
                <line x1="0" y1="24" x2="760" y2="24" stroke="#ccc" stroke-width="1"/>

                <!-- Spec rows -->
                <g v-for="(row, ri) in fdData.specRows" :key="'fsr-'+ri">
                  <rect x="0" :y="28 + ri*22" width="760" height="22"
                    :fill="ri%2===0 ? '#fff' : '#f4f6fc'" stroke="none"/>
                  <rect v-if="row.color" x="0" :y="28 + ri*22" width="4" height="22"
                    :fill="row.color"/>
                  <text x="8"   :y="43 + ri*22" font-size="8" fill="#555" font-family="monospace">{{ row.ref }}</text>
                  <text x="50"  :y="43 + ri*22" font-size="8.5" fill="#1a1a2e" font-family="sans-serif" font-weight="600">{{ row.item }}</text>
                  <text x="200" :y="43 + ri*22" font-size="8" fill="#1a1a2e" font-family="monospace">{{ row.spec }}</text>
                  <text x="470" :y="43 + ri*22" font-size="7.5" fill="#555" font-family="monospace">{{ row.tol }}</text>
                  <text x="600" :y="43 + ri*22" font-size="7.5" fill="#555" font-family="monospace">{{ row.std }}</text>
                </g>
              </g>

            </svg>
          </div><!-- end foundry-wrap -->

          <!-- ═══════════════════════════════════════════════════════════════
               3D ISOMETRIC VIEW — Perspective drawing of the wound transformer
               ═══════════════════════════════════════════════════════════ -->
          <div v-if="mechView==='3d'" class="threed-wrap">
            <svg viewBox="0 0 680 480" class="threed-svg" xmlns="http://www.w3.org/2000/svg">

              <rect x="0" y="0" width="680" height="480" fill="#1a1e35"/>
              <text x="340" y="28" text-anchor="middle"
                font-size="11" fill="#c0c8f0" font-family="monospace" font-weight="600">
                3D Isometric View — {{ result.core.name }} Flyback Transformer
              </text>

              <!-- ── Isometric transformer body ─────────────────────────────── -->
              <g transform="translate(120, 60)">

                <!-- Isometric helper: x_iso = x - y*cos(30°), y_iso = -z + (x+y)*sin(30°) -->
                <!-- Core body (bottom E half) — isometric box -->
                <!-- Front face -->
                <polygon :points="i3p(tdData, 0,0,0, tdData.cW,0,0)"
                  fill="#8b7840" stroke="#6b5820" stroke-width="1.5"/>
                <!-- We draw the 3D box as 3 visible faces: front, top, right -->

                <!-- Full isometric transformer boxes -->
                <!-- Bottom core (E half) -->
                <g v-for="(face, fi) in tdData.bottomCore" :key="'bc-'+fi">
                  <polygon :points="face.pts" :fill="face.fill"
                    :stroke="face.stroke" stroke-width="1.2" :opacity="face.opacity"/>
                </g>

                <!-- Top core (E half) -->
                <g v-for="(face, fi) in tdData.topCore" :key="'tc-'+fi">
                  <polygon :points="face.pts" :fill="face.fill"
                    :stroke="face.stroke" stroke-width="1.2" :opacity="face.opacity"/>
                </g>

                <!-- Winding bands on the bobbin (isometric side and top) -->
                <g v-for="(band, bi) in tdData.windBands" :key="'wb-'+bi">
                  <polygon :points="band.pts" :fill="band.fill"
                    :stroke="band.stroke" stroke-width="0.8" :opacity="band.opacity"/>
                </g>

                <!-- Centre post (visible through bobbin window) -->
                <g v-for="(face, fi) in tdData.centrePost" :key="'cp-'+fi">
                  <polygon :points="face.pts" :fill="face.fill"
                    :stroke="face.stroke" stroke-width="0.8" :opacity="face.opacity"/>
                </g>

                <!-- Winding lead wires -->
                <g v-for="(lead, li) in tdData.leads" :key="'ld-'+li">
                  <line :x1="lead.x1" :y1="lead.y1" :x2="lead.x2" :y2="lead.y2"
                    :stroke="lead.color" stroke-width="2" stroke-linecap="round"/>
                  <circle :cx="lead.x2" :cy="lead.y2" r="3.5" :fill="lead.color" opacity="0.9"/>
                  <text :x="lead.x2 + lead.lx" :y="lead.y2 + lead.ly"
                    font-size="8" :fill="lead.color" font-family="monospace">{{ lead.label }}</text>
                </g>

                <!-- Gap annotation arrow -->
                <line :x1="tdData.gapArrow.x1" :y1="tdData.gapArrow.y1"
                      :x2="tdData.gapArrow.x2" :y2="tdData.gapArrow.y2"
                      stroke="#e74c3c" stroke-width="1.2" stroke-dasharray="3,2"/>
                <text :x="tdData.gapArrow.tx" :y="tdData.gapArrow.ty"
                  font-size="8" fill="#e74c3c" font-family="monospace">
                  gap {{ result.gap_mm }}mm
                </text>

              </g><!-- end 3D group -->

              <!-- Legend -->
              <g transform="translate(460, 80)">
                <rect x="0" y="0" width="205" height="200" fill="rgba(255,255,255,0.07)"
                  stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="4"/>
                <text x="102" y="18" text-anchor="middle" font-size="9" fill="#c0c8f0"
                  font-family="sans-serif" font-weight="700">Legend</text>
                <g v-for="(leg, li) in tdData.legend" :key="'tleg-'+li">
                  <rect x="10" :y="26 + li*24" width="14" height="14"
                    :fill="leg.color" rx="2" opacity="0.8"/>
                  <text x="30" :y="37 + li*24" font-size="8.5" fill="#c0c8f0" font-family="sans-serif">
                    {{ leg.label }}
                  </text>
                </g>

                <!-- Dimension readout -->
                <text x="10" y="175" font-size="8" fill="#9aa0c8" font-family="monospace">Lp = {{ result.Lp_uH }} µH</text>
                <text x="10" y="190" font-size="8" fill="#9aa0c8" font-family="monospace">Np/Ns = {{ result.Np }}/{{ result.Ns }}</text>
              </g>

              <!-- Isometric axis indicator -->
              <g transform="translate(44, 420)">
                <line x1="0" y1="0" x2="30" y2="-12" stroke="#4f8" stroke-width="1.5"/>
                <line x1="0" y1="0" x2="30" y2="12"  stroke="#f84" stroke-width="1.5"/>
                <line x1="0" y1="0" x2="0"  y2="-28"  stroke="#48f" stroke-width="1.5"/>
                <text x="32" y="-8" font-size="7" fill="#4f8" font-family="monospace">X</text>
                <text x="32" y="16" font-size="7" fill="#f84" font-family="monospace">Y</text>
                <text x="2"  y="-30" font-size="7" fill="#48f" font-family="monospace">Z</text>
              </g>

            </svg>
          </div><!-- end threed-wrap -->

          <!-- ═══════════════════════════════════════════════════════════════
               THERMAL VIEW — Temperature gradient map showing heat
               distribution across all transformer elements.
               ═══════════════════════════════════════════════════════════ -->
          <div v-if="mechView==='thermal'" class="therm-wrap">
            <svg viewBox="0 0 1020 480" class="therm-svg" xmlns="http://www.w3.org/2000/svg">

              <rect x="0" y="0" width="760" height="480" fill="#F4F6F9"/>
              <text x="380" y="28" text-anchor="middle"
                font-size="12" fill="#1A1A1A" font-family="sans-serif" font-weight="700">
                Thermal Map — {{ result.core.name }} (Ta={{ form.Ta }}°C)
              </text>

              <!-- Colour scale bar (right side) -->
              <defs>
                <linearGradient id="therm-grad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%"   stop-color="#1a237e"/>
                  <stop offset="20%"  stop-color="#0066CC"/>
                  <stop offset="40%"  stop-color="#0066A6"/>
                  <stop offset="55%"  stop-color="#4caf50"/>
                  <stop offset="70%"  stop-color="#ffeb3b"/>
                  <stop offset="85%"  stop-color="#ff9800"/>
                  <stop offset="100%" stop-color="#f44336"/>
                </linearGradient>
              </defs>
              <rect x="990" y="50" width="18" height="360" fill="url(#therm-grad)"
                stroke="#555" stroke-width="1" rx="3"/>
              <text x="1012" y="55"  font-size="8" fill="#1A1A1A" font-family="monospace">{{ thermData.tMax }}°C</text>
              <text x="1012" y="230" font-size="8" fill="#1A1A1A" font-family="monospace">{{ Math.round((thermData.tMax+form.Ta)/2) }}°C</text>
              <text x="1012" y="414" font-size="8" fill="#1A1A1A" font-family="monospace">{{ form.Ta }}°C</text>
              <text x="1000" y="430" font-size="8" fill="#9aa0c8" font-family="monospace" text-anchor="middle">°C</text>

              <!-- Thermal cross-section of transformer -->
              <g transform="translate(40, 40)">

                <!-- Core halves (thermal colour by T1 delta) -->
                <!-- Top core -->
                <rect x="30" y="4" :width="thermData.coreW" height="28"
                  :fill="thermData.coreColor" stroke="#555" stroke-width="1" rx="2" opacity="0.9"/>
                <text :x="30 + thermData.coreW/2" y="21" text-anchor="middle"
                  font-size="8" fill="#fff" font-family="monospace" font-weight="600">
                  CORE {{ (form.Ta + result.T1_dT).toFixed(0) }}°C
                </text>

                <!-- Winding thermal bands -->
                <g v-for="(band, bi) in thermData.bands" :key="'tb-'+bi">
                  <rect :x="30 + thermData.flangeW" :y="band.y + 32"
                    :width="thermData.windW" :height="band.h"
                    :fill="band.fill" stroke="#1a1a2e" stroke-width="0.5" opacity="0.92"/>
                  <!-- Temperature readout text inside band -->
                  <text :x="30 + thermData.flangeW + thermData.windW/2"
                        :y="band.y + 32 + band.h/2 + 4"
                    text-anchor="middle" font-size="8.5" :fill="band.textColor"
                    font-family="monospace" font-weight="700">
                    {{ band.tLabel }}
                  </text>
                  <!-- Isothermal gradient lines -->
                  <g v-for="gl in band.gradLines" :key="'gl-'+bi+'-'+gl">
                    <line :x1="30 + thermData.flangeW + gl*18" :y1="band.y + 32"
                          :x2="30 + thermData.flangeW + gl*18" :y2="band.y + 32 + band.h"
                      stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
                  </g>
                </g>

                <!-- Flanges -->
                <rect x="30" :y="32" :width="thermData.flangeW" :height="thermData.winH"
                  :fill="thermData.flangeColor" stroke="#555" stroke-width="1" opacity="0.8"/>
                <rect :x="30 + thermData.coreW - thermData.flangeW" y="32"
                  :width="thermData.flangeW" :height="thermData.winH"
                  :fill="thermData.flangeColor" stroke="#555" stroke-width="1" opacity="0.8"/>

                <!-- Bottom core -->
                <rect x="30" :y="32 + thermData.winH" :width="thermData.coreW" height="28"
                  :fill="thermData.coreColor" stroke="#555" stroke-width="1" rx="2" opacity="0.9"/>
                <text :x="30 + thermData.coreW/2" :y="32 + thermData.winH + 18" text-anchor="middle"
                  font-size="8" fill="#fff" font-family="monospace">CORE</text>

                <!-- Hot spot annotations with leader lines -->
                <g v-for="(hs, hi) in thermData.hotSpots" :key="'hs-'+hi">
                  <circle :cx="hs.cx" :cy="hs.cy" r="6" :fill="hs.color" opacity="0.9"
                    stroke="#fff" stroke-width="1"/>
                  <line :x1="hs.cx" :y1="hs.cy" :x2="hs.lx" :y2="hs.ly"
                    stroke="#fff" stroke-width="0.8"/>
                  <rect :x="hs.lx" :y="hs.ly - 9" :width="hs.boxW" height="18"
                    fill="#1a1e35" stroke="#555" stroke-width="0.8" rx="2"/>
                  <text :x="hs.lx + 5" :y="hs.ly + 4" font-size="8" :fill="hs.color"
                    font-family="monospace" font-weight="700">{{ hs.label }}</text>
                </g>

              </g><!-- end thermal group -->

              <!-- Thermal resistance table (right) -->
              <g transform="translate(480,50)">
                <rect x="0" y="0" width="490" height="250" fill="rgba(255,255,255,0.05)"
                  stroke="rgba(255,255,255,0.15)" stroke-width="1" rx="4"/>
                <text x="245" y="18" text-anchor="middle" font-size="9.5" fill="#c0c8f0"
                  font-family="sans-serif" font-weight="700">Thermal Budget</text>
                <line x1="0" y1="24" x2="490" y2="24" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
                <g v-for="(row, ri) in thermData.table" :key="'tr-'+ri">
                  <rect x="0" :y="28+ri*26" width="490" height="26"
                    :fill="ri%2===0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)'"/>
                  <text x="8"   :y="45+ri*26" font-size="8" fill="#9aa0c8" font-family="monospace">{{ row.comp }}</text>
                  <text x="160" :y="45+ri*26" font-size="9" :fill="row.color" font-family="monospace" font-weight="700">{{ row.tj }}°C</text>
                  <text x="250" :y="45+ri*26" font-size="7.5" fill="#6a7090" font-family="monospace">{{ row.margin }}</text>
                </g>

                <!-- Status banner -->
                <rect x="5" y="260" width="480" height="32" rx="4"
                  :fill="result.thermal.pass ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'"
                  :stroke="result.thermal.pass ? '#38A169' : '#0066A6'" stroke-width="1.5"/>
                <text x="245" y="281" text-anchor="middle" font-size="10" font-weight="700"
                  :fill="result.thermal.pass ? '#4ade80' : '#f87171'" font-family="sans-serif">
                  THERMAL: {{ result.thermal.pass ? 'PASS ✓' : 'FAIL ✕' }}
                </text>

                <!-- Loss breakdown mini-bar chart -->
                <text x="8" y="318" font-size="8.5" fill="#c0c8f0" font-family="sans-serif" font-weight="700">Loss Sources (W)</text>
                <g v-for="(item, ii) in thermData.lossChart" :key="'lc-'+ii">
                  <text x="8"   :y="334+ii*18" font-size="7.5" fill="#9aa0c8" font-family="monospace">{{ item.label }}</text>
                  <rect x="80" :y="324+ii*18" :width="item.barW" height="10"
                    :fill="item.color" rx="2" opacity="0.8"/>
                  <text :x="82 + item.barW" :y="334+ii*18" font-size="7.5" fill="#c0c8f0" font-family="monospace">{{ item.val }}W</text>
                </g>
              </g>

            </svg>
          </div><!-- end therm-wrap -->


          <!-- ═══════════════════════════════════════════════════════════════
               DIMENSIONS VIEW — Actual-size orthographic drawing with full
               dimensional annotations. Shows front/side/top views of the
               assembled transformer with all key measurements in mm.
               A 1:1 scale indicator lets the user verify physical size.
               ═══════════════════════════════════════════════════════════ -->
          <div v-if="mechView==='dimensions'" class="dims-wrap">
            <div class="dims-scale-bar">
              <span class="dims-scale-label">Scale 1:1 @ 96dpi — ruler check:</span>
              <div class="dims-ruler" :style="{width: (25.4 * dimData.scalePx) + 'px'}">
                <div class="dims-ruler-inner"></div>
                <span>25mm</span>
              </div>
              <span class="dims-scale-hint">Core: {{ result.core.name }} — {{ result.core.material }}</span>
            </div>
            <svg :viewBox="'0 0 ' + dimData.svgW + ' ' + dimData.svgH"
                 class="dims-svg"
                 xmlns="http://www.w3.org/2000/svg">

              <!-- Grid (subtle) -->
              <defs>
                <pattern id="dims-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
                </pattern>
                <!-- Arrowhead markers -->
                <marker id="da-r" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,1 L5,3 L0,5 Z" fill="#1a56c8"/>
                </marker>
                <marker id="da-l" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
                  <path d="M5,1 L0,3 L5,5 Z" fill="#1a56c8"/>
                </marker>
                <marker id="da-rg" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,1 L5,3 L0,5 Z" fill="#e74c3c"/>
                </marker>
                <marker id="da-lg" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
                  <path d="M5,1 L0,3 L5,5 Z" fill="#e74c3c"/>
                </marker>
              </defs>
              <rect x="0" y="0" :width="dimData.svgW" :height="dimData.svgH" fill="url(#dims-grid)"/>
              <rect x="0" y="0" :width="dimData.svgW" :height="dimData.svgH" fill="none" stroke="#ccc" stroke-width="1"/>

              <!-- ══ FRONT VIEW (left side) ══════════════════════════════════ -->
              <text :x="dimData.frontX + dimData.coreAw/2" :y="dimData.viewLabelY"
                text-anchor="middle" font-size="10" fill="#333"
                font-family="sans-serif" font-weight="700">FRONT VIEW</text>

              <!-- Core outline (front) -->
              <rect :x="dimData.frontX" :y="dimData.viewY"
                :width="dimData.coreAw" :height="dimData.coreHw"
                fill="#f5f0e0" stroke="#555" stroke-width="1.5" rx="1"/>

              <!-- Left outer limb (front view) -->
              <rect :x="dimData.frontX" :y="dimData.viewY"
                :width="dimData.limbW" :height="dimData.coreHw"
                fill="#c8a84a" stroke="#8b6914" stroke-width="1.2" opacity="0.7"/>

              <!-- Right outer limb (front view) -->
              <rect :x="dimData.frontX + dimData.coreAw - dimData.limbW" :y="dimData.viewY"
                :width="dimData.limbW" :height="dimData.coreHw"
                fill="#c8a84a" stroke="#8b6914" stroke-width="1.2" opacity="0.7"/>

              <!-- Centre post with gap (front view) -->
              <rect :x="dimData.frontX + dimData.coreAw/2 - dimData.postW/2" :y="dimData.viewY"
                :width="dimData.postW" :height="dimData.coreHw/2 - dimData.gapPx/2"
                fill="#d4b460" stroke="#8b6914" stroke-width="1" opacity="0.85"/>
              <rect :x="dimData.frontX + dimData.coreAw/2 - dimData.postW/2"
                    :y="dimData.viewY + dimData.coreHw/2 + dimData.gapPx/2"
                :width="dimData.postW" :height="dimData.coreHw/2 - dimData.gapPx/2"
                fill="#d4b460" stroke="#8b6914" stroke-width="1" opacity="0.85"/>
              <!-- Gap line (red) -->
              <line :x1="dimData.frontX + dimData.coreAw/2 - dimData.postW/2 - 4"
                    :y1="dimData.viewY + dimData.coreHw/2"
                    :x2="dimData.frontX + dimData.coreAw/2 + dimData.postW/2 + 4"
                    :y2="dimData.viewY + dimData.coreHw/2"
                stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="4,2"/>

              <!-- Winding area (front view, bobbin window) -->
              <rect :x="dimData.frontX + dimData.limbW" :y="dimData.viewY + dimData.coreTopH"
                :width="dimData.winAreaW" :height="dimData.winAreaH"
                fill="none" stroke="#888" stroke-width="0.8" stroke-dasharray="3,2"/>
              <!-- Winding colour fill bands -->
              <g v-for="(fb, fbi) in dimData.frontBands" :key="'fb-'+fbi">
                <rect :x="dimData.frontX + dimData.limbW + 1"
                      :y="dimData.viewY + dimData.coreTopH + fb.y"
                  :width="dimData.winAreaW - 2" :height="fb.h"
                  :fill="fb.color" :fill-opacity="0.3"
                  :stroke="fb.color" stroke-width="0.5"/>
              </g>

              <!-- ── Dimension lines: FRONT VIEW ─────────────────────────── -->
              <!-- A: Overall width -->
              <line :x1="dimData.frontX" :y1="dimData.viewY + dimData.coreHw + 18"
                    :x2="dimData.frontX + dimData.coreAw" :y2="dimData.viewY + dimData.coreHw + 18"
                stroke="#1a56c8" stroke-width="1"
                marker-start="url(#da-l)" marker-end="url(#da-r)"/>
              <text :x="dimData.frontX + dimData.coreAw/2" :y="dimData.viewY + dimData.coreHw + 32"
                text-anchor="middle" font-size="9" fill="#1a56c8" font-family="monospace" font-weight="700">
                A = {{ dimData.dims.A }} mm
              </text>

              <!-- H: Overall height -->
              <line :x1="dimData.frontX - 22" :y1="dimData.viewY"
                    :x2="dimData.frontX - 22" :y2="dimData.viewY + dimData.coreHw"
                stroke="#1a56c8" stroke-width="1"
                marker-start="url(#da-r)" marker-end="url(#da-l)"/>
              <text :x="dimData.frontX - 32" :y="dimData.viewY + dimData.coreHw/2 + 4"
                font-size="9" fill="#1a56c8" font-family="monospace" font-weight="700"
                text-anchor="end" writing-mode="lr">H={{ dimData.dims.H }}mm</text>

              <!-- E: Window length -->
              <line :x1="dimData.frontX + dimData.limbW"
                    :y1="dimData.viewY + dimData.coreHw + 36"
                    :x2="dimData.frontX + dimData.limbW + dimData.winAreaW"
                    :y2="dimData.viewY + dimData.coreHw + 36"
                stroke="#38A169" stroke-width="1"
                marker-start="url(#da-l)" marker-end="url(#da-r)"/>
              <text :x="dimData.frontX + dimData.limbW + dimData.winAreaW/2"
                    :y="dimData.viewY + dimData.coreHw + 49"
                text-anchor="middle" font-size="9" fill="#38A169" font-family="monospace">
                E = {{ dimData.dims.E }} mm
              </text>

              <!-- D: Window height -->
              <line :x1="dimData.frontX + dimData.coreAw + 14"
                    :y1="dimData.viewY + dimData.coreTopH"
                    :x2="dimData.frontX + dimData.coreAw + 14"
                    :y2="dimData.viewY + dimData.coreTopH + dimData.winAreaH"
                stroke="#38A169" stroke-width="1"
                marker-start="url(#da-r)" marker-end="url(#da-l)"/>
              <text :x="dimData.frontX + dimData.coreAw + 26"
                    :y="dimData.viewY + dimData.coreTopH + dimData.winAreaH/2 + 4"
                font-size="9" fill="#38A169" font-family="monospace">D={{ dimData.dims.D }}mm</text>

              <!-- F: Centre post width -->
              <line :x1="dimData.frontX + dimData.coreAw/2 - dimData.postW/2"
                    :y1="dimData.viewY - 14"
                    :x2="dimData.frontX + dimData.coreAw/2 + dimData.postW/2"
                    :y2="dimData.viewY - 14"
                stroke="#7c3aed" stroke-width="1"
                marker-start="url(#da-l)" marker-end="url(#da-r)"/>
              <text :x="dimData.frontX + dimData.coreAw/2" :y="dimData.viewY - 18"
                text-anchor="middle" font-size="8.5" fill="#7c3aed" font-family="monospace">
                F={{ dimData.dims.F }}mm
              </text>

              <!-- Gap callout -->
              <line :x1="dimData.frontX + dimData.coreAw/2 + dimData.postW/2 + 6"
                    :y1="dimData.viewY + dimData.coreHw/2"
                    :x2="dimData.frontX + dimData.coreAw + 40"
                    :y2="dimData.viewY + dimData.coreHw/2 - 25"
                stroke="#e74c3c" stroke-width="0.8"/>
              <text :x="dimData.frontX + dimData.coreAw + 44"
                    :y="dimData.viewY + dimData.coreHw/2 - 28"
                font-size="8" fill="#e74c3c" font-family="monospace" font-weight="700">
                Gap={{ result.gap_mm }}mm
              </text>
              <text :x="dimData.frontX + dimData.coreAw + 44"
                    :y="dimData.viewY + dimData.coreHw/2 - 16"
                font-size="7.5" fill="#e74c3c" font-family="monospace">Al={{ result.Al_eff_nH }}nH/T²</text>

              <!-- ══ SIDE VIEW (right side) ══════════════════════════════════ -->
              <text :x="dimData.sideX + dimData.coreBw/2" :y="dimData.viewLabelY"
                text-anchor="middle" font-size="10" fill="#333"
                font-family="sans-serif" font-weight="700">SIDE VIEW</text>

              <!-- Core outline (side — B dimension wide) -->
              <rect :x="dimData.sideX" :y="dimData.viewY"
                :width="dimData.coreBw" :height="dimData.coreHw"
                fill="#f5f0e0" stroke="#555" stroke-width="1.5" rx="1"/>

              <!-- Top and bottom bars (C dimension) -->
              <rect :x="dimData.sideX" :y="dimData.viewY"
                :width="dimData.coreBw" :height="dimData.coreTopH"
                fill="#c8a84a" stroke="#8b6914" stroke-width="1" opacity="0.7"/>
              <rect :x="dimData.sideX" :y="dimData.viewY + dimData.coreHw - dimData.coreTopH"
                :width="dimData.coreBw" :height="dimData.coreTopH"
                fill="#c8a84a" stroke="#8b6914" stroke-width="1" opacity="0.7"/>

              <!-- Centre post circle (side view) -->
              <ellipse :cx="dimData.sideX + dimData.coreBw/2"
                       :cy="dimData.viewY + dimData.coreHw/2"
                :rx="dimData.postW/2" :ry="dimData.postW/2"
                fill="#d4b460" stroke="#8b6914" stroke-width="1" opacity="0.85"/>

              <!-- Winding area (side, annular ring) -->
              <ellipse :cx="dimData.sideX + dimData.coreBw/2"
                       :cy="dimData.viewY + dimData.coreHw/2"
                :rx="dimData.coreBw/2 - dimData.limbW/2"
                :ry="dimData.coreBw/2 - dimData.limbW/2"
                fill="none" stroke="#888" stroke-width="0.8" stroke-dasharray="3,2"/>

              <!-- B: Side width dimension -->
              <line :x1="dimData.sideX" :y1="dimData.viewY + dimData.coreHw + 18"
                    :x2="dimData.sideX + dimData.coreBw" :y2="dimData.viewY + dimData.coreHw + 18"
                stroke="#1a56c8" stroke-width="1"
                marker-start="url(#da-l)" marker-end="url(#da-r)"/>
              <text :x="dimData.sideX + dimData.coreBw/2" :y="dimData.viewY + dimData.coreHw + 32"
                text-anchor="middle" font-size="9" fill="#1a56c8" font-family="monospace" font-weight="700">
                B = {{ dimData.dims.B }} mm
              </text>

              <!-- C: Top bar height (one E-half) -->
              <line :x1="dimData.sideX - 16" :y1="dimData.viewY"
                    :x2="dimData.sideX - 16" :y2="dimData.viewY + dimData.coreTopH"
                stroke="#ea7c0a" stroke-width="1"
                marker-start="url(#da-r)" marker-end="url(#da-l)"/>
              <text :x="dimData.sideX - 22" :y="dimData.viewY + dimData.coreTopH/2 + 4"
                font-size="8.5" fill="#ea7c0a" font-family="monospace"
                text-anchor="end">C={{ dimData.dims.C }}mm</text>

              <!-- ══ TOP VIEW (bottom of SVG) ════════════════════════════════ -->
              <text :x="dimData.frontX + dimData.coreAw/2" :y="dimData.topViewY - 8"
                text-anchor="middle" font-size="10" fill="#333"
                font-family="sans-serif" font-weight="700">TOP VIEW</text>

              <!-- Core outline (top view — A×B rectangle) -->
              <rect :x="dimData.frontX" :y="dimData.topViewY"
                :width="dimData.coreAw" :height="dimData.coreBw"
                fill="#f5f0e0" stroke="#555" stroke-width="1.5" rx="1"/>

              <!-- Outer limbs (top view) -->
              <rect :x="dimData.frontX" :y="dimData.topViewY"
                :width="dimData.coreAw" :height="dimData.limbW"
                fill="#c8a84a" stroke="#8b6914" stroke-width="1" opacity="0.6"/>
              <rect :x="dimData.frontX" :y="dimData.topViewY + dimData.coreBw - dimData.limbW"
                :width="dimData.coreAw" :height="dimData.limbW"
                fill="#c8a84a" stroke="#8b6914" stroke-width="1" opacity="0.6"/>

              <!-- Centre post (top view) -->
              <rect :x="dimData.frontX + dimData.limbW"
                    :y="dimData.topViewY + dimData.coreBw/2 - dimData.postW/2"
                :width="dimData.winAreaW" :height="dimData.postW"
                fill="#d4b460" stroke="#8b6914" stroke-width="1" opacity="0.8"/>

              <!-- Winding colour bands (top view) -->
              <g v-for="(tb, tbi) in dimData.topBands" :key="'tvb-'+tbi">
                <rect :x="dimData.frontX + dimData.limbW"
                      :y="dimData.topViewY + dimData.coreBw/2 - dimData.postW/2 - tb.offset - tb.h"
                  :width="dimData.winAreaW" :height="tb.h"
                  :fill="tb.color" :fill-opacity="0.3" :stroke="tb.color" stroke-width="0.5"/>
                <rect :x="dimData.frontX + dimData.limbW"
                      :y="dimData.topViewY + dimData.coreBw/2 + dimData.postW/2 + tb.offset"
                  :width="dimData.winAreaW" :height="tb.h"
                  :fill="tb.color" :fill-opacity="0.3" :stroke="tb.color" stroke-width="0.5"/>
              </g>

              <!-- MLT circle (dotted, average winding path) -->
              <ellipse :cx="dimData.frontX + dimData.coreAw/2"
                       :cy="dimData.topViewY + dimData.coreBw/2"
                :rx="dimData.mltR" :ry="dimData.mltR"
                fill="none" stroke="#6b7280" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.5"/>
              <text :x="dimData.frontX + dimData.coreAw/2 + dimData.mltR + 4"
                    :y="dimData.topViewY + dimData.coreBw/2 + 4"
                font-size="7.5" fill="#6b7280" font-family="monospace">MLT={{ result.core.MLT_mm }}mm</text>

              <!-- ══ DIMENSIONS TABLE (right side) ══════════════════════════ -->
              <g :transform="'translate(' + dimData.tableX + ',60)'">
                <rect x="0" y="0" width="230" height="370" fill="#f8f9fc"
                  stroke="#ccc" stroke-width="1" rx="3"/>
                <text x="115" y="18" text-anchor="middle" font-size="10" fill="#1a1a2e"
                  font-family="sans-serif" font-weight="700">DIMENSIONS</text>
                <line x1="0" y1="24" x2="230" y2="24" stroke="#ccc" stroke-width="1"/>

                <!-- Section: Core Physical -->
                <text x="6" y="40" font-size="8.5" fill="#1a56c8" font-family="sans-serif" font-weight="700">Core Physical</text>
                <g v-for="(row, ri) in dimData.physTable" :key="'pt-'+ri">
                  <rect x="0" :y="46+ri*20" width="230" height="20"
                    :fill="ri%2===0 ? '#fff' : '#f0f4fb'"/>
                  <rect x="0" :y="46+ri*20" width="3" height="20" :fill="row.color||'transparent'"/>
                  <text x="8"   :y="60+ri*20" font-size="8.5" fill="#555" font-family="monospace">{{ row.label }}</text>
                  <text x="90"  :y="60+ri*20" font-size="9" fill="#1a1a2e" font-family="monospace" font-weight="700">{{ row.value }}</text>
                  <text x="155" :y="60+ri*20" font-size="7.5" fill="#888" font-family="monospace">{{ row.note }}</text>
                </g>

                <!-- Section: Winding Build -->
                <text x="6" :y="50 + dimData.physTable.length*20 + 16"
                  font-size="8.5" fill="#38A169" font-family="sans-serif" font-weight="700">Winding Build</text>
                <g v-for="(row, ri) in dimData.windTable" :key="'wt-'+ri">
                  <rect x="0" :y="56 + dimData.physTable.length*20 + ri*20" width="230" height="20"
                    :fill="ri%2===0 ? '#fff' : '#f0f4fb'"/>
                  <rect x="0" :y="56 + dimData.physTable.length*20 + ri*20" width="3" height="20" :fill="row.color||'transparent'"/>
                  <text x="8"  :y="70 + dimData.physTable.length*20 + ri*20" font-size="8.5" fill="#555" font-family="monospace">{{ row.label }}</text>
                  <text x="90" :y="70 + dimData.physTable.length*20 + ri*20" font-size="9" fill="#1a1a2e" font-family="monospace" font-weight="700">{{ row.value }}</text>
                  <text x="155":y="70 + dimData.physTable.length*20 + ri*20" font-size="7.5" fill="#888" font-family="monospace">{{ row.note }}</text>
                </g>

                <!-- Footprint summary -->
                <rect x="5" :y="64 + (dimData.physTable.length + dimData.windTable.length)*20"
                  width="220" height="42" fill="#eef3ff" stroke="#1a56c8" stroke-width="1" rx="3"/>
                <text x="115" :y="80 + (dimData.physTable.length + dimData.windTable.length)*20"
                  text-anchor="middle" font-size="9" fill="#1a56c8" font-family="sans-serif" font-weight="700">
                  PCB Footprint
                </text>
                <text x="115" :y="95 + (dimData.physTable.length + dimData.windTable.length)*20"
                  text-anchor="middle" font-size="9" fill="#1a1a2e" font-family="monospace">
                  {{ dimData.dims.A }}mm × {{ dimData.dims.B }}mm × {{ dimData.dims.H }}mm (L×W×H)
                </text>
              </g>

              <!-- Scale bar (bottom left) -->
              <g :transform="'translate(20,' + (dimData.svgH - 35) + ')'">
                <rect x="0" y="0" :width="dimData.scaleBarW" height="8" fill="#1a56c8" opacity="0.7"/>
                <rect :x="dimData.scaleBarW" y="0" :width="dimData.scaleBarW" height="8" fill="#fff" stroke="#1a56c8" stroke-width="0.8"/>
                <text x="0" y="20" font-size="8" fill="#333" font-family="monospace">0</text>
                <text :x="dimData.scaleBarW" y="20" text-anchor="middle" font-size="8" fill="#333" font-family="monospace">10mm</text>
                <text :x="dimData.scaleBarW*2" y="20" text-anchor="end" font-size="8" fill="#333" font-family="monospace">20mm</text>
                <text x="0" y="32" font-size="7.5" fill="#888" font-family="monospace">Scale: 1:1 @ 96dpi</text>
              </g>

            </svg>
          </div><!-- end dims-wrap -->

        </div>
      </div>

      <div class="md-right-col">

      <!-- Panel 2: Windings Info -->
      <div class="md-panel p-winfo">
        <div class="md-panel-title md-title-cyan">
          <span>Windings Info</span>
          <div class="md-title-btns">
            <button class="md-titlebtn">📌</button>
            <button class="md-titlebtn">⬜</button>
          </div>
        </div>
        <div class="md-panel-body wi-body">
          <div class="wi-header">
            Stack Fill Factor: <strong>{{ result.fill_pct }}%</strong>;
            Total Copper Weight: <strong>{{ result.copper_g }}g</strong>
          </div>
          <div v-for="w in result.windings" :key="w.ref"
               class="wi-card" :style="{borderLeftColor: w.color}">
            <div class="wi-line1">
              <span class="wi-color-tag" :style="{background: w.color}"></span>
              <span>{{ w.Lw_pct }}µH;&nbsp;</span>
              <span><strong>{{ w.name }};</strong>&nbsp;</span>
              <span>IRMS = {{ w.Irms }}A;</span>
            </div>
            <div class="wi-line2">
              {{ w.Lw_uH }}L;&nbsp;{{ w.turns }}T;&nbsp;
              {{ w.strands }}x{{ w.awg }} AWG;&nbsp;
              CMA = {{ w.CMA_cmils }} Cmils/A;&nbsp;
              LENw = {{ w.LENw_cm }} cm;
            </div>
          </div>
          <div class="wi-footnote">
            All losses shown correspond to the nominal current limit and primary winding
            inductance at the minimum AC voltage.
          </div>
        </div>
      </div>

      

      <!-- Panel 5: Winding Properties -->
      <div class="md-panel p-windprop">
        <div class="md-panel-title md-title-dark">
          <span>Winding Properties</span>
          <div class="md-title-btns">
            <button class="md-titlebtn md-titlebtn-dk">📌</button>
            <button class="md-titlebtn md-titlebtn-dk">⬜</button>
          </div>
        </div>
        <div class="md-panel-body wp-body">
          <table class="cfp-table">
            <thead>
              <tr>
                <th>Winding</th><th>Turns</th><th>AWG</th>
                <th>×</th><th>Irms (A)</th><th>J (A/mm²)</th>
                <th>DCR (mΩ)</th><th>Fill %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in result.windings" :key="w.ref"
                  :class="w.isPrimary ? 'wp-pri' : w.isBias ? 'wp-bias' : 'wp-sec'">>
                <td>
                  <span class="wp-dot" :style="{background: w.color}"></span>
                  {{ w.name }}
                </td>
                <td>{{ w.turns }}</td>
                <td>{{ w.awg }}</td>
                <td>{{ w.strands }}</td>
                <td>{{ w.Irms }}</td>
                <td :class="w.J_ok ? 'wp-ok' : 'wp-warn'">{{ w.J_Amm2 }}</td>
                <td>{{ w.DCR_mohm }}</td>
                <td>{{ w.area_pct }}%</td>
              </tr>
            </tbody>
          </table>

          <!-- Compliance summary -->
          <div class="wp-compliance">
            <div class="wp-comp-hd">Compliance Checks</div>
            <div v-for="chk in result.checks" :key="chk.name"
                 class="wp-chk" :class="'chk-' + chk.severity">
              <span class="wp-chk-icon">
                {{ chk.severity === 'pass' ? '✓' : chk.severity === 'error' ? '✕' : '⚠' }}
              </span>
              <span class="wp-chk-name">{{ chk.name }}</span>
              <span class="wp-chk-val">{{ chk.detail }}</span>
            </div>
          </div>
        </div>
      </div>

      

      <!-- Panel 6: Instructions -->
      <div class="md-panel p-instr">
        <div class="md-panel-title md-title-dark">
          <span>Instructions</span>
          <div class="md-title-btns">
            <button class="md-titlebtn md-titlebtn-dk">📌</button>
            <button class="md-titlebtn md-titlebtn-dk">⬜</button>
          </div>
        </div>
        <div class="md-panel-body instr-body">

          <!-- Rich-text-style toolbar -->
          <div class="instr-toolbar">
            <button class="it-btn" @click="instrTab='bom'" :class="{'it-active': instrTab==='bom'}">BOM</button>
            <button class="it-btn" @click="instrTab='asm'" :class="{'it-active': instrTab==='asm'}">Assembly</button>
            <button class="it-btn" @click="instrTab='compliance'" :class="{'it-active': instrTab==='compliance'}">Compliance</button>
            <div class="it-sep"></div>
            <span class="it-fmt">B</span>
            <span class="it-fmt it-i">I</span>
            <span class="it-fmt">U</span>
            <span class="it-fmt it-s">S</span>
            <div class="it-sep"></div>
            <span class="it-fmt">¶</span>
            <span class="it-fmt">≡</span>
            <span class="it-fmt">≡</span>
            <span class="it-fmt">❝❞</span>
            <span class="it-fmt">=</span>
            <span class="it-fmt">▦</span>
          </div>

          <!-- BOM Tab -->
          <div v-if="instrTab === 'bom'" class="instr-content">
            <div class="instr-bom-title">LIST OF MATERIALS</div>
            <table class="bom-table">
              <thead>
                <tr><th>Item</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in bomItems" :key="i">
                  <td class="bom-item-num">[{{ i + 1 }}]</td>
                  <td>{{ item }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Assembly Tab -->
          <div v-if="instrTab === 'asm'" class="instr-content">
            <div class="instr-bom-title">ASSEMBLY INSTRUCTIONS</div>
            <div v-for="(step, i) in result.assemblySteps" :key="i" class="asm-step">
              <div class="asm-num">{{ i + 1 }}</div>
              <div class="asm-body">
                <div class="asm-title">{{ step.title }}</div>
                <div class="asm-detail">{{ step.detail }}</div>
                <div v-if="step.spec" class="asm-spec">{{ step.spec }}</div>
              </div>
            </div>
          </div>

          <!-- Compliance Tab -->
          <div v-if="instrTab === 'compliance'" class="instr-content">
            <div class="instr-bom-title">COMPLIANCE CHECKS</div>
            <div v-for="chk in result.checks" :key="chk.name"
                 class="ic-chk" :class="'chk-' + chk.severity">
              <span class="ic-icon">
                {{ chk.severity === 'pass' ? '✓' : chk.severity === 'error' ? '✕' : '⚠' }}
              </span>
              <div class="ic-body">
                <div class="ic-name">{{ chk.name }}</div>
                <div class="ic-detail">{{ chk.detail }}</div>
              </div>
              <span class="ic-std">{{ chk.standard }}</span>
            </div>
          </div>

        </div>
      </div>

      </div><!-- end right col -->

      </div><!-- end row 1 -->

      <!-- ROW 2: Electrical Diagram + Coil Former Properties + Instructions -->
      <div class="md-workspace-row md-row-bot">

      <!-- Panel 3: Electrical Diagram -->
      <div class="md-panel p-elec">
        <div class="md-panel-title md-title-cyan">
          <span>Electrical Diagram</span>
          <div class="md-title-btns">
            <button class="md-titlebtn">📌</button>
            <button class="md-titlebtn">⬜</button>
          </div>
        </div>
        <div class="md-panel-body elec-body">
          <svg viewBox="0 0 560 380" class="elec-svg" xmlns="http://www.w3.org/2000/svg">
            <!-- Title -->
            <text x="280" y="24" text-anchor="middle"
            font-size="11" fill="#111" font-family="monospace" font-weight="600">
              {{ elec.title }}
            </text>

            <!-- Core bars -->
            <line x1="200" y1="30" x2="200" y2="360" stroke="#555" stroke-width="4"/>
            <line x1="208" y1="30" x2="208" y2="360" stroke="#555" stroke-width="4"/>
            <line x1="280" y1="30" x2="280" y2="360" stroke="#555" stroke-width="4"/>
            <line x1="288" y1="30" x2="288" y2="360" stroke="#555" stroke-width="4"/>

            <!-- Left pin connections (primary side) -->
            <g v-for="(pin, i) in elec.leftPins" :key="'lp'+i">
              <text :x="22" :y="pin.y + 4" font-size="10" fill="#333"
                font-family="sans-serif" text-anchor="middle">{{ pin.label }}</text>
              <line :x1="30" :y1="pin.y" x2="199" :y2="pin.y"
                stroke="#555" stroke-width="1.2"/>
            </g>

            <!-- Right pin connections (secondary side) -->
            <g v-for="(pin, i) in elec.rightPins" :key="'rp'+i">
              <text :x="420" :y="pin.y + 4" font-size="10" fill="#333"
                font-family="sans-serif" text-anchor="middle">{{ pin.label }}</text>
              <line :x1="289" :y1="pin.y" x2="400" :y2="pin.y"
                stroke="#555" stroke-width="1.2"/>
            </g>

            <!-- Primary winding arcs (left of core) -->
            <g v-for="(arc, i) in elec.primaryArcs" :key="'pa'+i">
              <path :d="arc" fill="none" stroke="#2563eb" stroke-width="2.5"/>
            </g>

            <!-- Bias winding arcs (left, below primary) -->
            <g v-for="(arc, i) in elec.biasArcsL" :key="'ba'+i">
              <path :d="arc" fill="none" stroke="#ea7c0a" stroke-width="2"/>
            </g>

            <!-- Secondary winding arcs (right of core) -->
            <g v-for="(grp, gi) in elec.secondaryGroups" :key="'sg'+gi">
              <g v-for="(arc, i) in grp.arcs" :key="'sa'+i">
                <path :d="arc" fill="none" :stroke="grp.color" stroke-width="2.5"/>
              </g>
            </g>

            <!-- Polarity dots -->
            <g v-for="(dot, i) in elec.dots" :key="'d'+i">
              <circle :cx="dot.x" :cy="dot.y" r="4" :fill="dot.color"/>
            </g>

            <!-- Winding labels -->
            <g v-for="(lbl, i) in elec.labels" :key="'lb'+i">
              <text :x="lbl.x" :y="lbl.y"
                :fill="lbl.color" font-size="9.5"
                :text-anchor="lbl.anchor || 'middle'"
                font-family="sans-serif" font-weight="600">{{ lbl.line1 }}</text>
              <text v-if="lbl.line2" :x="lbl.x" :y="lbl.y + 13"
                :fill="lbl.color" font-size="8.5"
                :text-anchor="lbl.anchor || 'middle'"
                font-family="monospace">{{ lbl.line2 }}</text>
              <text v-if="lbl.line3" :x="lbl.x" :y="lbl.y + 25"
                :fill="lbl.color" font-size="8"
                :text-anchor="lbl.anchor || 'middle'"
                font-family="monospace">{{ lbl.line3 }}</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Panel 4: Coil Former Properties -->
      <div class="md-panel p-coilprop">
        <div class="md-panel-title md-title-dark">
          <span>Coil Former Properties</span>
          <div class="md-title-btns">
            <button class="md-titlebtn md-titlebtn-dk">📌</button>
            <button class="md-titlebtn md-titlebtn-dk">⬜</button>
          </div>
        </div>
        <div class="md-panel-body cfp-body">
          <table class="cfp-table">
            <tbody>
              <tr v-for="row in coilFormerRows" :key="row.label"
                  :class="row.grayed ? 'cfp-gray' : ''">
                <td class="cfp-label">{{ row.label }}</td>
                <td class="cfp-val">{{ row.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Panel 5: Winding Properties -->
      <div class="md-panel p-windprop">
        <div class="md-panel-title md-title-dark">
          <span>Winding Properties</span>
          <div class="md-title-btns">
            <button class="md-titlebtn md-titlebtn-dk">📌</button>
            <button class="md-titlebtn md-titlebtn-dk">⬜</button>
          </div>
        </div>
        <div class="md-panel-body wp-body">
          <table class="cfp-table">
            <thead>
              <tr>
                <th>Winding</th><th>Turns</th><th>AWG</th>
                <th>×</th><th>Irms (A)</th><th>J (A/mm²)</th>
                <th>DCR (mΩ)</th><th>Fill %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in result.windings" :key="w.ref"
                  :class="w.isPrimary ? 'wp-pri' : w.isBias ? 'wp-bias' : 'wp-sec'">>
                <td>
                  <span class="wp-dot" :style="{background: w.color}"></span>
                  {{ w.name }}
                </td>
                <td>{{ w.turns }}</td>
                <td>{{ w.awg }}</td>
                <td>{{ w.strands }}</td>
                <td>{{ w.Irms }}</td>
                <td :class="w.J_ok ? 'wp-ok' : 'wp-warn'">{{ w.J_Amm2 }}</td>
                <td>{{ w.DCR_mohm }}</td>
                <td>{{ w.area_pct }}%</td>
              </tr>
            </tbody>
          </table>

          <!-- Compliance summary -->
          <div class="wp-compliance">
            <div class="wp-comp-hd">Compliance Checks</div>
            <div v-for="chk in result.checks" :key="chk.name"
                 class="wp-chk" :class="'chk-' + chk.severity">
              <span class="wp-chk-icon">
                {{ chk.severity === 'pass' ? '✓' : chk.severity === 'error' ? '✕' : '⚠' }}
              </span>
              <span class="wp-chk-name">{{ chk.name }}</span>
              <span class="wp-chk-val">{{ chk.detail }}</span>
            </div>
          </div>
        </div>
      </div>

      

      <!-- Panel 6: Instructions -->
      <div class="md-panel p-instr">
        <div class="md-panel-title md-title-dark">
          <span>Instructions</span>
          <div class="md-title-btns">
            <button class="md-titlebtn md-titlebtn-dk">📌</button>
            <button class="md-titlebtn md-titlebtn-dk">⬜</button>
          </div>
        </div>
        <div class="md-panel-body instr-body">

          <!-- Rich-text-style toolbar -->
          <div class="instr-toolbar">
            <button class="it-btn" @click="instrTab='bom'" :class="{'it-active': instrTab==='bom'}">BOM</button>
            <button class="it-btn" @click="instrTab='asm'" :class="{'it-active': instrTab==='asm'}">Assembly</button>
            <button class="it-btn" @click="instrTab='compliance'" :class="{'it-active': instrTab==='compliance'}">Compliance</button>
            <div class="it-sep"></div>
            <span class="it-fmt">B</span>
            <span class="it-fmt it-i">I</span>
            <span class="it-fmt">U</span>
            <span class="it-fmt it-s">S</span>
            <div class="it-sep"></div>
            <span class="it-fmt">¶</span>
            <span class="it-fmt">≡</span>
            <span class="it-fmt">≡</span>
            <span class="it-fmt">❝❞</span>
            <span class="it-fmt">=</span>
            <span class="it-fmt">▦</span>
          </div>

          <!-- BOM Tab -->
          <div v-if="instrTab === 'bom'" class="instr-content">
            <div class="instr-bom-title">LIST OF MATERIALS</div>
            <table class="bom-table">
              <thead>
                <tr><th>Item</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in bomItems" :key="i">
                  <td class="bom-item-num">[{{ i + 1 }}]</td>
                  <td>{{ item }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Assembly Tab -->
          <div v-if="instrTab === 'asm'" class="instr-content">
            <div class="instr-bom-title">ASSEMBLY INSTRUCTIONS</div>
            <div v-for="(step, i) in result.assemblySteps" :key="i" class="asm-step">
              <div class="asm-num">{{ i + 1 }}</div>
              <div class="asm-body">
                <div class="asm-title">{{ step.title }}</div>
                <div class="asm-detail">{{ step.detail }}</div>
                <div v-if="step.spec" class="asm-spec">{{ step.spec }}</div>
              </div>
            </div>
          </div>

          <!-- Compliance Tab -->
          <div v-if="instrTab === 'compliance'" class="instr-content">
            <div class="instr-bom-title">COMPLIANCE CHECKS</div>
            <div v-for="chk in result.checks" :key="chk.name"
                 class="ic-chk" :class="'chk-' + chk.severity">
              <span class="ic-icon">
                {{ chk.severity === 'pass' ? '✓' : chk.severity === 'error' ? '✕' : '⚠' }}
              </span>
              <div class="ic-body">
                <div class="ic-name">{{ chk.name }}</div>
                <div class="ic-detail">{{ chk.detail }}</div>
              </div>
              <span class="ic-std">{{ chk.standard }}</span>
            </div>
          </div>

        </div>
      </div>

      </div><!-- end row 2 -->


    </div><!-- end md-workspace -->

    <!-- ══ CONFIG SCREEN (before first run) ═════════════════════════════════ -->
    <div class="md-config" v-if="!result">
      <div class="cfg-header">
        <div class="cfg-title">Flyback Transformer Design — Configure Parameters</div>
        <div class="cfg-presets">
          <span>Quick Preset:</span>
          <button v-for="p in PRESETS" :key="p.label"
            class="cfg-preset-btn" @click="applyPreset(p.label)">{{ p.label }}</button>
        </div>
      </div>
      <div class="cfg-grid">
        <div class="cfg-section">
          <div class="cfg-sec-title">Power Stage</div>
          <div class="cfg-fields">
            <div class="cfg-f"><label>Vin min (V)</label><input class="cfg-inp" type="number" v-model.number="form.vMin"/></div>
            <div class="cfg-f"><label>Vin max (V)</label><input class="cfg-inp" type="number" v-model.number="form.vMax"/></div>
            <div class="cfg-f"><label>Line freq (Hz)</label>
              <select class="cfg-inp" v-model.number="form.lineFreq">
                <option :value="50">50 Hz</option><option :value="60">60 Hz</option>
              </select>
            </div>
            <div class="cfg-f"><label>Pout (W)</label><input class="cfg-inp" type="number" v-model.number="form.Pout"/></div>
            <div class="cfg-f"><label>η target (%)</label><input class="cfg-inp" type="number" v-model.number="form.eta_target"/></div>
            <div class="cfg-f"><label>fsw (kHz)</label><input class="cfg-inp" type="number" v-model.number="form.fsw_kHz"/></div>
          </div>
        </div>
        <div class="cfg-section">
          <div class="cfg-sec-title">Output Rails
            <button class="cfg-add-btn" @click="addOutput" :disabled="form.outputs.length >= 4">+ Rail</button>
          </div>
          <div v-for="(out, i) in form.outputs" :key="i" class="cfg-out-row">
            <span class="cfg-out-lbl">Rail {{ i+1 }}</span>
            <div class="cfg-f cfg-f-sm"><label>V</label><input class="cfg-inp" type="number" v-model.number="out.voltage" step="0.1"/></div>
            <div class="cfg-f cfg-f-sm"><label>A</label><input class="cfg-inp" type="number" v-model.number="out.current" step="0.01"/></div>
            <span class="cfg-out-pw">= {{ (out.voltage * out.current).toFixed(1) }}W</span>
            <button v-if="form.outputs.length > 1" class="cfg-del-btn" @click="removeOutput(i)">✕</button>
          </div>
        </div>
        <div class="cfg-section">
          <div class="cfg-sec-title">Transformer</div>
          <div class="cfg-fields">
            <div class="cfg-f"><label>IC Family</label>
              <select class="cfg-inp" v-model="form.family">
                <option>HPFC-1</option><option>HPFC-2</option>
                <option>IFC-CE</option><option>IFC-AE</option>
                <option>LPFC-1</option><option>LPFC-2</option>
                <option>PSC-TN</option>
              </select>
            </div>
            <div class="cfg-f"><label>VOR (V)</label><input class="cfg-inp" type="number" v-model.number="form.VOR"/></div>
            <div class="cfg-f"><label>KP</label><input class="cfg-inp" type="number" v-model.number="form.KP" step="0.05"/></div>
            <div class="cfg-f"><label>Winding style</label>
              <select class="cfg-inp" v-model="form.windingStyle">
                <option value="standard">Standard</option>
                <option value="interleaved">Interleaved</option>
              </select>
            </div>
            <div class="cfg-f"><label>Wire type</label>
              <select class="cfg-inp" v-model="form.wireType">
                <option value="solid">Solid</option>
                <option value="litz">Litz</option>
              </select>
            </div>
            <div class="cfg-f"><label>Isolation</label>
              <select class="cfg-inp" v-model="form.isolationClass">
                <option value="basic">Basic</option>
                <option value="supplementary">Supplementary</option>
                <option value="reinforced">Reinforced</option>
              </select>
            </div>
          </div>
        </div>
        <div class="cfg-section">
          <div class="cfg-sec-title">Core &amp; Thermal</div>
          <div class="cfg-fields">
            <div class="cfg-f"><label>Material</label>
              <select class="cfg-inp" v-model="form.coreMaterial">
                <option v-for="m in MATERIALS" :key="m.name" :value="m.name">{{ m.name }} (Bsat {{ m.Bsat_mT }}mT)</option>
              </select>
            </div>
            <div class="cfg-f"><label>Core override</label>
              <select class="cfg-inp" v-model="form.coreOverride">
                <option value="">Auto-select</option>
                <option v-for="c in CORES" :key="c.name" :value="c.name">{{ c.name }}</option>
              </select>
            </div>
            <div class="cfg-f"><label>Ambient T (°C)</label><input class="cfg-inp" type="number" v-model.number="form.Ta"/></div>
            <div class="cfg-f"><label>Max ΔT core (°C)</label><input class="cfg-inp" type="number" v-model.number="form.dT_limit"/></div>
          </div>
        </div>
      </div>
      <div class="cfg-run-row">
        <button class="cfg-run-btn" :disabled="!canDesign" @click="runDesign">▶ Run Design</button>
        <span class="cfg-run-hint" v-if="!canDesign">Fill in all required fields above</span>
      </div>
    </div>

    <!-- Warning bar -->
    <div class="md-warnbar" v-if="result && result.warnings.length">
      <span v-for="w in result.warnings" :key="w.msg"
        class="md-warn-pill" :class="w.level === 'error' ? 'pill-err' : 'pill-warn'">
        {{ w.level === 'error' ? '❌' : '⚠️' }} {{ w.msg }}
      </span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

// ── Material & Core databases ────────────────────────────────────────────────
const MATERIALS = [
  { name:'PC95',  Bsat_mT:410, k:1.00e-4, alpha:2.50, beta:1.30, mfr:'TDK' },
  { name:'N97',   Bsat_mT:430, k:1.10e-4, alpha:2.50, beta:1.35, mfr:'TDK' },
  { name:'N87',   Bsat_mT:400, k:1.30e-4, alpha:2.50, beta:1.40, mfr:'TDK' },
  { name:'3F3',   Bsat_mT:440, k:1.00e-4, alpha:2.50, beta:1.30, mfr:'Ferroxcube' },
  { name:'3C95',  Bsat_mT:410, k:9.00e-5, alpha:2.52, beta:1.28, mfr:'Ferroxcube' },
  { name:'PC44',  Bsat_mT:390, k:1.20e-4, alpha:2.48, beta:1.32, mfr:'TDK' },
  { name:'3C90',  Bsat_mT:380, k:1.15e-4, alpha:2.50, beta:1.35, mfr:'Ferroxcube' },
  { name:'N27',   Bsat_mT:380, k:1.50e-4, alpha:2.45, beta:1.40, mfr:'TDK' },
];
const CORES = [
  // name, series, Ae_mm2, Le_mm, Ve_mm3, Al_nH, Wa_mm2, MLT_mm, Pmax,
  // A(outer L), B(outer W), C(half H), D(win H), E(win L), F(post W), H(full H)
  { name:'EFD12.6', series:'EFD', Ae_mm2:12.4, Le_mm:29.6, Ve_mm3:367,   Al_nH:850,  Wa_mm2:9.2,  MLT_mm:22, Pmax:12,  A:12.6, B:7.4,  C:4.1,  D:3.0,  E:8.6,  F:3.4, H:4.5  },
  { name:'EE13',    series:'EE',  Ae_mm2:17.1, Le_mm:30.2, Ve_mm3:517,   Al_nH:1130, Wa_mm2:10.8, MLT_mm:24, Pmax:18,  A:13.0, B:7.0,  C:5.0,  D:3.8,  E:9.0,  F:3.8, H:5.0  },
  { name:'EE16',    series:'EE',  Ae_mm2:19.0, Le_mm:34.5, Ve_mm3:656,   Al_nH:1140, Wa_mm2:13.5, MLT_mm:28, Pmax:25,  A:16.0, B:9.0,  C:6.0,  D:4.6,  E:11.0, F:4.5, H:6.0  },
  { name:'EE19',    series:'EE',  Ae_mm2:22.0, Le_mm:39.0, Ve_mm3:858,   Al_nH:590,  Wa_mm2:15.6, MLT_mm:30, Pmax:28,  A:19.0, B:8.5,  C:5.0,  D:3.8,  E:10.6, F:4.8, H:4.5  },
  { name:'EFD20',   series:'EFD', Ae_mm2:31.0, Le_mm:42.0, Ve_mm3:1302,  Al_nH:1400, Wa_mm2:22.4, MLT_mm:34, Pmax:40,  A:20.0, B:10.0, C:7.0,  D:4.8,  E:12.6, F:5.2, H:6.0  },
  { name:'EE25',    series:'EE',  Ae_mm2:40.0, Le_mm:52.0, Ve_mm3:2080,  Al_nH:950,  Wa_mm2:29.4, MLT_mm:40, Pmax:55,  A:25.0, B:13.0, C:7.0,  D:5.4,  E:14.5, F:5.8, H:6.5  },
  { name:'EFD25',   series:'EFD', Ae_mm2:52.0, Le_mm:54.0, Ve_mm3:2808,  Al_nH:1900, Wa_mm2:35.5, MLT_mm:42, Pmax:65,  A:25.0, B:13.0, C:9.0,  D:6.2,  E:15.6, F:6.3, H:8.0  },
  { name:'EE30',    series:'EE',  Ae_mm2:60.0, Le_mm:52.0, Ve_mm3:3120,  Al_nH:920,  Wa_mm2:38.0, MLT_mm:48, Pmax:80,  A:30.0, B:15.0, C:7.0,  D:5.4,  E:17.0, F:7.0, H:7.0  },
  { name:'EFD30',   series:'EFD', Ae_mm2:60.0, Le_mm:46.5, Ve_mm3:2790,  Al_nH:1900, Wa_mm2:40.2, MLT_mm:46, Pmax:90,  A:30.0, B:15.0, C:9.0,  D:6.2,  E:18.2, F:6.2, H:8.0  },
  { name:'EE40',    series:'EE',  Ae_mm2:148,  Le_mm:77.0, Ve_mm3:11396, Al_nH:2100, Wa_mm2:89.0, MLT_mm:60, Pmax:150, A:40.0, B:20.0, C:15.0, D:12.0, E:24.0, F:10.0,H:15.0 },
  { name:'ETD29',   series:'ETD', Ae_mm2:76.0, Le_mm:72.0, Ve_mm3:5470,  Al_nH:1700, Wa_mm2:57.0, MLT_mm:52, Pmax:110, A:29.0, B:29.0, C:10.0, D:7.2,  E:18.0, F:8.0, H:10.0 },
  { name:'ETD34',   series:'ETD', Ae_mm2:97.0, Le_mm:78.6, Ve_mm3:7630,  Al_nH:1900, Wa_mm2:74.0, MLT_mm:58, Pmax:160, A:34.0, B:34.0, C:11.0, D:7.8,  E:21.0, F:9.0, H:11.0 },
  { name:'ETD39',   series:'ETD', Ae_mm2:125,  Le_mm:92.2, Ve_mm3:11500, Al_nH:2200, Wa_mm2:98.0, MLT_mm:66, Pmax:220, A:39.0, B:39.0, C:13.0, D:9.5,  E:24.0, F:10.6,H:13.0 },
  { name:'ETD44',   series:'ETD', Ae_mm2:172,  Le_mm:103,  Ve_mm3:17700, Al_nH:2300, Wa_mm2:128,  MLT_mm:74, Pmax:300, A:44.0, B:44.0, C:15.0, D:11.0, E:27.0, F:12.0,H:15.0 },
  { name:'ETD49',   series:'ETD', Ae_mm2:211,  Le_mm:114,  Ve_mm3:24100, Al_nH:2600, Wa_mm2:160,  MLT_mm:82, Pmax:400, A:49.0, B:49.0, C:16.0, D:12.0, E:30.0, F:13.0,H:16.0 },
  { name:'PQ20/16', series:'PQ',  Ae_mm2:62.0, Le_mm:37.0, Ve_mm3:2294,  Al_nH:1700, Wa_mm2:44.0, MLT_mm:48, Pmax:90,  A:20.0, B:20.0, C:9.2,  D:7.0,  E:14.0, F:6.7, H:9.6  },
  { name:'PQ32/20', series:'PQ',  Ae_mm2:160,  Le_mm:56.0, Ve_mm3:8960,  Al_nH:2800, Wa_mm2:114,  MLT_mm:68, Pmax:190, A:32.0, B:32.0, C:14.5, D:11.2, E:21.5, F:10.6,H:14.5 },
  { name:'RM8',     series:'RM',  Ae_mm2:60.1, Le_mm:45.7, Ve_mm3:2748,  Al_nH:1700, Wa_mm2:42.0, MLT_mm:44, Pmax:80,  A:14.5, B:14.5, C:10.2, D:7.5,  E:10.5, F:5.0, H:9.4  },
  { name:'RM10',    series:'RM',  Ae_mm2:96.6, Le_mm:58.0, Ve_mm3:5603,  Al_nH:2400, Wa_mm2:72.0, MLT_mm:56, Pmax:130, A:17.8, B:17.8, C:12.5, D:9.5,  E:13.0, F:6.2, H:11.5 },
];
const WIRE = [
  {awg:32,dia:0.203,area_mm2:0.0324},{awg:30,dia:0.255,area_mm2:0.0509},
  {awg:28,dia:0.321,area_mm2:0.0810},{awg:26,dia:0.405,area_mm2:0.1288},
  {awg:24,dia:0.511,area_mm2:0.2047},{awg:22,dia:0.644,area_mm2:0.3255},
  {awg:20,dia:0.812,area_mm2:0.5176},{awg:18,dia:1.024,area_mm2:0.8231},
  {awg:16,dia:1.291,area_mm2:1.3087},{awg:14,dia:1.628,area_mm2:2.0812},
];
// Winding colours matching PI Expert: primary=blue, secondary=red, bias=orange
const WCOL = { primary:'#1a56e8', secondary:'#0066A6', bias:'#ea7c0a', extra:'#7c3aed' };

const PRESETS = [
  { label:'5W Phone',      vMin:85, vMax:265,lineFreq:50,fsw_kHz:132,Pout:5,  eta_target:82,family:'LPFC-1',  VOR:60, KP:0.65,coreMaterial:'N87', coreOverride:'',outputs:[{voltage:5, current:1}],  windingStyle:'standard',    wireType:'solid',isolationClass:'reinforced',Ta:40,dT_limit:40 },
  { label:'18W QC',        vMin:85, vMax:265,lineFreq:50,fsw_kHz:132,Pout:18, eta_target:85,family:'LPFC-2', VOR:90, KP:0.65,coreMaterial:'PC95',coreOverride:'',outputs:[{voltage:9, current:2}],  windingStyle:'standard',    wireType:'solid',isolationClass:'reinforced',Ta:40,dT_limit:40 },
  { label:'65W Adapter',   vMin:85, vMax:265,lineFreq:50,fsw_kHz:132,Pout:65, eta_target:88,family:'HPFC-1',  VOR:90, KP:0.65,coreMaterial:'PC95',coreOverride:'',outputs:[{voltage:20,current:3.25}],windingStyle:'standard',    wireType:'solid',isolationClass:'reinforced',Ta:40,dT_limit:40 },
  { label:'105W Industrial',vMin:85, vMax:305,lineFreq:60,fsw_kHz:100,Pout:108,eta_target:88,family:'HPFC-2',  VOR:120,KP:0.60,coreMaterial:'3C95',coreOverride:'',outputs:[{voltage:24,current:4.4},{voltage:12,current:0.25}],windingStyle:'interleaved',wireType:'solid',isolationClass:'reinforced',Ta:45,dT_limit:40 },
  { label:'200W',          vMin:85, vMax:265,lineFreq:50,fsw_kHz:66, Pout:200,eta_target:91,family:'IFC-CE',VOR:135,KP:0.50,coreMaterial:'3C95',coreOverride:'',outputs:[{voltage:48,current:4.2}],windingStyle:'interleaved',wireType:'litz', isolationClass:'reinforced',Ta:40,dT_limit:40 },
];

// ── State ─────────────────────────────────────────────────────────────────────
// ── seedDesign prop: pre-populate from an existing UDS design ────────────────
const props = defineProps({ seedDesign: { type: Object, default: null } });


onMounted(() => {
  if (props.seedDesign) seedFromDesign(props.seedDesign);
});
watch(() => props.seedDesign, (d) => { if (d) seedFromDesign(d); });

function seedFromDesign(d) {
  if (!d) return;
  const meta = d.meta || d;
  const inp  = d.spec?.input || d;
  const opts = d.spec?.options || d;
  const outs = d.spec?.outputs || d.outputs || [];
  form.value.vMin       = Number(inp.vMin  || meta.vMin  || 85);
  form.value.vMax       = Number(inp.vMax  || meta.vMax  || 265);
  form.value.lineFreq   = Number(inp.lineFreq || 50);
  form.value.Pout       = Number(meta.totalPower || 65);
  form.value.fsw_kHz    = parseInt(meta.frequency || opts.frequency || '132') || 132;
  form.value.family     = meta.family || 'HPFC-1';
  form.value.KP         = Number(opts.KP || 0.65);
  form.value.coreMaterial = opts.coreMaterial || 'PC95';
  if (outs.length > 0) form.value.outputs = outs.map(o => ({ voltage: Number(o.voltage||12), current: Number(o.current||1) }));
  // Auto-set VOR based on family
  const fam = (meta.family || '').toLowerCase();
  if (fam.includes('innoswitch')) form.value.VOR = 135;
  else if (fam.includes('tiny')) form.value.VOR = 60;
  else form.value.VOR = 90;
}

const form = ref({
  vMin:85,vMax:265,lineFreq:50,fsw_kHz:132,Pout:65,eta_target:87,
  family:'HPFC-1',VOR:90,KP:0.65,
  coreMaterial:'PC95',coreOverride:'',
  outputs:[{voltage:12,current:5.4}],
  windingStyle:'standard',wireType:'solid',
  isolationClass:'reinforced',Ta:40,dT_limit:40,
});
const result        = ref(null);
const instrTab      = ref('bom');
const mechView      = ref('cross');  // 'cross' | 'spiral'
const selectedPreset= ref('');

// ── Pure helpers ──────────────────────────────────────────────────────────────
const R = (v,d) => { const m=10**d; return Math.round(v*m)/m; };
const canDesign = computed(()=>
  form.value.Pout>0 && form.value.vMin>0 &&
  form.value.fsw_kHz>=30 &&
  form.value.outputs.every(o=>o.voltage>0&&o.current>0)
);
const selMat = computed(()=> MATERIALS.find(m=>m.name===form.value.coreMaterial)||MATERIALS[0]);

// ── SVG Mechanical Diagram layout ─────────────────────────────────────────────
// The bobbin is drawn as a horizontal cross-section.
// Left flange = purple vertical bar.  Right flange = grey bar.
// Wire circles are laid in horizontal rows inside the bobbin window.
// Each row: filled circles for the winding, hollow circles to pad to full width.
// Colours: primary=blue (#1a56e8), secondary=red (#0066A6), bias=orange (#ea7c0a)
// Tape separator lines (yellow) appear between winding groups.
// FL labels appear outside both flanges; row numbers appear inside left flange.

// SVG constants
const MSVG = {
  w:680, h:220,
  // Flange positions
  lf_x:54,   // left-flange x (more room for FL labels)
  rf_x:568,  // right-flange x (starts here)
  flange_w:14,
  // Bobbin window top — extra margin for gap text above
  top:32,
  total_h:168,
  // Wire circle diameter
  wd:12,
};
// Computed bobbin window width (between flanges)
const MSVG_win = computed(()=> MSVG.rf_x - (MSVG.lf_x + MSVG.flange_w));  // 510px
const wiresPerRow = computed(()=> Math.floor((MSVG_win.value - 12) / (MSVG.wd + 1)));

// Build layer stack from result windings
// Winding order bottom→top: [bias, primary, secondary(interleaved?), secondary]
const mechLayers = computed(()=>{
  if (!result.value) return [];
  const ws   = result.value.windings;
  const wpr  = wiresPerRow.value;
  const layers = [];

  // Order: secondary(last) at bottom, then primary, then bias at top
  // Each winding can span multiple rows
  const order = [
    ws.find(w=>!w.isPrimary&&!w.isBias),  // secondary
    ws.find(w=>w.isPrimary),               // primary
    ws.find(w=>w.isBias),                  // bias
  ].filter(Boolean);

  let fl = 1; // FL pin counter

  order.forEach((w, wi)=>{
    let remaining = w.turns;
    let rowNum    = 1;
    const isFirst = true;
    while (remaining > 0) {
      const inRow = Math.min(remaining, wpr);
      const circles = [];
      // Filled circles = actual wire
      for (let i=0; i<wpr; i++) {
        if (i < inRow) {
          circles.push({ fill: w.color, stroke: w.color });
        } else {
          circles.push({ fill: 'none', stroke: w.color });
        }
      }
      layers.push({
        circles,
        rowNum: String(rowNum),
        tapeBefore: wi > 0 && rowNum === 1,   // tape before each new winding group
        flLeft:  rowNum === 1 ? `FL${fl}`   : '',
        flRight: rowNum === 1 ? `FL${fl+1}` : '',
        y: 0,   // will be set below
      });
      remaining -= inRow;
      rowNum++;
      fl += (remaining <= 0) ? 2 : 0;
    }
  });

  // Assign Y positions: layer 0 = bottom, last = top
  const nL  = layers.length;
  const rowH = MSVG.wd + 3;
  const totalH = nL * rowH;
  const startY = MSVG.top + MSVG.total_h - totalH;
  layers.forEach((l, i)=>{
    l.y = startY + i * rowH;
  });

  return layers;
});


// ── Spiral cross-section diagram data ─────────────────────────────────────────
// Concentric rectangular rings, one per winding layer.
// Each ring represents the conductor cross-section as seen from the top of the bobbin.
// The innermost ring = the first winding wound on the bobbin (usually secondary).
// Each subsequent ring is offset outward by the wire diameter + insulation.
//
// We use rectangular approximation (matches EFD/EE/ETD bobbin geometry).
// Ring geometry:
//   inner = previous outer + gap
//   outer = inner + wire_dia * turns_in_ring / circumference * scale
//
// Wire dots are rendered along the top edge of each ring to show individual turns.
const spiralData = computed(()=>{
  if (!result.value) return { rings:[], spirals:[], legend:[], core_half:160, bobbin_half:130, post_half:30 };
  const r   = result.value;
  const ws  = r.windings;
  const core= r.core;

  // ── Scale geometry to 420×420 SVG ─────────────────────────────────────────
  // We use the core's Ae to derive a proportional scale.
  // EFD30: Ae=60mm², outer ~30×15mm → Le/2 ~ 8mm half-width
  // We pick a fixed display size then scale all rings proportionally.
  const SVG_CTR   = 210;            // centre of SVG
  const CORE_HALF = 155;            // half-size of core outline in SVG px
  const BOB_HALF  = 120;            // half-size of bobbin window in SVG px
  const POST_HALF = Math.round(BOB_HALF * 0.18);  // centre post ~18% of window
  const BOBWIN_MM = Math.sqrt(core.Wa_mm2);        // approx bobbin window side length (mm)
  const PX_PER_MM = (BOB_HALF - POST_HALF) / Math.max(BOBWIN_MM / 2, 1);  // px per mm for wires

  // Winding order inside bobbin: layer closest to core first
  // PI AN-29: usually secondary closest to core (lower leakage inductance)
  // then primary, then bias on outside
  const pri  = ws.find(w=>w.isPrimary);
  const secs = ws.filter(w=>!w.isPrimary&&!w.isBias);
  const bias = ws.find(w=>w.isBias);
  const windOrder = [...secs, pri, bias].filter(Boolean);

  const rings  = [];
  const spirals= [];
  let innerR   = POST_HALF + 4;  // start just outside the centre post

  const R = (v,d)=>{ const m=10**d; return Math.round(v*m)/m; };

  windOrder.forEach((w, wi)=>{
    const wireDia_px = Math.max(3, Math.min(10, (WIRE_DIA[w.awg] || 0.5) * PX_PER_MM * 1.8));
    const isInsulation = wi > 0;  // tape between each winding group

    // Tape gap before this winding (after first)
    if (isInsulation) innerR += 6;

    const outerR = innerR + wireDia_px * Math.min(w.layers || 1, 3) + 4;

    // How many wire dots fit along the top edge of the ring?
    const topLen   = (innerR + outerR);  // approx top half-width
    const dotsN    = Math.min(w.turns, Math.round(topLen * 2 / (wireDia_px + 1)));
    const topDots  = [];
    const dotY     = SVG_CTR - outerR + wireDia_px / 2 + 1;
    const dotStartX= SVG_CTR - Math.min(topLen, outerR - 4);
    const dotStep  = dotsN > 1 ? (Math.min(topLen, outerR - 4) * 2) / (dotsN - 1) : 0;
    for (let i=0; i<dotsN; i++) {
      topDots.push({
        x: dotStartX + i * dotStep,
        y: dotY,
        r: Math.max(2, wireDia_px / 2 - 0.5),
      });
    }

    rings.push({
      inner:       innerR,
      outer:       outerR,
      color:       w.color,
      strokeColor: w.color,
      alpha:       0.25,
      tape:        isInsulation,
      topDots,
      label: `${w.name.split(' ')[0]} (${w.turns}T)`,
    });

    // Spiral path for this winding (illustrative clockwise spiral)
    // Starts from inner radius, spirals outward to outer radius
    const spPath = buildSpiralPath(SVG_CTR, SVG_CTR, innerR + 2, outerR - 2, Math.min(w.turns, 3), w.color);
    spirals.push({
      path:   spPath,
      color:  w.color,
      width:  Math.max(1.5, wireDia_px * 0.5),
      dotX:   SVG_CTR - outerR + 5,
      dotY:   SVG_CTR,
    });

    innerR = outerR + 2;
  });

  // Build legend
  const legend = windOrder.map(w=>({ color: w.color, label: `${w.name} — ${w.turns}T AWG${w.awg}` }));

  return {
    rings, spirals, legend,
    core_half:  CORE_HALF,
    bobbin_half:BOB_HALF,
    post_half:  POST_HALF,
  };
});


// ── Construction Diagram data ─────────────────────────────────────────────────
// Produces a detailed side-view cross-section of the transformer assembly.
// Shows:
//   - E-core halves (top/bottom) with ferrite fill and centre limb
//   - Left flange (purple) and right flange (grey)
//   - Winding layer bands (coloured by winding, with individual wire dots)
//   - Insulation tape bands between winding groups (gold/yellow)
//   - Dimension annotation arrows (BW height, Le width, outer width)
//   - Pin assignment diagram (right side, separate SVG group)
//   - Layer legend row (bottom)
const cd = computed(()=>{
  if (!result.value) return {
    bobbinW:400, flangeW:22, winH:120, tapeZones:20, postW:40, corePostH:18,
    layers:[], pins:{left:[],right:[]}, legend:[],
  };

  const r  = result.value;
  const ws = r.windings;
  const f  = form.value;
  const pri  = ws.find(w=>w.isPrimary);
  const secs = ws.filter(w=>!w.isPrimary&&!w.isBias);
  const bias = ws.find(w=>w.isBias);

  // ── Geometry constants (SVG px) ───────────────────────────────────────────
  const BOBBIN_W   = 420;   // horizontal width of winding window in px
  const FLANGE_W   = 22;    // thickness of each flange
  const POST_W     = 44;    // width of centre post
  const CORE_POST_H= 20;    // how far centre post extends into window
  const WIRE_ROW_H = 13;    // height of one wire row (circle diameter + gap)
  const TAPE_H     = 8;     // height of an insulation tape band

  // Winding order — bottom of bobbin first (secondary closest to core per AN-29)
  const windOrder = [...secs, pri, bias].filter(Boolean);

  // ── Build layers ───────────────────────────────────────────────────────────
  const layers = [];
  let yPos = 4;  // current y from top of winding window

  const numPins = Math.max(8, ws.length * 2 + 4);
  let leftPinNum  = 1;
  let rightFlNum  = 1;

  windOrder.forEach((w, wi) => {
    // Tape band before each winding group (after the first)
    if (wi > 0) {
      const nLayers = f.isolationClass === 'reinforced' ? 3 : f.isolationClass === 'supplementary' ? 2 : 1;
      layers.push({
        isTape: true, y: yPos, h: TAPE_H * nLayers,
        tapeLabel: `${nLayers}L tape (${f.isolationClass})`,
      });
      yPos += TAPE_H * nLayers;
    }

    // Compute number of rows for this winding
    const wireDia_px = Math.max(4, Math.min(11, (WIRE_DIA[w.awg] || 0.5) * 28));
    const maxWiresPerRow = Math.floor((BOBBIN_W - 8) / (wireDia_px + 1.5));
    const nRows = Math.ceil(w.turns / maxWiresPerRow);
    const rowH  = wireDia_px + 3;

    for (let row = 0; row < nRows; row++) {
      const turnsInRow = row < nRows - 1 ? maxWiresPerRow : w.turns - row * maxWiresPerRow;
      const h = rowH;

      // Wire dots: filled for actual turns, outline for padding
      const wireDots = [];
      for (let i = 0; i < Math.min(maxWiresPerRow, 55); i++) {
        wireDots.push({
          x: 6 + i * (wireDia_px + 1.5) + wireDia_px / 2,
          y: h / 2,
          r: wireDia_px / 2 - 0.5,
          filled: i < turnsInRow,
        });
      }

      layers.push({
        isTape:   false,
        y:        yPos,
        h,
        color:    w.color,
        label:    row === 0 ? `${w.name} (${w.turns}T AWG${w.awg} ×${w.strands})` : '',
        rowNum:   String(nRows - row),  // count down (first wound = innermost)
        wireDots,
        pinSide:  w.isPrimary ? 'left' : 'right',
        windingRef: w.ref,
      });
      yPos += h;
    }
  });

  const totalTapeH = layers.filter(l=>l.isTape).reduce((s,l)=>s+l.h, 0);
  const totalWinH  = layers.filter(l=>!l.isTape).reduce((s,l)=>s+l.h, 0);
  const winH       = totalWinH + totalTapeH + 8;

  // ── Pin assignments ────────────────────────────────────────────────────────
  const leftPins = [
    { num:'1', label:'Primary start',  color: '#1a56e8', winding:'P' },
    { num:'2', label:'Primary end',    color: '#1a56e8', winding:'P' },
    { num:'3', label:'Bias start',     color: '#ea7c0a', winding:'B' },
    { num:'4', label:'Bias end',       color: '#ea7c0a', winding:'B' },
  ];
  const rightPins = [
    { num:'FL1', label:'FL1', color: '#0066A6', winding: 'Sec start' },
    { num:'FL2', label:'FL2', color: '#0066A6', winding: 'Sec end'   },
    { num:'FL3', label:'FL3', color: '#ea7c0a', winding: 'Sec bias'  },
    { num:'FL4', label:'FL4', color: '#888',    winding: 'Shield/GND'},
  ];

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = windOrder.map(w => ({
    color: w.color,
    label: `${w.name} — ${w.turns}T AWG${w.awg}`,
  }));

  return {
    bobbinW:   BOBBIN_W,
    flangeW:   FLANGE_W,
    postW:     POST_W,
    corePostH: CORE_POST_H,
    winH:      Math.max(winH, 80),
    tapeZones: 0,  // already included in winH
    layers,
    pins: { left: leftPins, right: rightPins },
    legend,
  };
});


// ── Designer View data ────────────────────────────────────────────────────────
// Engineering schematic drawing: winding stack with hatching, spec table,
// title block, dimension arrows. Format matches magnetics vendor submissions.
const dvData = computed(()=>{
  if (!result.value) return { coreW:400, flangeW:20, windW:360, bwMm:0, blocks:[], coreParams:[] };
  const r=result.value, f=form.value, ws=r.windings;
  const secs=ws.filter(w=>!w.isPrimary&&!w.isBias);
  const pri=ws.find(w=>w.isPrimary);
  const bias=ws.find(w=>w.isBias);
  const order=[...secs,pri,bias].filter(Boolean);

  const CORE_W=360, FLANGE_W=18, WIND_W=CORE_W-FLANGE_W*2;
  const TAPE_H=10, BASE_ROW_H=16;
  const TOTAL_H=310;

  // compute actual height needed
  let totalH=0;
  order.forEach((w,wi)=>{
    if(wi>0) totalH+=TAPE_H*(f.isolationClass==='reinforced'?3:f.isolationClass==='supplementary'?2:1);
    const nRows=Math.ceil(w.turns/30);
    totalH+=nRows*BASE_ROW_H;
  });
  const scale=Math.min(1, TOTAL_H/Math.max(totalH,40));

  const blocks=[];
  let y=32; // start below top core
  const calloutLetters=['P','S','B','D'];
  let callIdx=0;

  order.forEach((w,wi)=>{
    if(wi>0){
      const nL=f.isolationClass==='reinforced'?3:f.isolationClass==='supplementary'?2:1;
      const h=Math.round(TAPE_H*nL*scale);
      blocks.push({isTape:true,y,h,tapeLabel:`${nL}× 40µm poly`});
      y+=h;
    }
    const nRows=Math.ceil(w.turns/30);
    const h=Math.round(nRows*BASE_ROW_H*scale);
    const hatchCount=Math.floor(WIND_W/8);
    blocks.push({
      isTape:false, y, h, color:w.color,
      shortLabel:`${w.ref}(${w.turns}T)`,
      heightMm:R(w.turns*(WIRE_DIA[w.awg]||0.5)+1,2),
      hatchLines:Array.from({length:hatchCount},(_,i)=>i),
      hatchCount, callout:calloutLetters[callIdx++]||'?',
    });
    y+=h;
  });

  const bwMm=R(ws.reduce((s,w)=>s+w.turns*(WIRE_DIA[w.awg]||0.5),0)*1.15+3,1);

  const coreParams=[
    {label:'Core',       value:`${r.core.name} ${f.coreMaterial}`},
    {label:'Al (gapped)',value:`${r.Al_eff_nH} nH/T²`},
    {label:'Gap',        value:`${r.gap_mm} mm/leg`},
    {label:'Lp',         value:`${r.Lp_uH} µH`},
    {label:'Bmax',       value:`${r.Bmax_mT} mT`},
    {label:'Fill',       value:`${r.fill_pct}%`},
    {label:'η',          value:`${r.eta_pct}%`},
    {label:'Losses',     value:`${r.losses.total} W`},
    {label:'U1 Tj',      value:`${r.thermal.U1_Tj}°C`},
    {label:'Status',     value:r.status},
  ];
  return {coreW:CORE_W,flangeW:FLANGE_W,windW:WIND_W,bwMm,blocks,coreParams};
});

// ── Foundry View data ─────────────────────────────────────────────────────────
// Manufacturing drawing with ANSI hatching, callout circles, tolerances,
// materials table matching what a magnetics vendor receives.
const fdData = computed(()=>{
  if (!result.value) return { coreW:280,flangeW:16,windW:248,postW:40,bwMm:0,blocks:[],specRows:[],notes:[] };
  const r=result.value, f=form.value, ws=r.windings;
  const secs=ws.filter(w=>!w.isPrimary&&!w.isBias);
  const pri=ws.find(w=>w.isPrimary);
  const bias=ws.find(w=>w.isBias);
  const order=[...secs,pri,bias].filter(Boolean);

  const CORE_W=260,FLANGE_W=14,WIND_W=CORE_W-FLANGE_W*2,POST_W=38;
  const TAPE_H=9, BASE_ROW_H=14, TOTAL_H=280;
  let totalH=0;
  order.forEach((w,wi)=>{
    if(wi>0) totalH+=TAPE_H*(f.isolationClass==='reinforced'?3:2);
    totalH+=Math.ceil(w.turns/30)*BASE_ROW_H;
  });
  const scale=Math.min(1,TOTAL_H/Math.max(totalH,30));
  const blocks=[]; let y=26;
  const letters=['P','S','B'];  let ci=0;
  order.forEach((w,wi)=>{
    if(wi>0){
      const nL=f.isolationClass==='reinforced'?3:f.isolationClass==='supplementary'?2:1;
      const h=Math.round(TAPE_H*nL*scale);
      blocks.push({isTape:true,y,h,tapeLabel:`${nL}L`}); y+=h;
    }
    const h=Math.round(Math.ceil(w.turns/30)*BASE_ROW_H*scale);
    blocks.push({isTape:false,y,h,color:w.color,hatchCount:Math.floor(WIND_W/7),callout:letters[ci++]||'?'}); y+=h;
  });
  const bwMm=R(ws.reduce((s,w)=>s+w.turns*(WIRE_DIA[w.awg]||0.5),0)*1.15+3,1);

  // Spec rows: Ref | Item | Specification | Tolerance | Standard
  const specRows=[];
  specRows.push({ref:'—', item:'Core', spec:`${f.coreMaterial} ${r.core.name} gapped`, tol:`Al=${r.Al_eff_nH}±5%`, std:'IEC 60424', color:null});
  specRows.push({ref:'—', item:'Bobbin', spec:`GFR thermosetting plastic`, tol:'—', std:'UL94 V-0', color:null});
  ws.forEach((w,i)=>{
    const ltr=['P','S','B','D'][i];
    const wire=WIRE.find(wr=>wr.awg===w.awg)||WIRE[5];
    specRows.push({ref:ltr, item:w.name, spec:`${w.turns}T, AWG${w.awg}×${w.strands}, Irms=${w.Irms}A`, tol:`DCR<${Math.round(w.DCR_mohm*1.15)}mΩ`, std:'IEC 60317', color:w.color});
  });
  specRows.push({ref:'INS', item:'Insulation tape', spec:`Polyester film ${f.isolationClass}`, tol:`Creepage≥${r.creepage_mm}mm`, std:'IEC 62368-1', color:null});
  specRows.push({ref:'TEST',item:'Hi-Pot', spec:'3kVAC 1s P→S', tol:'No breakdown', std:'IEC 62368-1 §5.4', color:null});
  specRows.push({ref:'TEST',item:'Inductance', spec:`Lp=${r.Lp_uH}µH ±15%`, tol:'Llk<3% Lp', std:'PI AN-29', color:null});

  const notes=[
    `All dimensions in mm unless otherwise specified.`,
    `Core gap ${r.gap_mm}mm total (${R(r.gap_mm/2,3)}mm per leg on centre post). Tolerance ±0.03mm.`,
    `Winding order: ${order.map(w=>w.name).join(' → ')} (innermost first).`,
    `Insulation class: ${f.isolationClass} (IEC 62368-1). Creepage ${r.creepage_mm}mm.`,
    `Test: Lp=${r.Lp_uH}µH ±15% at 1kHz 0.25V. Hi-Pot 3kVAC 1s.`,
  ];

  return {coreW:CORE_W,flangeW:FLANGE_W,windW:WIND_W,postW:POST_W,bwMm,blocks,specRows,notes};
});

// ── 3D Isometric View data ────────────────────────────────────────────────────
// Builds isometric polygon faces for a simplified 3D transformer:
// bottom E-core, winding bands, centre post, top E-core, lead wires.
// Isometric projection: X right-forward, Y left-forward, Z up.
const tdData = computed(()=>{
  if (!result.value) return { bottomCore:[], topCore:[], windBands:[], centrePost:[], leads:[], gapArrow:{x1:0,y1:0,x2:0,y2:0,tx:0,ty:0}, legend:[] };

  const r=result.value, ws=r.windings;
  const secs=ws.filter(w=>!w.isPrimary&&!w.isBias);
  const pri=ws.find(w=>w.isPrimary);
  const bias=ws.find(w=>w.isBias);
  const order=[...secs,pri,bias].filter(Boolean);

  // Isometric constants
  const COS30=Math.cos(Math.PI/6), SIN30=0.5;
  // Convert 3D (x,y,z) → 2D SVG  (origin at left centre of diagram)
  function iso(x,y,z){ return [x*COS30 - y*COS30, -z + (x+y)*SIN30]; }
  function pt(x,y,z){ const[px,py]=iso(x,y,z); return `${(200+px).toFixed(1)},${(220+py).toFixed(1)}`; }

  // Transformer dimensions in "units" (1 unit ≈ mm scale)
  const CW=120, CD=60, FLANGE=12, WW=CW-FLANGE*2, POST=20, CORE_H=16;
  const WIN_H=Math.min(120, ws.length*20+40);

  // Bottom E-core (3 faces: top, front, right)
  const bottomCore=[
    {pts:`${pt(0,0,0)} ${pt(CW,0,0)} ${pt(CW,CD,0)} ${pt(0,CD,0)}`, fill:'#a08040', stroke:'#6b5820', opacity:0.85},   // top
    {pts:`${pt(0,0,0)} ${pt(CW,0,0)} ${pt(CW,0,-CORE_H)} ${pt(0,0,-CORE_H)}`, fill:'#7a6030', stroke:'#5a4020', opacity:0.9}, // front
    {pts:`${pt(CW,0,0)} ${pt(CW,CD,0)} ${pt(CW,CD,-CORE_H)} ${pt(CW,0,-CORE_H)}`, fill:'#8b6920', stroke:'#5a4020', opacity:0.9}, // right
  ];

  // Top E-core (sits above winding stack)
  const TZ=WIN_H+CORE_H;
  const topCore=[
    {pts:`${pt(0,0,TZ)} ${pt(CW,0,TZ)} ${pt(CW,CD,TZ)} ${pt(0,CD,TZ)}`, fill:'#a08040', stroke:'#6b5820', opacity:0.85},
    {pts:`${pt(0,0,TZ-CORE_H)} ${pt(CW,0,TZ-CORE_H)} ${pt(CW,0,TZ)} ${pt(0,0,TZ)}`, fill:'#7a6030', stroke:'#5a4020', opacity:0.9},
    {pts:`${pt(CW,0,TZ-CORE_H)} ${pt(CW,CD,TZ-CORE_H)} ${pt(CW,CD,TZ)} ${pt(CW,0,TZ)}`, fill:'#8b6920', stroke:'#5a4020', opacity:0.9},
  ];

  // Centre post (gold/tan)
  const PX=(CW-POST)/2;
  const centrePost=[
    {pts:`${pt(PX,FLANGE,0)} ${pt(PX+POST,FLANGE,0)} ${pt(PX+POST,FLANGE,WIN_H)} ${pt(PX,FLANGE,WIN_H)}`, fill:'#c8a84a', stroke:'#8b6914', opacity:0.7},
    {pts:`${pt(PX,FLANGE,WIN_H)} ${pt(PX+POST,FLANGE,WIN_H)} ${pt(PX+POST,CD-FLANGE,WIN_H)} ${pt(PX,CD-FLANGE,WIN_H)}`, fill:'#d4b460', stroke:'#8b6914', opacity:0.7},
  ];

  // Winding bands — one horizontal ring per winding, front+top faces
  const windBands=[];
  let z0=CORE_H;
  order.forEach((w,wi)=>{
    const bH=Math.min(30, Math.max(12, Math.ceil(w.turns/12)*8));
    // Front face
    windBands.push({pts:`${pt(FLANGE,0,z0)} ${pt(CW-FLANGE,0,z0)} ${pt(CW-FLANGE,0,z0+bH)} ${pt(FLANGE,0,z0+bH)}`, fill:w.color, stroke:w.color, opacity:0.55});
    // Top face
    windBands.push({pts:`${pt(FLANGE,0,z0+bH)} ${pt(CW-FLANGE,0,z0+bH)} ${pt(CW-FLANGE,CD,z0+bH)} ${pt(FLANGE,CD,z0+bH)}`, fill:w.color, stroke:w.color, opacity:0.35});
    z0+=bH+4;
  });

  // Lead wires (exit from left flange face)
  const leads=[];
  ws.forEach((w,i)=>{
    const lz=CORE_H+20+i*25;
    const[bx,by]=iso(0,0,lz); const[ex,ey]=iso(-28,0,lz+10);
    leads.push({x1:200+bx,y1:220+by,x2:200+ex,y2:220+ey,color:w.color,label:w.ref,lx:-30,ly:-3});
  });

  // Gap arrow (between core halves at bottom)
  const[gx1,gy1]=iso(CW/2,0,0); const[gx2,gy2]=iso(CW/2,0,CORE_H/2);
  const gapArrow={x1:200+gx1,y1:220+gy1,x2:200+gx2-40,y2:220+gy2-20,tx:200+gx2-80,ty:220+gy2-25};

  const legend=[
    {color:'#a08040', label:'Ferrite core ('+f.coreMaterial+')'},
    ...order.map(w=>({color:w.color, label:`${w.name} ${w.turns}T AWG${w.awg}`})),
    {color:'#c8a84a', label:'Centre post / gap'},
  ];
  return {bottomCore,topCore,windBands,centrePost,leads,gapArrow,legend,cW:CW};
});

// ── Thermal Map data ──────────────────────────────────────────────────────────
// Computes temperature at each winding layer and core section.
// Uses: thermal.U1_Tj, thermal.D3_Tj, T1_dT, losses breakdown.
// Colours map temperature to the gradient: blue(cool) → red(hot).
const thermData = computed(()=>{
  if (!result.value) return { bands:[], hotSpots:[], table:[], lossChart:[], coreW:400, flangeW:20, windW:360, winH:100, coreColor:'#555', flangeColor:'#333', tMax:100 };
  const r=result.value, f=form.value, ws=r.windings;
  const secs=ws.filter(w=>!w.isPrimary&&!w.isBias);
  const pri=ws.find(w=>w.isPrimary);
  const bias=ws.find(w=>w.isBias);
  const order=[...secs,pri,bias].filter(Boolean);

  const CORE_W=400, FLANGE_W=22, WIND_W=CORE_W-FLANGE_W*2;

  // Temperature at each element
  const Tcore  = f.Ta + r.T1_dT;
  const Tpri   = f.Ta + r.losses.copperPri * 18 + r.T1_dT * 0.4;
  const Tsec   = f.Ta + r.losses.copperSec * 22 + r.T1_dT * 0.35;
  const Tbias  = f.Ta + r.losses.copperSec * 8;
  const Tflange= f.Ta + r.T1_dT * 0.5;
  const tMax   = Math.max(Tcore, Tpri, r.thermal.U1_Tj, r.thermal.D3_Tj);
  const tMin   = f.Ta;

  // Map temperature to colour (blue → cyan → green → yellow → orange → red)
  function tempColor(T){
    const ratio=Math.max(0,Math.min(1,(T-tMin)/(tMax-tMin||1)));
    if(ratio<0.2)  return `rgb(${Math.round(26+ratio*5*160)},${Math.round(35+ratio*5*120)},${Math.round(126+ratio*5*90)})`;
    if(ratio<0.4)  { const r2=(ratio-0.2)*5; return `rgb(${Math.round(186+r2*69)},${Math.round(155+r2*100)},${Math.round(216-r2*200)})`; }
    if(ratio<0.6)  { const r2=(ratio-0.4)*5; return `rgb(${Math.round(255)},${Math.round(255-r2*150)},${Math.round(16-r2*16)})`; }
    if(ratio<0.8)  { const r2=(ratio-0.6)*5; return `rgb(255,${Math.round(105-r2*105)},0)`; }
    const r2=(ratio-0.8)*5; return `rgb(${Math.round(255-r2*50)},${Math.round(r2*10)},${Math.round(r2*10)})`;
  }
  function textColor(T){ const ratio=(T-tMin)/(tMax-tMin||1); return ratio>0.55?'#fff':'#1a1a2e'; }

  const TAPE_H=6, BASE_H=16, TOTAL_H=280;
  const wBandH=Math.min(BASE_H*3, Math.floor(TOTAL_H/(order.length+1)));
  const bands=[];
  let y=0;
  order.forEach((w,wi)=>{
    if(wi>0){ bands.push({isTape:true,y,h:TAPE_H,fill:'rgba(240,200,64,0.4)',textColor:'#fff',tLabel:''}); y+=TAPE_H; }
    const T=w.isPrimary?Tpri:w.isBias?Tbias:Tsec;
    const nG=Math.floor(WIND_W/18);
    bands.push({y,h:wBandH,fill:tempColor(T),textColor:textColor(T),tLabel:`${w.name}: ${T.toFixed(0)}°C`,gradLines:Array.from({length:nG},(_,i)=>i)});
    y+=wBandH;
  });
  const winH=y;
  const coreColor=tempColor(Tcore);
  const flangeColor=tempColor(Tflange);

  // Hot spot markers
  const hotSpots=[
    {cx:30+FLANGE_W+WIND_W*0.3, cy:32+winH*0.35, color:'#0066A6',label:`U1 ${r.thermal.U1_Tj}°C`,lx:220,ly:60,boxW:85},
    {cx:30+FLANGE_W+WIND_W*0.7, cy:32+winH*0.65, color:'#f97316',label:`D3 ${r.thermal.D3_Tj}°C`,lx:220,ly:120,boxW:85},
    {cx:30+FLANGE_W+WIND_W/2,   cy:32+winH+14,   color:tempColor(Tcore),label:`Core ${Tcore.toFixed(0)}°C`,lx:220,ly:180,boxW:100},
  ];

  // Thermal resistance table
  const table=[
    {comp:'U1 (Switch)', tj:`${r.thermal.U1_Tj}`, margin:`${r.thermal.margin_U1}°C margin`, color:r.thermal.U1_Tj<135?'#4ade80':'#f87171'},
    {comp:'D3 (Diode)',  tj:`${r.thermal.D3_Tj}`, margin:`${r.thermal.margin_D3}°C margin`, color:r.thermal.D3_Tj<110?'#4ade80':'#f87171'},
    {comp:'T1 core ΔT', tj:`+${r.T1_dT}`,        margin:`${(f.dT_limit-r.T1_dT).toFixed(1)}°C margin`, color:r.T1_dT<=f.dT_limit?'#4ade80':'#f87171'},
    {comp:'Primary Cu',  tj:`${Tpri.toFixed(0)}`, margin:'',                                               color:tempColor(Tpri)},
    {comp:'Secondary Cu',tj:`${Tsec.toFixed(0)}`, margin:'',                                               color:tempColor(Tsec)},
  ];

  // Loss bar chart items (max bar width = 120px)
  const maxLoss=Math.max(...Object.values(r.losses).filter(v=>typeof v==='number'));
  const lossItems=[
    {label:'Switching', val:r.losses.switching, color:'#0066A6'},
    {label:'Cu Primary', val:r.losses.copperPri, color:'#3b82f6'},
    {label:'Cu Secondary', val:r.losses.copperSec, color:'#10b981'},
    {label:'Core',      val:r.losses.core, color:'#8b5cf6'},
    {label:'Diode',     val:r.losses.diode, color:'#D97706'},
  ];
  const lossChart=lossItems.map(it=>({...it, barW:Math.round(it.val/maxLoss*120)}));

  return {bands,hotSpots,table,lossChart,coreW:CORE_W,flangeW:FLANGE_W,windW:WIND_W,winH,coreColor,flangeColor,tMax:Math.round(tMax)};
});


// ── Dimensions View data ──────────────────────────────────────────────────────
// Produces a three-view orthographic drawing (front/side/top) with fully
// annotated dimension lines.  All measurements are derived from the real
// physical dimensions (A,B,C,D,E,F,H) stored in the CORES table.
// The drawings are scaled so 1 SVG px = scalePx mm at 96 dpi (1px ≈ 0.2646mm).
// scalePx is set so the core fits comfortably on screen with generous margins.
const dimData = computed(()=>{
  if (!result.value) return { svgW:800, svgH:600, dims:{A:30,B:15,C:9,D:6,E:18,F:6,H:8}, physTable:[], windTable:[], frontBands:[], topBands:[], scalePx:4, scaleBarW:40, tableX:600, viewLabelY:50, viewY:60, frontX:60, sideX:260, topViewY:320, coreAw:120, coreBw:60, coreHw:32, limbW:8, postW:25, winAreaW:104, winAreaH:16, coreTopH:8, gapPx:2, mltR:30 };

  const r   = result.value;
  const f   = form.value;
  const core= r.core;
  const ws  = r.windings;

  // Use real dimensions from CORES table; fall back to derived values
  const D = core.D || R(Math.sqrt(core.Wa_mm2) * 0.8, 1);
  const E = core.E || R(core.Wa_mm2 / D, 1);
  const A = core.A || R(core.Le_mm * 0.58, 1);
  const B = core.B || R(A * 0.55, 1);
  const C = core.C || R(core.H ? core.H/2 : A * 0.30, 1);
  const F = core.F || R(Math.sqrt(core.Ae_mm2) * 0.95, 1);
  const H = core.H || R(C * 2, 1);

  // Choose scale: fit A (longest dim) into ~220px
  const scalePx = Math.max(4, Math.min(12, 320 / A));
  // SVG unit = 1px = (1/scalePx) mm, so 1mm = scalePx px

  // Derived px dimensions
  const coreAw   = R(A * scalePx, 0);   // front view width (A mm)
  const coreBw   = R(B * scalePx, 0);   // side view width (B mm)
  const coreHw   = R(H * scalePx, 0);   // overall height (H mm)
  const coreTopH = R(C * scalePx, 0);   // top/bottom bar height (C = one E-half)
  const limbW    = R(Math.max(4, (A - E) / 2 * scalePx), 0);
  const postW    = R(F * scalePx, 0);
  const winAreaW = coreAw - limbW * 2;
  const winAreaH = R(D * scalePx, 0);
  const gapPx    = Math.max(2, R(r.gap_mm * scalePx, 1));
  const mltR     = R(core.MLT_mm / 2 * scalePx * 0.5, 0);
  const scaleBarW = R(10 * scalePx, 0);  // 10mm bar

  // Layout positions
  const MARGIN   = 50;
  const frontX   = MARGIN + 30;
  const sideX    = frontX + coreAw + 100;
  const tableX   = sideX + coreBw + 70;
  const viewLabelY = 42;
  const viewY    = 56;
  const topViewY = viewY + coreHw + 90;
  const svgW     = tableX + 260;
  const svgH     = topViewY + coreBw + 100;
  const scalePxVal = scalePx;  // px per mm (for ruler)

  // Front-view winding bands
  const secs = ws.filter(w=>!w.isPrimary&&!w.isBias);
  const pri  = ws.find(w=>w.isPrimary);
  const bias = ws.find(w=>w.isBias);
  const order= [...secs,pri,bias].filter(Boolean);
  const frontBands = [];
  const TAPE_H_PX = Math.max(2, R(0.12 * scalePx, 0));  // ~0.12mm per tape layer
  let yFB = 0;
  const availH = winAreaH;
  const totalWireH = ws.reduce((s,w)=>s + (WIRE_DIA[w.awg]||0.5)*Math.ceil(w.turns/30), 0);
  const scaleFB = totalWireH > 0 ? (availH * 0.85) / totalWireH : 1;
  order.forEach((w,wi)=>{
    if (wi > 0) yFB += TAPE_H_PX * (f.isolationClass==='reinforced'?3:f.isolationClass==='supplementary'?2:1);
    const h = Math.max(4, R((WIRE_DIA[w.awg]||0.5) * Math.ceil(w.turns/30) * scaleFB, 0));
    frontBands.push({ y:yFB, h, color:w.color });
    yFB += h;
  });

  // Top-view winding rings
  const topBands = [];
  let offset = postW / 2 + 2;
  order.forEach((w,wi)=>{
    if (wi > 0) offset += 3;
    const th = Math.max(3, R((WIRE_DIA[w.awg]||0.5) * scalePx * 1.5, 0));
    topBands.push({ offset, h:th, color:w.color });
    offset += th;
  });

  // Physical dimensions table
  const physTable = [
    { label:'A  outer length',  value:`${A} mm`,   note:'±0.3',  color:'#1a56c8' },
    { label:'B  outer width',   value:`${B} mm`,   note:'±0.3',  color:'#1a56c8' },
    { label:'H  total height',  value:`${H} mm`,   note:'±0.3',  color:'#1a56c8' },
    { label:'C  E-half height', value:`${C} mm`,   note:'±0.2',  color:'#ea7c0a' },
    { label:'D  window height', value:`${D} mm`,   note:'±0.2',  color:'#38A169' },
    { label:'E  window length', value:`${E} mm`,   note:'±0.2',  color:'#38A169' },
    { label:'F  post width',    value:`${F} mm`,   note:'±0.15', color:'#7c3aed' },
    { label:'Ae  eff. area',    value:`${core.Ae_mm2} mm²`, note:'magnetic', color:null },
    { label:'Le  path length',  value:`${core.Le_mm} mm`,  note:'magnetic', color:null },
    { label:'Ve  volume',       value:`${core.Ve_mm3} mm³`, note:'magnetic', color:null },
    { label:'Al  ungapped',     value:`${core.Al_nH} nH/t²`, note:'@0gap',  color:null },
    { label:'Al  gapped',       value:`${r.Al_eff_nH} nH/t²`, note:'design', color:'#e74c3c' },
    { label:'Gap (total)',       value:`${r.gap_mm} mm`,    note:'±0.03',  color:'#e74c3c' },
    { label:'MLT (avg)',         value:`${core.MLT_mm} mm`, note:'winding', color:null },
  ];

  // Winding build table
  const windTable = [];
  order.forEach(w=>{
    const wireDiaMm = WIRE_DIA[w.awg] || 0.5;
    const nRows     = Math.ceil(w.turns / 30);
    const buildMm   = R(nRows * wireDiaMm * 1.15, 2);
    windTable.push({ label:`${w.name}`, value:`${buildMm} mm`, note:`${w.turns}T ×${w.strands}`, color:w.color });
  });
  const tapeLayersN = f.isolationClass==='reinforced'?3:f.isolationClass==='supplementary'?2:1;
  const tapeTotalMm = R((order.length - 1) * tapeLayersN * 0.04, 2);
  windTable.push({ label:'Insulation tape', value:`${tapeTotalMm} mm`, note:`${tapeLayersN}L×${(order.length-1)}`, color:null });
  const totalBuildMm = R(windTable.slice(0,-1).reduce((s,rw)=>s+parseFloat(rw.value),0) + tapeTotalMm, 2);
  windTable.push({ label:'Total BW', value:`${totalBuildMm} mm`, note:`vs D=${D}mm`, color: totalBuildMm <= D ? '#38A169' : '#e74c3c' });
  windTable.push({ label:'Fill factor', value:`${r.fill_pct}%`, note:`of ${r.window_area_mm2}mm²`, color: r.fill_ok ? '#38A169' : '#e74c3c' });

  return {
    svgW, svgH, dims:{ A, B, C, D, E, F, H },
    physTable, windTable, frontBands, topBands,
    scalePx: scalePxVal,
    scaleBarW,
    tableX, viewLabelY, viewY,
    frontX, sideX, topViewY,
    coreAw, coreBw, coreHw, limbW, postW,
    winAreaW, winAreaH, coreTopH, gapPx, mltR,
  };
});

// AWG to wire diameter (mm) for spiral dot sizing
const WIRE_DIA = {
  32:0.203, 30:0.255, 28:0.321, 26:0.405, 24:0.511, 22:0.644,
  20:0.812, 18:1.024, 16:1.291, 14:1.628, 12:2.053, 10:2.588,
};

// Build an Archimedean spiral SVG path (rectangular approximation)
// Makes N clockwise turns around centre (cx,cy) going from r0 to r1
function buildSpiralPath(cx, cy, r0, r1, turns, color) {
  if (r0 >= r1 || turns <= 0) return '';
  const steps = Math.round(turns * 60);   // segments per full turn
  const dr    = (r1 - r0) / steps;
  const dTheta= (2 * Math.PI * turns) / steps;
  let path    = '';
  for (let i=0; i<=steps; i++) {
    const r     = r0 + i * dr;
    const theta = -Math.PI / 2 + i * dTheta;  // start at top
    const x     = cx + r * Math.cos(theta);
    const y     = cy + r * Math.sin(theta);
    path += (i === 0 ? `M ${x.toFixed(1)},${y.toFixed(1)}` : ` L ${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return path;
}

// ── Electrical Diagram computed data ──────────────────────────────────────────
const elec = computed(()=>{
  if (!result.value) return { title:'', leftPins:[], rightPins:[], primaryArcs:[], biasArcsL:[], secondaryGroups:[], dots:[], labels:[] };
  const r  = result.value;
  const ws = r.windings;
  const pri  = ws.find(w=>w.isPrimary);
  const sec  = ws.filter(w=>!w.isPrimary&&!w.isBias);
  const bias = ws.find(w=>w.isBias);

  const title = `${form.value.coreMaterial}${r.core.name}-${r.Al_eff_nH}`;

  // Left pins: 1=primary start, 2=primary end, 3=bias start, 4=bias end
  const leftPins = [
    { label:'1', y: 48  },
    { label:'2', y:118  },
    { label:'3', y:195  },
    { label:'4', y:262  },
  ];
  const rightPins = [
    { label:'FL2', y: 48  },
    { label:'FL1', y:115  },
    { label:'FL1', y:182  },
    { label:'FL3', y:262  },
  ];

  // Primary arcs: small semicircles to left of core (x=145), stacked vertically
  const primaryArcs = [];
  const priTurns = Math.min(pri?.turns||0, 8);
  const priY0 = 35, priStep = 13;
  for (let i=0; i<priTurns; i++) {
    const y0 = priY0 + i * priStep;
    primaryArcs.push(`M 199,${y0} A 7,7 0 0,1 199,${y0+12}`);
  }

  // Bias arcs: smaller, below primary on left side
  const biasArcsL = [];
  const biasY0 = 185, biasStep = 11;
  const biasTurns = Math.min(bias?.turns||0, 6);
  for (let i=0; i<biasTurns; i++) {
    const y0 = biasY0 + i * biasStep;
    biasArcsL.push(`M 199,${y0} A 6,6 0 0,1 199,${y0+10}`);
  }

  // Secondary groups — each secondary winding is its own group of arcs
  const secondaryGroups = [];
  const secColors = [WCOL.secondary, '#1a56e8'];
  sec.forEach((sw, si)=>{
    const arcs = [];
    const secTurns = Math.min(sw.turns, 6);
    const secY0 = 35 + si * 85, secStep = 13;
    for (let i=0; i<secTurns; i++) {
      const y0 = secY0 + i * secStep;
      arcs.push(`M 289,${y0} A 7,7 0 0,0 289,${y0+12}`);
    }
    secondaryGroups.push({ arcs, color: secColors[si] || WCOL.secondary });
  });

  // Secondary bias (right side, bottom)
  if (bias) {
    const arcs = [];
    for (let i=0; i<Math.min(bias.turns,3); i++) {
      arcs.push(`M 289,${225 + i*11} A 6,6 0 0,0 289,${225+i*11+10}`);
    }
    secondaryGroups.push({ arcs, color: WCOL.bias });
  }

  // Polarity dots
  const dots = [
    { x:291, y:46,  color:WCOL.secondary },
    { x:291, y:131, color:WCOL.secondary },
    { x:198, y:118, color:WCOL.primary   },
    { x:198, y:46,  color:WCOL.primary   },
  ];

  // Labels
  const labels = [
    { x:92,  y:72,  color:WCOL.primary,   line1:'Primary',         line2:`${pri?.turns||0}T`, line3:`${pri?.strands}x${pri?.awg} AWG` },
    { x:92,  y:210, color:WCOL.bias,      line1:'Primary Bias',    line2:`${bias?.turns||0}T`,line3:`${bias?.strands}x${bias?.awg} AWG` },
    { x:330, y:68,  color:WCOL.secondary, line1:'Secondary 1-1',   line2:`${sec[0]?.turns||0}T`,line3:`${sec[0]?.strands}x${sec[0]?.awg} TIW` },
    { x:330, y:155, color:'#1a56e8',      line1:'Secondary 1-2',   line2:`${sec[1]?.turns||sec[0]?.turns||0}T`,line3:`${sec[1]?.strands||sec[0]?.strands}x${sec[1]?.awg||sec[0]?.awg} TIW` },
    { x:330, y:240, color:WCOL.bias,      line1:'Secondary Bias',  line2:`${bias?.turns||0}T`,line3:`1x35 TIW` },
  ];

  return { title, leftPins, rightPins, primaryArcs, biasArcsL, secondaryGroups, dots, labels };
});

// ── Coil Former Properties table rows ─────────────────────────────────────────
const coilFormerRows = computed(()=>{
  if (!result.value) return [];
  const r = result.value, f = form.value, core = r.core;
  const bobbinPN = `B${core.series}${core.name.replace('/','')}-1`;
  const bobbinType = ['PQ','RM'].includes(core.series) ? 'Vertical' : 'Horizontal';
  const pins = String(Math.max(8, r.windings.length * 2 + 4));
  const totalBW = R(core.Wa_mm2 / (core.Ae_mm2 ** 0.5) * 3, 1);
  const corePN = `${f.coreMaterial}${core.name}-${r.Al_eff_nH}`;
  return [
    { label:'Core Type',             value:`${core.series} (${corePN})` },
    { label:'Part Number',           value:corePN },
    { label:'Core Material',         value:f.coreMaterial },
    { label:'Coil Former Part Number',value:bobbinPN },
    { label:'Bobbin type',           value:bobbinType,     grayed:true },
    { label:'Available Pins',        value:pins },
    { label:'Total BW, mm',          value:String(totalBW) },
    { label:'Ae (mm²)',              value:String(core.Ae_mm2) },
    { label:'Le (mm)',               value:String(core.Le_mm) },
    { label:'Ve (mm³)',              value:String(core.Ve_mm3) },
    { label:'Al (nH/t²)',           value:String(core.Al_nH) },
    { label:'Al gapped (nH/t²)',    value:String(r.Al_eff_nH) },
    { label:'Air Gap (mm)',          value:`${r.gap_mm} total / ${R(r.gap_mm/2,3)}/leg` },
    { label:'Lp (µH)',              value:String(r.Lp_uH) },
    { label:'Bmax (mT)',            value:`${r.Bmax_mT}  [limit: ${r.Bsat_mT}]` },
    { label:'Fill Factor',          value:`${r.fill_pct}%  (${r.fill_ok?'OK':'REWIND'})` },
    { label:'Creepage P→S (mm)',    value:String(r.creepage_mm) },
    { label:'Clearance P→S (mm)',   value:String(r.clearance_mm) },
    { label:'η estimated',          value:`${r.eta_pct}%` },
    { label:'Losses (W)',           value:String(r.losses.total) },
    { label:'U1 Tj (°C)',          value:`${r.thermal.U1_Tj}  [limit 135]` },
    { label:'D3 Tj (°C)',          value:`${r.thermal.D3_Tj}  [limit 110]` },
    { label:'Status',               value:r.status },
  ];
});

// ── BOM items ─────────────────────────────────────────────────────────────────
const bomItems = computed(()=>{
  if (!result.value) return [];
  const r=result.value, f=form.value, core=r.core;
  const bobbinPN = `B${core.series}${core.name.replace('/','')}-1`;
  const corePN   = `${f.coreMaterial}${core.name}-${r.Al_eff_nH}`;
  const isol     = calcIsolation(f.isolationClass, f.vMax);
  const items = [
    `Core: ${corePN}, ${f.coreMaterial}, gapped for ALG of ${r.Al_eff_nH} nH / T²`,
    `Bobbin: GFR thermosetting plastic ${bobbinPN}`,
    `Tinned copper wire 0.5mm`,
    `Varnish (UL94 V-0, IEC 60317 compliant)`,
  ];
  r.windings.forEach(w=>{
    const wire = WIRE.find(wr=>wr.awg===w.awg)||WIRE[5];
    items.push(
      `${w.strands===1?'Single':'Multi'}-core wire: ${w.awg} AWG (${wire.dia.toFixed(3)}mm), insulation Heavy Build (OD: ${R(wire.dia*1.24,3)}mm) IEC 60317-56, IEC 60950 Annex U`
    );
  });
  const tapeW = R(Math.sqrt(core.Wa_mm2)*4, 1);
  items.push(`Separation Tape: Polyester film [1 mil (25.4 micrometers) base thickness], ${tapeW} mm wide`);
  items.push(`Outer wrap tape: self-adhesive polyester, ${tapeW} mm wide`);
  items.push(`Hi-Pot test: 3kV AC, 1 second, Primary → Secondary (IEC 62368-1 §5.4)`);
  return items;
});

// ── Design engine (PI AN-19/AN-29/AN-57) ─────────────────────────────────────
function runDesign() {
  const f   = form.value;
  const fsw = f.fsw_kHz * 1000;
  const Pout= f.Pout;
  const Pin = Pout / (f.eta_target / 100);
  const Vout1 = f.outputs[0].voltage;
  const Iout1 = f.outputs[0].current;
  const Vd    = Vout1 >= 20 ? 0.65 : 0.45;
  const mat   = selMat.value;

  // DC bus
  const Vdc_min = calcVdc(f.vMin, f.lineFreq, Pout);
  const Vdc_max = calcVdc(f.vMax, f.lineFreq, Pout);

  // Duty cycle (AN-19)
  const D_max = f.VOR / (Vdc_min + f.VOR);
  const D_min = f.VOR / (Vdc_max + f.VOR);

  // Primary inductance (AN-19 eq.4)
  const KP  = f.KP;
  const Lp  = (Vdc_min**2 * D_max**2) / (2 * fsw * Pin * KP * (2-KP) / 2);
  const Lp_uH = R(Lp * 1e6, 2);

  // Primary currents (AN-19 eq.6/7)
  const Ip_pk  = (2 * Pin) / (Vdc_min * D_max * (2 - KP));
  const Ip_rms = Ip_pk * Math.sqrt(D_max / 3) * Math.sqrt(1 + KP / 3);

  // Turns ratio & secondary currents
  const n_ps   = (Vdc_min * D_max) / ((Vout1 + Vd) * (1 - D_max));
  const Is_pk  = Ip_pk * n_ps;
  const Is_rms = Is_pk * Math.sqrt((1 - D_max) / 3);

  // Core selection
  const Bsat  = mat.Bsat_mT / 1000;
  const Bmax  = Bsat * 0.80;    // 80% derating per AN-57
  const core  = f.coreOverride
    ? (CORES.find(c=>c.name===f.coreOverride) || autoSelectCore(Pout, fsw))
    : autoSelectCore(Pout, fsw);
  const Ae_m2 = core.Ae_mm2 * 1e-6;

  // Primary turns (AN-29 eq.1)
  const Np    = Math.max(Math.ceil((Lp * Ip_pk) / (Bmax * Ae_m2)), 15);

  // Air gap (AN-29)
  const mu0   = 4 * Math.PI * 1e-7;
  const Le_m  = core.Le_mm * 1e-3;
  const Lgap_raw    = (mu0 * Np**2 * Ae_m2) / Lp - Le_m / 2000;
  const Lgap_mm     = Math.max(0.05, Lgap_raw * 1000);
  const fringing    = 1 + (Lgap_mm / Math.sqrt(core.Ae_mm2)) * Math.log(2 * core.MLT_mm / Lgap_mm);
  const Al_eff_nH   = R((mu0 * Ae_m2 / (Lgap_raw || Le_m/2000)) * 1e9 * fringing, 0);
  const Lp_gapped   = R(Al_eff_nH * 1e-9 * Np**2 * 1e6, 2);

  // Winding turns
  const Ns = Math.max(1, Math.round(Np / n_ps));
  const Nb = Math.max(1, Math.round(Ns * 12 / Vout1));

  // Bmax verification
  const Bmax_actual = (Lp * Ip_pk) / (Np * Ae_m2);
  const Bmax_mT     = R(Bmax_actual * 1000, 0);
  const Bmargin     = R((1 - Bmax_actual / Bsat) * 100, 0);

  // Winding details
  const windings = buildWindings(f, Np, Ns, Nb, Ip_rms, Is_rms, Iout1, core, Lp_uH);

  // Losses
  const losses  = calcLosses(Pout, Ip_rms, Is_rms, Iout1, Vout1, fsw, mat, Bmax_actual, core);
  const eta_pct = R(Pout / (Pout + losses.total) * 100, 1);

  // Thermal
  const Rja_U1 = f.family.toLowerCase().includes('eg') ? 22 : 25;
  const thermal = {
    U1_Tj:    R(f.Ta + (losses.switching + losses.copperPri) * Rja_U1, 1),
    D3_Tj:    R(f.Ta + losses.diode * 32, 1),
    margin_U1:0, margin_D3:0, pass:false,
  };
  thermal.margin_U1 = R(135 - thermal.U1_Tj, 1);
  thermal.margin_D3 = R(110 - thermal.D3_Tj, 1);
  thermal.pass = thermal.U1_Tj < 135 && thermal.D3_Tj < 110;

  // Fill
  const copper_area = windings.reduce((s,w)=>s + w.copper_area_mm2, 0);
  const fill_pct    = R(copper_area / core.Wa_mm2 * 100, 1);
  const fill_ok     = fill_pct <= 40;
  windings.forEach(w=>{ w.area_pct = R(w.copper_area_mm2 / core.Wa_mm2 * 100, 1); });

  // Isolation
  const isol = calcIsolation(f.isolationClass, f.vMax);

  // Compliance + warnings
  const checks   = runCompliance({ D_max, Ip_pk, eta:eta_pct/100, Bmax_actual, Bsat, fsw, fill_ok, thermal, Lgap_mm:Lgap_mm, form:f, losses });
  const warnings = buildWarnings({ D_max, Ip_pk, eta:eta_pct/100, Bmax_actual, Bsat, fill_ok, Lgap_mm:Lgap_mm, form:f });

  // Assembly
  const assemblySteps = buildAssembly({ core, windings, Lgap_mm, form:f, Np, Ns, Nb, mat });

  // Copper weight (density 8.96 g/cm³)
  const copper_g = R(windings.reduce((s,w)=>{
    const wire = WIRE.find(wr=>wr.awg===w.awg)||WIRE[5];
    return s + w.turns * core.MLT_mm * 1e-3 * wire.area_mm2 * 1e-6 * 1e6 * 8.96;
  }, 0), 2);

  const allOk   = checks.every(c=>c.severity !== 'error');
  const hasWarn = checks.some(c=>c.severity === 'warn');

  result.value = {
    Vdc_min:R(Vdc_min,1), Vdc_max:R(Vdc_max,1),
    D_max:R(D_max*100,2), D_min:R(D_min*100,2),
    Vclamp:R(Vdc_max + f.VOR*1.35, 0),
    Ip_pk:R(Ip_pk,3), Ip_rms:R(Ip_rms,3), n_ps:R(n_ps,3),
    mode: KP >= 1 ? 'BCM' : 'DCM',
    Lp_uH, Lp_gapped_uH:Lp_gapped,
    Lp_check: Math.abs(Lp_gapped - Lp_uH) / Lp_uH < 0.15,
    gap_mm:R(Lgap_mm,3), fringing_factor:R(fringing,3), Al_eff_nH,
    core:{ ...core, material:f.coreMaterial },
    Bmax_mT, Bsat_mT:R(mat.Bsat_mT*0.80,0), dB_mT:R(Bmax_mT/2,0),
    Bmax_ok: Bmax_actual < Bsat*0.80, Bmargin,
    Np, Ns, Nb, windings,
    fill_pct, fill_ok, copper_area_mm2:R(copper_area,2),
    window_area_mm2:core.Wa_mm2, Ku:R(fill_pct/100,2),
    ...isol,
    eta_pct, Pin:R(Pin,2), losses, thermal, Rja_U1,
    T1_dT:R(Math.min(losses.core * 45, f.dT_limit * 2), 1),
    checks, warnings, assemblySteps, copper_g,
    status: !allOk ? 'FAIL' : hasWarn ? 'REVIEW' : 'PASS',
  };
}

// ── Sub-functions ──────────────────────────────────────────────────────────────
function calcVdc(Vac, fline, Pout) {
  const Vpk = Vac * Math.SQRT2;
  const Idc = (Pout / 0.87) / Vpk;
  const C   = Math.max(Pout, 47);
  const dV  = (Idc * 1000) / (2 * fline * C);
  return Math.max(Vpk - dV, Vpk * 0.80);
}

function autoSelectCore(Pout, fsw) {
  const d    = fsw>=200000?0.65 : fsw>=150000?0.75 : fsw>=100000?0.85 : 1.0;
  const Peff = Pout * d;
  return CORES.find(c=>c.Pmax >= Peff) || CORES[CORES.length-1];
}

function selectWire(Irms, j=4.0) {
  const a = Math.max(Irms, 0.01) / j;
  for (const w of WIRE) if (w.area_mm2 >= a) return w;
  return WIRE[WIRE.length-1];
}

function buildWindings(f, Np, Ns, Nb, Ip_rms, Is_rms, Iout, core, Lp_uH) {
  const strands = f.wireType === 'litz' ? 7 : 1;
  const MLT     = core.MLT_mm;

  function mw(name, ref, turns, Irms, color, isPrimary=false, isBias=false) {
    const w    = selectWire(Irms / strands);
    const DCR  = (MLT*1e-3 * turns * 1.724e-8) / (w.area_mm2*1e-6) * 1000; // mΩ
    const J    = Irms / (strands * w.area_mm2);
    const area = strands * w.area_mm2 * turns * 1.15;
    // CMA per amp: 1 CMA = 5.067e-4 mm²; 1 mm² = 1/5.067e-4 = 1973 CMA
    const CMA_total = w.area_mm2 * strands * 1973;
    const CMA_perA  = R(CMA_total / Math.max(Irms, 0.01), 1);
    const LENw      = R(turns * MLT / 10, 1);  // cm
    const Lw_uH     = R(Lp_uH * (turns/Np)**2, 2);
    const Lw_pct    = R(Lw_uH / Lp_uH * 100, 2);
    return {
      name, ref, color, turns, awg:w.awg, dia_mm:w.dia.toFixed(3),
      strands, Irms:R(Irms,3), J_Amm2:R(J,2), J_ok:J<5.5,
      layers:Math.ceil(turns/30), MLT_mm:MLT, DCR_mohm:R(DCR,0),
      copper_area_mm2:R(area,2),
      CMA_cmils:CMA_perA, LENw_cm:LENw,
      Lw_uH, Lw_pct: String(Lw_pct),
      isPrimary, isBias,
    };
  }
  const Np_ref = Np; // capture for CMA closure
  const ws = [
    mw('Primary',      'P',  Np, Ip_rms, WCOL.primary,   true,  false),
    mw('Secondary 1-1','S1', Ns, Is_rms, WCOL.secondary, false, false),
  ];
  if (Nb > 0) ws.push(mw('Primary Bias','B', Nb, 0.08, WCOL.bias, false, true));
  // If interleaved, add a second secondary section
  if (f.windingStyle === 'interleaved' && Ns > 1) {
    ws.push(mw('Secondary 1-2','S2', Math.round(Ns/2), Is_rms/2, '#1a56e8', false, false));
  }
  return ws;
}

function calcLosses(Pout, Ip_rms, Is_rms, Iout, Vout, fsw, mat, Bmax, core) {
  const Vd    = Vout >= 20 ? 0.65 : 0.45;
  const Pcore = mat.k * Math.pow(Bmax*1000, mat.alpha) * Math.pow(fsw/1000, mat.beta) * core.Ve_mm3*1e-9;
  const P_sw  = 0.5 * 60e-12 * 340**2 * fsw;
  const P_cup = Ip_rms**2 * 0.18;
  const P_cus = Is_rms**2 * 0.04;
  const P_d   = Vd * Iout;
  const P_g   = Pout * 0.008;
  const P_o   = Pout * 0.006;
  const total = P_sw + P_cup + P_cus + P_d + Pcore + P_g + P_o;
  return { switching:R(P_sw,3), copperPri:R(P_cup,3), copperSec:R(P_cus,3), diode:R(P_d,3), core:R(Pcore,3), gate:R(P_g,3), other:R(P_o,3), total:R(total,3) };
}

function calcIsolation(cls, vMax) {
  const t = ({
    basic:         { creepage_mm:3.2, clearance_mm:1.5, tape_layers_pri:1, tape_layers_sec:1 },
    supplementary: { creepage_mm:4.0, clearance_mm:2.0, tape_layers_pri:2, tape_layers_sec:1 },
    reinforced:    { creepage_mm:6.4, clearance_mm:3.0, tape_layers_pri:3, tape_layers_sec:2 },
  })[cls] || { creepage_mm:6.4, clearance_mm:3.0, tape_layers_pri:3, tape_layers_sec:2 };
  const sc = vMax > 250 ? (vMax/250)**0.5 : 1;
  return { creepage_mm:R(t.creepage_mm*sc,2), clearance_mm:R(t.clearance_mm*sc,2), tape_layers_pri:t.tape_layers_pri, tape_layers_sec:t.tape_layers_sec };
}

function runCompliance({D_max,Ip_pk,eta,Bmax_actual,Bsat,fsw,fill_ok,thermal,Lgap_mm,form:f,losses}) {
  return [
    {name:'D_max < 55%',         standard:'PI AN-29',    pass:D_max*100<55,  detail:`D_max=${R(D_max*100,2)}%`,   severity:D_max*100>=60?'error':D_max*100>=55?'warn':'pass'},
    {name:'Bmax < 80% Bsat',    standard:'PI AN-57',    pass:Bmax_actual<Bsat*0.80, detail:`Bmax=${R(Bmax_actual*1000,0)}mT`, severity:Bmax_actual>=Bsat?'error':Bmax_actual>=Bsat*0.80?'warn':'pass'},
    {name:'η ≥ 82%',            standard:'DOE Level VI',pass:eta>=0.82,     detail:`η=${R(eta*100,1)}%`,         severity:eta<0.80?'error':eta<0.82?'warn':'pass'},
    {name:'Fill ≤ 40%',          standard:'IPC-2152',    pass:fill_ok,       detail:`Fill=${R(fill_ok?0:0,0)}%`,  severity:fill_ok?'pass':'warn'},
    {name:'U1 Tj < 135°C',      standard:'IEC 62368-1', pass:thermal.U1_Tj<135, detail:`Tj=${thermal.U1_Tj}°C`, severity:thermal.U1_Tj>=150?'error':thermal.U1_Tj>=135?'warn':'pass'},
    {name:'D3 Tj < 110°C',      standard:'IEC 62368-1', pass:thermal.D3_Tj<110, detail:`Tj=${thermal.D3_Tj}°C`, severity:thermal.D3_Tj>=125?'error':thermal.D3_Tj>=110?'warn':'pass'},
    {name:'Gap ≥ 0.05mm',       standard:'Mfg limit',   pass:Lgap_mm>=0.05, detail:`Gap=${R(Lgap_mm,3)}mm`,     severity:Lgap_mm<0.05?'warn':'pass'},
    {name:'fsw ≤ 500kHz',       standard:'CISPR 32',    pass:f.fsw_kHz<=500,detail:`fsw=${f.fsw_kHz}kHz`,      severity:f.fsw_kHz>500?'warn':'pass'},
    {name:'Reinforced isolation',standard:'IEC 62368-1', pass:f.isolationClass!=='basic'||f.vMax<=150, detail:`Class: ${f.isolationClass}`, severity:f.isolationClass==='basic'&&f.vMax>150?'warn':'pass'},
  ];
}

function buildWarnings({D_max,Ip_pk,eta,Bmax_actual,Bsat,fill_ok,Lgap_mm,form:f}) {
  const w=[];
  if(D_max*100>55)              w.push({level:'warn', msg:`D_max=${R(D_max*100,1)}% > 55% — saturation risk`});
  if(Ip_pk>6)                   w.push({level:'warn', msg:`Ip_pk=${R(Ip_pk,2)}A is high — verify ILIM`});
  if(eta<0.82)                  w.push({level:'warn', msg:`η=${R(eta*100,1)}% < 82% DOE Level VI`});
  if(Bmax_actual>=Bsat*0.80)   w.push({level:'warn', msg:`Bmax near saturation — consider larger core`});
  if(!fill_ok)                  w.push({level:'warn', msg:`Fill > 40% — increase core size`});
  if(Lgap_mm<0.05)             w.push({level:'warn', msg:`Gap=${R(Lgap_mm,3)}mm — difficult to manufacture`});
  if(f.fsw_kHz>200)            w.push({level:'warn', msg:`fsw=${f.fsw_kHz}kHz — use PC95/3C95 for low core loss`});
  return w;
}

function buildAssembly({core,windings,Lgap_mm,form:f,Np,Ns,Nb,mat}) {
  const pri=windings[0], sec=windings[1];
  const isol=calcIsolation(f.isolationClass,f.vMax);
  const tapeLayers=isol.tape_layers_pri;
  const tapeDesc=tapeLayers===3?'3 layers (reinforced — mandatory for mains-connected PSU)':tapeLayers===2?'2 layers (supplementary)':'1 layer (basic)';
  return [
    {title:`Prepare ${core.name} bobbin`,detail:`Inspect bobbin for cracks. Mark primary start pin 1. Clean with IPA.`,spec:`Core: ${core.name} | Material: ${mat.name} | MLT: ${core.MLT_mm}mm | Wa: ${core.Wa_mm2}mm²`},
    {title:'Apply base insulation tape',detail:`Apply 1 layer 25µm polyester tape across full bobbin width to form electrical base.`},
    {title:`Wind Primary (P) — ${Np} turns, AWG${pri?.awg}`,detail:`Wind ${Np} turns of ${pri?.strands}×AWG${pri?.awg} (${pri?.dia_mm}mm) wire. Wind left-to-right uniformly. Leave 3mm margin at each bobbin flange.`,spec:`Np=${Np}T | strands=${pri?.strands} | AWG${pri?.awg} | Irms=${pri?.Irms}A | J=${pri?.J_Amm2}A/mm²`},
    {title:`Apply primary insulation — ${tapeDesc}`,detail:`Apply ${tapeLayers} layer(s) of 40µm polyester tape across full winding. Each layer minimum 3mm margin on both sides to achieve creepage distance.`,spec:`Creepage required: ${isol.creepage_mm}mm | Clearance: ${isol.clearance_mm}mm (IEC 62368-1)`},
    {title:`Wind Secondary (S1) — ${Ns} turns, AWG${sec?.awg}`,detail:`Wind ${Ns} turns of ${sec?.strands}×AWG${sec?.awg} wire. Mark polarity dot (•) at winding start. Respect polarity relative to primary.`,spec:`Ns=${Ns}T | strands=${sec?.strands} | AWG${sec?.awg} | Irms=${sec?.Irms}A`},
    {title:`Wind Bias (B) — ${Nb} turns`,detail:`Wind ${Nb} turns of thin wire for IC bias supply. Keep close to primary to maintain tight coupling.`},
    {title:'Apply final outer insulation',detail:`Apply 2 layers 25µm polyester tape over all windings. Press core halves together, check gap symmetry.`},
    {title:`Insert air gap shims`,detail:`Insert ${R(Lgap_mm/2,3)}mm shim (each leg) cut from ${R(Lgap_mm/2*1000/25.4,0)}mil polyester film on centre post only. Check both legs equal.`,spec:`Total gap: ${R(Lgap_mm,3)}mm | Per leg: ${R(Lgap_mm/2,3)}mm | Al target: ${result.value?.Al_eff_nH}nH/T²`},
    {title:'Secure core assembly',detail:`Wrap core perimeter with 3 passes of 25mm self-adhesive polyester tape. Ensure no visible air gap on outer limbs.`},
    {title:'Final electrical test',detail:`Measure Lp (primary, secondary open). Measure Llk (primary, secondary shorted). Hi-Pot 3kVAC 1 second primary→secondary.`,spec:`Lp target: ${result.value?.Lp_uH}µH ±15% | Llk < 3% of Lp | Hi-Pot: 3kVAC / 1s`},
  ];
}

// ── UI actions ────────────────────────────────────────────────────────────────
function addOutput()    { if(form.value.outputs.length<4) form.value.outputs.push({voltage:5,current:1}); }
function removeOutput(i){ form.value.outputs.splice(i,1); }
function resetForm()    { result.value=null; selectedPreset.value=''; }

function applyPreset(label) {
  const p = PRESETS.find(x=>x.label===label);
  if (p) { Object.assign(form.value, JSON.parse(JSON.stringify(p))); result.value=null; }
}

function exportReport() {
  if (!result.value) return;
  const r=result.value, f=form.value;
  const lines = [
    'FluxForge Magnetics Designer — Design Report',
    '='.repeat(48),
    `Date: ${new Date().toLocaleString()}`,
    `Core: ${f.coreMaterial}${r.core.name}  |  Vin: ${f.vMin}–${f.vMax}V AC  |  ${f.fsw_kHz}kHz  |  η=${r.eta_pct}%`,
    `Pout: ${f.Pout}W  |  ${f.outputs.map(o=>o.voltage+'V/'+o.current+'A').join(' + ')}`,
    '',
    'WINDING SUMMARY',
    '-'.repeat(40),
    ...r.windings.map(w=>`${w.name.padEnd(20)} ${w.turns}T  AWG${w.awg}  ×${w.strands}  Irms=${w.Irms}A  J=${w.J_Amm2}A/mm²  DCR=${w.DCR_mohm}mΩ  CMA=${w.CMA_cmils}Cmils/A`),
    '',
    'CORE & GAP',
    '-'.repeat(40),
    `Core: ${r.core.name}  Ae=${r.core.Ae_mm2}mm²  Le=${r.core.Le_mm}mm  Ve=${r.core.Ve_mm3}mm³`,
    `Al gapped: ${r.Al_eff_nH}nH/T²  |  Gap: ${r.gap_mm}mm total / ${R(r.gap_mm/2,3)}mm/leg`,
    `Lp: ${r.Lp_uH}µH  Bmax: ${r.Bmax_mT}mT  Fill: ${r.fill_pct}%`,
    '',
    'STATUS: ' + r.status,
    '',
    'LIST OF MATERIALS',
    '-'.repeat(40),
    ...bomItems.value.map((it,i)=>`[${i+1}] ${it}`),
  ];
  const a=document.createElement('a');
  a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(lines.join('\n'));
  a.download=`Magnetics_${f.Pout}W_${r.core.name}_${f.coreMaterial}.txt`;
  a.click();
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════ */
/* ROOT & TOP TOOLBAR                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
.md-root {
  display: flex; flex-direction: column; height: 100%;
  background: #e8eaf0; font-family: 'Segoe UI', Arial, sans-serif;
  font-size: .8rem; color: #1a1a2e; overflow: hidden;
}
.md-topbar {
  display: flex; align-items: center; gap: .3rem; flex-wrap: wrap;
  padding: .28rem .6rem; background: #1B3A6B;
  border-bottom: 2px solid #0066A6; flex-shrink: 0;
}
.md-brand { font-size: .85rem; font-weight: 800; color: #FFFFFF; white-space: nowrap; letter-spacing:.02em; }
.md-topbar-sep { width: 1px; height: 18px; background: rgba(255,255,255,.25); margin: 0 .2rem; }
.md-qi { display: flex; align-items: center; gap: .2rem; }
.md-qi label { font-size: .6rem; color: #A8C8E8; white-space: nowrap; }
.md-inp {
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25); color: #FFFFFF;
  border-radius: 3px; padding: .13rem .3rem; font-size: .73rem; width: 58px;
}
.md-inp:focus { outline: none; border-color: #A8C8E8; background: rgba(255,255,255,.2); }
.md-inp-sm  { width: 46px; }
.md-inp-xs  { width: 36px; }
.md-inp-md  { width: 82px; }
select.md-inp { width: 80px; }
.md-tb-run {
  padding: .22rem .7rem; background: #0066A6; border: 1px solid #005490;
  color: #fff; border-radius: 3px; font-size: .73rem; font-weight: 700; cursor: pointer;
}
.md-tb-run:hover:not(:disabled) { background: #005490; }
.md-tb-run:disabled { opacity: .4; cursor: not-allowed; }
.md-tb-btn {
  padding: .22rem .55rem; background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.2); color: #C8DEF0; border-radius: 3px;
  font-size: .72rem; cursor: pointer;
}
.md-tb-btn:hover { background: rgba(255,255,255,.2); color:#FFFFFF; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 6-PANEL WORKSPACE — two flex rows, each filling half the height             */
/* ═══════════════════════════════════════════════════════════════════════════ */
.md-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  gap: 2px;
  background: #C8D4E4;
  padding: 2px;
}
.md-workspace-row {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 2px;
}
.md-panel {
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  overflow: hidden;
  min-width: 0;
  flex: 1;
}
/* Row 1 (top, ~60%): Mech panel (2/3) + right-col with Windings+WindProp */
.md-row-top { flex: 2.2; }
.md-row-top .p-mech { flex: 2; }
.md-right-col {
  flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; min-height: 0;
}
.md-right-col .p-winfo    { flex: 1.4; }
.md-right-col .p-windprop { flex: 1; }
/* Row 2 (bottom, ~40%): Elec + CoilProp + Instructions */
.md-row-bot { flex: 1.5; }
.p-elec     { flex: 1; }
.p-coilprop { flex: 1; }
.p-instr    { flex: 1; }

/* ── Panel title bars ────────────────────────────────────────────────────── */
.md-panel-title {
  display: flex;
  align-items: center;
  gap: .25rem;
  padding: .2rem .4rem;
  font-size: .72rem;
  font-weight: 700;
  flex-shrink: 0;
  user-select: none;
  min-height: 0;
  flex-wrap: wrap;
}
.md-title-cyan { background: #1B3A6B; color: #fff; }
.md-title-dark { background: #24467A; color: #C8DEF0; }
.md-title-btns { margin-left: auto; display: flex; gap: .2rem; flex-shrink: 0; }
.md-titlebtn {
  background: none;
  border: 1px solid rgba(255,255,255,.35);
  color: rgba(255,255,255,.85);
  border-radius: 2px;
  padding: .05rem .22rem;
  font-size: .58rem;
  cursor: pointer;
  line-height: 1.2;
}
.md-titlebtn-dk { border-color: rgba(255,255,255,.2); color: rgba(255,255,255,.6); }
.md-titlebtn:hover { background: rgba(255,255,255,.2); }

/* ── Panel body — fills remaining space, content scrolls inside ──────────── */
.md-panel-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PANEL 1: MECHANICAL DIAGRAM                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
.mech-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background: #fafafa;
  padding: .25rem;
}
/* All SVG diagrams inside mech-body scale to fill available width */
.mech-svg,
.spiral-svg,
.constr-svg,
.dsgn-svg,
.foundry-svg,
.threed-svg,
.therm-svg {
  display: block;
  width: 100%;
  height: auto;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PANEL 2: WINDINGS INFO                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
.wi-body { overflow-y: auto; padding: 0; }
.wi-header {
  padding: .3rem .55rem; font-size: .72rem; color: #333;
  border-bottom: 1px solid #e0e4ea; flex-shrink: 0;
}
.wi-header strong { color: #1a1a2e; }
/* Per-winding card — coloured left border like in the screenshot */
.wi-card {
  border-left: 4px solid #888; margin: .25rem .4rem;
  border-radius: 3px; overflow: hidden;
}
.wi-color-tag {
  display: inline-block; width: 10px; height: 10px;
  border-radius: 50%; margin-right: .3rem; vertical-align: middle;
}
.wi-line1 {
  padding: .22rem .5rem; font-size: .72rem; color: #1a1a2e;
  font-family: monospace; line-height: 1.5;
}
.wi-line2 {
  padding: .1rem .5rem .22rem; font-size: .68rem;
  color: #3a4a7a; font-family: monospace; line-height: 1.5;
}
.wi-footnote {
  margin-top: auto; padding: .35rem .55rem;
  font-size: .63rem; color: #777; border-top: 1px solid #e8eaf0;
  font-style: italic; flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PANEL 3: ELECTRICAL DIAGRAM                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
.elec-body {
  background: #fff; align-items: center; justify-content: center; padding: .3rem;
}
.elec-svg { display: block; max-width: 100%; max-height: 100%; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PANEL 4: COIL FORMER PROPERTIES                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
.cfp-body { overflow-y: auto; padding: 0; }
.cfp-table { width: 100%; border-collapse: collapse; font-size: .72rem; }
.cfp-table td {
  padding: .22rem .55rem; border-bottom: 1px solid #eee; vertical-align: top;
}
.cfp-label { color: #555; width: 44%; font-size: .7rem; }
.cfp-val   { color: #1a1a2e; font-family: monospace; }
.cfp-gray  .cfp-label, .cfp-gray  .cfp-val { color: #aaa; }
.cfp-table tr:hover { background: #f5f8ff; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PANEL 5: WINDING PROPERTIES                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
.wp-body { overflow-y: auto; padding: 0; }
.cfp-table th {
  background: #f0f2fa; color: #555; padding: .22rem .45rem;
  font-size: .65rem; font-weight: 700; border-bottom: 2px solid #d0d4e8;
  text-align: left; white-space: nowrap;
}
.wp-dot {
  display: inline-block; width: 9px; height: 9px;
  border-radius: 50%; margin-right: .3rem; vertical-align: middle;
}
.wp-ok   { color: #38A169; font-weight: 700; }
.wp-warn { color: #0066A6; font-weight: 700; }
.wp-pri  { background: #eff6ff; }
.wp-sec  { background: #fff5f5; }
.wp-bias { background: #fff8ee; }
.wp-compliance { border-top: 1px solid #e0e4ea; padding: .4rem; }
.wp-comp-hd {
  font-size: .65rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: .07em; color: #555; margin-bottom: .3rem;
}
.wp-chk {
  display: flex; align-items: flex-start; gap: .3rem;
  padding: .15rem .2rem; border-radius: 3px; margin-bottom: .1rem;
  font-size: .68rem;
}
.wp-chk-icon { flex-shrink: 0; font-weight: 700; }
.wp-chk-name { flex: 1; }
.wp-chk-val  { color: #777; font-family: monospace; font-size: .65rem; }
.chk-pass  { background: rgba(5,150,105,.08); color: #276749; }
.chk-warn  { background: rgba(217,119,6,.08);  color: #92400e; }
.chk-error { background: rgba(220,38,38,.08);  color: #7f1d1d; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PANEL 6: INSTRUCTIONS                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
.instr-body { overflow-y: auto; display: flex; flex-direction: column; }
/* Formatting toolbar — matches PI Expert screenshot closely */
.instr-toolbar {
  display: flex; align-items: center; gap: .1rem; flex-wrap: wrap;
  padding: .25rem .4rem; background: #f4f5f8;
  border-bottom: 1px solid #d4d8e8; flex-shrink: 0;
}
.it-btn {
  padding: .18rem .48rem; font-size: .7rem; font-weight: 600;
  border: 1px solid #c0c4d8; border-radius: 3px; background: #fff;
  cursor: pointer; color: #333;
}
.it-active { background: #ddeeff; border-color: #0066A6; color: #0066CC; }
.it-btn:hover { background: #eef2ff; }
.it-sep  { width: 1px; height: 14px; background: #c8ccd8; margin: 0 .15rem; }
.it-fmt  {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: 1px solid #c0c4d8;
  border-radius: 2px; font-size: .72rem; cursor: pointer; color: #444; background: #fff;
}
.it-fmt:hover { background: #eef2ff; }
.it-i    { font-style: italic; }
.it-s    { text-decoration: line-through; }
.instr-content { padding: .5rem .65rem; flex: 1; }
.instr-bom-title {
  font-size: .92rem; font-weight: 800; color: #1a1a2e;
  margin-bottom: .5rem; padding-bottom: .25rem;
  border-bottom: 1px solid #e0e4ea;
}
/* BOM table — matches PI Expert screenshot style */
.bom-table { width: 100%; border-collapse: collapse; font-size: .73rem; }
.bom-table th {
  background: #f0f2fa; color: #444; padding: .25rem .5rem;
  font-size: .68rem; font-weight: 700; border: 1px solid #d4d8e8;
  text-align: left;
}
.bom-table td {
  padding: .22rem .5rem; border: 1px solid #eaecf2;
  vertical-align: top; color: #2a2a3e; line-height: 1.45;
}
.bom-table tr:hover td { background: #f8f9ff; }
.bom-item-num { width: 32px; color: #0066CC; font-family: monospace; font-weight: 700; }
/* Assembly steps */
.asm-step {
  display: flex; gap: .5rem; padding: .35rem 0;
  border-bottom: 1px solid #f0f2f8;
}
.asm-num {
  width: 22px; height: 22px; background: #0066CC; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .65rem; font-weight: 800; color: #fff; flex-shrink: 0;
}
.asm-title  { font-size: .75rem; font-weight: 700; color: #1a1a2e; }
.asm-detail { font-size: .68rem; color: #555; margin-top: .1rem; line-height: 1.5; }
.asm-spec   {
  font-size: .64rem; color: #0066CC; font-family: monospace;
  margin-top: .15rem; background: #eef8ff; padding: .12rem .35rem; border-radius: 3px;
}
/* Compliance items */
.ic-chk {
  display: flex; align-items: flex-start; gap: .4rem;
  padding: .28rem .4rem; border-radius: 4px; margin-bottom: .2rem;
}
.ic-icon { font-size: .85rem; flex-shrink: 0; font-weight: 700; }
.ic-name { font-size: .73rem; font-weight: 700; color: #1a1a2e; }
.ic-detail { font-size: .67rem; color: #555; font-family: monospace; margin-top: .08rem; }
.ic-std { font-size: .62rem; color: #888; margin-left: auto; white-space: nowrap; flex-shrink: 0; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* CONFIG SCREEN (pre-run)                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
.md-config { flex: 1; overflow-y: auto; padding: 1rem; background: #f0f2f8; }
.cfg-header {
  display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  margin-bottom: .8rem;
}
.cfg-title { font-size: .95rem; font-weight: 800; color: #1B3A6B; }
.cfg-presets { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
.cfg-presets span { font-size: .73rem; color: #666; }
.cfg-preset-btn {
  padding: .2rem .55rem; border: 1px solid #0066CC; border-radius: 12px;
  background: #e8f5fe; color: #0066CC; font-size: .7rem; cursor: pointer;
}
.cfg-preset-btn:hover { background: #d0ecfd; }
.cfg-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: .7rem;
}
.cfg-section {
  background: #fff; border: 1px solid #d8dcea; border-radius: 6px; padding: .6rem;
}
.cfg-sec-title {
  font-size: .7rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: .07em; color: #0066CC;
  padding-bottom: .3rem; border-bottom: 1px solid #e0e4ea;
  margin-bottom: .4rem; display: flex; align-items: center; justify-content: space-between;
}
.cfg-add-btn {
  font-size: .62rem; padding: .1rem .35rem;
  border: 1px solid #0066CC; background: #e8f5fe; color: #0066CC;
  border-radius: 3px; cursor: pointer;
}
.cfg-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem .5rem; }
.cfg-f { display: flex; flex-direction: column; gap: .1rem; }
.cfg-f label { font-size: .62rem; color: #777; text-transform: uppercase; letter-spacing: .04em; }
.cfg-f-sm { flex: 0 0 68px; }
.cfg-inp {
  background: #fff; border: 1px solid #c8ccd8; color: #1a1a2e;
  border-radius: 3px; padding: .22rem .4rem; font-size: .75rem; width: 100%;
  box-sizing: border-box;
}
.cfg-inp:focus { outline: none; border-color: #0066CC; }
.cfg-out-row {
  display: flex; align-items: flex-end; gap: .3rem; margin-bottom: .3rem;
}
.cfg-out-lbl { font-size: .65rem; color: #888; white-space: nowrap; padding-bottom: .25rem; }
.cfg-out-pw  { font-size: .68rem; color: #0066CC; padding-bottom: .25rem; }
.cfg-del-btn {
  background: #FFF5F5; border: none; color: #0066A6;
  border-radius: 3px; cursor: pointer; padding: .2rem .4rem;
}
.cfg-run-row {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; margin-top: 1.2rem;
}
.cfg-run-btn {
  padding: .5rem 2.5rem; background: #0066CC; border: 2px solid #0066A6;
  color: #fff; border-radius: 6px; font-size: .9rem; font-weight: 800; cursor: pointer;
}
.cfg-run-btn:hover:not(:disabled) { background: #0398e1; }
.cfg-run-btn:disabled { opacity: .4; cursor: not-allowed; }
.cfg-run-hint { font-size: .72rem; color: #888; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* WARNING BAR                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
.md-warnbar {
  display: flex; gap: .35rem; flex-wrap: wrap;
  padding: .2rem .5rem; background: #fff8ee;
  border-top: 1px solid #D97706; flex-shrink: 0;
}
.md-warn-pill {
  font-size: .68rem; padding: .1rem .4rem;
  background: #FFFBEB; border-radius: 3px; color: #92400e;
}
.pill-err { background: #FFF5F5; color: #991b1b; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MECHANICAL DIAGRAM TABS & SPIRAL VIEW                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
.md-mech-tabs {
  display: flex; flex-wrap: wrap; gap: 2px; margin: 0 .2rem; flex: 1;
}
.md-mech-tab {
  padding: .08rem .32rem; border: 1px solid rgba(255,255,255,.4);
  background: rgba(255,255,255,.12); color: rgba(255,255,255,.85);
  border-radius: 3px; font-size: .62rem; font-weight: 600; cursor: pointer;
  white-space: nowrap;
}
.md-mech-tab:hover { background: rgba(255,255,255,.22); }
.mmt-active {
  background: rgba(255,255,255,.9) !important;
  color: #0066CC !important; border-color: rgba(255,255,255,.9) !important;
}

/* ── All diagram wrappers: flex column, scroll, fill available space ───────── */
.spiral-wrap,
.constr-wrap,
.dsgn-wrap,
.foundry-wrap,
.threed-wrap,
.therm-wrap,
.dims-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: .25rem;
}
.spiral-wrap  { background: #f9f9f9; }
.constr-wrap  { background: #fdfdfd; }
.dsgn-wrap    { background: #fff; }
.foundry-wrap { background: #f8f8f8; }
.threed-wrap  { background: #1a1e35; }
.therm-wrap   { background: #F4F6F9; }
.dims-wrap    { background: #fff; }

/* ── Dimensions scale bar ─────────────────────────────────────────────────── */
.dims-scale-bar {
  display: flex; align-items: center; gap: .6rem;
  padding: .25rem .5rem; background: #f0f4ff;
  border-bottom: 1px solid #d0d8ee; flex-shrink: 0; flex-wrap: wrap;
}
.dims-scale-label { font-size: .72rem; color: #555; font-weight: 600; }
.dims-ruler { height: 16px; border: 1px solid #1a56c8; position: relative; flex-shrink: 0; }
.dims-ruler-inner { position: absolute; left: 0; top: 0; bottom: 0; width: 50%; background: #1a56c8; opacity: 0.25; }
.dims-ruler span { position: absolute; right: 2px; top: 1px; font-size: .65rem; color: #1a56c8; font-family: monospace; }
.dims-scale-hint { font-size: .7rem; color: #888; }

/* ── Spiral legend (outside SVG) ─────────────────────────────────────────── */
.spiral-legend {
  display: flex; align-items: center; justify-content: space-between;
  padding: .25rem .5rem .2rem; background: #f9f9f9;
  border-top: 1px solid #e0e4ea; flex-shrink: 0;
}
.spiral-legend-items {
  display: flex; flex-wrap: wrap; gap: .3rem .9rem; flex: 1;
}
.spiral-leg-item {
  display: flex; align-items: center; gap: .3rem; font-size: .72rem; color: #333;
}
.spiral-leg-swatch {
  width: 14px; height: 10px; border-radius: 2px; flex-shrink: 0; opacity: .8;
}
.spiral-leg-label { white-space: nowrap; }
.spiral-stats {
  display: flex; gap: .6rem; font-size: .72rem; font-family: monospace;
  flex-shrink: 0; padding-left: .75rem; border-left: 1px solid #e0e4ea;
}
.ss-ok   { color: #38A169; font-weight: 700; }
.ss-warn { color: #0066A6; font-weight: 700; }
.ss-dim  { color: #888; }

.dims-svg { display: block; width: 100%; height: auto; max-width: 100%; }
</style>
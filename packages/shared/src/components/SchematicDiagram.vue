<template>
  <div class="sd-wrap">
    <div class="sd-toolbar">
      <button class="sd-tb-btn" @click="zoom = Math.min(zoom+0.25,4)">＋</button>
      <button class="sd-tb-btn" @click="zoom = Math.max(zoom-0.25,0.3)">－</button>
      <button class="sd-tb-btn" @click="fitView">Fit</button>
      <button class="sd-tb-btn" @click="zoom=1;panX=0;panY=0">1:1</button>
      <span class="sd-zoom-label">{{ Math.round(zoom*100) }}%</span>
      <span class="sd-title">{{ uds?.meta?.fileName }}.uds</span>
    </div>

    <div class="sd-canvas" ref="canvasEl"
      @wheel.prevent="onWheel"
      @mousedown="startPan" @mousemove="doPan"
      @mouseup="endPan" @mouseleave="endPan">
      <div class="sd-inner" :style="{ transform:`translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin:'0 0' }">

        <!-- ── HPFC-1 / HX / GX (default flyback) ───────── -->
        <svg v-if="schematicType==='hpfc'" width="1440" height="660" viewBox="0 0 1440 660"
          xmlns="http://www.w3.org/2000/svg" class="sd-svg"
          @mousemove="onSvgMouseMove" @mouseleave="onSvgMouseLeave"
          @click="onSvgClick"
          :style="hoveredRef ? 'cursor:pointer' : 'cursor:default'">
          <defs>
            <pattern id="sgrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0L0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
            </pattern>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0,0 6,3 0,6" fill="#555"/>
            </marker>
          </defs>
          <rect width="1440" height="660" fill="white"/>
          <rect width="1440" height="660" fill="url(#sgrid)"/>

          <!-- ══ PRIMARY POWER RAILS ════════════════════════════════════════ -->
          <!-- Top HV+ rail -->
          <line x1="28" y1="100" x2="1380" y2="100" stroke="#444" stroke-width="1.5"/>
          <!-- Bottom RTN rail -->
          <line x1="28" y1="555" x2="1380" y2="555" stroke="#444" stroke-width="1.5"/>
          <!-- Secondary output top rail (VOUT) -->
          <line x1="838" y1="155" x2="1380" y2="155" stroke="#444" stroke-width="1.5"/>

          <!-- ══ AC INPUT ═══════════════════════════════════════════════════ -->
          <line x1="28" y1="100" x2="28" y2="318" stroke="#444" stroke-width="1.5"/>
          <line x1="28" y1="382" x2="28" y2="555" stroke="#444" stroke-width="1.5"/>
          <circle cx="28" cy="318" r="4" fill="none" stroke="#444" stroke-width="1.5"/>
          <circle cx="28" cy="382" r="4" fill="none" stroke="#444" stroke-width="1.5"/>
          <text x="4"  y="315" font-size="8.5" fill="#444" font-family="Arial,sans-serif">85 - 265</text>
          <text x="12" y="328" font-size="8.5" fill="#444" font-family="Arial,sans-serif">VAC</text>

          <!-- ══ F1 FUSE ════════════════════════════════════════════════════ -->
          <line x1="28" y1="100" x2="57" y2="100" stroke="#444" stroke-width="1.5"/>
          <rect x="57" y="91" width="50" height="18" rx="9" fill="none" stroke="#444" stroke-width="1.5"/>
          <line x1="107" y1="100" x2="138" y2="100" stroke="#444" stroke-width="1.5"/>
          <text x="66" y="88" font-size="8" fill="#333" font-weight="600" font-family="Arial,sans-serif">F1</text>
          <text x="58" y="122" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('F1','value') || '1.25 A' }}</text>

          <!-- ══ C1 Y-CAP ═══════════════════════════════════════════════════ -->
          <line x1="138" y1="100" x2="122" y2="100" stroke="#444" stroke-width="1.5"/>
          <line x1="122" y1="84" x2="122" y2="116" stroke="#444" stroke-width="2.5"/>
          <line x1="128" y1="84" x2="128" y2="116" stroke="#444" stroke-width="2.5"/>
          <line x1="128" y1="100" x2="148" y2="100" stroke="#444" stroke-width="1.5"/>
          <line x1="125" y1="116" x2="125" y2="555" stroke="#444" stroke-width="1"/>
          <text x="132" y="88" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C1</text>
          <text x="133" y="98" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('C1','value') || '47 nF' }}</text>
          <text x="133" y="107" font-size="7" fill="#777" font-family="Arial,sans-serif">250 V</text>

          <!-- ══ RT1 NTC THERMISTOR ══════════════════════════════════════════ -->
          <line x1="148" y1="100" x2="152" y2="100" stroke="#444" stroke-width="1.5"/>
          <rect x="152" y="91" width="44" height="18" rx="2" fill="#fff8ee" stroke="#444" stroke-width="1.3"/>
          <text x="157" y="103" font-size="7.5" fill="#333" font-family="Arial,sans-serif">{{ cv('RT1','value') || '8 Ω' }}</text>
          <line x1="196" y1="100" x2="210" y2="100" stroke="#444" stroke-width="1.5"/>
          <text x="153" y="88" font-size="7.5" fill="#333" font-weight="600" font-family="Arial,sans-serif">RT1</text>
          <text x="153" y="120" font-size="7" fill="#777" font-family="Arial,sans-serif">8 Ω</text>
          <!-- thermistor symbol: t° -->
          <text x="187" y="88" font-size="8" fill="#d97706" font-family="Arial,sans-serif">t°</text>

          <!-- ══ L1 COMMON-MODE CHOKE ════════════════════════════════════════ -->
          <!-- Top (line) winding -->
          <path d="M 210,100 C 210,88 220,88 220,100 C 220,88 230,88 230,100 C 230,88 240,88 240,100 C 240,88 250,88 250,100" fill="none" stroke="#444" stroke-width="2"/>
          <line x1="250" y1="100" x2="280" y2="100" stroke="#444" stroke-width="1.5"/>
          <text x="218" y="80" font-size="8" fill="#333" font-weight="600" font-family="Arial,sans-serif">L1</text>
          <text x="214" y="120" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('L1','value') || '6 mH' }}</text>
          <!-- Bottom (neutral) winding -->
          <line x1="28" y1="382" x2="210" y2="382" stroke="#444" stroke-width="1.5"/>
          <path d="M 210,382 C 210,370 220,370 220,382 C 220,370 230,370 230,382 C 230,370 240,370 240,382 C 240,370 250,370 250,382" fill="none" stroke="#444" stroke-width="2"/>
          <line x1="250" y1="382" x2="280" y2="382" stroke="#444" stroke-width="1.5"/>
          <!-- Coupling bar (ferrite) -->
          <line x1="230" y1="107" x2="230" y2="375" stroke="#b8860b" stroke-width="2"/>

          <!-- ══ BR1 BRIDGE RECTIFIER ════════════════════════════════════════ -->
          <!-- Box -->
          <rect x="280" y="170" width="90" height="220" rx="4" fill="#f5f8ff" stroke="#888" stroke-width="1.5"/>
          <text x="298" y="195" font-size="9" fill="#333" font-weight="700" font-family="Arial,sans-serif">BR1</text>
          <text x="282" y="408" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('BR1','part') || 'DF1506S' }}</text>
          <!-- + terminal label -->
          <text x="315" y="188" font-size="11" fill="#555" font-weight="700">+</text>
          <!-- Four diodes inside (simplified) -->
          <polygon points="290,225 300,210 310,225" fill="none" stroke="#555" stroke-width="1.3"/>
          <line x1="290" y1="210" x2="310" y2="210" stroke="#555" stroke-width="1.3"/>
          <polygon points="322,225 332,210 342,225" fill="none" stroke="#555" stroke-width="1.3"/>
          <line x1="322" y1="210" x2="342" y2="210" stroke="#555" stroke-width="1.3"/>
          <polygon points="290,345 300,330 310,345" fill="none" stroke="#555" stroke-width="1.3"/>
          <line x1="290" y1="330" x2="310" y2="330" stroke="#555" stroke-width="1.3"/>
          <polygon points="322,345 332,330 342,345" fill="none" stroke="#555" stroke-width="1.3"/>
          <line x1="322" y1="330" x2="342" y2="330" stroke="#555" stroke-width="1.3"/>
          <!-- AC input connections -->
          <line x1="280" y1="280" x2="280" y2="100" stroke="#444" stroke-width="1.5"/>
          <line x1="280" y1="300" x2="280" y2="382" stroke="#444" stroke-width="1.5"/>
          <!-- DC+ output top right → HV+ rail -->
          <line x1="370" y1="200" x2="400" y2="200" stroke="#444" stroke-width="1.5"/>
          <line x1="400" y1="200" x2="400" y2="100" stroke="#444" stroke-width="1.5"/>
          <!-- DC- output bottom right → RTN rail -->
          <line x1="370" y1="360" x2="400" y2="360" stroke="#444" stroke-width="1.5"/>
          <line x1="400" y1="360" x2="400" y2="555" stroke="#444" stroke-width="1.5"/>
          <!-- junction dots -->
          <circle cx="400" cy="100" r="3.5" fill="#444"/>
          <circle cx="400" cy="555" r="3.5" fill="#444"/>

          <!-- ══ C2 BULK ELECTROLYTIC ════════════════════════════════════════ -->
          <line x1="456" y1="100" x2="456" y2="148" stroke="#444" stroke-width="1.5"/>
          <line x1="442" y1="148" x2="470" y2="148" stroke="#444" stroke-width="2.5"/>
          <line x1="442" y1="155" x2="470" y2="155" stroke="#444" stroke-width="2.5"/>
          <line x1="456" y1="155" x2="456" y2="555" stroke="#444" stroke-width="1.5"/>
          <text x="474" y="148" font-size="8" fill="#333" font-weight="600" font-family="Arial,sans-serif">C2</text>
          <text x="474" y="157" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('C2','value') || '150 µF' }}</text>
          <text x="474" y="166" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('C2','voltage') || '400 V' }}</text>
          <circle cx="456" cy="100" r="3.5" fill="#444"/>
          <circle cx="456" cy="555" r="3.5" fill="#444"/>

          <!-- ══ R4 / R5 BLEED RESISTORS ════════════════════════════════════ -->
          <line x1="456" y1="100" x2="500" y2="100" stroke="#444" stroke-width="1"/>
          <!-- R4 -->
          <rect x="500" y="91" width="36" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <line x1="536" y1="98" x2="556" y2="98" stroke="#444" stroke-width="1"/>
          <text x="501" y="88" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R4</text>
          <text x="500" y="78" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('R4','value') || '7.32 MΩ' }}</text>
          <text x="500" y="88" font-size="6.5" fill="#777" font-family="Arial,sans-serif">2 W</text>
          <!-- R5 below R4 -->
          <line x1="500" y1="108" x2="500" y2="98" stroke="#444" stroke-width="1"/>
          <rect x="500" y="108" width="36" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <line x1="536" y1="115" x2="556" y2="115" stroke="#444" stroke-width="1"/>
          <line x1="556" y1="98" x2="556" y2="115" stroke="#444" stroke-width="1"/>
          <line x1="556" y1="106" x2="556" y2="555" stroke="#444" stroke-width="1" stroke-dasharray="3,2"/>
          <text x="501" y="107" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R5</text>
          <text x="500" y="134" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('R5','value') || '7.32 MΩ' }}</text>

          <!-- ══ R1 / R2 (V-pin startup resistors) ══════════════════════════ -->
          <rect x="473" y="72" width="34" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="474" y="69" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R1</text>
          <text x="473" y="97" font-size="7" fill="#777" font-family="Arial,sans-serif">51 kΩ / 2W</text>
          <rect x="515" y="72" width="34" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="516" y="69" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R2</text>
          <text x="515" y="97" font-size="7" fill="#777" font-family="Arial,sans-serif">51 kΩ / 2W</text>
          <line x1="490" y1="72" x2="490" y2="65" stroke="#444" stroke-width="1"/>
          <line x1="490" y1="65" x2="562" y2="65" stroke="#444" stroke-width="1"/>
          <line x1="562" y1="65" x2="562" y2="72" stroke="#444" stroke-width="1"/>
          <line x1="507" y1="72" x2="515" y2="72" stroke="#444" stroke-width="1"/>

          <!-- ══ C3 SNUBBER CAP ═══════════════════════════════════════════ -->
          <line x1="480" y1="86" x2="480" y2="142" stroke="#444" stroke-width="1"/>
          <line x1="470" y1="142" x2="490" y2="142" stroke="#444" stroke-width="2"/>
          <line x1="470" y1="148" x2="490" y2="148" stroke="#444" stroke-width="2"/>
          <line x1="480" y1="148" x2="480" y2="220" stroke="#444" stroke-width="1"/>
          <text x="493" y="147" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C3</text>
          <text x="493" y="157" font-size="7" fill="#777" font-family="Arial,sans-serif">3.9 nF / 1 kV</text>

          <!-- ══ VR1 CLAMP ═══════════════════════════════════════════════════ -->
          <line x1="562" y1="100" x2="562" y2="148" stroke="#444" stroke-width="1"/>
          <polygon points="554,148 570,148 562,163" fill="none" stroke="#555" stroke-width="1.3"/>
          <line x1="554" y1="163" x2="570" y2="163" stroke="#555" stroke-width="1.8"/>
          <line x1="562" y1="163" x2="562" y2="220" stroke="#444" stroke-width="1"/>
          <text x="574" y="158" font-size="7.5" fill="#333" font-family="Arial,sans-serif">VR1</text>
          <text x="574" y="168" font-size="7" fill="#777" font-family="Arial,sans-serif">160 V / 5%</text>

          <!-- ══ C6 SNUBBER ACROSS PRIMARY ════════════════════════════════ -->
          <line x1="562" y1="100" x2="562" y2="52" stroke="#444" stroke-width="1"/>
          <line x1="562" y1="52" x2="640" y2="52" stroke="#444" stroke-width="1"/>
          <line x1="638" y1="44" x2="638" y2="60" stroke="#444" stroke-width="2"/>
          <line x1="644" y1="44" x2="644" y2="60" stroke="#444" stroke-width="2"/>
          <line x1="644" y1="52" x2="672" y2="52" stroke="#444" stroke-width="1"/>
          <line x1="672" y1="52" x2="672" y2="100" stroke="#444" stroke-width="1"/>
          <text x="618" y="40" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C6</text>
          <text x="614" y="34" font-size="7" fill="#777" font-family="Arial,sans-serif">0.68 nF</text>
          <text x="614" y="27" font-size="7" fill="#777" font-family="Arial,sans-serif">250 VAC</text>
          <circle cx="562" cy="100" r="3.5" fill="#444"/>
          <circle cx="672" cy="100" r="3.5" fill="#444"/>

          <!-- ══ TRANSFORMER T1 ══════════════════════════════════════════════ -->
          <!-- T1 bounding box -->
          <rect x="590" y="88" width="168" height="364" rx="4" fill="#fdf8ff" stroke="#9b59b6" stroke-width="1.8"/>
          <text x="596" y="103" font-size="9" fill="#7c3aed" font-weight="700" font-family="Arial,sans-serif">T1</text>
          <text x="596" y="114" font-size="7" fill="#888" font-family="Arial,sans-serif">{{ cv('T1','part') || 'EFD30 (E...' }}</text>
          <!-- Ferrite core bars -->
          <line x1="658" y1="95" x2="658" y2="445" stroke="#7c3aed" stroke-width="4"/>
          <line x1="668" y1="95" x2="668" y2="445" stroke="#7c3aed" stroke-width="4"/>
          <!-- Primary winding (left of core, pins 1-2) -->
          <path d="M 656,135 A 10,10 0 0,1 656,155 A 10,10 0 0,1 656,175 A 10,10 0 0,1 656,195 A 10,10 0 0,1 656,215 A 10,10 0 0,1 656,235" fill="none" stroke="#0066A6" stroke-width="2.5"/>
          <!-- Polarity dot primary -->
          <circle cx="655" cy="138" r="5" fill="#0066A6"/>
          <!-- Bias winding (left of core, pins 3-4) -->
          <path d="M 656,265 A 9,9 0 0,1 656,283 A 9,9 0 0,1 656,301 A 9,9 0 0,1 656,319" fill="none" stroke="#ea7c0a" stroke-width="2"/>
          <!-- Secondary winding (right of core, pins 7-8) -->
          <path d="M 670,135 A 10,10 0 0,0 670,155 A 10,10 0 0,0 670,175" fill="none" stroke="#0066A6" stroke-width="2.5"/>
          <!-- Polarity dot secondary -->
          <circle cx="671" cy="138" r="5" fill="#0066A6"/>
          <!-- Pin numbers -->
          <text x="596" y="143" font-size="7.5" fill="#555" font-family="Arial,sans-serif">1</text>
          <text x="596" y="238" font-size="7.5" fill="#555" font-family="Arial,sans-serif">2</text>
          <text x="596" y="273" font-size="7.5" fill="#555" font-family="Arial,sans-serif">3</text>
          <text x="596" y="352" font-size="7.5" fill="#555" font-family="Arial,sans-serif">4</text>
          <text x="740" y="143" font-size="7.5" fill="#555" font-family="Arial,sans-serif">8</text>
          <text x="740" y="178" font-size="7.5" fill="#555" font-family="Arial,sans-serif">7</text>
          <text x="740" y="340" font-size="7.5" fill="#555" font-family="Arial,sans-serif">5</text>
          <!-- Winding labels -->
          <text x="596" y="202" font-size="7" fill="#0066A6" font-weight="600" font-family="Arial,sans-serif">Np={{ result?.Np || '?' }}T</text>
          <text x="596" y="284" font-size="7" fill="#ea7c0a" font-weight="600" font-family="Arial,sans-serif">Nb={{ result?.Nb || '?' }}T</text>
          <text x="672" y="163" font-size="7" fill="#0066A6" font-weight="600" font-family="Arial,sans-serif">Ns={{ result?.Ns || '?' }}T</text>
          <!-- T1 connection wires -->
          <!-- Pin 1: primary start → HV+ -->
          <line x1="590" y1="135" x2="562" y2="135" stroke="#555" stroke-width="1.5"/>
          <line x1="562" y1="135" x2="562" y2="100" stroke="#555" stroke-width="1.5"/>
          <line x1="456" y1="100" x2="562" y2="100" stroke="#555" stroke-width="1.5"/>
          <circle cx="562" cy="100" r="0" fill="#444"/>
          <!-- Pin 2: primary end → D pin of U1 (via SW node) -->
          <line x1="590" y1="235" x2="556" y2="235" stroke="#0066A6" stroke-width="1.5"/>
          <line x1="556" y1="235" x2="556" y2="470" stroke="#0066A6" stroke-width="1.5"/>
          <line x1="556" y1="470" x2="636" y2="470" stroke="#0066A6" stroke-width="1.5"/>
          <!-- Pin 8: secondary top → output -->
          <line x1="758" y1="135" x2="800" y2="135" stroke="#555" stroke-width="1.5"/>
          <!-- Pin 7: secondary bottom → D2 diode -->
          <line x1="758" y1="175" x2="800" y2="175" stroke="#555" stroke-width="1.5"/>
          <!-- Pin 4: bias out → GND area -->
          <line x1="590" y1="345" x2="560" y2="345" stroke="#ea7c0a" stroke-width="1.2"/>
          <line x1="758" y1="335" x2="800" y2="335" stroke="#ea7c0a" stroke-width="1.2"/>

          <!-- ══ D3 OUTPUT RECTIFIER ══════════════════════════════════════ -->
          <!-- D3: horizontal diode, cathode to output rail -->
          <line x1="800" y1="135" x2="818" y2="135" stroke="#555" stroke-width="1.5"/>
          <polygon points="818,127 818,143 832,135" fill="#555"/>
          <line x1="832" y1="127" x2="832" y2="143" stroke="#555" stroke-width="2"/>
          <line x1="832" y1="135" x2="880" y2="135" stroke="#555" stroke-width="1.5"/>
          <text x="818" y="122" font-size="7.5" fill="#333" font-weight="600" font-family="Arial,sans-serif">D3</text>
          <text x="810" y="152" font-size="7" fill="#777" font-family="Arial,sans-serif">{{ cv('D3','part') || 'V10D60C-...' }}</text>
          <!-- Cathode connects to VOUT rail at node -->
          <line x1="880" y1="100" x2="880" y2="155" stroke="#555" stroke-width="1.5"/>
          <circle cx="880" cy="155" r="3.5" fill="#444"/>

          <!-- ══ RCD CLAMP: R10, C7, D2 ══════════════════════════════════ -->
          <!-- D2: vertical diode from HV+ down to R10 junction -->
          <line x1="900" y1="100" x2="900" y2="118" stroke="#555" stroke-width="1.5"/>
          <polygon points="893,118 907,118 900,132" fill="#555"/>
          <line x1="893" y1="132" x2="907" y2="132" stroke="#555" stroke-width="1.8"/>
          <line x1="900" y1="132" x2="900" y2="140" stroke="#555" stroke-width="1.5"/>
          <text x="910" y="127" font-size="7.5" fill="#333" font-weight="600" font-family="Arial,sans-serif">D2</text>
          <circle cx="900" cy="100" r="3.5" fill="#444"/>
          <!-- R10 horizontal from T1 pin8 node to C7 -->
          <line x1="800" y1="140" x2="838" y2="140" stroke="#555" stroke-width="1.5"/>
          <rect x="838" y="132" width="40" height="16" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <line x1="878" y1="140" x2="900" y2="140" stroke="#555" stroke-width="1.5"/>
          <text x="840" y="128" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R10</text>
          <text x="838" y="160" font-size="7" fill="#777" font-family="Arial,sans-serif">22 Ω</text>
          <!-- Junction dot R10-D2 -->
          <circle cx="900" cy="140" r="3.5" fill="#444"/>
          <!-- C7 from R10-D2 junction to GND -->
          <line x1="900" y1="140" x2="938" y2="140" stroke="#555" stroke-width="1.5"/>
          <line x1="938" y1="120" x2="938" y2="140" stroke="#555" stroke-width="1.5"/>
          <line x1="926" y1="120" x2="950" y2="120" stroke="#555" stroke-width="2.2"/>
          <line x1="926" y1="114" x2="950" y2="114" stroke="#555" stroke-width="2.2"/>
          <line x1="938" y1="114" x2="938" y2="100" stroke="#555" stroke-width="1.5"/>
          <line x1="880" y1="100" x2="938" y2="100" stroke="#555" stroke-width="1.5"/>
          <text x="952" y="120" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C7</text>
          <text x="952" y="130" font-size="7" fill="#777" font-family="Arial,sans-serif">470 pF</text>
          <text x="952" y="139" font-size="7" fill="#777" font-family="Arial,sans-serif">200 V</text>
          <circle cx="938" cy="100" r="3.5" fill="#444"/>

          <!-- ══ D2 SECONDARY DIODE (bias secondary return) ══════════════ -->
          <line x1="800" y1="175" x2="818" y2="175" stroke="#555" stroke-width="1.5"/>
          <polygon points="818,167 818,183 832,175" fill="#555"/>
          <line x1="832" y1="167" x2="832" y2="183" stroke="#555" stroke-width="2"/>
          <line x1="832" y1="175" x2="880" y2="175" stroke="#555" stroke-width="1.5"/>
          <line x1="832" y1="155" x2="832" y2="175" stroke="#555" stroke-width="1.5"/>
          <!-- FDLL4448 label -->
          <text x="808" y="192" font-size="7" fill="#777" font-family="Arial,sans-serif">D2  FDLL4448...</text>
          <!-- Connect to output capacitor network -->
          <line x1="880" y1="175" x2="960" y2="175" stroke="#555" stroke-width="1.5"/>
          <circle cx="880" cy="175" r="3.5" fill="#444"/>

          <!-- ══ C9 OUTPUT CAP ════════════════════════════════════════════ -->
          <line x1="960" y1="155" x2="960" y2="173" stroke="#555" stroke-width="1.5"/>
          <line x1="948" y1="173" x2="972" y2="173" stroke="#555" stroke-width="2.5"/>
          <line x1="948" y1="179" x2="972" y2="179" stroke="#555" stroke-width="2.5"/>
          <line x1="960" y1="179" x2="960" y2="555" stroke="#555" stroke-width="1.5"/>
          <text x="976" y="170" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C9</text>
          <text x="976" y="179" font-size="7" fill="#777" font-family="Arial,sans-serif">470 µF</text>
          <text x="976" y="188" font-size="7" fill="#777" font-family="Arial,sans-serif">25 V</text>
          <circle cx="960" cy="155" r="3.5" fill="#444"/>
          <circle cx="960" cy="555" r="3.5" fill="#444"/>

          <!-- ══ C10 OUTPUT CAP ═══════════════════════════════════════════ -->
          <line x1="1020" y1="155" x2="1020" y2="173" stroke="#555" stroke-width="1.5"/>
          <line x1="1008" y1="173" x2="1032" y2="173" stroke="#555" stroke-width="2.5"/>
          <line x1="1008" y1="179" x2="1032" y2="179" stroke="#555" stroke-width="2.5"/>
          <line x1="1020" y1="179" x2="1020" y2="555" stroke="#555" stroke-width="1.5"/>
          <text x="1036" y="170" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C10</text>
          <text x="1036" y="179" font-size="7" fill="#777" font-family="Arial,sans-serif">470 µF</text>
          <text x="1036" y="188" font-size="7" fill="#777" font-family="Arial,sans-serif">25 V</text>
          <circle cx="1020" cy="155" r="3.5" fill="#444"/>
          <circle cx="1020" cy="555" r="3.5" fill="#444"/>

          <!-- ══ L2 OUTPUT CHOKE ══════════════════════════════════════════ -->
          <line x1="1020" y1="155" x2="1058" y2="155" stroke="#555" stroke-width="1.5"/>
          <path d="M 1058,155 A 9,9 0 0,1 1076,155 A 9,9 0 0,1 1094,155" fill="none" stroke="#555" stroke-width="2"/>
          <line x1="1094" y1="155" x2="1116" y2="155" stroke="#555" stroke-width="1.5"/>
          <text x="1063" y="142" font-size="7.5" fill="#333" font-family="Arial,sans-serif">L2</text>
          <text x="1060" y="170" font-size="7" fill="#777" font-family="Arial,sans-serif">3.3 µH</text>
          <circle cx="1020" cy="155" r="3.5" fill="#444"/>

          <!-- ══ C11 OUTPUT CAP ═══════════════════════════════════════════ -->
          <line x1="1116" y1="155" x2="1145" y2="155" stroke="#555" stroke-width="1.5"/>
          <line x1="1145" y1="143" x2="1145" y2="167" stroke="#555" stroke-width="2.5"/>
          <line x1="1151" y1="143" x2="1151" y2="167" stroke="#555" stroke-width="2.5"/>
          <line x1="1151" y1="155" x2="1200" y2="155" stroke="#555" stroke-width="1.5"/>
          <line x1="1148" y1="167" x2="1148" y2="555" stroke="#555" stroke-width="1.5"/>
          <text x="1156" y="148" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C11</text>
          <text x="1156" y="158" font-size="7" fill="#777" font-family="Arial,sans-serif">100 µF</text>
          <text x="1156" y="167" font-size="7" fill="#777" font-family="Arial,sans-serif">16 V</text>
          <circle cx="1148" cy="555" r="3.5" fill="#444"/>

          <!-- ══ OUTPUT TERMINALS ═════════════════════════════════════════ -->
          <circle cx="1380" cy="155" r="5" fill="#38A169"/>
          <text x="1392" y="159" font-size="10" fill="#38A169" font-weight="700" font-family="Arial,sans-serif">{{ outputVoltage }}V, {{ cv('out','current') || '5.000' }} A</text>
          <circle cx="1380" cy="555" r="5" fill="#555"/>
          <text x="1392" y="559" font-size="10" fill="#555" font-weight="700" font-family="Arial,sans-serif">RTN</text>
          <!-- Join output rail to VOUT line at right -->
          <line x1="1200" y1="155" x2="1380" y2="155" stroke="#444" stroke-width="1.5"/>

          <!-- ══ HPFC U1 IC ═════════════════════════════════════════ -->
          <rect x="638" y="440" width="132" height="104" rx="5" fill="#e8f4ff" stroke="#0066A6" stroke-width="2"/>
          <text x="646" y="460" font-size="9" fill="#003366" font-weight="700" font-family="Arial,sans-serif">HPFC-1</text>
          <rect x="668" y="466" width="62" height="22" rx="2" fill="#0066A6"/>
          <text x="685" y="481" font-size="8.5" fill="#fff" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle">CONTROL</text>
          <text x="653" y="500" font-size="8" fill="#555" font-family="Arial,sans-serif">{{ cv('U1','part') || 'TOP266EG' }}</text>
          <!-- Pin labels left -->
          <text x="622" y="458" font-size="8" fill="#333" font-family="Arial,sans-serif" text-anchor="end">D</text>
          <text x="622" y="473" font-size="8" fill="#333" font-family="Arial,sans-serif" text-anchor="end">V</text>
          <text x="622" y="488" font-size="8" fill="#333" font-family="Arial,sans-serif" text-anchor="end">C</text>
          <!-- Pin labels right -->
          <text x="778" y="458" font-size="8" fill="#333" font-family="Arial,sans-serif">S</text>
          <text x="778" y="473" font-size="8" fill="#333" font-family="Arial,sans-serif">X</text>
          <text x="778" y="488" font-size="8" fill="#333" font-family="Arial,sans-serif">F</text>
          <!-- D pin wire (SW node to primary end) -->
          <line x1="638" y1="456" x2="624" y2="456" stroke="#333" stroke-width="1.5"/>
          <line x1="624" y1="456" x2="556" y2="456" stroke="#333" stroke-width="1.5"/>
          <line x1="556" y1="456" x2="556" y2="235" stroke="#333" stroke-width="1.5"/>
          <!-- V pin wire to C5/R7-R8 network -->
          <line x1="638" y1="471" x2="616" y2="471" stroke="#333" stroke-width="1.2"/>
          <!-- S pin to primary GND -->
          <line x1="770" y1="456" x2="820" y2="456" stroke="#333" stroke-width="1.5"/>
          <line x1="820" y1="456" x2="820" y2="555" stroke="#333" stroke-width="1.5"/>
          <circle cx="820" cy="555" r="3.5" fill="#444"/>
          <!-- X pin to GND -->
          <line x1="770" y1="471" x2="796" y2="471" stroke="#333" stroke-width="1.2"/>
          <!-- F pin from optocoupler -->
          <line x1="770" y1="486" x2="808" y2="486" stroke="#555" stroke-width="1.2"/>

          <!-- ══ C4 BYPASS CAP (V pin) ════════════════════════════════════ -->
          <line x1="616" y1="471" x2="602" y2="471" stroke="#555" stroke-width="1.2"/>
          <line x1="602" y1="471" x2="602" y2="492" stroke="#555" stroke-width="1.2"/>
          <line x1="591" y1="492" x2="613" y2="492" stroke="#555" stroke-width="2.2"/>
          <line x1="591" y1="498" x2="613" y2="498" stroke="#555" stroke-width="2.2"/>
          <line x1="602" y1="498" x2="602" y2="555" stroke="#555" stroke-width="1.2"/>
          <text x="616" y="494" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C4</text>
          <text x="616" y="504" font-size="7" fill="#777" font-family="Arial,sans-serif">0.1 µF  16 V</text>
          <circle cx="602" cy="555" r="3.5" fill="#444"/>

          <!-- ══ C5 VOLTAGE CAP ═══════════════════════════════════════════ -->
          <line x1="638" y1="471" x2="638" y2="506" stroke="#555" stroke-width="1.2"/>
          <line x1="627" y1="506" x2="649" y2="506" stroke="#555" stroke-width="2.2"/>
          <line x1="627" y1="512" x2="649" y2="512" stroke="#555" stroke-width="2.2"/>
          <line x1="638" y1="512" x2="638" y2="555" stroke="#555" stroke-width="1.2"/>
          <text x="653" y="510" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C5</text>
          <text x="653" y="520" font-size="7" fill="#777" font-family="Arial,sans-serif">47 µF  10 V</text>
          <circle cx="638" cy="471" r="3.5" fill="#444"/>
          <circle cx="638" cy="555" r="3.5" fill="#444"/>

          <!-- ══ R9 CURRENT SENSE ═════════════════════════════════════════ -->
          <line x1="808" y1="486" x2="844" y2="486" stroke="#555" stroke-width="1.2"/>
          <rect x="844" y="479" width="32" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <line x1="876" y1="486" x2="900" y2="486" stroke="#555" stroke-width="1.2"/>
          <line x1="900" y1="486" x2="900" y2="555" stroke="#555" stroke-width="1.2"/>
          <text x="846" y="475" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R9</text>
          <text x="844" y="504" font-size="7" fill="#777" font-family="Arial,sans-serif">6.8 Ω</text>
          <circle cx="900" cy="555" r="3.5" fill="#444"/>

          <!-- ══ R6 SOURCE RESISTOR ═══════════════════════════════════════ -->
          <line x1="820" y1="555" x2="776" y2="555" stroke="#555" stroke-width="1.5"/>
          <rect x="736" y="547" width="40" height="16" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <line x1="736" y1="555" x2="710" y2="555" stroke="#555" stroke-width="1.5"/>
          <text x="740" y="543" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R6</text>
          <text x="736" y="572" font-size="7" fill="#777" font-family="Arial,sans-serif">7.68 kΩ / 1%</text>

          <!-- ══ D1 FREEWHEELING DIODE ════════════════════════════════════ -->
          <line x1="556" y1="235" x2="530" y2="235" stroke="#555" stroke-width="1"/>
          <line x1="530" y1="235" x2="530" y2="380" stroke="#555" stroke-width="1"/>
          <polygon points="523,380 537,380 530,395" fill="none" stroke="#555" stroke-width="1.3"/>
          <line x1="523" y1="395" x2="537" y2="395" stroke="#555" stroke-width="1.8"/>
          <line x1="530" y1="395" x2="530" y2="555" stroke="#555" stroke-width="1"/>
          <text x="540" y="390" font-size="7.5" fill="#333" font-family="Arial,sans-serif">D1</text>
          <text x="536" y="404" font-size="7" fill="#777" font-family="Arial,sans-serif">RS07K-GS...</text>

          <!-- ══ R7 / R8 V-pin divider ═══════════════════════════════════ -->
          <line x1="638" y1="471" x2="838" y2="471" stroke="#555" stroke-width="1" stroke-dasharray="4,2"/>
          <rect x="838" y="447" width="32" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="840" y="443" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R7</text>
          <text x="838" y="472" font-size="7" fill="#777" font-family="Arial,sans-serif">2 MΩ / 1%</text>
          <rect x="838" y="468" width="32" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="840" y="465" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R8</text>
          <text x="838" y="494" font-size="7" fill="#777" font-family="Arial,sans-serif">2 MΩ / 1%</text>
          <line x1="838" y1="454" x2="816" y2="454" stroke="#555" stroke-width="1.2"/>
          <line x1="816" y1="454" x2="816" y2="471" stroke="#555" stroke-width="1.2"/>
          <line x1="870" y1="454" x2="884" y2="454" stroke="#555" stroke-width="1.2"/>
          <line x1="884" y1="454" x2="884" y2="555" stroke="#555" stroke-width="1.2"/>
          <circle cx="884" cy="555" r="3.5" fill="#444"/>

          <!-- ══ U2A / U2B OPTOCOUPLER ════════════════════════════════════ -->
          <rect x="1040" y="380" width="60" height="54" rx="3" fill="#f0f4ff" stroke="#aaa" stroke-width="1.3"/>
          <text x="1048" y="397" font-size="8.5" fill="#555" font-weight="600" font-family="Arial,sans-serif">U2A</text>
          <text x="1044" y="409" font-size="7.5" fill="#777" font-family="Arial,sans-serif">LTV-817D</text>
          <!-- LED symbol -->
          <line x1="1054" y1="418" x2="1054" y2="428" stroke="#555" stroke-width="1"/>
          <polygon points="1050,428 1058,428 1054,436" fill="none" stroke="#555" stroke-width="1"/>
          <line x1="1050" y1="436" x2="1058" y2="436" stroke="#555" stroke-width="1.3"/>
          <!-- U2B -->
          <rect x="1040" y="444" width="60" height="54" rx="3" fill="#f0f4ff" stroke="#aaa" stroke-width="1.3"/>
          <text x="1048" y="461" font-size="8.5" fill="#555" font-weight="600" font-family="Arial,sans-serif">U2B</text>
          <text x="1044" y="473" font-size="7.5" fill="#777" font-family="Arial,sans-serif">LTV-817D</text>

          <!-- ══ U3 TL431 SHUNT REFERENCE ════════════════════════════════ -->
          <rect x="1140" y="440" width="58" height="54" rx="3" fill="#fff8ee" stroke="#d97706" stroke-width="1.3"/>
          <text x="1147" y="458" font-size="8.5" fill="#d97706" font-weight="600" font-family="Arial,sans-serif">U3</text>
          <text x="1143" y="471" font-size="7.5" fill="#888" font-family="Arial,sans-serif">TL431CD</text>
          <text x="1147" y="484" font-size="7" fill="#888" font-family="Arial,sans-serif">2%</text>

          <!-- ══ FEEDBACK NETWORK: R11-R15, C12, C13 ═════════════════════ -->
          <!-- R11 -->
          <rect x="1216" y="218" width="32" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="1218" y="214" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R11</text>
          <text x="1216" y="243" font-size="7" fill="#777" font-family="Arial,sans-serif">6190 Ω / 1%</text>
          <!-- R12 -->
          <rect x="1256" y="218" width="32" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="1258" y="214" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R12</text>
          <text x="1256" y="243" font-size="7" fill="#777" font-family="Arial,sans-serif">698 Ω / 1%</text>
          <!-- R13 -->
          <rect x="1216" y="378" width="32" height="14" rx="2" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="1218" y="374" font-size="7.5" fill="#333" font-family="Arial,sans-serif">R13</text>
          <text x="1216" y="403" font-size="7" fill="#777" font-family="Arial,sans-serif">1 kΩ</text>
          <!-- Vertical backbone from VOUT to RTN via R11/R13 -->
          <line x1="1232" y1="155" x2="1232" y2="218" stroke="#555" stroke-width="1.2"/>
          <line x1="1232" y1="232" x2="1232" y2="378" stroke="#555" stroke-width="1.2"/>
          <line x1="1232" y1="392" x2="1232" y2="555" stroke="#555" stroke-width="1.2"/>
          <circle cx="1232" cy="155" r="3.5" fill="#444"/>
          <circle cx="1232" cy="555" r="3.5" fill="#444"/>
          <!-- R12 junction wire -->
          <line x1="1248" y1="225" x2="1256" y2="225" stroke="#555" stroke-width="1.2"/>
          <line x1="1288" y1="225" x2="1305" y2="225" stroke="#555" stroke-width="1.2"/>
          <line x1="1305" y1="155" x2="1305" y2="225" stroke="#555" stroke-width="1.2"/>
          <circle cx="1305" cy="155" r="3.5" fill="#444"/>

          <!-- C12 bypass cap -->
          <line x1="1288" y1="155" x2="1288" y2="204" stroke="#555" stroke-width="1"/>
          <line x1="1277" y1="204" x2="1299" y2="204" stroke="#555" stroke-width="2.2"/>
          <line x1="1277" y1="210" x2="1299" y2="210" stroke="#555" stroke-width="2.2"/>
          <line x1="1288" y1="210" x2="1288" y2="555" stroke="#555" stroke-width="1"/>
          <text x="1302" y="208" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C12</text>
          <text x="1302" y="217" font-size="7" fill="#777" font-family="Arial,sans-serif">22 nF / 100 V</text>
          <circle cx="1288" cy="155" r="3.5" fill="#444"/>
          <circle cx="1288" cy="555" r="3.5" fill="#444"/>

          <!-- C13 compensation cap (across U3) -->
          <line x1="1148" y1="480" x2="1140" y2="480" stroke="#555" stroke-width="1"/>
          <line x1="1140" y1="468" x2="1140" y2="492" stroke="#555" stroke-width="2.2"/>
          <line x1="1134" y1="468" x2="1134" y2="492" stroke="#555" stroke-width="2.2"/>
          <line x1="1134" y1="480" x2="1116" y2="480" stroke="#555" stroke-width="1"/>
          <line x1="1116" y1="480" x2="1116" y2="555" stroke="#555" stroke-width="1"/>
          <text x="1143" y="464" font-size="7.5" fill="#333" font-family="Arial,sans-serif">C13</text>
          <text x="1143" y="497" font-size="7" fill="#777" font-family="Arial,sans-serif">100 nF / 16 V</text>
          <circle cx="1116" cy="555" r="3.5" fill="#444"/>

          <!-- ══ TITLE BLOCK ══════════════════════════════════════════════ -->
          <rect x="28" y="580" width="320" height="56" fill="#f8f9fb" stroke="#ddd" stroke-width="1"/>
          <text x="80" y="594" font-size="8.5" fill="#0066A6" font-weight="600" font-family="Arial,sans-serif">{{ uds?.meta?.fileName || 'Design' }}.uds</text>
          <text x="32" y="606" font-size="7.5" fill="#555" font-family="Arial,sans-serif">Topology: {{ uds?.meta?.topology || '—' }}  |  Family: {{ uds?.meta?.family || '—' }}</text>
          <text x="32" y="618" font-size="7.5" fill="#555" font-family="Arial,sans-serif">Input: {{ uds?.meta?.inputSpec || '—' }}  |  Power: {{ (uds?.meta?.totalPower||0).toFixed(1) }}W</text>
          <text x="32" y="630" font-size="7" fill="#888" font-family="Arial,sans-serif">{{ uds?.meta?.createdAt?.slice(0,10) }}  •  HPFC-1 flyback converter</text>
          <text x="430" y="648" font-size="8" fill="#0066A6" font-style="italic" font-family="Arial,sans-serif">
            Blue highlighted components have been changed from their simulated values.
          </text>

          <!-- ══ HIT REGIONS ════════════════════════════════════════════ -->
          <g v-for="[refKey, box] in Object.entries(HIT_BOXES)" :key="'hit-'+refKey">
            <rect :x="box.x" :y="box.y" :width="box.w" :height="box.h || box.height || 20"
              fill="transparent" stroke="none" style="cursor:pointer"
              @mouseover="hoveredRef=refKey" @mouseleave="hoveredRef=null"
              @click.stop="activeRef=refKey; openEditor(refKey); $emit('component-click', refKey)"/>
          </g>

          
          <!-- ══ HOVER OVERLAYS ═════════════════════════════════════════════ -->
          <g v-for="[refKey, box] in Object.entries(HIT_BOXES)" :key="'ov-'+refKey" pointer-events="none">
            <!-- Hover: dashed blue outline + tooltip -->
            <g v-if="hoveredRef===refKey && !modifiedRefs.has(refKey) && !frozenRefs.has(refKey)">
              <rect :x="box.x-3" :y="box.y-3" :width="box.w+6" :height="(box.h||box.height||20)+6"
                fill="rgba(0,102,166,0.08)" stroke="#0066A6" stroke-width="1.5"
                stroke-dasharray="4,2" rx="3"/>
              <rect :x="box.x + (box.w||20)/2 - 22" :y="box.y - 20" width="44" height="15"
                fill="#1B3A6B" rx="3"/>
              <text :x="box.x + (box.w||20)/2" :y="box.y - 10"
                text-anchor="middle" font-size="8" font-weight="700"
                fill="#e8ecff" font-family="monospace">{{ refKey }}</text>
            </g>
            <!-- Modified by user: solid blue outline + ✎ badge -->
            <g v-if="modifiedRefs.has(refKey)" pointer-events="none">
              <rect :x="box.x-4" :y="box.y-4" :width="box.w+8" :height="(box.h||20)+8"
                fill="rgba(0,102,166,0.10)" stroke="#0066A6" stroke-width="2.5" rx="3"/>
              <rect :x="box.x + (box.w||20)/2 - 24" :y="box.y - 19" width="48" height="15"
                fill="#0066A6" rx="3"/>
              <text :x="box.x + (box.w||20)/2" :y="box.y - 9"
                text-anchor="middle" font-size="8" font-weight="800"
                fill="#fff" font-family="monospace">✎ {{ refKey }}</text>
            </g>
            <!-- Frozen (pinned highlight) -->
            <g v-else-if="frozenRefs.has(refKey)" pointer-events="none">
              <rect :x="box.x-3" :y="box.y-3" :width="box.w+6" :height="(box.h||20)+6"
                fill="rgba(45,107,228,0.12)" stroke="#0066CC" stroke-width="1.5" rx="3"/>
              <text :x="box.x + (box.w||20)/2" :y="box.y - 6"
                text-anchor="middle" font-size="8" font-weight="700"
                fill="#0066CC" font-family="monospace">{{ refKey }}</text>
            </g>
          </g>

          </svg><!-- end topswitch schematic -->

        <!-- ── IFC flyback schematic ─────────────────── -->
        <svg v-else-if="schematicType==='ifc'" width="1120" height="640" viewBox="0 0 1120 640"
          xmlns="http://www.w3.org/2000/svg" class="sd-svg"
          @mousemove="onSvgMouseMove" @mouseleave="onSvgMouseLeave"
          @click="onSvgClick">
          <defs>
            <pattern id="sgrid2" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0L0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="1120" height="640" fill="#fff"/>
          <rect width="1120" height="640" fill="url(#sgrid2)"/>
          <!-- AC Input -->
          <circle cx="28" cy="200" r="3" fill="none" stroke="#333" stroke-width="1.2"/>
          <circle cx="28" cy="340" r="3" fill="none" stroke="#333" stroke-width="1.2"/>
          <line x1="28" y1="200" x2="95" y2="200" stroke="#333" stroke-width="1.5"/>
          <line x1="28" y1="340" x2="55" y2="340" stroke="#333" stroke-width="1.5"/>
          <text x="10" y="198" font-size="8" fill="#444" font-family="monospace">85-265</text>
          <text x="13" y="208" font-size="8" fill="#444" font-family="monospace">VAC</text>
          <!-- Fuse F1 -->
          <rect x="55" y="192" width="40" height="16" rx="8" fill="none" stroke="#555" stroke-width="1.5"/>
          <text x="58" y="186" font-size="7" fill="#555">F1</text>
          <line x1="55" y1="340" x2="175" y2="340" stroke="#555" stroke-width="1.5"/>
          <!-- Bridge Rect -->
          <rect x="175" y="175" width="75" height="165" rx="3" fill="#f5f8ff" stroke="#aaa" stroke-width="1.2"/>
          <text x="193" y="258" font-size="8" fill="#555">BR1</text>
          <line x1="250" y1="258" x2="290" y2="258" stroke="#555" stroke-width="1.5"/>
          <!-- Bulk Cap C1 -->
          <line x1="290" y1="185" x2="290" y2="330" stroke="#555" stroke-width="1.5"/>
          <line x1="305" y1="185" x2="305" y2="330" stroke="#555" stroke-width="1.5"/>
          <text x="290" y="178" font-size="7" fill="#555">C1</text>
          <line x1="250" y1="185" x2="360" y2="185" stroke="#555" stroke-width="1.5"/>
          <line x1="305" y1="330" x2="360" y2="330" stroke="#555" stroke-width="1.5"/>
          <line x1="175" y1="258" x2="140" y2="258" stroke="#555" stroke-width="1.5"/>
          <line x1="140" y1="258" x2="140" y2="400" stroke="#555" stroke-width="1.5"/>
          <line x1="140" y1="400" x2="350" y2="400" stroke="#888" stroke-width="1" stroke-dasharray="4,2"/>
          <!-- Transformer T1 -->
          <rect x="360" y="175" width="140" height="220" rx="4" fill="#faf5ff" stroke="#9b59b6" stroke-width="1.8"/>
          <text x="375" y="198" font-size="8" fill="#7c3aed" font-weight="700">T1</text>
          <path d="M 396,215 A 8,8 0 0,1 396,231 A 8,8 0 0,1 396,247 A 8,8 0 0,1 396,263 A 8,8 0 0,1 396,279" fill="none" stroke="#0066A6" stroke-width="2"/>
          <line x1="422" y1="200" x2="422" y2="380" stroke="#9b59b6" stroke-width="2.5"/>
          <line x1="430" y1="200" x2="430" y2="380" stroke="#9b59b6" stroke-width="2.5"/>
          <path d="M 458,215 A 8,8 0 0,0 458,231 A 8,8 0 0,0 458,247" fill="none" stroke="#38A169" stroke-width="2"/>
          <text x="398" y="308" font-size="7" fill="#0066A6">Np={{ result?.Np || '?' }}T</text>
          <text x="440" y="308" font-size="7" fill="#38A169">Ns={{ result?.Ns || '?' }}T</text>
          <!-- Dot markers (polarity) -->
          <circle cx="398" cy="218" r="3.5" fill="#0066A6"/>
          <circle cx="460" cy="218" r="3.5" fill="#38A169"/>
          <line x1="305" y1="185" x2="380" y2="185" stroke="#555" stroke-width="1.5"/>
          <line x1="380" y1="185" x2="380" y2="215" stroke="#555" stroke-width="1.5"/>
          <line x1="380" y1="360" x2="350" y2="360" stroke="#555" stroke-width="1.5"/>
          <line x1="500" y1="215" x2="545" y2="215" stroke="#555" stroke-width="1.5"/>
          <line x1="500" y1="248" x2="545" y2="248" stroke="#555" stroke-width="1.5"/>
          <!-- IFC IC — 8-pin SOP, primary+secondary sides separated by isolation barrier -->
          <rect x="545" y="365" width="170" height="140" rx="5" fill="#F0FFF4" stroke="#38A169" stroke-width="2"/>
          <rect x="545" y="365" width="82" height="140" rx="5 0 0 5" fill="#e8f5e9" stroke="#38A169" stroke-width="1.2"/>
          <text x="552" y="386" font-size="8" font-weight="700" fill="#276749">PRIMARY</text>
          <text x="636" y="386" font-size="8" font-weight="700" fill="#276749">SECONDARY</text>
          <line x1="628" y1="370" x2="628" y2="500" stroke="#38A169" stroke-width="1.2" stroke-dasharray="3,2"/>
          <text x="622" y="440" font-size="7" fill="#38A169" transform="rotate(-90,622,440)">ISOLATION</text>
          <text x="552" y="406" font-size="9" fill="#38A169" font-weight="800">{{ icPins.label }}</text>
          <text x="552" y="422" font-size="7.5" fill="#276749">IFC Integrated</text>
          <text x="552" y="437" font-size="7" fill="#555">{{ cv('U1','ref') }} {{ cv('U1','part') }}</text>
          <!-- Pin labels -->
          <text x="530" y="410" font-size="7" fill="#333">D</text>
          <text x="530" y="428" font-size="7" fill="#333">V</text>
          <text x="530" y="446" font-size="7" fill="#333">BP</text>
          <text x="720" y="410" font-size="7" fill="#333">S</text>
          <text x="720" y="428" font-size="7" fill="#333">FB</text>
          <text x="720" y="446" font-size="7" fill="#333">SR</text>
          <line x1="530" y1="408" x2="545" y2="408" stroke="#333" stroke-width="1.2"/>
          <line x1="715" y1="408" x2="728" y2="408" stroke="#333" stroke-width="1.2"/>
          <line x1="715" y1="426" x2="728" y2="426" stroke="#333" stroke-width="1.2"/>
          <!-- D pin to primary of transformer -->
          <line x1="530" y1="408" x2="510" y2="408" stroke="#333" stroke-width="1.5"/>
          <line x1="510" y1="408" x2="510" y2="360" stroke="#333" stroke-width="1.5"/>
          <!-- SR (sync rectifier) connection to output -->
          <line x1="728" y1="408" x2="760" y2="408" stroke="#38A169" stroke-width="1.2" stroke-dasharray="3,2"/>
          <!-- Output diode/SR + cap -->
          <text x="800" y="208" font-size="7" fill="#555">D3</text>
          <line x1="775" y1="215" x2="820" y2="215" stroke="#555" stroke-width="1.5"/>
          <line x1="820" y1="190" x2="820" y2="240" stroke="#555" stroke-width="1.5"/>
          <line x1="832" y1="190" x2="832" y2="240" stroke="#555" stroke-width="1.5"/>
          <text x="820" y="183" font-size="7" fill="#555">Co</text>
          <line x1="775" y1="190" x2="900" y2="190" stroke="#555" stroke-width="1.5"/>
          <line x1="832" y1="240" x2="900" y2="240" stroke="#555" stroke-width="1.2" stroke-dasharray="4,2"/>
          <text x="904" y="189" font-size="9" fill="#38A169" font-weight="700">+Vout</text>
          <text x="904" y="240" font-size="8" fill="#555">GND</text>
          <circle cx="901" cy="191" r="3.5" fill="#38A169"/>
          <circle cx="901" cy="238" r="3.5" fill="#555"/>
          <!-- Feedback resistors -->
          <rect x="870" y="260" width="28" height="15" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="870" y="257" font-size="7" fill="#555">R_fb1</text>
          <rect x="870" y="290" width="28" height="15" fill="none" stroke="#555" stroke-width="1.2"/>
          <text x="870" y="287" font-size="7" fill="#555">R_fb2</text>
          <line x1="884" y1="238" x2="884" y2="260" stroke="#555" stroke-width="1.2"/>
          <line x1="884" y1="275" x2="884" y2="290" stroke="#555" stroke-width="1.2"/>
          <line x1="884" y1="305" x2="884" y2="360" stroke="#555" stroke-width="1.2"/>
          <line x1="715" y1="426" x2="884" y2="426" stroke="#555" stroke-width="1" stroke-dasharray="3,2"/>
          <!-- Title block -->
          <rect x="30" y="558" width="300" height="57" fill="#f8f9fb" stroke="#ddd" stroke-width="1"/>
          <text x="78" y="576" font-size="8" fill="#38A169">{{ uds?.meta?.fileName }}.uds</text>
          <text x="30" y="589" font-size="7.5" fill="#555">Topology: {{ uds?.meta?.topology }}  |  Family: {{ uds?.meta?.family }}</text>
          <text x="30" y="602" font-size="7.5" fill="#555">Input: {{ uds?.meta?.inputSpec }}  |  Power: {{ (uds?.meta?.totalPower||0).toFixed(1) }} W</text>
          <text x="30" y="612" font-size="7" fill="#888">{{ uds?.meta?.createdAt?.slice(0,10) }}  •  IFC — integrated flyback with sync rectification</text>
        </svg>

        <!-- ── LPFC-1 / LT — low power flyback ─────────── -->
        <svg v-else-if="schematicType==='lpfc1' || schematicType==='lpfc2'" width="1120" height="640" viewBox="0 0 1120 640"
          xmlns="http://www.w3.org/2000/svg" class="sd-svg"
          @mousemove="onSvgMouseMove" @mouseleave="onSvgMouseLeave"
          @click="onSvgClick">
          <rect width="1120" height="640" fill="#fff"/>
          <defs><pattern id="sgrid3" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="0.5"/></pattern></defs>
          <rect width="1120" height="640" fill="url(#sgrid3)"/>
          <!-- AC Input -->
          <circle cx="28" cy="200" r="3" fill="none" stroke="#333" stroke-width="1.2"/>
          <circle cx="28" cy="340" r="3" fill="none" stroke="#333" stroke-width="1.2"/>
          <line x1="28" y1="200" x2="55" y2="200" stroke="#333" stroke-width="1.5"/>
          <line x1="28" y1="340" x2="55" y2="340" stroke="#333" stroke-width="1.5"/>
          <text x="10" y="198" font-size="8" fill="#444" font-family="monospace">85-265</text>
          <text x="13" y="208" font-size="8" fill="#444" font-family="monospace">VAC</text>
          <!-- Fuse -->
          <rect x="55" y="192" width="40" height="16" rx="8" fill="none" stroke="#555" stroke-width="1.5"/>
          <text x="58" y="186" font-size="7" fill="#555">F1</text>
          <line x1="55" y1="200" x2="62" y2="200" stroke="#555" stroke-width="1.5"/>
          <line x1="87" y1="200" x2="175" y2="200" stroke="#555" stroke-width="1.5"/>
          <line x1="55" y1="340" x2="175" y2="340" stroke="#555" stroke-width="1.5"/>
          <!-- Bridge rect -->
          <rect x="175" y="175" width="70" height="155" rx="3" fill="#f5f8ff" stroke="#aaa" stroke-width="1.2"/>
          <text x="190" y="253" font-size="8" fill="#555">BR1</text>
          <line x1="245" y1="253" x2="290" y2="253" stroke="#555" stroke-width="1.5"/>
          <line x1="290" y1="185" x2="340" y2="185" stroke="#555" stroke-width="1.5"/>
          <line x1="290" y1="320" x2="340" y2="320" stroke="#555" stroke-width="1.5"/>
          <!-- Bulk cap (smaller for LPFC) -->
          <line x1="340" y1="170" x2="340" y2="315" stroke="#555" stroke-width="1.5"/>
          <line x1="352" y1="170" x2="352" y2="315" stroke="#555" stroke-width="1.5"/>
          <text x="338" y="163" font-size="7" fill="#555">C1</text>
          <line x1="352" y1="185" x2="410" y2="185" stroke="#555" stroke-width="1.5"/>
          <line x1="175" y1="253" x2="140" y2="253" stroke="#555" stroke-width="1.5"/>
          <line x1="140" y1="253" x2="140" y2="390" stroke="#555" stroke-width="1.5"/>
          <line x1="140" y1="390" x2="352" y2="390" stroke="#888" stroke-width="1" stroke-dasharray="4,2"/>
          <!-- Transformer T1 (smaller core for LPFC) -->
          <rect x="410" y="168" width="115" height="205" rx="4" fill="#fff8ee" stroke="#d97706" stroke-width="1.8"/>
          <text x="425" y="188" font-size="8" fill="#d97706" font-weight="700">T1</text>
          <path d="M 440,205 A 7,7 0 0,1 440,219 A 7,7 0 0,1 440,233 A 7,7 0 0,1 440,247" fill="none" stroke="#0066A6" stroke-width="2"/>
          <line x1="462" y1="180" x2="462" y2="355" stroke="#d97706" stroke-width="2.5"/>
          <line x1="470" y1="180" x2="470" y2="355" stroke="#d97706" stroke-width="2.5"/>
          <path d="M 495,205 A 7,7 0 0,0 495,219 A 7,7 0 0,0 495,233" fill="none" stroke="#38A169" stroke-width="2"/>
          <text x="443" y="275" font-size="7" fill="#0066A6">Np={{ result?.Np || '?' }}T</text>
          <text x="475" y="275" font-size="7" fill="#38A169">Ns={{ result?.Ns || '?' }}T</text>
          <circle cx="442" cy="208" r="3" fill="#0066A6"/>
          <circle cx="497" cy="208" r="3" fill="#38A169"/>
          <line x1="352" y1="185" x2="423" y2="185" stroke="#555" stroke-width="1.5"/>
          <line x1="423" y1="185" x2="423" y2="205" stroke="#555" stroke-width="1.5"/>
          <line x1="423" y1="348" x2="352" y2="348" stroke="#555" stroke-width="1.5"/>
          <line x1="525" y1="208" x2="570" y2="208" stroke="#555" stroke-width="1.5"/>
          <line x1="525" y1="235" x2="570" y2="235" stroke="#555" stroke-width="1.5"/>
          <!-- Y-cap (LPFC typical) -->
          <line x1="410" y1="250" x2="390" y2="250" stroke="#555" stroke-width="1"/>
          <line x1="390" y1="250" x2="390" y2="360" stroke="#555" stroke-width="1" stroke-dasharray="3,2"/>
          <text x="368" y="248" font-size="7" fill="#888">CY1</text>
          <!-- LPFC IC — compact 8-pin package -->
          <rect x="570" y="385" width="118" height="95" rx="4" fill="#FFFBEB" stroke="#d97706" stroke-width="2"/>
          <text x="578" y="405" font-size="8" font-weight="700" fill="#92400e">{{ icPins.label }}</text>
          <text x="578" y="419" font-size="9" fill="#d97706" font-weight="800">FluxForge</text>
          <text x="578" y="433" font-size="7.5" fill="#555">Auto-restart</text>
          <text x="578" y="447" font-size="7" fill="#555">{{ cv('U1','ref') }} {{ cv('U1','part') }}</text>
          <!-- Pins -->
          <text x="554" y="407" font-size="7" fill="#333">D</text>
          <text x="554" y="423" font-size="7" fill="#333">EN</text>
          <text x="692" y="407" font-size="7" fill="#333">S</text>
          <text x="692" y="423" font-size="7" fill="#333">BYP</text>
          <line x1="553" y1="405" x2="570" y2="405" stroke="#333" stroke-width="1.2"/>
          <line x1="553" y1="421" x2="570" y2="421" stroke="#333" stroke-width="1.2"/>
          <line x1="688" y1="405" x2="700" y2="405" stroke="#333" stroke-width="1.2"/>
          <line x1="553" y1="405" x2="525" y2="405" stroke="#333" stroke-width="1.5"/>
          <line x1="525" y1="405" x2="525" y2="348" stroke="#333" stroke-width="1.5"/>
          <!-- BYP cap -->
          <text x="712" y="437" font-size="7" fill="#555">C_byp</text>
          <line x1="700" y1="421" x2="720" y2="421" stroke="#555" stroke-width="1"/>
          <!-- Output stage -->
          <text x="748" y="208" font-size="7" fill="#555">D3</text>
          <polygon points="748,215 782,230 748,245" fill="none" stroke="#555" stroke-width="1.5"/>
          <line x1="782" y1="230" x2="820" y2="230" stroke="#555" stroke-width="1.5"/>
          <line x1="820" y1="210" x2="820" y2="252" stroke="#555" stroke-width="1.5"/>
          <line x1="832" y1="210" x2="832" y2="252" stroke="#555" stroke-width="1.5"/>
          <text x="820" y="203" font-size="7" fill="#555">Co</text>
          <line x1="782" y1="210" x2="880" y2="210" stroke="#555" stroke-width="1.5"/>
          <line x1="832" y1="252" x2="880" y2="252" stroke="#555" stroke-width="1.2" stroke-dasharray="4,2"/>
          <text x="884" y="209" font-size="9" fill="#d97706" font-weight="700">+Vout</text>
          <text x="884" y="252" font-size="8" fill="#555">GND</text>
          <circle cx="881" cy="211" r="3.5" fill="#d97706"/>
          <circle cx="881" cy="250" r="3.5" fill="#555"/>
          <!-- Optocoupler feedback -->
          <rect x="848" y="285" width="38" height="32" rx="3" fill="#f0f4ff" stroke="#aaa" stroke-width="1"/>
          <text x="853" y="304" font-size="7" fill="#555">U2</text>
          <text x="853" y="312" font-size="6.5" fill="#888">Opto</text>
          <line x1="881" y1="252" x2="881" y2="285" stroke="#555" stroke-width="1"/>
          <line x1="848" y1="300" x2="840" y2="300" stroke="#555" stroke-width="1"/>
          <line x1="840" y1="300" x2="840" y2="421" stroke="#555" stroke-width="1" stroke-dasharray="3,2"/>
          <line x1="840" y1="421" x2="700" y2="421" stroke="#555" stroke-width="1" stroke-dasharray="3,2"/>
          <!-- Title block -->
          <rect x="30" y="558" width="300" height="57" fill="#f8f9fb" stroke="#ddd" stroke-width="1"/>
          <text x="78" y="576" font-size="8" fill="#d97706">{{ uds?.meta?.fileName }}.uds</text>
          <text x="30" y="589" font-size="7.5" fill="#555">Topology: {{ uds?.meta?.topology }}  |  Family: {{ uds?.meta?.family }}</text>
          <text x="30" y="602" font-size="7.5" fill="#555">Input: {{ uds?.meta?.inputSpec }}  |  Power: {{ (uds?.meta?.totalPower||0).toFixed(1) }} W</text>
          <text x="30" y="612" font-size="7" fill="#888">{{ uds?.meta?.createdAt?.slice(0,10) }}  •  LPFC FluxForge — auto-restart flyback with opto feedback</text>
        </svg>

        <!-- ── PSC (TN2 / XT2 / HP) ───────────────────── -->
        <svg v-else-if="schematicType==='psctn' || schematicType==='pscxt' || schematicType==='pschp'" width="1120" height="640" viewBox="0 0 1120 640"
          xmlns="http://www.w3.org/2000/svg" class="sd-svg"
          @mousemove="onSvgMouseMove" @mouseleave="onSvgMouseLeave"
          @click="onSvgClick">
          <rect width="1120" height="640" fill="#fff"/>
          <defs><pattern id="sgrid4" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="0.5"/></pattern></defs>
          <rect width="1120" height="640" fill="url(#sgrid4)"/>
          <!-- AC Input -->
          <circle cx="28" cy="200" r="3" fill="none" stroke="#333" stroke-width="1.2"/>
          <circle cx="28" cy="340" r="3" fill="none" stroke="#333" stroke-width="1.2"/>
          <line x1="28" y1="200" x2="55" y2="200" stroke="#333" stroke-width="1.5"/>
          <line x1="28" y1="340" x2="55" y2="340" stroke="#333" stroke-width="1.5"/>
          <text x="10" y="198" font-size="8" fill="#444" font-family="monospace">85-265</text>
          <text x="13" y="208" font-size="8" fill="#444" font-family="monospace">VAC</text>
          <!-- Fuse -->
          <rect x="55" y="192" width="40" height="16" rx="8" fill="none" stroke="#555" stroke-width="1.5"/>
          <text x="58" y="186" font-size="7" fill="#555">F1</text>
          <line x1="55" y1="200" x2="62" y2="200" stroke="#555" stroke-width="1.5"/>
          <line x1="87" y1="200" x2="175" y2="200" stroke="#555" stroke-width="1.5"/>
          <line x1="55" y1="340" x2="175" y2="340" stroke="#555" stroke-width="1.5"/>
          <!-- Bridge + Bulk -->
          <rect x="175" y="182" width="70" height="148" rx="3" fill="#f5f8ff" stroke="#aaa" stroke-width="1.2"/>
          <text x="190" y="256" font-size="8" fill="#555">BR1</text>
          <line x1="245" y1="256" x2="285" y2="256" stroke="#555" stroke-width="1.5"/>
          <line x1="285" y1="190" x2="355" y2="190" stroke="#555" stroke-width="1.5"/>
          <line x1="285" y1="320" x2="355" y2="320" stroke="#555" stroke-width="1.5"/>
          <line x1="355" y1="175" x2="355" y2="315" stroke="#555" stroke-width="1.5"/>
          <line x1="367" y1="175" x2="367" y2="315" stroke="#555" stroke-width="1.5"/>
          <text x="353" y="168" font-size="7" fill="#555">C1</text>
          <line x1="367" y1="190" x2="420" y2="190" stroke="#555" stroke-width="1.5"/>
          <line x1="175" y1="256" x2="140" y2="256" stroke="#555" stroke-width="1.5"/>
          <line x1="140" y1="256" x2="140" y2="390" stroke="#555" stroke-width="1.5"/>
          <line x1="140" y1="390" x2="367" y2="390" stroke="#888" stroke-width="1" stroke-dasharray="4,2"/>
          <!-- Inductor or Transformer -->
          <rect x="420" y="172" width="110" height="200" rx="4" fill="#f0f4ff" stroke="#7c3aed" stroke-width="1.8"/>
          <text x="432" y="192" font-size="8" fill="#7c3aed" font-weight="700">{{ schematicType==='psctn' ? 'L1 (Inductor)' : 'T1 (Transformer)' }}</text>
          <path d="M 452,208 A 7,7 0 0,1 452,222 A 7,7 0 0,1 452,236 A 7,7 0 0,1 452,250" fill="none" stroke="#0066A6" stroke-width="2"/>
          <line x1="475" y1="182" x2="475" y2="355" stroke="#7c3aed" stroke-width="2.5"/>
          <line x1="483" y1="182" x2="483" y2="355" stroke="#7c3aed" stroke-width="2.5"/>
          <path d="M 505,208 A 7,7 0 0,0 505,222 A 7,7 0 0,0 505,236" fill="none" stroke="#38A169" stroke-width="2"/>
          <text x="454" y="282" font-size="7" fill="#0066A6">Np={{ result?.Np || '?' }}T</text>
          <text x="488" y="282" font-size="7" fill="#38A169">Ns={{ result?.Ns || '?' }}T</text>
          <circle cx="454" cy="211" r="3" fill="#0066A6"/>
          <circle cx="507" cy="211" r="3" fill="#38A169"/>
          <line x1="367" y1="190" x2="432" y2="190" stroke="#555" stroke-width="1.5"/>
          <line x1="432" y1="190" x2="432" y2="208" stroke="#555" stroke-width="1.5"/>
          <line x1="432" y1="348" x2="367" y2="348" stroke="#555" stroke-width="1.5"/>
          <line x1="530" y1="210" x2="575" y2="210" stroke="#555" stroke-width="1.5"/>
          <line x1="530" y1="235" x2="575" y2="235" stroke="#555" stroke-width="1.5"/>
          <!-- PSC IC -->
          <rect x="575" y="382" width="118" height="100" rx="4" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
          <text x="582" y="402" font-size="8" font-weight="700" fill="#5b21b6">{{ icPins.label }}</text>
          <text x="582" y="416" font-size="9" fill="#7c3aed" font-weight="800">FluxForge</text>
          <text x="582" y="430" font-size="7.5" fill="#555">{{ schematicType==='psctn' ? 'Buck / Flyback' : 'Flyback' }}</text>
          <text x="582" y="444" font-size="7" fill="#555">{{ cv('U1','ref') }} {{ cv('U1','part') }}</text>
          <!-- Pins -->
          <text x="559" y="404" font-size="7" fill="#333">D</text>
          <text x="697" y="404" font-size="7" fill="#333">S</text>
          <text x="697" y="422" font-size="7" fill="#333">BP</text>
          <line x1="558" y1="402" x2="575" y2="402" stroke="#333" stroke-width="1.2"/>
          <line x1="693" y1="402" x2="706" y2="402" stroke="#333" stroke-width="1.2"/>
          <line x1="558" y1="402" x2="530" y2="402" stroke="#333" stroke-width="1.5"/>
          <line x1="530" y1="402" x2="530" y2="348" stroke="#333" stroke-width="1.5"/>
          <!-- Output diode + cap -->
          <text x="752" y="210" font-size="7" fill="#555">D3</text>
          <polygon points="752,218 786,232 752,246" fill="none" stroke="#555" stroke-width="1.5"/>
          <line x1="786" y1="232" x2="830" y2="232" stroke="#555" stroke-width="1.5"/>
          <line x1="830" y1="210" x2="830" y2="254" stroke="#555" stroke-width="1.5"/>
          <line x1="842" y1="210" x2="842" y2="254" stroke="#555" stroke-width="1.5"/>
          <text x="830" y="203" font-size="7" fill="#555">Co</text>
          <line x1="786" y1="210" x2="890" y2="210" stroke="#555" stroke-width="1.5"/>
          <line x1="842" y1="254" x2="890" y2="254" stroke="#555" stroke-width="1.2" stroke-dasharray="4,2"/>
          <text x="895" y="209" font-size="9" fill="#7c3aed" font-weight="700">+Vout</text>
          <text x="895" y="254" font-size="8" fill="#555">GND</text>
          <circle cx="892" cy="211" r="3.5" fill="#7c3aed"/>
          <circle cx="892" cy="252" r="3.5" fill="#555"/>
          <!-- BP bypass cap -->
          <line x1="706" y1="420" x2="740" y2="420" stroke="#555" stroke-width="1"/>
          <line x1="740" y1="405" x2="740" y2="435" stroke="#555" stroke-width="1.5"/>
          <line x1="752" y1="405" x2="752" y2="435" stroke="#555" stroke-width="1.5"/>
          <text x="756" y="422" font-size="7" fill="#555">C_bp</text>
          <!-- Title block -->
          <rect x="30" y="558" width="300" height="57" fill="#f8f9fb" stroke="#ddd" stroke-width="1"/>
          <text x="78" y="576" font-size="8" fill="#7c3aed">{{ uds?.meta?.fileName }}.uds</text>
          <text x="30" y="589" font-size="7.5" fill="#555">Topology: {{ uds?.meta?.topology }}  |  Family: {{ uds?.meta?.family }}</text>
          <text x="30" y="602" font-size="7.5" fill="#555">Input: {{ uds?.meta?.inputSpec }}  |  Power: {{ (uds?.meta?.totalPower||0).toFixed(1) }} W</text>
          <text x="30" y="612" font-size="7" fill="#888">{{ uds?.meta?.createdAt?.slice(0,10) }}  •  PSC — {{ schematicType==='psctn' ? 'ultra-low standby buck/flyback' : 'isolated flyback' }}</text>
        </svg>

      </div>
    </div>
    <!-- Right-click context menu -->

    <!-- ══ Component Selector Modal (matching Image 1 design) ════════════════ -->
    <teleport to="body">
      <div v-if="editorOpen && editorRef" class="sd-modal-backdrop" @click.self="closeEditor">
        <div class="sd-modal" @click.stop>

          <!-- Modal header -->
          <div class="sd-modal-hd">
            <div class="sd-modal-hd-left">
              <span class="sd-modal-comp-icon">▣</span>
              <div>
                <div class="sd-modal-title">{{ COMP_CATEGORY[editorRef]?.label }}</div>
                <div class="sd-modal-subtitle">
                  Ref: <strong class="sd-modal-ref">{{ editorRef }}</strong>
                  <span v-if="modifiedRefs.has(editorRef)" class="sd-modal-ref-mod">·  {{ editDraft.part || editDraft.value || '—' }}</span>
                </div>
              </div>
            </div>
            <button class="sd-modal-close" @click="closeEditor">✕</button>
          </div>

          <!-- Tabs -->
          <div class="sd-modal-tabs">
            <button :class="['sd-modal-tab', {active: modalTab==='db'}]"     @click="modalTab='db'">Component DB</button>
            <button :class="['sd-modal-tab', {active: modalTab==='params'}]" @click="modalTab='params'">Parameters</button>
            <button :class="['sd-modal-tab', {active: modalTab==='notes'}]"  @click="modalTab='notes'">Notes</button>
          </div>

          <!-- Tab: Component DB -->
          <div v-if="modalTab==='db'" class="sd-modal-body">
            <!-- Search + filter row -->
            <div class="sd-modal-search-row">
              <input v-model="altSearch" class="sd-modal-search" placeholder="Search parts..."/>
              <select v-model="altFilter" class="sd-modal-filter">
                <option value="">All types</option>
                <option v-for="t in altTypeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
              <span class="sd-modal-count">{{ filteredAlts.length }} parts</span>
            </div>
            <!-- Table -->
            <div class="sd-modal-table-wrap">
              <table class="sd-modal-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Part #</th>
                    <th>Manufacturer</th>
                    <th>Value / Cap.</th>
                    <th>Rated Voltage</th>
                    <th>ESR / Tol</th>
                    <th>Package</th>
                    <th>Temp (°C)</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(alt, i) in filteredAlts" :key="i"
                    :class="['sd-modal-row', {selected: selectedAltIdx===i}]"
                    @click="selectedAltIdx=i; editDraft={...alt}">
                    <td><span :class="['sd-modal-radio', {active: selectedAltIdx===i}]"/></td>
                    <td class="sd-modal-part">{{ alt.part }}</td>
                    <td>{{ alt.mfr }}</td>
                    <td>{{ alt.value || alt.rating || alt.current || '—' }}</td>
                    <td>{{ alt.voltage || '—' }}</td>
                    <td>{{ alt.esr || alt.tol || '—' }}</td>
                    <td>{{ alt.package || alt.pkg || alt.size || '—' }}</td>
                    <td>{{ alt.temp || '—' }}</td>
                    <td class="sd-modal-cost">${{ alt.cost || '—' }}</td>
                  </tr>
                  <tr v-if="filteredAlts.length===0">
                    <td colspan="9" class="sd-modal-empty">No matching parts found</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab: Parameters -->
          <div v-else-if="modalTab==='params'" class="sd-modal-body sd-modal-params">
            <div v-for="field in editFields" :key="field" class="sd-param-row">
              <label class="sd-param-label">{{ FIELD_LABELS[field] || field }}</label>
              <input class="sd-param-input"
                :value="editDraft[field] ?? ''"
                @input="editDraft[field] = $event.target.value"/>
            </div>
          </div>

          <!-- Tab: Notes -->
          <div v-else-if="modalTab==='notes'" class="sd-modal-body">
            <textarea v-model="editDraft._notes" class="sd-modal-notes" placeholder="Add notes about this component choice..."/>
          </div>

          <!-- Footer buttons -->
          <div class="sd-modal-footer">
            <button v-if="modifiedRefs.has(editorRef)" class="sd-modal-btn sd-modal-btn-reset" @click="resetComponent">
              ↺ Reset to original
            </button>
            <div style="flex:1"/>
            <button class="sd-modal-btn sd-modal-btn-cancel" @click="closeEditor">Cancel</button>
            <button class="sd-modal-btn sd-modal-btn-apply" @click="confirmEdit">Apply</button>
          </div>

        </div>
      </div>
    </teleport>

    <div v-if="ctxMenu" class="sd-ctx-menu"
      :style="{ left: ctxMenu.x+'px', top: ctxMenu.y+'px' }"
      @click.stop>
      <div class="sd-ctx-header">{{ ctxMenu.ref }}</div>
      <button class="sd-ctx-item" @click="toggleFreeze(ctxMenu.ref)">
        <span class="sd-ctx-icon">{{ frozenRefs.has(ctxMenu.ref) ? '🔓' : '❄️' }}</span>
        {{ frozenRefs.has(ctxMenu.ref) ? 'Unfreeze' : 'Freeze' }}
        <span class="sd-ctx-hint">{{ frozenRefs.has(ctxMenu.ref) ? 'Remove permanent highlight' : 'Keep permanently highlighted' }}</span>
      </button>
      <button class="sd-ctx-item" @click="openFromContext(ctxMenu.ref)">
        <span class="sd-ctx-icon">🔍</span>
        Open Functional Diagram
        <span class="sd-ctx-hint">View component details</span>
      </button>
    </div>
    <!-- Click outside to close context menu -->

    <!-- ══ Component Editor Panel ════════════════════════════════════════════ -->
    <transition name="sd-panel-slide">
      <div v-if="editorOpen && editorRef" class="sd-editor-panel" @click.stop>

        <!-- Header -->
        <div class="sd-ep-header">
          <div class="sd-ep-title-row">
            <span class="sd-ep-ref">{{ editorRef }}</span>
            <span class="sd-ep-label">{{ COMP_CATEGORY[editorRef]?.label }}</span>
            <span v-if="modifiedRefs.has(editorRef)" class="sd-ep-modified-badge">✎ Modified</span>
          </div>
          <div class="sd-ep-current">
            Current: <strong>{{ editorSummary }}</strong>
          </div>
          <button class="sd-ep-close" @click="closeEditor" title="Close">✕</button>
        </div>

        <!-- Editable fields -->
        <div class="sd-ep-fields">
          <div class="sd-ep-section-label">Edit fields</div>
          <div v-for="field in editFields" :key="field" class="sd-ep-field-row">
            <label class="sd-ep-field-label">{{ FIELD_LABELS[field] || field }}</label>
            <input
              class="sd-ep-field-input"
              :value="editDraft[field] ?? ''"
              @input="editDraft[field] = $event.target.value"
              :placeholder="COMP_CATEGORY[editorRef]?.isTransformer && field==='part' ? 'e.g. EFD30' : ''"
            />
          </div>
        </div>

        <!-- Alternatives list -->
        <div class="sd-ep-alts" v-if="alternatives.length">
          <div class="sd-ep-section-label">
            {{ isTransformer ? 'Available cores' : 'Compatible alternatives' }}
            <span class="sd-ep-alt-count">{{ alternatives.length }}</span>
          </div>
          <div class="sd-ep-alt-list">
            <div
              v-for="(alt, i) in alternatives" :key="i"
              class="sd-ep-alt-item"
              :class="{ 'sd-ep-alt-active': editDraft.part === alt.part }"
              @click="applyAlternative(alt)"
            >
              <!-- Part number + manufacturer -->
              <div class="sd-ep-alt-main">
                <span class="sd-ep-alt-part">{{ alt.part }}</span>
                <span class="sd-ep-alt-mfr">{{ alt.mfr }}</span>
              </div>
              <!-- Key specs — shown differently per component type -->
              <div class="sd-ep-alt-specs">
                <span v-if="alt.rating">{{ alt.rating }}</span>
                <span v-if="alt.value">{{ alt.value }}</span>
                <span v-if="alt.voltage">{{ alt.voltage }}</span>
                <span v-if="alt.current">{{ alt.current }}</span>
                <span v-if="alt.power">{{ alt.power }}</span>
                <span v-if="alt.tol">±{{ alt.tol }}</span>
                <span v-if="alt.type">{{ alt.type }}</span>
                <span v-if="alt.package || alt.pkg">{{ alt.package || alt.pkg }}</span>
                <span v-if="alt.ae">Ae={{ alt.ae }}</span>
                <span v-if="alt.material">{{ alt.material }}</span>
                <span v-if="alt.family">{{ alt.family }}</span>
                <span v-if="alt.cost" class="sd-ep-alt-cost">${{ alt.cost }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="sd-ep-actions">
          <button
            v-if="modifiedRefs.has(editorRef)"
            class="sd-ep-btn sd-ep-btn-reset"
            @click="resetComponent"
          >↺ Reset to original</button>
          <button class="sd-ep-btn sd-ep-btn-cancel" @click="closeEditor">Cancel</button>
          <button class="sd-ep-btn sd-ep-btn-confirm" @click="confirmEdit">✔ Apply change</button>
        </div>

      </div>
    </transition>
    <!-- backdrop closes editor when clicking outside panel -->
    <div v-if="editorOpen" class="sd-editor-backdrop" @click="closeEditor"/>

    <div v-if="ctxMenu" class="sd-ctx-backdrop" @click="closeCtxMenu" @contextmenu.prevent="closeCtxMenu"/>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { COMPONENT_DB } from '../data/ComponentDatabase.js';

const emit = defineEmits(['component-click', 'update:uds']);

const props = defineProps({ uds: Object });

const zoom    = ref(1);
const panX    = ref(0);
const panY    = ref(0);
const canvasEl   = ref(null);
const hoveredRef  = ref(null);
const activeRef   = ref(null);
const frozenRefs  = ref(new Set());   // refs permanently highlighted
const ctxMenu     = ref(null);        // { ref, x, y } — right-click menu position


// ── Component editor state ────────────────────────────────────────────────────
const editorOpen   = ref(false);
const editorRef    = ref('');       // e.g. 'F1', 'T1', 'C2'
const editDraft    = ref({});       // live-editable fields
const modifiedRefs = ref(new Set());// refs changed by user → blue colour

// Map every schematic ref to its DB category so we know what alternatives to show
const COMP_CATEGORY = Object.freeze({
  F1:  { label:'Fuse',                    db:'fuses',      sub:null,              fields:['rating','voltage','type','size','part','mfr'] },
  C1:  { label:'X2 Safety Capacitor',     db:'emi',        sub:'x_caps',          fields:['value','voltage','type','part','mfr'] },
  C2:  { label:'Bulk Electrolytic Cap',   db:'capacitors', sub:'bulk_electrolytic',fields:['value','voltage','esr','temp','part','mfr'] },
  C3:  { label:'Snubber Capacitor',       db:'capacitors', sub:'snubber',         fields:['value','voltage','type','part','mfr'] },
  C4:  { label:'Bypass Capacitor',        db:'capacitors', sub:'ceramic',         fields:['value','voltage','part','mfr'] },
  C5:  { label:'Voltage Capacitor',       db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','esr','part','mfr'] },
  C7:  { label:'RCD Clamp Cap',           db:'capacitors', sub:'snubber',         fields:['value','voltage','part','mfr'] },
  C8:  { label:'Bias Filter Cap',         db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','part','mfr'] },
  C9:  { label:'Output Filter Cap',       db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','esr','part','mfr'] },
  C10: { label:'Output Filter Cap',       db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','esr','part','mfr'] },
  C11: { label:'Post-Choke Cap',          db:'capacitors', sub:'output_electrolytic',fields:['value','voltage','part','mfr'] },
  C12: { label:'Filter Capacitor',        db:'capacitors', sub:'ceramic',         fields:['value','voltage','part','mfr'] },
  C13: { label:'Compensation Cap',        db:'capacitors', sub:'ceramic',         fields:['value','voltage','part','mfr'] },
  R4:  { label:'Bleed Resistor',          db:'resistors',  sub:'startup',         fields:['value','power','tol','package','part','mfr'] },
  R5:  { label:'Bleed Resistor',          db:'resistors',  sub:'startup',         fields:['value','power','tol','package','part','mfr'] },
  R6:  { label:'Source Resistor',         db:'resistors',  sub:'current_sense',   fields:['value','power','tol','package','part','mfr'] },
  R7:  { label:'V-pin Upper Resistor',    db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R8:  { label:'V-pin Lower Resistor',    db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R9:  { label:'Current Sense Res.',      db:'resistors',  sub:'current_sense',   fields:['value','power','tol','package','part','mfr'] },
  R10: { label:'RCD Clamp Resistor',      db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R11: { label:'Upper Feedback Res.',     db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R12: { label:'Lower Feedback Res.',     db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  R13: { label:'TL431 Anode Res.',        db:'resistors',  sub:'feedback',        fields:['value','power','tol','package','part','mfr'] },
  D1:  { label:'Freewheeling Diode',      db:'diodes',     sub:'clamp',           fields:['voltage','current','type','package','part','mfr'] },
  D2:  { label:'RCD Clamp Diode',         db:'diodes',     sub:'clamp',           fields:['voltage','current','type','package','part','mfr'] },
  D3:  { label:'Output Rectifier Diode',  db:'diodes',     sub:'output_schottky', fields:['voltage','current','vf','package','part','mfr'] },
  D8:  { label:'Bias Rectifier Diode',    db:'diodes',     sub:'output_schottky', fields:['voltage','current','vf','package','part','mfr'] },
  L1:  { label:'EMI Filter Choke',        db:'inductors',  sub:'emi_filter',      fields:['value','current','dcr','part','mfr'] },
  L2:  { label:'Output Choke',            db:'inductors',  sub:'emi_filter',      fields:['value','current','dcr','part','mfr'] },
  BR1: { label:'Bridge Rectifier',        db:'diodes',     sub:'bridge_rectifier',fields:['voltage','current','vf','package','part','mfr'] },
  VR1: { label:'TVS / Clamp Diode',       db:'diodes',     sub:'clamp',           fields:['voltage','power','type','package','part','mfr'] },
  RT1: { label:'NTC Thermistor',          db:'resistors',  sub:'startup',         fields:['value','power','part','mfr'] },
  T1:  { label:'Flyback Transformer',     db:'inductors',  sub:'transformer_cores',fields:['part','ae','le','material','mfr'], isTransformer:true },
  U1:  { label:'Controller IC',           db:'ics',        sub:null,              fields:['part','family','pkg','power','freq','mfr'] },
  U2A: { label:'Optocoupler',             db:'ics',        sub:null,              fields:['part','pkg','mfr'] },
  U2B: { label:'Optocoupler',             db:'ics',        sub:null,              fields:['part','pkg','mfr'] },
  U3:  { label:'TL431 Shunt Ref.',        db:'ics',        sub:null,              fields:['part','pkg','mfr'] },
});

// Human-readable field labels
const FIELD_LABELS = {
  value:'Value', rating:'Rating', voltage:'Voltage', current:'Current',
  power:'Power', tol:'Tolerance', package:'Package', part:'Part Number',
  mfr:'Manufacturer', type:'Type', size:'Size', vf:'Vf', esr:'ESR',
  temp:'Max Temp', dcr:'DCR', ae:'Ae', le:'Le', material:'Material',
  family:'Family', pkg:'Package', freq:'Frequency',
};

// Flatten ComponentDB: get the right list for a given ref
function getAlternatives(ref) {
  const cat = COMP_CATEGORY[ref];
  if (!cat) return [];
  const top = COMPONENT_DB[cat.db];
  if (!top) return [];
  if (Array.isArray(top)) return top;                        // e.g. fuses
  if (cat.sub && top[cat.sub]) return top[cat.sub];          // e.g. capacitors.bulk_electrolytic
  // ics: flatten all sub-arrays
  return Object.values(top).flat();
}

// ── Modal UI state ────────────────────────────────────────────────────────────
const modalTab       = ref('db');
const altSearch      = ref('');
const altFilter      = ref('');
const selectedAltIdx = ref(-1);

const filteredAlts = computed(() => {
  const alts = alternatives.value;
  const q    = altSearch.value.toLowerCase();
  const f    = altFilter.value;
  return alts.filter(a => {
    const matchQ = !q || [a.part,a.mfr,a.value,a.rating,a.type,a.family].some(v => v?.toString().toLowerCase().includes(q));
    const matchF = !f || a.type === f || a.family === f || a.size === f;
    return matchQ && matchF;
  });
});

const altTypeOptions = computed(() => {
  const types = new Set(alternatives.value.map(a => a.type || a.family || a.size).filter(Boolean));
  return [...types];
});

// Open the editor for a given ref
function openEditor(ref) {
  if (!COMP_CATEGORY[ref]) return;
  editorRef.value = ref;
  const saved = props.uds?.components?.[ref] || {};
  editDraft.value = { ...saved };
  modalTab.value   = 'db';
  altSearch.value  = '';
  altFilter.value  = '';
  const alts = getAlternatives(ref);
  selectedAltIdx.value = alts.findIndex(a => a.part === saved.part);
  editorOpen.value = true;
}

function closeEditor() { editorOpen.value = false; }

// User clicks an alternative in the list → populate draft fields
function applyAlternative(alt) {
  editDraft.value = { ...alt };
}

// Confirm: write draft → UDS, mark ref blue
function confirmEdit() {
  if (!editorRef.value || !props.uds) return;
  const ref = editorRef.value;
  const newUds = JSON.parse(JSON.stringify(props.uds));
  if (!newUds.components) newUds.components = {};
  newUds.components[ref] = { ...editDraft.value };
  // Mark as user-modified
  modifiedRefs.value = new Set([...modifiedRefs.value, ref]);
  frozenRefs.value   = new Set([...frozenRefs.value,   ref]);
  emit('update:uds', newUds);
  closeEditor();
}

// Reset ref back to original simulated value
function resetComponent() {
  const ref = editorRef.value;
  if (!ref || !props.uds) return;
  const newUds = JSON.parse(JSON.stringify(props.uds));
  if (newUds.components) delete newUds.components[ref];
  const mr = new Set(modifiedRefs.value); mr.delete(ref); modifiedRefs.value = mr;
  const fr = new Set(frozenRefs.value);   fr.delete(ref); frozenRefs.value   = fr;
  emit('update:uds', newUds);
  closeEditor();
}

// Summary line shown in the panel header
const editorSummary = computed(() => {
  if (!editorRef.value) return '';
  const saved = props.uds?.components?.[editorRef.value];
  if (!saved) return 'Original (simulated)';
  return saved.part || saved.value || saved.rating || 'Custom';
});

// Sorted list of alternatives with the currently-active one highlighted
const alternatives = computed(() => {
  if (!editorRef.value) return [];
  return getAlternatives(editorRef.value);
});

const editFields = computed(() => COMP_CATEGORY[editorRef.value]?.fields || ['value','part','mfr']);
const isTransformer = computed(() => !!COMP_CATEGORY[editorRef.value]?.isTransformer);

// ── Component hit regions — {x,y,w,h} in SVG user-space ──────────────────────
const HIT_BOXES = {
  // Positions mapped to 1440×640 viewBox matching reference schematic
  F1:  { x:57,  y:88,  w:50,  h:26 },   // Fuse F1
  C1:  { x:112, y:82,  w:18,  h:32 },   // Y-cap C1
  RT1: { x:152, y:88,  w:42,  h:24 },   // NTC thermistor RT1
  L1:  { x:206, y:84,  w:76,  h:26 },   // CM choke L1
  BR1: { x:268, y:168, w:94,  h:226 },  // Bridge rectifier BR1
  C2:  { x:434, y:138, w:32,  h:48 },   // Bulk cap C2
  R4:  { x:497, y:88,  w:36,  h:16 },   // Bleed R4
  R5:  { x:497, y:111, w:36,  h:16 },   // Bleed R5
  T1:  { x:588, y:88,  w:164, h:346 },  // Transformer T1
  VR1: { x:534, y:148, w:16,  h:50 },   // Transient suppressor VR1
  C3:  { x:470, y:138, w:20,  h:50 },   // Snubber cap C3
  R10: { x:817, y:118, w:40,  h:20 },   // RCD clamp R10
  C7:  { x:908, y:112, w:28,  h:60 },   // RCD clamp C7
  D3:  { x:820, y:144, w:60,  h:22 },   // Output rectifier D3
  C9:  { x:946, y:162, w:28,  h:54 },   // Output cap C9
  C10: { x:1006,y:162, w:28,  h:54 },   // Output cap C10
  L2:  { x:1056,y:144, w:50,  h:22 },   // Output choke L2
  C11: { x:1136,y:140, w:22,  h:52 },   // Output cap C11
  U1:  { x:638, y:438, w:134, h:106 },  // HPFC U1
  C4:  { x:588, y:488, w:26,  h:54 },   // Bypass C4
  C5:  { x:626, y:506, w:26,  h:44 },   // Voltage cap C5
  R9:  { x:837, y:476, w:32,  h:18 },   // Current sense R9
  R6:  { x:737, y:530, w:40,  h:20 },   // Source R6
  D1:  { x:520, y:380, w:22,  h:44 },   // Freewheeling D1
  U2A: { x:1037,y:377, w:62,  h:58 },   // Optocoupler U2A
  U2B: { x:1037,y:442, w:62,  h:58 },   // Optocoupler U2B
  U3:  { x:1137,y:436, w:58,  h:56 },   // TL431 reference U3
  R11: { x:1217,y:217, w:32,  h:18 },   // Feedback R11
  R12: { x:1257,y:217, w:32,  h:18 },   // Feedback R12
  R13: { x:1217,y:377, w:32,  h:18 },   // Feedback R13
};

function onSvgMouseMove(e) {
  const pt = svgPoint(e);
  if (!pt) { hoveredRef.value = null; return; }
  hoveredRef.value = hitTest(pt.x, pt.y);
}
function onSvgMouseLeave() { hoveredRef.value = null; }

function onSvgClick(e) {
  if (dragDist > 5) { dragDist = 0; return; }
  dragDist = 0;
  const pt = svgPoint(e);
  if (!pt) return;
  const ref = hitTest(pt.x, pt.y);
  if (ref) {
    activeRef.value = ref;
    openEditor(ref);
    emit('component-click', ref);
  }
}

function svgPoint(e) {
  const svgEl = canvasEl.value?.querySelector('svg');
  if (!svgEl) return null;
  try {
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return null;
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(ctm.inverse());
  } catch { return null; }
}

function hitTest(x, y) {
  for (const [ref, box] of Object.entries(HIT_BOXES)) {
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return ref;
  }
  return null;
}

// Convenience: get a value from uds.components[ref][field]
function cv(ref, field) {
  const c = props.uds?.components?.[ref];
  if (!c) return '';
  if (field === 'value' && c.value != null) {
    return `${c.value}${c.unit ? ' ' + c.unit : ''}`;
  }
  return c[field] ?? '';
}

const outputVoltage = computed(() => {
  const out = props.uds?.spec?.outputs?.[0];
  return out ? out.voltage : 12;
});

// ── Family / topology detection ───────────────────────────────────────────────
const family   = computed(() => props.uds?.meta?.family || '');
const topology = computed(() => props.uds?.meta?.topology || 'Flyback');
const Vout     = outputVoltage;

// Which schematic variant to render
const schematicType = computed(() => {
  const f = family.value.toLowerCase();
  if (f.includes('ifc') || f.includes('innoswitch-3')) return 'ifc';
  if (f.includes('tinyswitch-4') || f.includes('lpfc1')) return 'lpfc1';
  if (f.includes('tinyswitch-lt') || f.includes('lpfc2')) return 'lpfc2';
  if (f.includes('linkswitch-tn') || f.includes('psctn')) return 'psctn';
  if (f.includes('linkswitch-xt') || f.includes('pscxt')) return 'pscxt';
  if (f.includes('linkswitch-hp') || f.includes('pschp')) return 'pschp';
  if (f.includes('hpfc-2') || f.includes('hpfc2')) return 'hpfc';
  if (f.includes('hpfc-3') || f.includes('hpfc3')) return 'hpfc';
  return 'hpfc'; // default: HPFC-1 / generic flyback
});

// IC package pin labels per family
const icPins = computed(() => {
  const t = schematicType.value;
  if (t === 'ifc') return { left:['D','V','BP/M'], right:['S','FB','SR'], label:'IFC', color:'#38A169' };
  if (t === 'lpfc1') return { left:['D','EN/UV'], right:['S','BYP'], label:'LPFC-1', color:'#d97706' };
  if (t === 'lpfc2') return { left:['D','EN/UV'], right:['S','BYP'], label:'LPFC-2', color:'#d97706' };
  if (t === 'psctn') return { left:['D'], right:['S','BP'], label:'PSC-TN', color:'#7c3aed' };
  if (t === 'pscxt') return { left:['D','EN/UV'], right:['S','BP'], label:'PSC-XT', color:'#7c3aed' };
  if (t === 'pschp') return { left:['D','V'], right:['S','X'], label:'PSC-HP', color:'#7c3aed' };
  return { left:['D','V','F'], right:['S','X'], label: family.value || 'HPFC-1', color:'#0D7377' };
});

function onWheel(e) {
  const delta = e.deltaY > 0 ? -0.15 : 0.15;
  zoom.value = Math.min(4, Math.max(0.25, zoom.value + delta));
}

let panning = false, lastX = 0, lastY = 0, dragDist = 0;
function startPan(e) {
  // Only start pan on middle button or when not clicking an SVG rect hit area
  if (e.target.tagName === 'rect' || e.target.tagName === 'text' || e.target.tagName === 'g') return;
  panning = true; dragDist = 0;
  lastX = e.clientX; lastY = e.clientY;
}
function doPan(e) {
  if (!panning) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  dragDist += Math.abs(dx) + Math.abs(dy);
  panX.value += dx; panY.value += dy;
  lastX = e.clientX; lastY = e.clientY;
}
function endPan(e) {
  panning = false;
}
function clearActiveRef() { activeRef.value = null; }

// ── Right-click context menu ─────────────────────────────────────────────────
function onRightClick(e, refKey) {
  e.preventDefault();
  e.stopPropagation();
  // Show context menu at mouse position within the canvas container
  const rect = canvasEl.value?.getBoundingClientRect();
  ctxMenu.value = {
    ref: refKey,
    x: e.clientX - (rect?.left ?? 0),
    y: e.clientY - (rect?.top  ?? 0),
  };
}

function closeCtxMenu() { ctxMenu.value = null; }

function toggleFreeze(refKey) {
  const s = new Set(frozenRefs.value);
  if (s.has(refKey)) s.delete(refKey);
  else s.add(refKey);
  frozenRefs.value = s;
  closeCtxMenu();
}

function openFromContext(refKey) {
  activeRef.value = refKey;
  emit('component-click', refKey);
  closeCtxMenu();
}

function getFrozenSet() { return frozenRefs.value; }
function setFrozenSet(s) { frozenRefs.value = new Set(s); }

defineExpose({ clearActiveRef, getFrozenSet, setFrozenSet });

function fitView() { zoom.value = 0.85; panX.value = 0; panY.value = 0; }
</script>

<style scoped>
.sd-wrap { display:flex; flex-direction:column; flex:1; min-height:0; border:1px solid #e2e4ea; border-radius:6px; overflow:hidden; background:#fff; position:relative; }
.sd-toolbar { display:flex; align-items:center; gap:.3rem; padding:.3rem .6rem; background:#f8f9fb; border-bottom:1px solid #e2e4ea; flex-shrink:0; }
.sd-tb-btn { height:24px; padding:0 .55rem; border:1px solid #d0d3de; border-radius:4px; background:#fff; font-size:.78rem; cursor:pointer; }
.sd-tb-btn:hover { background:#eef2ff; border-color:#0066A6; color:#0066A6; }
.sd-hit-overlay rect[fill="transparent"] { cursor: pointer; }
.sd-svg { user-select: none; }
.sd-zoom-label { font-size:.75rem; color:#888; }
.sd-title { font-size:.72rem; color:#0066A6; margin-left:.5rem; font-family:monospace; }
.sd-canvas { flex:1; overflow:hidden; cursor:grab; position:relative; background:#fafbfc; }
.sd-canvas:active { cursor:grabbing; }
.sd-inner { position:absolute; top:0; left:0; }
.sd-svg { display:block; user-select:none; }

/* ── Enhanced hover animation ─────────────────────────────────────────────── */
.sd-hover-dash {
  animation: sd-dash-march 0.6s linear infinite;
}
@keyframes sd-dash-march {
  to { stroke-dashoffset: -16; }
}
/* ── Context menu ─────────────────────────────────────────────────────────── */
.sd-ctx-backdrop { position:absolute; inset:0; z-index:99; }
.sd-ctx-menu {
  position:absolute; z-index:100; min-width:200px;
  background:#fff; border:1px solid #d0d4e8; border-radius:7px;
  box-shadow:0 8px 28px rgba(0,0,0,.18); overflow:hidden;
  user-select:none;
}
.sd-ctx-header {
  padding:.4rem .8rem; background:#1B3A6B; color:#e8ecff;
  font-size:.78rem; font-weight:700; font-family:monospace; letter-spacing:.05em;
}
.sd-ctx-item {
  display:flex; align-items:flex-start; gap:.5rem; width:100%;
  padding:.5rem .8rem; border:none; border-bottom:1px solid #f0f1f6;
  background:#fff; text-align:left; cursor:pointer; font-size:.8rem; color:#1a1a2e;
  flex-direction:row; flex-wrap:wrap;
}
.sd-ctx-item:hover { background:#f0f4ff; }
.sd-ctx-item:last-child { border-bottom:none; }
.sd-ctx-icon { font-size:1rem; flex-shrink:0; }
.sd-ctx-hint { display:block; width:100%; font-size:.68rem; color:#888; padding-left:1.5rem; margin-top:.05rem; }

/* ── Component Editor Panel ──────────────────────────────────────────────────── */



.sd-panel-slide-leave-active { transition: transform .2s ease, opacity .15s; }
.sd-panel-slide-enter-from,
.sd-panel-slide-leave-to    { transform: translateX(100%); opacity: 0; }

/* Header */

.sd-ep-title-row { display: flex; align-items: center; gap: .5rem; margin-bottom: .2rem; }
.sd-ep-ref   { font-size: 1rem; font-weight: 800; letter-spacing: .04em; }
.sd-ep-label { font-size: .78rem; color: rgba(200,220,255,.85); }
.sd-ep-modified-badge {
  margin-left: auto;
  font-size: .65rem; font-weight: 700;
  background: #0066A6; color: #fff;
  padding: .1rem .4rem; border-radius: 3px;
}
.sd-ep-current { font-size: .72rem; color: rgba(180,210,255,.9); }
.sd-ep-close {
  position: absolute; top: .5rem; right: .6rem;
  background: rgba(255,255,255,.15); border: none; color: #fff;
  width: 22px; height: 22px; border-radius: 50%;
  font-size: .8rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.sd-ep-close:hover { background: rgba(255,255,255,.3); }

/* Section label */
.sd-ep-section-label {
  font-size: .68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: #8899AA;
  padding: .5rem .85rem .25rem;
  display: flex; align-items: center; gap: .5rem;
}
.sd-ep-alt-count {
  background: #EEF4FB; color: #0066A6;
  font-size: .65rem; font-weight: 700;
  padding: .05rem .35rem; border-radius: 10px;
}

/* Editable fields */
.sd-ep-fields { padding: 0 .85rem .5rem; flex-shrink: 0; }
.sd-ep-field-row {
  display: flex; align-items: center;
  gap: .5rem; margin-bottom: .3rem;
}
.sd-ep-field-label {
  width: 90px; flex-shrink: 0;
  font-size: .72rem; color: #5A6A7E; font-weight: 600;
}
.sd-ep-field-input {
  flex: 1; font-size: .78rem; padding: .25rem .45rem;
  border: 1px solid #D1D9E6; border-radius: 4px;
  background: #F8FAFB; color: #1A2332;
  font-family: 'Segoe UI', sans-serif;
}
.sd-ep-field-input:focus {
  outline: none; border-color: #0066A6;
  background: #fff; box-shadow: 0 0 0 2px rgba(0,102,166,.12);
}

/* Alternatives list */
.sd-ep-alts { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.sd-ep-alt-list { flex: 1; overflow-y: auto; padding: 0 .5rem .5rem; }

.sd-ep-alt-item:hover   { background: #EEF4FB; border-color: #0066A6; }
.sd-ep-alt-active       { background: #EEF4FB; border-color: #0066A6; }
.sd-ep-alt-main {
  display: flex; align-items: baseline; gap: .45rem; margin-bottom: .2rem;
}
.sd-ep-alt-part { font-size: .8rem; font-weight: 700; color: #1B3A6B; font-family: monospace; }
.sd-ep-alt-mfr  { font-size: .7rem; color: #8899AA; }
.sd-ep-alt-specs {
  display: flex; flex-wrap: wrap; gap: .2rem;
}
.sd-ep-alt-specs span {
  font-size: .68rem; background: #F4F6F9;
  color: #4A5568; padding: .06rem .3rem; border-radius: 3px;
}
.sd-ep-alt-cost { background: #F0FFF4 !important; color: #276749 !important; font-weight: 700; }

/* Action buttons */
.sd-ep-actions {
  padding: .6rem .85rem;
  border-top: 1px solid #EEF2F7;
  display: flex; gap: .45rem; flex-shrink: 0;
  background: #F8FAFB;
}

.sd-ep-btn-confirm { background: #0066A6; color: #fff; }
.sd-ep-btn-confirm:hover { background: #005490; }
.sd-ep-btn-cancel  { background: #EEF2F7; color: #5A6A7E; }
.sd-ep-btn-cancel:hover  { background: #E0E8F0; }
.sd-ep-btn-reset   { background: #FFF0F0; color: #B5122A; flex: 0 0 auto; padding: .38rem .65rem; }
.sd-ep-btn-reset:hover   { background: #FFE0E0; }


/* ── Component Selector Modal ─────────────────────────────────────────────── */
.sd-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,20,50,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000;
}
.sd-modal {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 12px 48px rgba(0,20,60,.28);
  width: 720px; max-width: 95vw;
  max-height: 88vh;
  display: flex; flex-direction: column;
  overflow: hidden;
}
/* Header */
.sd-modal-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: .85rem 1.1rem .75rem;
  border-bottom: 1px solid #E8ECF4;
}
.sd-modal-hd-left { display: flex; align-items: center; gap: .75rem; }
.sd-modal-comp-icon {
  width: 34px; height: 34px;
  background: #EEF4FB; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; color: #0066A6;
}
.sd-modal-title    { font-size: .95rem; font-weight: 700; color: #1A2332; }
.sd-modal-subtitle { font-size: .78rem; color: #5A6A7E; margin-top: .1rem; }
.sd-modal-ref      { color: #0066A6; font-family: monospace; }
.sd-modal-ref-mod  { color: #888; margin-left: .3rem; }
.sd-modal-close {
  background: none; border: none; font-size: 1rem;
  color: #8899AA; cursor: pointer; padding: .2rem .4rem; border-radius: 4px;
}
.sd-modal-close:hover { background: #F4F6F9; color: #1A2332; }

/* Tabs */
.sd-modal-tabs {
  display: flex; gap: 0;
  border-bottom: 2px solid #E8ECF4;
  padding: 0 1.1rem;
  background: #fff;
}
.sd-modal-tab {
  background: none; border: none; cursor: pointer;
  padding: .55rem .9rem; font-size: .82rem; font-weight: 500;
  color: #5A6A7E; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all .12s;
}
.sd-modal-tab:hover { color: #0066A6; }
.sd-modal-tab.active { color: #0066A6; font-weight: 700; border-bottom-color: #0066A6; }

/* Body */
.sd-modal-body { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

/* Search row */
.sd-modal-search-row {
  display: flex; align-items: center; gap: .6rem;
  padding: .6rem 1rem; border-bottom: 1px solid #F0F2F8; flex-shrink: 0;
}
.sd-modal-search {
  flex: 1; padding: .38rem .65rem; border: 1px solid #D1D9E6;
  border-radius: 5px; font-size: .82rem; background: #FAFBFC;
}
.sd-modal-search:focus { outline: none; border-color: #0066A6; background: #fff; }
.sd-modal-filter {
  padding: .38rem .55rem; border: 1px solid #D1D9E6;
  border-radius: 5px; font-size: .82rem; background: #FAFBFC;
  min-width: 120px;
}
.sd-modal-count { font-size: .75rem; color: #8899AA; white-space: nowrap; }

/* Table */
.sd-modal-table-wrap { flex: 1; overflow-y: auto; }
.sd-modal-table {
  width: 100%; border-collapse: collapse; font-size: .8rem;
}
.sd-modal-table thead tr {
  background: #1B3A6B;
  position: sticky; top: 0; z-index: 2;
}
.sd-modal-table thead th {
  padding: .5rem .65rem; text-align: left;
  color: #fff; font-weight: 600; font-size: .75rem;
  white-space: nowrap;
}
.sd-modal-table thead th:first-child { width: 34px; }
.sd-modal-table tbody tr { border-bottom: 1px solid #F0F2F8; cursor: pointer; }
.sd-modal-table tbody tr:hover  { background: #F4F8FF; }
.sd-modal-table tbody tr.selected { background: #EEF4FB; }
.sd-modal-table td { padding: .45rem .65rem; color: #1A2332; vertical-align: middle; }
.sd-modal-part  { font-family: monospace; font-weight: 600; color: #0066A6; }
.sd-modal-cost  { font-weight: 600; color: #276749; }
.sd-modal-empty { text-align: center; color: #8899AA; padding: 1.5rem; }
/* Radio dot */
.sd-modal-radio {
  width: 16px; height: 16px; border-radius: 50%;
  border: 1.5px solid #C0CCDD; display: inline-block;
  vertical-align: middle;
}
.sd-modal-radio.active {
  border-color: #0066A6; background: radial-gradient(circle, #0066A6 40%, transparent 41%);
  box-shadow: inset 0 0 0 3px #fff, inset 0 0 0 5px #0066A6;
}

/* Params tab */
.sd-modal-params { padding: .8rem 1.1rem; overflow-y: auto; }
.sd-param-row { display: flex; align-items: center; gap: .8rem; margin-bottom: .5rem; }
.sd-param-label { width: 110px; font-size: .78rem; font-weight: 600; color: #5A6A7E; flex-shrink: 0; }
.sd-param-input {
  flex: 1; padding: .32rem .55rem; border: 1px solid #D1D9E6;
  border-radius: 4px; font-size: .82rem; background: #FAFBFC;
}
.sd-param-input:focus { outline: none; border-color: #0066A6; background: #fff; }

/* Notes tab */
.sd-modal-notes {
  margin: .8rem 1.1rem; flex: 1;
  border: 1px solid #D1D9E6; border-radius: 5px;
  font-size: .82rem; padding: .6rem .75rem;
  resize: vertical; min-height: 140px;
  font-family: var(--font-body, 'Segoe UI', sans-serif);
}

/* Footer */
.sd-modal-footer {
  display: flex; align-items: center; gap: .5rem;
  padding: .65rem 1.1rem;
  border-top: 1px solid #E8ECF4;
  background: #FAFBFC;
}
.sd-modal-btn {
  padding: .42rem 1.1rem; border-radius: 5px;
  font-size: .82rem; font-weight: 600; cursor: pointer; border: none;
  transition: background .12s;
}
.sd-modal-btn-apply  { background: #0066A6; color: #fff; }
.sd-modal-btn-apply:hover  { background: #005490; }
.sd-modal-btn-cancel { background: #EEF2F7; color: #5A6A7E; }
.sd-modal-btn-cancel:hover { background: #E0E8F0; }
.sd-modal-btn-reset  { background: #FFF0F0; color: #B5122A; }
.sd-modal-btn-reset:hover  { background: #FFE0E0; }

</style>

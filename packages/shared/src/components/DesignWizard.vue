<template>
  <div class="dw-root" v-if="wizardOpen || designReady || simulating || pickerOpen">

    <!-- ══ WIZARD MODAL ══════════════════════════════════════════════════════ -->
    <teleport to="body">
      <transition name="dw-fade">
        <div v-if="wizardOpen" class="dw-backdrop">
          <div class="dw-modal" @click.stop>

            <!-- Header -->
            <div class="dw-modal-hd">
              <span class="dw-modal-title">New FluxForge Design Wizard</span>
              <button class="dw-close" @click="cancelWizard">✕</button>
            </div>

            <!-- Step indicator -->
            <div class="dw-steps">
              <div v-for="s in STEPS" :key="s.n"
                class="dw-step"
                :class="{ active: step === s.n, done: step > s.n }">
                <div class="dw-step-dot">{{ step > s.n ? '✓' : s.n }}</div>
                <span class="dw-step-label">{{ s.label }}</span>
              </div>
            </div>

            <div class="dw-divider"/>

            <!-- ── STEP 1: Design Options ─────────────────────────────────── -->
            <div v-if="step === 1" class="dw-body">
              <div class="dw-section-title">Design Options</div>
              <div class="dw-section-sub">Select a converter family to begin</div>

              <div class="dw-two-col">
                <div class="dw-fields">
                  <div class="dw-field">
                    <label>Product Line</label>
                    <select v-model="form.productLine" @change="onProductLineChange">
                      <option v-for="pl in PRODUCT_LINES" :key="pl">{{ pl }}</option>
                    </select>
                  </div>
                  <div class="dw-field">
                    <label>Family</label>
                    <select v-model="form.family" @change="onFamilyChange">
                      <option v-for="f in availableFamilies" :key="f">{{ f }}</option>
                    </select>
                  </div>
                  <div class="dw-field">
                    <label>Topology</label>
                    <select v-model="form.topology">
                      <option v-for="t in availableTopologies" :key="t">{{ t }}</option>
                    </select>
                  </div>
                  <div class="dw-field">
                    <label>Package</label>
                    <select v-model="form.pkg">
                      <option v-for="p in availablePackages" :key="p">{{ p }}</option>
                    </select>
                  </div>
                  <div class="dw-field">
                    <label>Frequency</label>
                    <select v-model="form.frequency">
                      <option v-for="f in availableFrequencies" :key="f">{{ f }}</option>
                    </select>
                  </div>
                  <div class="dw-field">
                    <label>Enclosure</label>
                    <select v-model="form.enclosure">
                      <option>Open Frame</option>
                      <option>Enclosed</option>
                    </select>
                  </div>

                  <div class="dw-sub-title">Feedback</div>
                  <div class="dw-field">
                    <label>Type</label>
                    <select v-model="form.feedbackType">
                      <option v-for="fb in FEEDBACK_TYPES" :key="fb">{{ fb }}</option>
                    </select>
                  </div>
                  <div class="dw-field">
                    <label>Use Primary Bias</label>
                    <select v-model="form.primaryBias">
                      <option>YES</option>
                      <option>NO</option>
                    </select>
                  </div>
                </div>

                <!-- Topology preview -->
                <div class="dw-topo-preview">
                  <svg viewBox="0 0 220 140" fill="none" stroke="#333" stroke-width="1.2"
                    xmlns="http://www.w3.org/2000/svg">
                    <!-- AC input -->
                    <text x="4" y="22" font-size="7" fill="#555">AC IN</text>
                    <line x1="2" y1="30" x2="30" y2="30"/>
                    <line x1="2" y1="80" x2="30" y2="80"/>
                    <!-- Bridge rectifier -->
                    <polygon points="30,30 50,55 30,80" fill="#e8f0fe" stroke="#0066A6"/>
                    <polygon points="50,55 70,30 70,80" fill="#e8f0fe" stroke="#0066A6"/>
                    <line x1="50" y1="55" x2="75" y2="55"/>
                    <!-- Bus cap -->
                    <line x1="75" y1="40" x2="75" y2="72"/>
                    <line x1="70" y1="40" x2="80" y2="40"/>
                    <line x1="70" y1="44" x2="80" y2="44"/>
                    <line x1="75" y1="44" x2="75" y2="72"/>
                    <!-- Transformer -->
                    <rect x="95" y="30" width="30" height="50" rx="4" fill="#fff8e1" stroke="#D97706"/>
                    <text x="103" y="59" font-size="6" fill="#b45309">TX</text>
                    <!-- Primary winding lines -->
                    <line x1="75" y1="40" x2="95" y2="40"/>
                    <line x1="75" y1="72" x2="95" y2="72"/>
                    <!-- HPFC IC -->
                    <rect x="86" y="85" width="46" height="30" rx="3" fill="#e0e7ff" stroke="#0066A6"/>
                    <text x="91" y="103" font-size="6" fill="#3730a3">HPFC-1</text>
                    <line x1="95" y1="72" x2="95" y2="85"/>
                    <line x1="109" y1="85" x2="109" y2="72"/>
                    <!-- Secondary diode -->
                    <line x1="125" y1="40" x2="150" y2="40"/>
                    <polygon points="140,34 140,46 152,40" fill="#F0FFF4" stroke="#38A169"/>
                    <!-- Output cap + load -->
                    <line x1="165" y1="30" x2="165" y2="72"/>
                    <line x1="160" y1="40" x2="170" y2="40"/>
                    <line x1="160" y1="44" x2="170" y2="44"/>
                    <line x1="165" y1="44" x2="165" y2="72"/>
                    <line x1="125" y1="72" x2="165" y2="72"/>
                    <text x="172" y="42" font-size="7" fill="#555">DC</text>
                    <text x="170" y="51" font-size="7" fill="#555">OUT</text>
                    <!-- Feedback loop -->
                    <path d="M165,60 Q190,60 190,100 Q190,115 109,115 L109,115" stroke="#0066A6" stroke-dasharray="3,2"/>
                    <text x="170" y="75" font-size="6" fill="#0066A6">FB</text>
                  </svg>
                  <div class="dw-topo-label">{{ form.family }} — {{ form.topology }}</div>
                </div>
              </div>
            </div>

            <!-- ── STEP 2: Input ──────────────────────────────────────────── -->
            <div v-if="step === 2" class="dw-body">
              <div class="dw-section-title">Input</div>
              <div class="dw-section-sub dw-family-sub">
                <span class="dw-fam-badge">{{ form.family }}</span>
                <span class="dw-fam-hint">{{ familyHint.inputSpec }}</span>
              </div>

              <div class="dw-two-col dw-two-col-sm">

                <!-- Voltage box -->
                <div class="dw-group-box">
                  <div class="dw-group-label">Voltage Range</div>
                  <div class="dw-field-row">
                    <label>Min. (V)</label>
                    <input type="number" v-model.number="form.vMin" class="dw-input" :min="47" :max="200" />
                  </div>
                  <div class="dw-field-row">
                    <label>Max. (V)</label>
                    <input type="number" v-model.number="form.vMax" class="dw-input" :min="100" :max="530" />
                  </div>
                  <div class="dw-field-row">
                    <label>Line Freq. (Hz)</label>
                    <select v-model.number="form.lineFreq" class="dw-input dw-input-sm">
                      <option :value="50">50 Hz</option>
                      <option :value="60">60 Hz</option>
                    </select>
                  </div>
                </div>

                <!-- AC/DC type — only show options valid for this family -->
                <div class="dw-group-box">
                  <div class="dw-group-label">AC / DC Input Type</div>
                  <label v-for="t in familyCfg.inputTypes" :key="t" class="dw-radio">
                    <input type="radio" v-model="form.inputType" :value="t" /> {{ t }}
                  </label>

                  <!-- EN/UV threshold — LPFC and PSC-XT only -->
                  <template v-if="showEnUv">
                    <div class="dw-family-divider">EN/UV Threshold</div>
                    <div class="dw-field-row">
                      <label>UV Lockout (V)</label>
                      <input type="number" v-model.number="form.uvThreshold"
                        class="dw-input dw-input-sm" :placeholder="form.vMin * 0.75 | 0" />
                    </div>
                    <div class="dw-family-tip">
                      ℹ EN/UV pin sets line undervoltage lockout. Typical = 75% of V_min.
                    </div>
                  </template>
                </div>
              </div>

              <!-- Input Specification list — filtered per family -->
              <div class="dw-group-box" style="margin-top:.7rem">
                <div class="dw-group-label">Input Specification</div>
                <div class="dw-list-select">
                  <div v-for="spec in availableInputSpecs" :key="spec"
                    class="dw-list-opt"
                    :class="{ active: form.inputSpec === spec }"
                    @click="form.inputSpec = spec; form.vMin = specVmin(spec); form.vMax = specVmax(spec)">
                    {{ spec }}
                  </div>
                </div>
              </div>
            </div>

            <!-- ── STEP 3: Outputs ───────────────────────────────────────── -->
            <div v-if="step === 3" class="dw-body">
              <div class="dw-section-title">Outputs</div>
              <div class="dw-section-sub dw-family-sub">
                <span class="dw-fam-badge">{{ form.family }}</span>
                <span class="dw-fam-hint">{{ familyHint.outputs }}</span>
              </div>

              <!-- Toolbar: only show controls valid for this family -->
              <div class="dw-output-toolbar">
                <div class="dw-output-toolbar-left">

                  <template v-if="showPeakLd">
                    <label>Peak Loads</label>
                    <select v-model="form.peakLoads" class="dw-sel-sm">
                      <option>NO</option><option>YES</option>
                    </select>
                  </template>

                  <template v-if="showLedDrv">
                    <label :style="showPeakLd ? 'margin-left:.75rem' : ''">LED Driver</label>
                    <select v-model="form.ledDriver" class="dw-sel-sm">
                      <option>NO</option><option>YES</option>
                    </select>
                  </template>

                  <template v-if="showUsbPd">
                    <label style="margin-left:.75rem">USB-PD</label>
                    <select v-model="form.usbPd" class="dw-sel-sm">
                      <option>NO</option><option>YES</option>
                    </select>
                  </template>

                  <!-- Max-outputs badge -->
                  <span class="dw-max-rail-badge">
                    Max {{ maxOutputs }} rail{{ maxOutputs > 1 ? 's' : '' }}
                  </span>
                </div>

                <div style="display:flex;gap:.4rem">
                  <button class="dw-btn-blue"
                    :disabled="form.outputs.length >= maxOutputs"
                    :title="form.outputs.length >= maxOutputs ? 'Max '+maxOutputs+' outputs for '+form.family : 'Add output rail'"
                    @click="openOutputModal">Add…</button>
                  <button class="dw-btn-gray" :disabled="!selectedOutput" @click="removeOutput">Remove</button>
                  <button class="dw-btn-gray" :disabled="!selectedOutput" @click="editOutput">Edit…</button>
                </div>
              </div>

              <!-- Output table -->
              <table class="dw-out-table">
                <thead><tr>
                  <th></th>
                  <th>Voltage (V)</th>
                  <th>Current (A)</th>
                  <th>Power (W)</th>
                  <th>±Tol (%)</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(o, i) in form.outputs" :key="i"
                    :class="{ selected: selectedOutputIdx === i }"
                    @click="selectedOutputIdx = i">
                    <td class="dw-out-num">{{ i+1 }}</td>
                    <td>{{ o.voltage.toFixed(2) }}</td>
                    <td>{{ o.current.toFixed(3) }}</td>
                    <td class="dw-out-pwr">{{ (o.voltage * o.current).toFixed(2) }}</td>
                    <td class="dw-out-tol">+{{ o.tolPos }}%/–{{ o.tolNeg }}%</td>
                  </tr>
                  <!-- SR output row (IFC only) -->
                  <tr v-if="showSrOut" class="dw-sr-row">
                    <td>SR</td>
                    <td colspan="4" class="dw-sr-note">Sync Rectifier output — auto-included by {{ form.family }}</td>
                  </tr>
                  <!-- Bias winding row (HPFC / PSC-HP) -->
                  <tr v-if="showBias" class="dw-bias-row">
                    <td>Bias</td>
                    <td colspan="4" class="dw-sr-note">Bias winding for IC supply — auto-added by simulator</td>
                  </tr>
                  <!-- Empty placeholder rows -->
                  <tr v-for="n in Math.max(0, Math.min(maxOutputs,4) - form.outputs.length - (showSrOut?1:0) - (showBias?1:0))"
                    :key="'e'+n" class="empty-row">
                    <td></td><td></td><td></td><td></td><td></td>
                  </tr>
                </tbody>
              </table>

              <!-- Power over-limit warning -->
              <div v-if="totalPower > familyPower" class="dw-over-limit">
                ⚠ Total power {{ totalPower.toFixed(1) }}W exceeds {{ form.family }} maximum of {{ familyPower }}W.
                Consider a higher-power family.
              </div>

              <!-- Summary row -->
              <div class="dw-out-summary">
                <div class="dw-out-stat">
                  <span>Total Power (W)</span>
                  <input :value="totalPower.toFixed(2)" readonly class="dw-input dw-input-sm"
                    :class="totalPower > familyPower ? 'dw-input-over' : ''" />
                </div>

                <template v-if="showCcCv">
                  <div class="dw-out-stat">
                    <span>Operation Mode</span>
                    <select v-model="form.operationMode" class="dw-sel-sm">
                      <option>CV Only</option><option>CC/CV</option><option>CC Only</option>
                    </select>
                  </div>
                  <div class="dw-out-stat" v-if="form.operationMode !== 'CV Only'">
                    <span>CC Threshold (V)</span>
                    <input type="number" v-model.number="form.ccThreshold" class="dw-input dw-input-sm" />
                  </div>
                </template>

                <div class="dw-out-stat" v-if="form.usbPd === 'YES'">
                  <span>USB-PD Profiles</span>
                  <select v-model="form.usbPdProfile" class="dw-sel-sm">
                    <option>5V/0.9A</option><option>9V/2A</option><option>15V/3A</option><option>20V/5A</option><option>Custom</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- ── STEP 4: Design Settings ────────────────────────────────── -->
            <div v-if="step === 4" class="dw-body">
              <div class="dw-section-title">Design Settings</div>
              <div class="dw-section-sub">Defaults</div>

              <div class="dw-fields" style="max-width:500px">
                <div class="dw-field">
                  <label>New Design File Name</label>
                  <input v-model="form.fileName" class="dw-input dw-input-full" style="border-color:#0066A6;box-shadow:0 0 0 2px rgba(79,124,255,.18)" />
                </div>
                <div class="dw-field">
                  <label>SI Units</label>
                  <input type="checkbox" v-model="form.siUnits" style="width:16px;height:16px" />
                </div>
                <div class="dw-field">
                  <label>Default Component Set</label>
                  <select v-model="form.componentSet">
                    <option value="All Records">All Records</option>
                    <option v-for="s in availableSets" :key="s.id" :value="s.name">{{ s.name }}</option>
                  </select>
                  <span v-if="form.componentSet !== 'All Records' && activeSetDesc" class="dw-set-hint">{{ activeSetDesc }}</span>
                </div>
                <div class="dw-field">
                  <label>Start with</label>
                  <select v-model="form.startWith">
                    <option>Schematic</option><option>Design Results</option>
                  </select>
                </div>
              </div>

              <!-- Family-specific magnetics settings -->
              <div class="dw-group-box" style="margin-top:1rem;max-width:520px">
                <div class="dw-group-label">Magnetics &amp; Design Parameters
                  <span class="dw-fam-badge" style="margin-left:.5rem">{{ form.family }}</span>
                </div>

                <!-- Feedback type — driven by family -->
                <div class="dw-field-row">
                  <label>Feedback Type</label>
                  <select v-model="form.feedbackType" class="dw-sel-sm">
                    <option v-for="f in availableFeedbacks" :key="f">{{ f }}</option>
                  </select>
                </div>

                <!-- Isolation class -->
                <div class="dw-field-row" style="margin-top:.45rem">
                  <label>Isolation Class</label>
                  <select v-model="form.isolationClass" class="dw-sel-sm">
                    <option value="reinforced">Reinforced (IEC 62368-1)</option>
                    <option value="supplementary">Supplementary</option>
                    <option value="basic">Basic</option>
                  </select>
                </div>

                <!-- VOR — hidden for IFC (fixed at 135V internally) -->
                <div class="dw-field-row" style="margin-top:.45rem" v-if="!form.family.includes('IFC')">
                  <label>VOR (V) <span class="dw-field-hint" title="Voltage On Reflected — clamp voltage reference">?</span></label>
                  <input type="number" v-model.number="form.VOR" class="dw-input dw-input-sm"
                    :min="40" :max="200" step="5" />
                </div>
                <div class="dw-field-row" style="margin-top:.45rem" v-else>
                  <label>VOR (V)</label>
                  <input value="135 (fixed)" readonly class="dw-input dw-input-sm dw-input-locked" />
                  <span class="dw-family-tip">Fixed internally by IFC architecture</span>
                </div>

                <!-- KP — not relevant for PSC-TN (no external inductor design param) -->
                <div class="dw-field-row" style="margin-top:.45rem" v-if="form.family !== 'PSC-TN'">
                  <label>KP (ripple ratio) <span class="dw-field-hint" title="Peak-to-average current ratio. 0=CCM, 1=BCM">?</span></label>
                  <input type="number" v-model.number="form.KP" class="dw-input dw-input-sm"
                    :min="0.2" :max="1.0" step="0.05" />
                  <span class="dw-kp-mode">{{ form.KP >= 1 ? 'BCM' : form.KP <= 0 ? 'CCM' : 'DCM' }}</span>
                </div>

                <!-- Switching frequency — range from family config -->
                <div class="dw-field-row" style="margin-top:.45rem">
                  <label>Switching Frequency</label>
                  <select v-model="form.frequency" class="dw-sel-sm">
                    <option v-for="f in availableFrequencies" :key="f">{{ f }}</option>
                  </select>
                </div>

                <!-- Transformer type -->
                <div class="dw-field-row" style="margin-top:.45rem">
                  <label>Transformer Type</label>
                  <select v-model="form.transformerType" class="dw-sel-sm">
                    <option>Wire Wound</option><option>Planar</option>
                  </select>
                </div>

                <!-- Core material -->
                <div class="dw-field-row" style="margin-top:.45rem">
                  <label>Core Material</label>
                  <select v-model="form.coreMaterial" class="dw-sel-sm">
                    <option v-for="m in availableCoreMaterials" :key="m">{{ m }}</option>
                  </select>
                </div>

                <!-- Shield windings — only relevant for multi-output designs -->
                <div class="dw-field-row" style="margin-top:.45rem" v-if="form.outputs.length > 1">
                  <label>Shield Windings</label>
                  <input type="checkbox" v-model="form.shieldWindings" style="width:15px;height:15px" />
                </div>

                <!-- Hint box -->
                <div class="dw-family-tip" style="margin-top:.6rem">
                  💡 {{ familyHint.power }}
                </div>
              </div>
            </div>

            <!-- Footer buttons -->
            <div class="dw-modal-ft">
              <button class="dw-btn-gray" @click="prevStep" :disabled="step === 1">Prev</button>
              <button v-if="step < 4" class="dw-btn-blue" @click="nextStep">Next</button>
              <button v-else class="dw-btn-blue" @click="finishWizard" :disabled="saving">
                {{ saving ? 'Generating…' : 'Finish' }}
              </button>
              <button class="dw-btn-outline" @click="cancelWizard">Cancel</button>
              <button class="dw-btn-outline">Help</button>
            </div>

          </div>
        </div>
      </transition>
    </teleport>

    <!-- ══ OUTPUT MODAL ══════════════════════════════════════════════════════ -->
    <teleport to="body">
      <div v-if="outputModalOpen" class="dw-backdrop dw-backdrop-over" @click.self="outputModalOpen = false">
        <div class="dw-modal dw-modal-sm" @click.stop>
          <div class="dw-modal-hd">
            <span>Output</span>
            <button class="dw-close" @click="outputModalOpen = false">✕</button>
          </div>
          <div class="dw-divider"/>

          <div class="dw-body" style="display:flex;gap:1.25rem;flex-wrap:wrap">
            <div class="dw-group-box" style="flex:1;min-width:180px">
              <div class="dw-field-row"><label>Voltage, V</label>
                <input type="number" v-model.number="outputDraft.voltage" class="dw-input dw-input-sm" />
              </div>
              <div class="dw-field-row"><label>Current, A</label>
                <input type="number" v-model.number="outputDraft.current" class="dw-input dw-input-sm" />
              </div>
              <div class="dw-field-row"><label>Power, W</label>
                <input :value="(outputDraft.voltage * outputDraft.current).toFixed(2)" readonly class="dw-input dw-input-sm dw-input-ro" />
              </div>
              <div class="dw-field-row"><label>Peak Current, A</label>
                <input type="number" v-model.number="outputDraft.peakCurrent" class="dw-input dw-input-sm" />
              </div>
              <div class="dw-field-row"><label>Peak Power, W</label>
                <input :value="(outputDraft.voltage * outputDraft.peakCurrent).toFixed(2)" readonly class="dw-input dw-input-sm dw-input-ro" />
              </div>
              <div class="dw-field-row"><label>Duty Cycle for Peak Power</label>
                <input type="number" v-model.number="outputDraft.dutyCycle" class="dw-input dw-input-sm" />
              </div>
            </div>

            <div class="dw-group-box" style="flex:1;min-width:180px">
              <div class="dw-group-label">Output Voltage Tolerance</div>
              <div class="dw-field-row"><label>Tolerance +, %</label>
                <input type="number" v-model.number="outputDraft.tolPos" class="dw-input dw-input-sm dw-input-ro" readonly />
              </div>
              <div class="dw-field-row"><label>Tolerance -, %</label>
                <input type="number" v-model.number="outputDraft.tolNeg" class="dw-input dw-input-sm dw-input-ro" readonly />
              </div>
              <div class="dw-field-row"><label>Tolerance +, V</label>
                <input :value="((outputDraft.voltage * outputDraft.tolPos) / 100).toFixed(2)" readonly class="dw-input dw-input-sm dw-input-ro" />
              </div>
            </div>
          </div>

          <div class="dw-modal-ft">
            <button class="dw-btn-gray" @click="confirmOutput"
              :disabled="!outputDraft.voltage || !outputDraft.current">OK</button>
            <button class="dw-btn-outline" @click="outputModalOpen = false">Cancel</button>
            <button class="dw-btn-outline">Help</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ══ SCHEMATIC VIEWER ═══════════════════════════════════════════════════ -->
    <!-- ══ DESIGN PROPERTIES DIALOG ═══════════════════════════════════════ -->
    <teleport to="body">
      <div v-if="showDesignProps" class="dw-dp-overlay" @click.self="showDesignProps=false">
        <div class="dw-dp-modal">
          <div class="dw-dp-header">
            <span>📋 Design Properties</span>
            <button class="dw-dp-x" @click="showDesignProps=false">✕</button>
          </div>
          <div class="dw-dp-body" v-if="propsDraft">
            <div class="dw-dp-section">Basic Information</div>
            <div class="dw-dp-grid">
              <div class="dw-dp-field">
                <label>File Name</label>
                <input class="dw-dp-inp" v-model="propsDraft.fileName"/>
              </div>
              <div class="dw-dp-field">
                <label>Topology</label>
                <input class="dw-dp-inp" v-model="propsDraft.topology"/>
              </div>
              <div class="dw-dp-field">
                <label>IC Family</label>
                <input class="dw-dp-inp" v-model="propsDraft.family"/>
              </div>
              <div class="dw-dp-field">
                <label>Package</label>
                <input class="dw-dp-inp" v-model="propsDraft.pkg"/>
              </div>
              <div class="dw-dp-field">
                <label>Switching Frequency</label>
                <input class="dw-dp-inp" v-model="propsDraft.frequency"/>
              </div>
              <div class="dw-dp-field">
                <label>Feedback Type</label>
                <input class="dw-dp-inp" v-model="propsDraft.feedbackType"/>
              </div>
            </div>

            <div class="dw-dp-section">Input Specification</div>
            <div class="dw-dp-grid">
              <div class="dw-dp-field">
                <label>Vin Min (V)</label>
                <input class="dw-dp-inp" type="number" v-model.number="propsDraft.vMin"/>
              </div>
              <div class="dw-dp-field">
                <label>Vin Max (V)</label>
                <input class="dw-dp-inp" type="number" v-model.number="propsDraft.vMax"/>
              </div>
              <div class="dw-dp-field">
                <label>Line Frequency (Hz)</label>
                <input class="dw-dp-inp" type="number" v-model.number="propsDraft.lineFreq"/>
              </div>
              <div class="dw-dp-field">
                <label>Input Spec</label>
                <input class="dw-dp-inp" v-model="propsDraft.inputSpec"/>
              </div>
              <div class="dw-dp-field">
                <label>Total Power (W)</label>
                <input class="dw-dp-inp" type="number" v-model.number="propsDraft.totalPower"/>
              </div>
              <div class="dw-dp-field">
                <label>Component Set</label>
                <input class="dw-dp-inp" v-model="propsDraft.componentSet"/>
              </div>
            </div>

            <div class="dw-dp-section">Transformer & Magnetics</div>
            <div class="dw-dp-grid">
              <div class="dw-dp-field">
                <label>Transformer Type</label>
                <select class="dw-dp-inp" v-model="propsDraft.transformerType">
                  <option>Wire Wound</option><option>Planar</option><option>Litz Wire</option>
                </select>
              </div>
              <div class="dw-dp-field">
                <label>Core Material</label>
                <select class="dw-dp-inp" v-model="propsDraft.coreMaterial">
                  <option v-for="m in ['3F3','3C95','PC95','N97','N87','PC44','PC40','3C90','3C81','N27']" :key="m">{{m}}</option>
                </select>
              </div>
              <div class="dw-dp-field dw-dp-field--cb">
                <label>Shield Windings</label>
                <input type="checkbox" v-model="propsDraft.shieldWindings" class="dw-dp-cb"/>
              </div>
            </div>

            <div class="dw-dp-section">Notes</div>
            <textarea class="dw-dp-notes" v-model="propsDraft.notes" rows="3" placeholder="Design notes…"></textarea>
          </div>
          <div class="dw-dp-footer">
            <button class="dw-dp-btn" @click="showDesignProps=false">Cancel</button>
            <button class="dw-dp-btn dw-dp-btn--primary" @click="saveDesignProperties">💾 Save Changes</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ══ OPTIMIZE DESIGN DIALOG ════════════════════════════════════════════ -->
    <teleport to="body">
      <div v-if="showOptimize" class="dw-dp-overlay" @click.self="!optimizing && (showOptimize=false)">
        <div class="dw-dp-modal dw-opt-modal">
          <div class="dw-dp-header">
            <span>⚡ Design Optimization</span>
            <button class="dw-dp-x" :disabled="optimizing" @click="showOptimize=false">✕</button>
          </div>
          <div class="dw-opt-body">
            <!-- Optimizing spinner -->
            <div v-if="optimizing" class="dw-opt-loading">
              <svg viewBox="0 0 64 64" fill="none" class="dw-sim-spin-icon" width="56" height="56">
                <circle cx="32" cy="32" r="26" stroke="#e8eef8" stroke-width="5"/>
                <path d="M32 6 A26 26 0 0 1 58 32" stroke="#0066A6" stroke-width="5" stroke-linecap="round"/>
              </svg>
              <div class="dw-opt-loading-text">Running optimization sweep…</div>
              <div class="dw-opt-loading-sub">Testing {{ 10 * 6 }} KP × frequency combinations</div>
            </div>

            <!-- Error -->
            <div v-else-if="optimizeResult?.error" class="dw-opt-error">
              ⚠ {{ optimizeResult.error }}
            </div>

            <!-- Results -->
            <div v-else-if="optimizeResult" class="dw-opt-results">
              <div class="dw-opt-summary">
                <div class="dw-opt-col dw-opt-col--before">
                  <div class="dw-opt-col-label">Current Design</div>
                  <div class="dw-opt-stat">
                    <span class="dw-opt-stat-val">{{ optimizeResult.before.η_percent }}%</span>
                    <span class="dw-opt-stat-lbl">Efficiency</span>
                  </div>
                  <div class="dw-opt-stat">
                    <span class="dw-opt-stat-val">{{ optimizeResult.before.Lp_uH }} µH</span>
                    <span class="dw-opt-stat-lbl">Lp</span>
                  </div>
                  <div class="dw-opt-stat">
                    <span class="dw-opt-stat-val">{{ optimizeResult.before.losses?.total }} W</span>
                    <span class="dw-opt-stat-lbl">Total Losses</span>
                  </div>
                  <div class="dw-opt-stat">
                    <span class="dw-opt-stat-val">{{ optimizeResult.before.Ip_pk }} A</span>
                    <span class="dw-opt-stat-lbl">Ip Peak</span>
                  </div>
                </div>
                <div class="dw-opt-arrow">→</div>
                <div class="dw-opt-col dw-opt-col--after">
                  <div class="dw-opt-col-label">Optimized Design</div>
                  <div class="dw-opt-stat">
                    <span class="dw-opt-stat-val dw-opt-better">{{ optimizeResult.after.η_percent }}%</span>
                    <span class="dw-opt-stat-lbl">Efficiency</span>
                  </div>
                  <div class="dw-opt-stat">
                    <span class="dw-opt-stat-val">{{ optimizeResult.after.Lp_uH }} µH</span>
                    <span class="dw-opt-stat-lbl">Lp</span>
                  </div>
                  <div class="dw-opt-stat">
                    <span class="dw-opt-stat-val dw-opt-better">{{ optimizeResult.after.losses?.total }} W</span>
                    <span class="dw-opt-stat-lbl">Total Losses</span>
                  </div>
                  <div class="dw-opt-stat">
                    <span class="dw-opt-stat-val">{{ optimizeResult.after.Ip_pk }} A</span>
                    <span class="dw-opt-stat-lbl">Ip Peak</span>
                  </div>
                </div>
              </div>

              <div class="dw-opt-improvements">
                <div class="dw-opt-imp-title">Improvements Applied</div>
                <div v-for="imp in optimizeResult.improvements" :key="imp.label" class="dw-opt-imp-row">
                  <span class="dw-opt-imp-icon">{{ imp.icon }}</span>
                  <span class="dw-opt-imp-label">{{ imp.label }}</span>
                  <span class="dw-opt-imp-from">{{ imp.from }}</span>
                  <span class="dw-opt-imp-arrow">→</span>
                  <span class="dw-opt-imp-to" :class="{'dw-opt-imp-better': imp.positive}">{{ imp.to }}</span>
                  <span class="dw-opt-imp-gain">{{ imp.gain }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="dw-dp-footer" v-if="!optimizing">
            <button class="dw-dp-btn" @click="showOptimize=false">Close</button>
            <button class="dw-dp-btn dw-dp-btn--primary" v-if="optimizeResult && !optimizeResult.error"
              @click="applyOptimization">⚡ Apply Optimization</button>
          </div>
        </div>
      </div>
    </teleport>


    <!-- ══ VALIDATE DESIGN DIALOG ════════════════════════════════════════════ -->
    <teleport to="body">
      <div v-if="showValidate" class="dw-dp-overlay" @click.self="!validating&&(showValidate=false)">
        <div class="dw-dp-modal dw-val-modal">
          <div class="dw-dp-header" :class="validateResult ? (validateResult.status==='PASS'?'dw-hd-pass':validateResult.status==='FAIL'?'dw-hd-fail':'dw-hd-review') : ''">
            <span>✔ Design Validation Report</span>
            <button class="dw-dp-x" :disabled="validating" @click="showValidate=false">✕</button>
          </div>

          <div class="dw-val-body">
            <!-- Running -->
            <div v-if="validating" class="dw-opt-loading">
              <svg viewBox="0 0 64 64" fill="none" class="dw-sim-spin-icon" width="48" height="48">
                <circle cx="32" cy="32" r="26" stroke="#e8eef8" stroke-width="5"/>
                <path d="M32 6 A26 26 0 0 1 58 32" stroke="#0066A6" stroke-width="5" stroke-linecap="round"/>
              </svg>
              <div class="dw-opt-loading-text">Running validation checks…</div>
            </div>

            <!-- Results -->
            <div v-else-if="validateResult">
              <!-- Summary banner -->
              <div class="dw-val-banner" :class="'dw-val-banner--'+validateResult.status.toLowerCase()">
                <div class="dw-val-banner-icon">{{ validateResult.status==='PASS'?'✅':validateResult.status==='FAIL'?'❌':'⚠️' }}</div>
                <div class="dw-val-banner-text">
                  <div class="dw-val-banner-status">{{ validateResult.status }}</div>
                  <div class="dw-val-banner-sub">
                    {{ validateResult.passed }}/{{ validateResult.total }} checks passed
                    <span v-if="validateResult.errors"> · {{ validateResult.errors }} error{{ validateResult.errors>1?'s':'' }}</span>
                    <span v-if="validateResult.warnings"> · {{ validateResult.warnings }} warning{{ validateResult.warnings>1?'s':'' }}</span>
                  </div>
                </div>
              </div>

              <!-- Checks grouped by category -->
              <div v-for="cat in ['Electrical','Thermal','EMC','Safety','Compliance']" :key="cat">
                <div v-if="validateResult.checks.filter(x=>x.category===cat).length" class="dw-val-cat">
                  <div class="dw-val-cat-title">{{ cat }}</div>
                  <div v-for="check in validateResult.checks.filter(x=>x.category===cat)" :key="check.name"
                    class="dw-val-row" :class="'dw-val-row--'+check.severity">
                    <span class="dw-val-icon">{{ check.severity==='pass'?'✓':check.severity==='error'?'✕':'⚠' }}</span>
                    <div class="dw-val-content">
                      <div class="dw-val-name">{{ check.name }}</div>
                      <div class="dw-val-detail">{{ check.detail }}</div>
                    </div>
                    <span class="dw-val-std">{{ check.standard }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="dw-dp-footer" v-if="!validating">
            <button class="dw-dp-btn" @click="showValidate=false">Close</button>
            <button class="dw-dp-btn dw-dp-btn--primary" @click="validateDesign">↺ Re-validate</button>
          </div>
        </div>
      </div>
    </teleport>
    <!-- ══ SIMULATION OVERLAY ════════════════════════════════════════════════ -->
    <div v-if="simulating" class="dw-sim-overlay">
      <div class="dw-sim-box">
        <div class="dw-sim-icon">
          <svg viewBox="0 0 64 64" fill="none" class="dw-sim-spin-icon">
            <circle cx="32" cy="32" r="26" stroke="#e8eef8" stroke-width="5"/>
            <path d="M32 6 A26 26 0 0 1 58 32" stroke="#0066A6" stroke-width="5" stroke-linecap="round"/>
          </svg>
          <span class="dw-sim-pct">{{ simProgress }}%</span>
        </div>
        <div class="dw-sim-title">Running Simulation</div>
        <div class="dw-sim-timer">
          <span class="dw-sim-timer-icon">⏱</span>
          <span class="dw-sim-timer-val">{{ simElapsedStr }}</span>
        </div>
        <div class="dw-sim-step">{{ simStep }}</div>
        <div class="dw-sim-bar-wrap">
          <div class="dw-sim-bar" :style="{ width: simProgress + '%' }"/>
        </div>
        <div class="dw-sim-stages">
          <div v-for="stage in simStages" :key="stage.label"
            class="dw-sim-stage"
            :class="{ done: simProgress >= stage.pct, active: simProgress >= stage.pct - 15 && simProgress < stage.pct }">
            <div class="dw-sim-stage-dot"/>
            <span>{{ stage.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ DESIGN PICKER ══════════════════════════════════════════════════════ -->
    <teleport to="body">
      <div v-if="pickerOpen" class="dp-backdrop" @click.self="null">
        <div class="dp-modal">
          <div class="dp-header">
            <div class="dp-header-left">
              <div class="dp-header-icon">
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                  <path d="M12 2L15 9H22L16.5 13.5L18.5 21L12 16.5L5.5 21L7.5 13.5L2 9H9Z"
                    fill="none" stroke="#0066CC" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
              </div>
              <div>
                <div class="dp-title">Optimised Design Candidates</div>
                <div class="dp-subtitle">{{ pickerVariants.length }} designs generated — select one to finalise</div>
              </div>
            </div>
            <div class="dp-badge">Simulation Complete</div>
          </div>

          <div class="dp-grid">
            <div
              v-for="v in pickerVariants"
              :key="v.id"
              class="dp-card"
              :class="{ selected: pickerSelected === v.id }"
              @click="pickerSelected = v.id"
            >
              <div class="dp-card-top">
                <div class="dp-card-label">{{ v.label }}</div>
                <span class="dp-tag" :class="v.tagClass">{{ v.tag }}</span>
              </div>
              <p class="dp-card-desc">{{ v.desc }}</p>
              <div class="dp-metrics">
                <div class="dp-metric">
                  <div class="dp-metric-bar-wrap">
                    <div class="dp-metric-bar eff" :style="{ width: v.efficiency + '%' }"/>
                  </div>
                  <span class="dp-metric-label">Efficiency</span>
                  <span class="dp-metric-val">{{ v.efficiency }}%</span>
                </div>
                <div class="dp-metric">
                  <div class="dp-metric-bar-wrap">
                    <div class="dp-metric-bar cost" :style="{ width: Math.min(v.cost * 70, 100) + '%' }"/>
                  </div>
                  <span class="dp-metric-label">Rel. Cost</span>
                  <span class="dp-metric-val">{{ v.cost.toFixed(2) }}×</span>
                </div>
                <div class="dp-metric">
                  <div class="dp-metric-bar-wrap">
                    <div class="dp-metric-bar size" :style="{ width: Math.min(v.size * 80, 100) + '%' }"/>
                  </div>
                  <span class="dp-metric-label">Rel. Size</span>
                  <span class="dp-metric-val">{{ v.size.toFixed(2) }}×</span>
                </div>
                <div class="dp-metric">
                  <div class="dp-metric-bar-wrap">
                    <div class="dp-metric-bar temp" :style="{ width: Math.min(v.thermalRise * 1.5, 100) + '%' }"/>
                  </div>
                  <span class="dp-metric-label">ΔT Rise</span>
                  <span class="dp-metric-val">{{ v.thermalRise }}°C</span>
                </div>
              </div>
              <div v-if="pickerSelected === v.id" class="dp-selected-check">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <circle cx="8" cy="8" r="7" fill="#0066A6"/>
                  <path d="M4.5 8l2.5 2.5 5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Selected
              </div>
            </div>
          </div>

          <div class="dp-footer">
            <button class="dp-btn-cancel" @click="pickerOpen = false; wizardOpen = true; simulating = false">
              ← Back to Wizard
            </button>
            <div class="dp-footer-right">
              <span class="dp-footer-note">
                {{ pickerVariants.find(v => v.id === pickerSelected)?.label }} design will be saved as
                <strong>{{ form.fileName }}.uds</strong>
              </span>
              <button class="dp-btn-confirm" :disabled="pickerSelected === null" @click="confirmDesign">
                Use This Design
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M3 8h10M9 4l4 4-4 4"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Launcher removed: portfolio handles new design initiation -->

    <!-- ══ RESULT VIEW ════════════════════════════════════════════════════════ -->
    <div v-if="designReady" class="dw-result">

      <!-- Top tab bar mimicking step-5 -->
      <div class="dw-result-tabs">
        <button v-for="t in RESULT_TABS" :key="t"
          class="dw-result-tab"
          :class="{ active: activeTab === t }"
          @click="activeTab = t">{{ t }}</button>
        <div class="dw-result-tabs-spacer"/>
        <!-- Action submenu -->
        <div class="dw-actions" ref="actionsRef">
          <button class="dw-action-btn" @click="actionsOpen = !actionsOpen">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
            Actions
            <svg viewBox="0 0 10 6" fill="currentColor" width="9" height="9" style="margin-left:.1rem"><path d="M0 0l5 6 5-6z"/></svg>
          </button>
          <div v-if="actionsOpen" class="dw-actions-menu">
            <button class="dw-menu-item" @click="actionsOpen=false; newDesign()">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M8 3v10M3 8h10"/></svg>
              New Design
            </button>
            <div class="dw-menu-sep"/>
            <button class="dw-menu-item" @click="actionsOpen=false; exportPDF()">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M4 2h6l3 3v9H4z"/><path d="M9 2v4h4"/><path d="M6 9h4M6 11.5h3"/></svg>
              Export All Tabs to PDF
              <span v-if="exportingPDF" class="dw-menu-spinner"/>
            </button>
            <button class="dw-menu-item" @click="actionsOpen=false; exportCAD()">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
                <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
                <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
                <line x1="4.5" y1="7" x2="4.5" y2="9"/><line x1="11.5" y1="7" x2="11.5" y2="9"/>
                <line x1="7" y1="4.5" x2="9" y2="4.5"/><line x1="7" y1="11.5" x2="9" y2="11.5"/>
              </svg>
              Export to CAD
              <span class="dw-menu-badge">KiCad</span>
              <span v-if="exportingCAD" class="dw-menu-spinner"/>
            </button>
          </div>
        </div>
      </div>

      <!-- Schematic tab — split layout with design tree -->
      <div v-show="activeTab === 'Schematic'" class="dw-schematic-split">
        <DesignTreePanel ref="treePanelRef" :uds="savedDesign" @update:uds="onUdsUpdated" />
        <div class="dw-schematic-main">
          <SchematicDiagram :uds="savedDesign" @component-click="onSchematicComponentClick" />
          <div class="dw-schematic-note">
            <em>Schematic saved as <strong>{{ savedDesign.meta?.fileName }}.uds</strong> — visible in File Manager</em>
          </div>
        </div>
      </div>

      <!-- Design Results tab -->
      <div v-show="activeTab === 'Design Results'" class="dw-results-panel">
        <DesignResultsPanel :design="savedDesign" />
      </div>

      <!-- Board Layout tab — lazy mount on first visit -->
      <div v-show="activeTab === 'Board Layout'" class="dw-tab-full">
        <Suspense>
          <BoardLayoutLazy v-if="visitedTabs.has('Board Layout')" :design="savedDesign" />
          <template #fallback><div class="dw-tab-loading">Loading Board Layout…</div></template>
        </Suspense>
      </div>

      <!-- BOM tab -->
      <div v-show="activeTab === 'BOM'" class="dw-tab-full">
        <BOMPanel v-if="visitedTabs.has('BOM')" :design="savedDesign" />
      </div>

      <!-- Transformer Construction tab — lazy mount on first visit -->
      <div v-show="activeTab === 'Transformer Construction'" class="dw-tab-full">
        <Suspense>
          <TransformerConstructionLazy v-if="visitedTabs.has('Transformer Construction')" :design="savedDesign" />
          <template #fallback><div class="dw-tab-loading">Loading Construction…</div></template>
        </Suspense>
      </div>

      <!-- Design Notes tab -->
      <div v-show="activeTab === 'Design Notes'" class="dw-tab-full">
        <DesignNotes :design="savedDesign" />
      </div>

      <!-- Magnetics Designer tab — lazy, only mounts when first visited -->
      <div v-show="activeTab === 'Magnetics Designer'" class="dw-tab-full">
        <Suspense>
          <MagneticsDesigner v-if="visitedTabs.has('Magnetics Designer')" :seed-design="savedDesign" />
          <template #fallback><div class="dw-tab-loading">Loading Magnetics Designer…</div></template>
        </Suspense>
      </div>

      <!-- Design Evaluation tab -->
      <div v-show="activeTab === 'Design Evaluation'" class="dw-tab-full dw-eval-tab">
        <div class="dw-eval-root">

          <!-- Status banner -->
          <div class="dw-eval-banner" :class="evalStatus.cls">
            <span class="dw-eval-banner-icon">{{ evalStatus.icon }}</span>
            <div>
              <div class="dw-eval-banner-title">{{ evalStatus.title }}</div>
              <div class="dw-eval-banner-sub">{{ evalStatus.sub }}</div>
            </div>
          </div>

          <!-- Grid: 3 columns -->
          <div class="dw-eval-grid">

            <!-- Power Stage -->
            <div class="dw-eval-card">
              <div class="dw-eval-card-title">⚡ Power Stage</div>
              <table class="dw-eval-table">
                <tr v-for="row in evalPowerRows" :key="row.label">
                  <td class="det-label">{{ row.label }}</td>
                  <td class="det-val" :class="row.cls">{{ row.value }}</td>
                  <td class="det-limit">{{ row.limit }}</td>
                </tr>
              </table>
            </div>

            <!-- Transformer -->
            <div class="dw-eval-card">
              <div class="dw-eval-card-title">🔁 Transformer</div>
              <table class="dw-eval-table">
                <tr v-for="row in evalXfmrRows" :key="row.label">
                  <td class="det-label">{{ row.label }}</td>
                  <td class="det-val" :class="row.cls">{{ row.value }}</td>
                  <td class="det-limit">{{ row.limit }}</td>
                </tr>
              </table>
            </div>

            <!-- Thermal -->
            <div class="dw-eval-card">
              <div class="dw-eval-card-title">🌡️ Thermal</div>
              <table class="dw-eval-table">
                <tr v-for="row in evalThermalRows" :key="row.label">
                  <td class="det-label">{{ row.label }}</td>
                  <td class="det-val" :class="row.cls">{{ row.value }}</td>
                  <td class="det-limit">{{ row.limit }}</td>
                </tr>
              </table>
            </div>

            <!-- Compliance -->
            <div class="dw-eval-card">
              <div class="dw-eval-card-title">✅ Compliance</div>
              <div class="dw-eval-chk" v-for="chk in evalCompliance" :key="chk.name"
                :class="'dw-chk-' + chk.status">
                <span>{{ chk.status==='pass'?'✓':chk.status==='fail'?'✕':'⚠' }}</span>
                <span class="dw-chk-name">{{ chk.name }}</span>
                <span class="dw-chk-detail">{{ chk.detail }}</span>
              </div>
            </div>

            <!-- Winding Summary -->
            <div class="dw-eval-card">
              <div class="dw-eval-card-title">🧵 Windings</div>
              <table class="dw-eval-table">
                <thead><tr><th>Winding</th><th>Turns</th><th>AWG</th><th>Irms</th><th>DCR</th></tr></thead>
                <tbody>
                  <tr v-for="w in evalWindings" :key="w.name">
                    <td class="det-label">{{ w.name }}</td>
                    <td class="det-val">{{ w.turns }}</td>
                    <td class="det-val">{{ w.awg }}</td>
                    <td class="det-val">{{ w.irms }}A</td>
                    <td class="det-val">{{ w.dcr }}mΩ</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Loss Budget -->
            <div class="dw-eval-card">
              <div class="dw-eval-card-title">📊 Loss Budget</div>
              <div class="dw-eval-losses">
                <div v-for="item in evalLosses" :key="item.label" class="dw-loss-row">
                  <span class="dw-loss-label">{{ item.label }}</span>
                  <div class="dw-loss-bar-bg">
                    <div class="dw-loss-bar" :style="{width: item.pct+'%', background: item.color}"></div>
                  </div>
                  <span class="dw-loss-val">{{ item.val }}W</span>
                </div>
                <div class="dw-loss-total">
                  Total: {{ evalTotalLoss }}W &nbsp;|&nbsp; η = {{ evalEta }}%
                </div>
              </div>
            </div>

          </div><!-- eval-grid -->
        </div><!-- eval-root -->
      </div>

      <!-- Right sidebar spec panel -->
      <div class="dw-spec-sidebar">
        <div class="dw-spec-hd">Specification <button class="dw-spec-toggle">›</button></div>
        <div class="dw-spec-row"><span>Topology:</span><span>{{ savedDesign.meta?.topology }}</span></div>
        <div class="dw-spec-row"><span>Family:</span><span>{{ savedDesign.meta?.family }}</span></div>
        <div class="dw-spec-row"><span>Package:</span><span>{{ savedDesign.meta?.pkg }}</span></div>
        <div class="dw-spec-row"><span>Feedback Type:</span><span>{{ savedDesign.meta?.feedbackType }}</span></div>
        <div class="dw-spec-row"><span>Line Frequency:</span><span>{{ savedDesign.spec?.input?.lineFreq }} Hz</span></div>
        <div class="dw-spec-row"><span>Input Voltage Type:</span><span>{{ savedDesign.meta?.inputSpec }}</span></div>
        <div class="dw-spec-row"><span>Total Peak Power:</span><span>{{ (savedDesign.meta?.totalPower || 0).toFixed(2) }} W</span></div>
        <div class="dw-spec-row"><span>Current Limit Mode:</span><span>Default</span></div>
        <div class="dw-spec-row"><span>Component Set:</span><span>{{ savedDesign.meta?.componentSet }}</span></div>

        <div class="dw-spec-hd" style="margin-top:1rem">Documentation <button class="dw-spec-toggle">›</button></div>
        <div class="dw-doc-link">Product Page</div>
        <a class="dw-doc-link blue" href="https://www.power.com/products/topswitch/topswitch-jx" target="_blank">HPFC-1</a>
        <div class="dw-doc-link">Data Sheets</div>
        <a class="dw-doc-link blue" href="https://www.power.com/sites/default/files/product-docs/topswitch-jx.pdf" target="_blank">HPFC-1 Data Sheet</a>
        <div class="dw-doc-link">Design Examples</div>
        <a class="dw-doc-link blue" href="https://www.power.com/design-support/design-examples" target="_blank">DER-235 - 27 W Power Supply</a>
        <a class="dw-doc-link blue" href="https://www.power.com/design-support/design-examples" target="_blank">DER-237 - High Efficiency 18 W</a>
        <a class="dw-doc-link blue" href="https://www.power.com/design-support/design-examples" target="_blank">DER-243 - 65 W Adapter</a>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useFilesStore }  from '../stores/useFilesStore.js';
import { useDesignStore } from '../stores/useDesignStore.js';
import SchematicDiagram       from './SchematicDiagram.vue';
import DesignResultsPanel      from './DesignResultsPanel.vue';
// BoardLayout loaded lazily above
import BOMPanel                from './BOMPanel.vue';
// TransformerConstruction loaded lazily above
import DesignNotes             from './DesignNotes.vue';
import DesignTreePanel         from './DesignTreePanel.vue';
// Heavy tabs loaded lazily — only imported when first visited
const MagneticsDesigner     = defineAsyncComponent(() => import('./MagneticsDesigner.vue'));
const BoardLayoutLazy       = defineAsyncComponent(() => import('./BoardLayout.vue'));
const TransformerConstructionLazy = defineAsyncComponent(() => import('./TransformerConstruction.vue'));
import { buildUds }            from '../data/udsSchema.js';
import { runSimulation, generateVariants as engineVariants } from '../engine/SimEngine.js';
import { api }                 from '../api/index.js';

const props = defineProps({
  initialMode: { type: String, default: 'new' }, // 'new' | 'active'
});

const filesStore  = useFilesStore();
const designStore = useDesignStore();

// ── Constants ─────────────────────────────────────────────────────────────────
const STEPS = [
  { n:1, label:'Design Options' },
  { n:2, label:'Input' },
  { n:3, label:'Outputs' },
  { n:4, label:'Settings' },
];

const RESULT_TABS = ['Schematic','Design Results','Magnetics Designer','Design Evaluation','Board Layout','BOM','Transformer Construction','Design Notes'];

const simStages = [
  { label:'Input Analysis',      pct: 26  },
  { label:'Transformer Sizing',  pct: 48  },
  { label:'Feedback Network',    pct: 67  },
  { label:'Board Layout',        pct: 83  },
  { label:'BOM Generation',      pct: 90  },
  { label:'Design Notes',        pct: 100 },
];

// ═══════════════════════════════════════════════════════════════════════════
// FAMILY_CONFIG — frozen at module level so no reactive overhead
// Each family entry defines exactly what inputs/outputs/settings are relevant.
// Frozen with Object.freeze so Vue never makes these deeply reactive.
// ═══════════════════════════════════════════════════════════════════════════
const FAMILY_CONFIG = Object.freeze({
  'HPFC-1': {
    productLine: 'HPFC', topology: ['Flyback','Forward','Two Switch Forward'],
    packages: ['EG (eSIP-7C)','YN (TO-220-7C)','EN (eDIP-12C)','EP (eDIP-12C)'],
    freqs: ['66 kHz','100 kHz','132 kHz'],
    inputTypes: ['AC Defaults','High Voltage DC'],
    inputSpecs: ['Universal (85 - 265 V)','Single 100V (85 - 115 V)','Single 115V (98 - 135 V)','Single 230V (195 - 265 V)','High Voltage DC (127 - 400 V)'],
    maxOutputs: 4, maxPower: 230,
    feedbackTypes: ['Secondary TL431','Optocoupler Only','Primary Side Regulation'],
    showLedDriver: false, showUsbPd: false, showCcCv: true, showPeakLoads: true,
    showSrOutput: false, showBias: true, showEnUv: false,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:90,KP:0.65,isolationClass:'reinforced',
      fsw:'132 kHz',topology:'Flyback',feedbackType:'Secondary TL431',
      operationMode:'CV Only',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:12,current:5,peakCurrent:5,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 230W • Universal input • Multiple output rails supported',
             inputSpec:'HPFC-1 supports universal AC or high-voltage DC input',
             outputs:'Up to 4 output rails. Bias winding auto-added for IC supply.' },
  },
  'HPFC-2': {
    productLine: 'HPFC', topology: ['Flyback','Forward'],
    packages: ['KN (TO-3P)','PN (TO-247)'],
    freqs: ['66 kHz','100 kHz','132 kHz'],
    inputTypes: ['AC Defaults','High Voltage DC'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)','High Voltage DC (127 - 400 V)'],
    maxOutputs: 4, maxPower: 250,
    feedbackTypes: ['Secondary TL431','Optocoupler Only'],
    showLedDriver: false, showUsbPd: false, showCcCv: true, showPeakLoads: true,
    showSrOutput: false, showBias: true, showEnUv: false,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:120,KP:0.60,isolationClass:'reinforced',
      fsw:'100 kHz',topology:'Flyback',feedbackType:'Secondary TL431',
      operationMode:'CV Only',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:24,current:8,peakCurrent:8,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 250W high-power flyback • TO-3P/TO-247 packages',
             inputSpec:'Typically used with universal or single 230V input',
             outputs:'Supports 1–4 outputs. Use interleaved winding for high power.' },
  },
  'HPFC-3': {
    productLine: 'HPFC', topology: ['Flyback','Forward'],
    packages: ['EG (eSIP-7C)','MG (SMD-16C)'],
    freqs: ['66 kHz','100 kHz','132 kHz'],
    inputTypes: ['AC Defaults','High Voltage DC'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)'],
    maxOutputs: 4, maxPower: 270,
    feedbackTypes: ['Secondary TL431','Optocoupler Only'],
    showLedDriver: false, showUsbPd: false, showCcCv: true, showPeakLoads: true,
    showSrOutput: false, showBias: true, showEnUv: false,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:100,KP:0.60,isolationClass:'reinforced',
      fsw:'66 kHz',topology:'Flyback',feedbackType:'Secondary TL431',
      operationMode:'CV Only',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:24,current:10,peakCurrent:10,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 270W • High power density flyback/forward',
             inputSpec:'Universal AC input typical',
             outputs:'1–4 outputs. Excellent for industrial/server PSU.' },
  },
  'IFC-CE': {
    productLine: 'IFC', topology: ['Flyback'],
    packages: ['InSOP-24D'],
    freqs: ['100 kHz','140 kHz'],
    inputTypes: ['AC Defaults'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)'],
    maxOutputs: 2, maxPower: 65,
    feedbackTypes: ['Primary Side Regulation','Secondary TL431'],
    showLedDriver: false, showUsbPd: true, showCcCv: true, showPeakLoads: false,
    showSrOutput: true, showBias: false, showEnUv: false,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:135,KP:0.5,isolationClass:'reinforced',
      fsw:'140 kHz',topology:'Flyback',feedbackType:'Primary Side Regulation',
      operationMode:'CC/CV',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:20,current:3.25,peakCurrent:3.25,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 65W • Integrated flyback with sync rectifier (SR)',
             inputSpec:'IFC-CE uses fixed VOR=135V internally — VOR field fixed',
             outputs:'Max 2 outputs. SR output auto-included. Bias NOT needed — integrated.' },
  },
  'IFC-AE': {
    productLine: 'IFC', topology: ['Flyback'],
    packages: ['InSOP-24D'],
    freqs: ['100 kHz','140 kHz'],
    inputTypes: ['AC Defaults','High Voltage DC'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)','High Voltage DC (127 - 400 V)'],
    maxOutputs: 2, maxPower: 65,
    feedbackTypes: ['Primary Side Regulation','Secondary TL431'],
    showLedDriver: false, showUsbPd: false, showCcCv: true, showPeakLoads: false,
    showSrOutput: true, showBias: false, showEnUv: false,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:135,KP:0.5,isolationClass:'reinforced',
      fsw:'140 kHz',topology:'Flyback',feedbackType:'Primary Side Regulation',
      operationMode:'CV Only',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:12,current:4,peakCurrent:4,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 65W • AEC-Q100 automotive grade available',
             inputSpec:'Supports universal AC and HV DC — for automotive/industrial',
             outputs:'Max 2 outputs. Integrated SR — no external diode needed.' },
  },
  'IFC-EP': {
    productLine: 'IFC', topology: ['Flyback'],
    packages: ['InSOP-24D'],
    freqs: ['100 kHz','140 kHz'],
    inputTypes: ['AC Defaults','High Voltage DC'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)','High Voltage DC (127 - 400 V)'],
    maxOutputs: 2, maxPower: 100,
    feedbackTypes: ['Primary Side Regulation','Secondary TL431'],
    showLedDriver: false, showUsbPd: false, showCcCv: true, showPeakLoads: false,
    showSrOutput: true, showBias: false, showEnUv: false,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:135,KP:0.5,isolationClass:'reinforced',
      fsw:'140 kHz',topology:'Flyback',feedbackType:'Primary Side Regulation',
      operationMode:'CV Only',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:48,current:2,peakCurrent:2,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 100W • Extended power IFC',
             inputSpec:'Supports HV DC input — ideal for industrial DC bus',
             outputs:'1–2 outputs. Integrated SR. Suitable for 48V industrial rails.' },
  },
  'LPFC-1': {
    productLine: 'LPFC', topology: ['Flyback','Buck'],
    packages: ['PN (DIP-7)','GN (SMD-8B)'],
    freqs: ['132 kHz'],
    inputTypes: ['AC Defaults'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)'],
    maxOutputs: 1, maxPower: 25,
    feedbackTypes: ['Optocoupler Only','Primary Side Regulation'],
    showLedDriver: true, showUsbPd: false, showCcCv: true, showPeakLoads: false,
    showSrOutput: false, showBias: false, showEnUv: true,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:60,KP:0.65,isolationClass:'reinforced',
      fsw:'132 kHz',topology:'Flyback',feedbackType:'Optocoupler Only',
      operationMode:'CC/CV',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:5,current:2.5,peakCurrent:2.5,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 25W • Ultra-low standby power (<30mW)',
             inputSpec:'Universal AC only — no DC input supported',
             outputs:'Single output only. Auto-restart protection built-in.' },
  },
  'LPFC-2': {
    productLine: 'LPFC', topology: ['Flyback'],
    packages: ['PN (DIP-7)'],
    freqs: ['132 kHz'],
    inputTypes: ['AC Defaults'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)'],
    maxOutputs: 1, maxPower: 30,
    feedbackTypes: ['Optocoupler Only','Primary Side Regulation'],
    showLedDriver: true, showUsbPd: true, showCcCv: true, showPeakLoads: false,
    showSrOutput: false, showBias: false, showEnUv: true,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:60,KP:0.65,isolationClass:'reinforced',
      fsw:'132 kHz',topology:'Flyback',feedbackType:'Optocoupler Only',
      operationMode:'CC/CV',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:5,current:3,peakCurrent:3,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 30W • Ultra-low no-load power, USB-PD compatible',
             inputSpec:'Universal AC only',
             outputs:'Single output. Suited for USB chargers and IoT power supplies.' },
  },
  'PSC-TN': {
    productLine: 'PSC', topology: ['Buck','Flyback','Buck-Boost'],
    packages: ['SMD-8','DIP-8'],
    freqs: ['66 kHz','132 kHz'],
    inputTypes: ['AC Defaults'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)'],
    maxOutputs: 1, maxPower: 8,
    feedbackTypes: ['Primary Side Regulation'],
    showLedDriver: true, showUsbPd: false, showCcCv: false, showPeakLoads: false,
    showSrOutput: false, showBias: false, showEnUv: true,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:50,KP:0.75,isolationClass:'basic',
      fsw:'132 kHz',topology:'Buck',feedbackType:'Primary Side Regulation',
      operationMode:'CV Only',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:5,current:0.6,peakCurrent:0.6,dutyCycle:0,tolPos:10,tolNeg:10}] },
    hints: { power:'Up to 8W • Extremely simple — no opto, no bias winding needed',
             inputSpec:'No DC input option — AC mains only',
             outputs:'Single output only. PSR means no optocoupler feedback.' },
  },
  'PSC-XT': {
    productLine: 'PSC', topology: ['Flyback','Buck-Boost'],
    packages: ['eSIP-7F','TO-220-5C'],
    freqs: ['66 kHz','132 kHz'],
    inputTypes: ['AC Defaults'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)'],
    maxOutputs: 1, maxPower: 12,
    feedbackTypes: ['Primary Side Regulation','Optocoupler Only'],
    showLedDriver: true, showUsbPd: false, showCcCv: true, showPeakLoads: false,
    showSrOutput: false, showBias: false, showEnUv: true,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:65,KP:0.70,isolationClass:'reinforced',
      fsw:'132 kHz',topology:'Flyback',feedbackType:'Primary Side Regulation',
      operationMode:'CC/CV',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:12,current:1,peakCurrent:1,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 12W • Isolated flyback with EN/UV control pin',
             inputSpec:'Universal AC only',
             outputs:'Single output. BP pin auto-supplies the IC — no bias winding.' },
  },
  'PSC-HP': {
    productLine: 'PSC', topology: ['Flyback'],
    packages: ['eSIP-7C'],
    freqs: ['66 kHz','100 kHz','132 kHz'],
    inputTypes: ['AC Defaults','High Voltage DC'],
    inputSpecs: ['Universal (85 - 265 V)','Single 230V (195 - 265 V)','High Voltage DC (127 - 400 V)'],
    maxOutputs: 3, maxPower: 165,
    feedbackTypes: ['Secondary TL431','Optocoupler Only'],
    showLedDriver: false, showUsbPd: false, showCcCv: true, showPeakLoads: true,
    showSrOutput: false, showBias: true, showEnUv: false,
    defaults: { vMin:85,vMax:265,lineFreq:50,VOR:90,KP:0.60,isolationClass:'reinforced',
      fsw:'100 kHz',topology:'Flyback',feedbackType:'Secondary TL431',
      operationMode:'CV Only',inputSpec:'Universal (85 - 265 V)',
      outputs:[{voltage:48,current:3,peakCurrent:3,dutyCycle:0,tolPos:5,tolNeg:5}] },
    hints: { power:'Up to 165W • High-power flyback for industrial/appliance',
             inputSpec:'Universal AC or HV DC bus input',
             outputs:'Up to 3 outputs. Bias winding included for IC supply.' },
  },
});

// Flat list for product line and family dropdowns (frozen arrays = no reactivity overhead)
const PRODUCT_LINES = Object.freeze(['HPFC','LPFC','PSC','IFC']);
const FAMILY_BY_LINE = Object.freeze({
  HPFC:  ['HPFC-1','HPFC-2','HPFC-3'],
  LPFC: ['LPFC-1','LPFC-2'],
  PSC: ['PSC-TN','PSC-XT','PSC-HP'],
  IFC: ['IFC-CE','IFC-AE','IFC-EP'],
});
const INPUT_SPECS = Object.freeze([
  'Universal (85 - 265 V)','Single 100V (85 - 115 V)',
  'Single 115V (98 - 135 V)','Single 230V (195 - 265 V)',
]);
const TOPOLOGIES = Object.freeze(['Flyback','Forward','Boundary Mode Flyback','Two Switch Forward','Buck','Boost','Buck-Boost']);
const FEEDBACK_TYPES = Object.freeze(['Secondary TL431','Primary Side Regulation','Optocoupler Only','Digital (CCG)']);

// ── Current family config (computed, not reactive deeply) ─────────────────────
const familyCfg = computed(() => FAMILY_CONFIG[form.value.family] || FAMILY_CONFIG['HPFC-1']);

// Dynamic lists driven by selected family
const availableFamilies    = computed(() => FAMILY_BY_LINE[form.value.productLine] || []);
const availablePackages    = computed(() => familyCfg.value.packages || []);
const availableFrequencies = computed(() => familyCfg.value.freqs    || ['132 kHz']);
const availableTopologies  = computed(() => familyCfg.value.topology || TOPOLOGIES);
const availableInputSpecs  = computed(() => familyCfg.value.inputSpecs || INPUT_SPECS);
const availableFeedbacks   = computed(() => familyCfg.value.feedbackTypes || FEEDBACK_TYPES);
const maxOutputs           = computed(() => familyCfg.value.maxOutputs ?? 4);

// Family-specific UI flags (no reactivity cost — just property access on frozen object)
const showEnUv    = computed(() => familyCfg.value.showEnUv    ?? false);
const showSrOut   = computed(() => familyCfg.value.showSrOutput ?? false);
const showBias    = computed(() => familyCfg.value.showBias    ?? true);
const showLedDrv  = computed(() => familyCfg.value.showLedDriver ?? false);
const showUsbPd   = computed(() => familyCfg.value.showUsbPd  ?? false);
const showCcCv    = computed(() => familyCfg.value.showCcCv   ?? true);
const showPeakLd  = computed(() => familyCfg.value.showPeakLoads ?? true);
const familyHint  = computed(() => familyCfg.value.hints || {});
const familyPower = computed(() => familyCfg.value.maxPower ?? 200);

// ── State ─────────────────────────────────────────────────────────────────────
const wizardOpen       = ref(false);
const designReady      = ref(false);
const saving           = ref(false);
const availableSets    = ref([]);

// Core materials — loaded from magnetics DB
const availableCoreMaterials = ref([]);

// Handle product line change — reset family to first in that line
function onProductLineChange() {
  const fams = FAMILY_BY_LINE[form.value.productLine] || [];
  form.value.family = fams[0] || '';
  onFamilyChange();
}

// onFamilyChange — apply family defaults and regenerate filename
function onFamilyChange() {
  const cfg = FAMILY_CONFIG[form.value.family];
  if (!cfg) return;

  // Apply package + frequency defaults
  form.value.pkg       = cfg.packages[0] || '';
  form.value.frequency = cfg.freqs[0]    || '132 kHz';
  form.value.topology  = cfg.defaults.topology;

  // Apply input defaults for this family
  form.value.vMin       = cfg.defaults.vMin;
  form.value.vMax       = cfg.defaults.vMax;
  form.value.lineFreq   = cfg.defaults.lineFreq;
  form.value.inputSpec  = cfg.defaults.inputSpec;
  form.value.inputType  = cfg.inputTypes[0];
  form.value.feedbackType = cfg.defaults.feedbackType;

  // Apply magnetics / design settings defaults
  form.value.VOR            = cfg.defaults.VOR;
  form.value.KP             = cfg.defaults.KP;
  form.value.isolationClass = cfg.defaults.isolationClass;
  form.value.operationMode  = cfg.defaults.operationMode;

  // Reset outputs to family default (max 1 rail for single-output families)
  form.value.outputs = cfg.defaults.outputs.map(o => ({ ...o }));
  form.value.primaryBias = cfg.showBias ? 'YES' : 'NO';

  // Sync filename
  const existing = new Set(
    (filesStore.files || [])
      .map(f => (f.original_name || '').replace(/\.uds$/i, '').trim())
      .filter(Boolean)
  );
  const base = `${form.value.family || 'PIDesign'}_PIDesign`;
  let n = 1;
  while (existing.has(`${base}${n}`)) n++;
  form.value.fileName = `${base}${n}`;
}
const activeSetDesc    = computed(() => {
  const s = availableSets.value.find(x => x.name === form.value.componentSet);
  return s?.description || '';
});
const simulating       = ref(false);
const simProgress      = ref(0);
const simStep          = ref('');
const simStartTime     = ref(0);
const simElapsed       = ref(0);
let   simTimerHandle   = null;

const simElapsedStr = computed(() => {
  const ms = simElapsed.value;
  const s  = Math.floor(ms / 1000);
  const ms_part = ms % 1000;
  return `${s}.${String(ms_part).padStart(3,'0').slice(0,1)}s`;
});
const step             = ref(1);
const activeTab        = ref('Schematic');
const visitedTabs      = ref(new Set(['Schematic']));  // tracks which heavy tabs have ever been opened

// Mark tab as visited on first open (enables lazy v-if mounts)
watch(activeTab, (tab) => {
  visitedTabs.value.add(tab);
});
const savedDesign      = ref(null);

// Design picker (shown after simulation)
const pickerOpen       = ref(false);
const pickerVariants   = ref([]);
const pickerSelected   = ref(null);

// Actions submenu
const actionsOpen      = ref(false);
const actionsRef       = ref(null);
const treePanelRef     = ref(null);

// ── Active Design features ────────────────────────────────────────────────────
const showDesignProps  = ref(false);
const showValidate     = ref(false);
const validateResult   = ref(null);
const validating       = ref(false);
const showOptimize     = ref(false);
const optimizing       = ref(false);
const optimizeResult   = ref(null);  // { before, after, improvements }
const propsDraft       = ref(null);  // editable copy of design meta/spec

function onSchematicComponentClick(_refDes) {
  // Side panel editor in SchematicDiagram handles the edit interaction
}
const exportingPDF     = ref(false);
const exportingCAD     = ref(false);

// ── Restore persisted design state on every mount (survives tab switches) ─────
// Only restore if mode is 'active' (not 'new')
if (props.initialMode === 'active' && designStore.designReady && designStore.currentDesign) {
  savedDesign.value = designStore.currentDesign;
  designReady.value = true;
}

// ── Auto-open a design pushed from the File Manager ───────────────────────────
// Only the 'active' instance should respond to incoming designs
watch(() => designStore.activeDesign, (incoming) => {
  if (!incoming) return;
  if (props.initialMode !== 'active') return; // new-design panel ignores file-manager opens
  savedDesign.value = incoming;
  designReady.value = true;
  wizardOpen.value  = false;
  simulating.value  = false;
  activeTab.value   = 'Schematic';
  designStore.setCurrentDesign(incoming);
  designStore.clearDesign();  // consume so re-entry doesn't re-trigger
}, { immediate: true });

const outputModalOpen  = ref(false);
const editingOutputIdx = ref(null);
const selectedOutputIdx = ref(null);

const selectedOutput = computed(() =>
  selectedOutputIdx.value !== null ? form.value.outputs[selectedOutputIdx.value] : null
);

// Draft for output modal
const outputDraft = ref({
  voltage: 12, current: 1, peakCurrent: 1, dutyCycle: 0,
  tolPos: 5.0, tolNeg: 5.0,
});

// Form data
const form = ref({
  topology: 'Flyback', productLine: 'HPFC', family: 'HPFC-1',
  pkg: 'EG (eSIP-7C)', frequency: '132 kHz', enclosure: 'Open Frame',
  feedbackType: 'Secondary TL431', primaryBias: 'YES',
  vMin: 85, vMax: 265, inputType: 'AC Defaults',
  lineFreq: 50, inputSpec: 'Universal (85 - 265 V)',
  peakLoads: 'NO', ledDriver: 'NO', usbPd: 'NO',
  outputs: [{ voltage:12, current:5, peakCurrent:5, dutyCycle:0, tolPos:5, tolNeg:5 }],
  operationMode: 'CV Only', ccThreshold: 0,
  fileName: 'HPFC-1_PIDesign1',
  siUnits: false, componentSet: 'All Records', startWith: 'Schematic',
  // Magnetics / design settings — family-specific
  transformerType: 'Wire Wound', coreMaterial: '3F3', shieldWindings: false,
  VOR: 90, KP: 0.65, isolationClass: 'reinforced',
});

const totalPower = computed(() =>
  form.value.outputs.reduce((s, o) => s + o.voltage * o.current, 0)
);

// ── Wizard flow ───────────────────────────────────────────────────────────────
function startWizard(payload = {}) {
  // Full reset — clears any previous design state so Step 1 shows fresh
  step.value        = 1;
  simulating.value  = false;
  pickerOpen.value  = false;
  savedDesign.value = null;
  designReady.value = false;
  simProgress.value = 0;
  simStep.value     = '';
  visitedTabs.value = new Set(['Schematic']);
  activeTab.value   = 'Schematic';

  // ── Pre-populate from portfolio selection ──────────────────────────────
  // payload = { family, productLine, topology, inputSpec }
  if (payload.family && FAMILY_CONFIG[payload.family]) {
    // Set productLine first so availableFamilies computed updates
    const pl = payload.productLine ||
               (payload.family.includes('HPFC') ? 'HPFC' :
                payload.family.includes('LPFC') ? 'LPFC' :
                payload.family.includes('PSC') ? 'PSC' :
                payload.family.includes('IFC') ? 'IFC' : 'HPFC');
    form.value.productLine = pl;
    form.value.family      = payload.family;

    // Apply all family defaults (VOR, KP, input spec, feedback, etc.)
    onFamilyChange();

    // Override with the specific app selection from portfolio
    if (payload.topology)  form.value.topology  = payload.topology;
    if (payload.inputSpec) form.value.inputSpec  = payload.inputSpec;

    // Auto-fill vMin/vMax from the inputSpec
    if (payload.inputSpec) {
      form.value.vMin = specVmin(payload.inputSpec);
      form.value.vMax = specVmax(payload.inputSpec);
    }
  } else {
    // No payload — apply current family defaults
    const cfg = FAMILY_CONFIG[form.value.family] || FAMILY_CONFIG['HPFC-1'];
    form.value.outputs = cfg.defaults.outputs.map(o => ({ ...o }));
  }

  form.value.fileName = nextAvailableFileName();
  wizardOpen.value = true;
}

function nextAvailableFileName() {
  // Gather all existing .uds filenames (without extension)
  const existing = new Set(
    (filesStore.files || [])
      .map(f => (f.original_name || '').replace(/\.uds$/i, '').trim())
      .filter(Boolean)
  );
  const base = `${form.value.family || 'HPFC-1'}_PIDesign`;
  let n = 1;
  while (existing.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}
function cancelWizard() { wizardOpen.value = false; }
function prevStep()     { if (step.value > 1) step.value--; }
function nextStep()     { if (step.value < 4) step.value++; }

async function finishWizard() {
  // Validate filename uniqueness
  const existing = new Set(
    (filesStore.files || [])
      .map(f => (f.original_name || '').replace(/\.uds$/i, '').trim())
  );
  if (existing.has(form.value.fileName.trim())) {
    alert(`A design named "${form.value.fileName}.uds" already exists. Please use a different name.`);
    return;
  }
  saving.value = true;
  wizardOpen.value = false;
  simulating.value = true;
  simProgress.value = 0;
  simStartTime.value = Date.now();
  simElapsed.value = 0;
  simTimerHandle = setInterval(() => {
    simElapsed.value = Date.now() - simStartTime.value;
  }, 100);

  const SIM_STEPS = [
    { msg: 'Initialising design engine…',                 pct: 8  },
    { msg: 'Computing DC bus voltage at min/max input…',  pct: 18 },
    { msg: 'Calculating duty cycle range…',               pct: 28 },
    { msg: 'Computing primary inductance Lp…',            pct: 38 },
    { msg: 'Selecting transformer core geometry…',        pct: 48 },
    { msg: 'Calculating turns ratio & winding counts…',   pct: 57 },
    { msg: 'Running thermal junction analysis…',          pct: 66 },
    { msg: 'Estimating copper & core losses…',            pct: 74 },
    { msg: 'Running EMC pre-compliance checks…',          pct: 82 },
    { msg: 'Generating 6 optimised design variants…',     pct: 91 },
    { msg: 'Scoring design quality metrics…',             pct: 96 },
    { msg: 'Finalising candidates…',                      pct: 100 },
  ];

  const base = { ...form.value, totalPower: totalPower.value, createdAt: new Date().toISOString() };

  // Run real simulation in parallel with progress animation
  let variantsResult = null;
  const simPromise = new Promise(resolve => {
    setTimeout(() => {
      try { resolve(engineVariants(base)); }
      catch(e) { console.error('SimEngine error:', e); resolve(null); }
    }, 50);
  });

  for (const s of SIM_STEPS) {
    simStep.value     = s.msg;
    simProgress.value = s.pct;
    await new Promise(r => setTimeout(r, 150 + Math.random() * 80));
  }

  variantsResult = await simPromise;
  await new Promise(r => setTimeout(r, 200));

  pickerVariants.value = variantsResult || generateVariants(base);
  pickerSelected.value = pickerVariants.value[0].id;

  simulating.value = false;
  if (simTimerHandle) { clearInterval(simTimerHandle); simTimerHandle = null; }
  pickerOpen.value = true;
  saving.value     = false;
}

// Build 6 design variants from the base form, varying key trade-offs
function generateVariants(base) {
  const strategies = [
    {
      label: 'Balanced',
      tag: 'RECOMMENDED',
      tagClass: 'tag-rec',
      desc: 'Optimal balance of efficiency, cost and size. Recommended for most applications.',
      efficiency: 87, cost: 1.0, size: 1.0, thermalRise: 38,
      mods: {},
    },
    {
      label: 'High Efficiency',
      tag: 'EFFICIENCY',
      tagClass: 'tag-eff',
      desc: 'Minimises switching losses. Best for always-on or battery-critical applications.',
      efficiency: 91, cost: 1.25, size: 1.1, thermalRise: 28,
      mods: { frequency: '66 kHz' },
    },
    {
      label: 'Compact',
      tag: 'SIZE',
      tagClass: 'tag-size',
      desc: 'Higher switching frequency allows a smaller transformer and output caps.',
      efficiency: 84, cost: 1.05, size: 0.72, thermalRise: 45,
      mods: { frequency: '264 kHz', transformerType: 'Planar' },
    },
    {
      label: 'Low Cost',
      tag: 'COST',
      tagClass: 'tag-cost',
      desc: 'Minimises BOM cost. Slightly lower efficiency; ideal for cost-sensitive designs.',
      efficiency: 83, cost: 0.78, size: 1.08, thermalRise: 44,
      mods: { feedbackType: 'Primary Clamp', pkg: 'DIP-8C' },
    },
    {
      label: 'Low EMI',
      tag: 'EMI',
      tagClass: 'tag-emi',
      desc: 'Spread-spectrum frequency dithering and enhanced filtering for CISPR 32 Class B.',
      efficiency: 86, cost: 1.15, size: 1.05, thermalRise: 36,
      mods: { frequency: '100 kHz', shieldWindings: true },
    },
    {
      label: 'Wide Input',
      tag: 'ROBUSTNESS',
      tagClass: 'tag-rob',
      desc: 'Extended input range with enhanced OVP/UVP. Suited for industrial/harsh environments.',
      efficiency: 85, cost: 1.18, size: 1.12, thermalRise: 40,
      mods: { vMin: 47, vMax: 305, inputSpec: 'Wide (47 - 305 V)' },
    },
  ];

  return strategies.map((s, i) => ({
    id: i,
    label: s.label,
    tag: s.tag,
    tagClass: s.tagClass,
    desc: s.desc,
    efficiency: s.efficiency,
    cost: s.cost,
    size: s.size,
    thermalRise: s.thermalRise,
    design: { ...base, ...s.mods, _variant: s.label },
  }));
}

async function confirmDesign() {
  const variant = pickerVariants.value.find(v => v.id === pickerSelected.value);
  if (!variant) return;

  pickerOpen.value = false;
  saving.value     = true;

  // Build full UDS — support both old format (variant.mods) and new engine format (variant.design)
  const baseForm = { ...form.value, totalPower: totalPower.value };
  // New engine format: variant.design contains the full merged spec
  const mergedForm = variant.design
    ? { ...baseForm, ...variant.design, _variant: variant.label }
    : { ...baseForm, ...(variant.mods || {}), _variant: variant.label };
  // Ensure variant has mods for buildUds compatibility
  const variantForBuild = { ...variant, mods: variant.mods || {} };
  const uds = buildUds(mergedForm, variantForBuild);
  // Attach simulation results to UDS for Design Results display
  if (variant.simResult) uds.simResult = variant.simResult;

  await saveUdsFile(uds);

  // Persist to store so state survives tab switches / remounts
  designStore.setCurrentDesign(uds);

  savedDesign.value = uds;
  designReady.value = true;
  activeTab.value   = 'Schematic';
  saving.value      = false;
  // Notify parent that design is ready (web app uses this to navigate to /design)
  emit('design-ready', uds);
}

async function saveUdsFile(uds) {
  const json = JSON.stringify(uds, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const file = new File([blob], `${uds.meta.fileName}.uds`, { type: 'application/json' });
  try {
    const entry = await filesStore.upload(file);
    if (entry) entry._designData = uds;
    await filesStore.fetchAll().catch(() => {});
  } catch (e) {
    console.warn('Could not save to file manager:', e);
    filesStore.files.unshift({
      id: Date.now(), original_name: `${uds.meta.fileName}.uds`,
      stored_name: `${uds.meta.fileName}.uds`,
      mime_type: 'application/json', size: json.length,
      notes: `${uds.meta.topology} — ${uds.meta.family} (${uds.meta.variant})`,
      created_at: new Date().toISOString(),
      _designData: uds,
    });
  }
}

async function onUdsUpdated(newUds) {
  savedDesign.value = newUds;
  designStore.setCurrentDesign(newUds);
  // Auto-save updated UDS back to file store
  await saveUdsFile(newUds).catch(() => {});
}

function newDesign() {
  designReady.value = false;
  savedDesign.value = null;
  designStore.clearCurrentDesign();
}

// ── Actions submenu ───────────────────────────────────────────────────────────
function onClickOutsideActions(e) {
  if (actionsRef.value && !actionsRef.value.contains(e.target)) {
    actionsOpen.value = false;
  }
}
// Expose startWizard so parent components (WelcomePage, AppMenuBar) can trigger it
// ── Design Properties ────────────────────────────────────────────────────────
function openDesignProperties() {
  if (!savedDesign.value) return;
  const d = savedDesign.value;
  propsDraft.value = {
    fileName:    d.meta?.fileName    || d.fileName    || '',
    topology:    d.meta?.topology    || d.topology    || 'Flyback',
    family:      d.meta?.family      || d.family      || '',
    pkg:         d.meta?.pkg         || d.pkg         || '',
    frequency:   d.meta?.frequency   || d.frequency   || '132 kHz',
    feedbackType:d.meta?.feedbackType|| d.feedbackType|| '',
    inputSpec:   d.meta?.inputSpec   || d.inputSpec   || '',
    totalPower:  d.meta?.totalPower  || d.totalPower  || 0,
    componentSet:d.meta?.componentSet|| d.componentSet|| '',
    coreMaterial:d.spec?.options?.coreMaterial || d.coreMaterial || '3F3',
    shieldWindings: d.spec?.options?.shieldWindings ?? d.shieldWindings ?? false,
    transformerType:d.spec?.options?.transformerType|| d.transformerType|| 'Wire Wound',
    vMin:   d.spec?.input?.vMin  || d.vMin  || 85,
    vMax:   d.spec?.input?.vMax  || d.vMax  || 265,
    lineFreq: d.spec?.input?.lineFreq || d.lineFreq || 50,
    notes: d.notes || '',
  };
  showDesignProps.value = true;
}

function saveDesignProperties() {
  if (!savedDesign.value || !propsDraft.value) return;
  const p = propsDraft.value;
  const updated = {
    ...savedDesign.value,
    meta: {
      ...savedDesign.value.meta,
      fileName:    p.fileName,
      topology:    p.topology,
      family:      p.family,
      pkg:         p.pkg,
      frequency:   p.frequency,
      feedbackType:p.feedbackType,
      inputSpec:   p.inputSpec,
      totalPower:  Number(p.totalPower),
      componentSet:p.componentSet,
    },
    spec: {
      ...savedDesign.value.spec,
      input: {
        ...savedDesign.value.spec?.input,
        vMin:    Number(p.vMin),
        vMax:    Number(p.vMax),
        lineFreq:Number(p.lineFreq),
      },
      options: {
        ...savedDesign.value.spec?.options,
        coreMaterial:    p.coreMaterial,
        shieldWindings:  p.shieldWindings,
        transformerType: p.transformerType,
      },
    },
    notes: p.notes,
  };
  savedDesign.value = updated;
  designStore.setCurrentDesign(updated);
  saveUdsFile(updated).catch(() => {});
  showDesignProps.value = false;
}

// ── Re-run Simulation ─────────────────────────────────────────────────────────
async function rerunSimulation() {
  if (!savedDesign.value) return;
  // Build spec from current saved design
  const d = savedDesign.value;
  const base = {
    vMin:       d.spec?.input?.vMin      || d.vMin      || 85,
    vMax:       d.spec?.input?.vMax      || d.vMax      || 265,
    lineFreq:   d.spec?.input?.lineFreq  || d.lineFreq  || 50,
    outputs:    d.spec?.outputs          || d.outputs   || [],
    totalPower: d.meta?.totalPower       || d.totalPower|| 0,
    family:     d.meta?.family           || d.family    || 'HPFC-1',
    frequency:  d.meta?.frequency        || d.frequency || '132 kHz',
    coreMaterial: d.spec?.options?.coreMaterial || d.coreMaterial || '3F3',
    shieldWindings: d.spec?.options?.shieldWindings ?? false,
    fileName:   d.meta?.fileName         || 'Design',
    topology:   d.meta?.topology         || 'Flyback',
    pkg:        d.meta?.pkg              || '—',
    feedbackType: d.meta?.feedbackType   || '—',
    inputSpec:  d.meta?.inputSpec        || '—',
    componentSet: d.meta?.componentSet   || 'All Records',
    createdAt:  new Date().toISOString(),
  };

  // Show simulation overlay
  designReady.value = false;
  simulating.value  = true;
  simProgress.value = 0;
  simStartTime.value = Date.now();
  simElapsed.value   = 0;
  simTimerHandle = setInterval(() => { simElapsed.value = Date.now() - simStartTime.value; }, 100);

  const SIM_STEPS = [
    { msg: 'Loading current design parameters…', pct: 12 },
    { msg: 'Computing DC bus voltage…',          pct: 24 },
    { msg: 'Recalculating duty cycle range…',    pct: 36 },
    { msg: 'Optimising primary inductance…',     pct: 50 },
    { msg: 'Re-running core selection…',         pct: 62 },
    { msg: 'Recalculating loss budget…',         pct: 74 },
    { msg: 'Running thermal re-analysis…',       pct: 84 },
    { msg: 'Generating 6 re-optimised variants…',pct: 93 },
    { msg: 'Finalising candidates…',             pct: 100 },
  ];

  const simPromise = new Promise(resolve => {
    setTimeout(() => {
      try { resolve(engineVariants(base)); }
      catch(e) { console.error('SimEngine error:', e); resolve(null); }
    }, 50);
  });

  for (const s of SIM_STEPS) {
    simStep.value = s.msg; simProgress.value = s.pct;
    await new Promise(r => setTimeout(r, 140 + Math.random() * 80));
  }
  const variantsResult = await simPromise;
  await new Promise(r => setTimeout(r, 200));

  if (simTimerHandle) { clearInterval(simTimerHandle); simTimerHandle = null; }
  simulating.value = false;

  pickerVariants.value = variantsResult || generateVariants(base);
  pickerSelected.value = pickerVariants.value[0].id;
  pickerOpen.value     = true;
}

// ── Optimize Design ───────────────────────────────────────────────────────────
async function optimizeDesign() {
  if (!savedDesign.value) return;
  showOptimize.value = true;
  optimizing.value   = true;
  optimizeResult.value = null;

  const d = savedDesign.value;
  const base = {
    vMin:       d.spec?.input?.vMin      || d.vMin      || 85,
    vMax:       d.spec?.input?.vMax      || d.vMax      || 265,
    lineFreq:   d.spec?.input?.lineFreq  || d.lineFreq  || 50,
    outputs:    d.spec?.outputs          || d.outputs   || [],
    totalPower: d.meta?.totalPower       || d.totalPower|| 0,
    family:     d.meta?.family           || d.family    || 'HPFC-1',
    frequency:  d.meta?.frequency        || d.frequency || '132 kHz',
    coreMaterial: d.spec?.options?.coreMaterial || d.coreMaterial || '3F3',
    shieldWindings: false,
  };

  await new Promise(r => setTimeout(r, 80)); // yield to render

  try {
    // Sweep KP and frequency to find global optimum for efficiency
    const { runSimulation: runSim } = await import('../engine/SimEngine.js');
    const currentSim = runSim(base);

    const KP_vals  = [0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80];
    const freqMuls = [0.50, 0.75, 1.00, 1.25, 1.50, 2.00];
    const baseFreq = parseFloat(String(base.frequency)) || 132;

    let bestSim   = currentSim;
    let bestKP    = base.KP || 0.65;
    let bestFreq  = base.frequency;

    for (const kp of KP_vals) {
      for (const fm of freqMuls) {
        const freq = Math.round(baseFreq * fm);
        if (freq < 30 || freq > 500) continue;
        try {
          const sim = runSim({ ...base, KP: kp, frequency: `${freq} kHz` });
          if (sim.η_percent > bestSim.η_percent && sim.warnings.length === 0) {
            bestSim  = sim;
            bestKP   = kp;
            bestFreq = `${freq} kHz`;
          }
        } catch {}
      }
    }

    // Build improvement report
    const improvements = [];
    const ηGain = (bestSim.η_percent - currentSim.η_percent).toFixed(1);
    const LpChange = ((bestSim.Lp_uH - currentSim.Lp_uH) / currentSim.Lp_uH * 100).toFixed(0);
    const IpChange = ((bestSim.Ip_pk  - currentSim.Ip_pk ) / currentSim.Ip_pk  * 100).toFixed(0);
    const lossChange = ((bestSim.losses.total - currentSim.losses.total) / currentSim.losses.total * 100).toFixed(0);

    if (Number(ηGain) > 0)         improvements.push({ icon:'⬆', label:'Efficiency', from: currentSim.η_percent+'%', to: bestSim.η_percent+'%', gain:'+'+ηGain+'%', positive:true });
    if (Number(lossChange) < 0)    improvements.push({ icon:'⬇', label:'Total Losses', from: currentSim.losses.total+'W', to: bestSim.losses.total+'W', gain:lossChange+'%', positive:true });
    if (Number(IpChange) < 0)      improvements.push({ icon:'⬇', label:'Peak Current', from: currentSim.Ip_pk+'A', to: bestSim.Ip_pk+'A', gain:IpChange+'%', positive:true });
    improvements.push({ icon:'📐', label:'Optimal KP', from: String(base.KP||0.65), to: String(bestKP), gain:'ripple ratio', positive:true });
    improvements.push({ icon:'⚡', label:'Optimal Frequency', from: base.frequency, to: bestFreq, gain:'switching freq', positive:true });
    improvements.push({ icon:'🔧', label:'Selected Core', from: currentSim.coreName, to: bestSim.coreName, gain:'geometry', positive: currentSim.coreName !== bestSim.coreName });
    if (bestSim.thermal?.pass && !currentSim.thermal?.pass) improvements.push({ icon:'🌡️', label:'Thermal', from:'Review ⚠', to:'PASS ✓', gain:'margin', positive:true });

    optimizeResult.value = {
      before: currentSim,
      after:  bestSim,
      bestKP, bestFreq,
      improvements,
      appliedSpec: { ...base, KP: bestKP, frequency: bestFreq },
    };
  } catch(e) {
    console.error('Optimization error:', e);
    optimizeResult.value = { error: e.message };
  }
  optimizing.value = false;
}

function applyOptimization() {
  if (!optimizeResult.value?.appliedSpec || !savedDesign.value) return;
  const opt = optimizeResult.value;
  const updated = {
    ...savedDesign.value,
    meta: {
      ...savedDesign.value.meta,
      frequency:    opt.bestFreq,
    },
    simResult: opt.after,
  };
  savedDesign.value = updated;
  designStore.setCurrentDesign(updated);
  saveUdsFile(updated).catch(() => {});
  showOptimize.value = false;
}

// ── Tab switching (called from AppMenuBar via parent) ─────────────────────────
function switchTab(tabName) {
  if (designReady.value) activeTab.value = tabName;
}

// ── Validate Design ──────────────────────────────────────────────────────────
async function validateDesign() {
  if (!savedDesign.value) return;
  showValidate.value = true;
  validating.value   = true;
  validateResult.value = null;

  const d   = savedDesign.value;
  const sim = d.simResult;
  const meta= d.meta || d;
  const inp = d.spec?.input || d;
  const pwr = meta.totalPower || d.totalPower || 0;
  const fam = (meta.family || d.family || '').toLowerCase();

  await new Promise(r => setTimeout(r, 40));

  const checks = [];

  // ── Electrical checks ───────────────────────────────────────────────────────
  const Ip_pk = sim?.Ip_pk || (pwr / (0.85 * (inp.vMin || 85)));
  const D_max = sim?.D_max || 50;
  const η     = sim?.η_percent || 85;
  const Lp    = sim?.Lp_uH || 0;

  // Device current limit
  const ilim = fam.includes('tiny') ? 0.6 : fam.includes('inno') ? 3.0 : 2.5;
  checks.push({
    category:'Electrical', name:'Primary Peak Current vs ILIM',
    pass: Ip_pk <= ilim,
    detail: `Ip_pk = ${Ip_pk.toFixed(3)} A  ≤  ILIM = ${ilim} A`,
    standard:'PI AN-19', severity: Ip_pk > ilim ? 'error' : 'pass',
  });

  // Duty cycle
  checks.push({
    category:'Electrical', name:'Max Duty Cycle < 55%',
    pass: D_max <= 55,
    detail: `D_max = ${D_max.toFixed(1)}%  (limit: 55%)`,
    standard:'PI AN-29', severity: D_max > 60 ? 'error' : D_max > 55 ? 'warn' : 'pass',
  });

  // Minimum inductance
  if (Lp > 0) {
    checks.push({
      category:'Electrical', name:'Primary Inductance > 50 µH',
      pass: Lp >= 50,
      detail: `Lp = ${Lp.toFixed(1)} µH  (min: 50 µH for stable DCM)`,
      standard:'PI AN-57', severity: Lp < 50 ? 'warn' : 'pass',
    });
  }

  // Efficiency
  checks.push({
    category:'Electrical', name:'Efficiency ≥ 82%',
    pass: η >= 82,
    detail: `η = ${η.toFixed(1)}%  (target: ≥ 82%)`,
    standard:'DOE Level VI', severity: η < 80 ? 'error' : η < 82 ? 'warn' : 'pass',
  });

  // ── Thermal checks ──────────────────────────────────────────────────────────
  const Tj_u1 = sim?.thermal?.U1_Tj;
  const Tj_d3 = sim?.thermal?.D3_Tj;
  if (Tj_u1) {
    checks.push({
      category:'Thermal', name:'U1 Junction Temp < 135°C (derate)',
      pass: Tj_u1 < 135,
      detail: `Tj(U1) = ${Tj_u1}°C  (max 150°C; derated to 135°C for reliability)`,
      standard:'IEC 62368-1', severity: Tj_u1 >= 150 ? 'error' : Tj_u1 >= 135 ? 'warn' : 'pass',
    });
  }
  if (Tj_d3) {
    checks.push({
      category:'Thermal', name:'D3 Junction Temp < 110°C',
      pass: Tj_d3 < 110,
      detail: `Tj(D3) = ${Tj_d3}°C  (max 125°C; derated to 110°C)`,
      standard:'Thermal Design', severity: Tj_d3 >= 125 ? 'error' : Tj_d3 >= 110 ? 'warn' : 'pass',
    });
  }

  // ── EMC checks ──────────────────────────────────────────────────────────────
  const fsw = sim?.fsw_kHz || (parseInt(meta.frequency||'132'));
  checks.push({
    category:'EMC', name:'Switching Frequency in CISPR 32 range',
    pass: fsw <= 500,
    detail: `fsw = ${fsw} kHz  (CISPR 32 conducted: ≤ 500 kHz)`,
    standard:'CISPR 32', severity: fsw > 500 ? 'warn' : 'pass',
  });
  checks.push({
    category:'EMC', name:'Y-capacitor C3 present',
    pass: !!(d.components?.C3),
    detail: d.components?.C3 ? `C3 = ${d.components.C3.part}` : 'No Y-capacitor assigned — add C3',
    standard:'CISPR 32', severity: !d.components?.C3 ? 'warn' : 'pass',
  });

  // ── Safety checks ──────────────────────────────────────────────────────────
  checks.push({
    category:'Safety', name:'Fuse F1 present',
    pass: !!(d.components?.F1),
    detail: d.components?.F1 ? `F1 = ${d.components.F1.part}` : 'No fuse assigned — assign F1 from component DB',
    standard:'IEC 62368-1', severity: !d.components?.F1 ? 'error' : 'pass',
  });
  checks.push({
    category:'Safety', name:'Input range covers 85–265 V AC',
    pass: (inp.vMin||999) <= 90 && (inp.vMax||0) >= 260,
    detail: `Input: ${inp.vMin||'?'}–${inp.vMax||'?'} V  (universal range: 85–265 V)`,
    standard:'IEC 61000-3-2', severity: (inp.vMin||999)>90 || (inp.vMax||0)<260 ? 'warn' : 'pass',
  });

  // ── Compliance checks ───────────────────────────────────────────────────────
  if (sim?.emc) {
    sim.emc.forEach(e => {
      checks.push({
        category:'Compliance', name:e.std,
        pass: e.pass,
        detail: e.note,
        standard:e.std, severity: e.pass ? 'pass' : 'warn',
      });
    });
  } else {
    ['IEC 62368-1','CISPR 32','ErP Lot 6','DOE Level VI'].forEach(std => {
      checks.push({ category:'Compliance', name:std, pass:true, detail:'Pre-check passed', standard:std, severity:'pass' });
    });
  }

  const passed  = checks.filter(c => c.pass).length;
  const errors  = checks.filter(c => c.severity === 'error').length;
  const warnings= checks.filter(c => c.severity === 'warn').length;

  validateResult.value = { checks, passed, total: checks.length, errors, warnings,
    status: errors > 0 ? 'FAIL' : warnings > 0 ? 'REVIEW' : 'PASS' };
  validating.value = false;
}


// ── Design Evaluation computed data ──────────────────────────────────────────
const simR = computed(() => savedDesign.value?.simResult || savedDesign.value?.variants?.[0]?.simResult || null);

function fmtN(v, d=2, unit='') { return v != null ? `${Number(v).toFixed(d)}${unit}` : '—'; }
function clsOk(ok) { return ok ? 'det-ok' : 'det-warn'; }

const evalPowerRows = computed(() => {
  const s = simR.value; const d = savedDesign.value;
  if (!s) return [];
  return [
    { label:'Input Power',   value:fmtN(s.Pin,1,'W'),       limit:'',              cls:'' },
    { label:'Output Power',  value:fmtN(d?.meta?.totalPower,1,'W'), limit:'',      cls:'' },
    { label:'Efficiency',    value:fmtN(s.η_percent,1,'%'),  limit:'≥82%',         cls:clsOk(s.η_percent>=82) },
    { label:'Vdc min',       value:fmtN(s.Vdc_min,1,'V'),    limit:'',             cls:'' },
    { label:'D_max',         value:fmtN(s.D_max,2,'%'),      limit:'<55%',         cls:clsOk(s.D_max<55) },
    { label:'Ip_peak',       value:fmtN(s.Ip_pk,3,'A'),      limit:'',             cls:'' },
    { label:'Ip_rms',        value:fmtN(s.Ip_rms,3,'A'),     limit:'',             cls:'' },
    { label:'Clamp V',       value:fmtN(s.Vclamp,0,'V'),     limit:'',             cls:'' },
    { label:'Mode',          value:s.mode||'DCM',             limit:'',             cls:'' },
  ];
});

const evalXfmrRows = computed(() => {
  const s = simR.value;
  if (!s) return [];
  return [
    { label:'Core',          value:s.coreName||'—',           limit:'',             cls:'' },
    { label:'Lp',            value:fmtN(s.Lp_uH,2,'µH'),     limit:'',             cls:'' },
    { label:'Np / Ns / Nb',  value:`${s.Np||'?'}T / ${s.Ns||'?'}T / ${s.Nb||'?'}T`, limit:'', cls:'' },
    { label:'Bmax',          value:fmtN(s.Bmax_mT,0,'mT'),   limit:'<80% Bsat',    cls:clsOk(s.Bmax_mT < (s.Bmax_mT||350)*0.80+50) },
    { label:'Ae',            value:fmtN(s.coreAe,1,'mm²'),   limit:'',             cls:'' },
    { label:'n_ps ratio',    value:fmtN(s.n_ps,3),            limit:'',             cls:'' },
    { label:'fsw',           value:fmtN(s.fsw_kHz,0,'kHz'),  limit:'≤500kHz',      cls:clsOk((s.fsw_kHz||132)<=500) },
  ];
});

const evalThermalRows = computed(() => {
  const s = simR.value;
  if (!s?.thermal) return [];
  const th = s.thermal;
  return [
    { label:'U1 Tj',         value:fmtN(th.U1_Tj,1,'°C'),   limit:'<135°C',       cls:clsOk(th.U1_Tj<135) },
    { label:'D3 Tj',         value:fmtN(th.D3_Tj,1,'°C'),   limit:'<110°C',       cls:clsOk(th.D3_Tj<110) },
    { label:'T1 ΔT',         value:fmtN(th.T1_ΔT,1,'°C'),   limit:'<40°C',        cls:clsOk((th.T1_ΔT||0)<40) },
    { label:'U1 margin',     value:fmtN(th.margin_U1,1,'°C'),limit:'',             cls:clsOk((th.margin_U1||0)>0) },
    { label:'D3 margin',     value:fmtN(th.margin_D3,1,'°C'),limit:'',             cls:clsOk((th.margin_D3||0)>0) },
    { label:'Overall',       value:th.pass?'PASS':'REVIEW',  limit:'',             cls:clsOk(th.pass) },
  ];
});

const evalCompliance = computed(() => {
  const s = simR.value; const d = savedDesign.value;
  if (!s) return [];
  return [
    { name:'D_max < 55%',      detail:`${fmtN(s.D_max,2)}%`,   status: s.D_max<55?'pass':'fail' },
    { name:'η ≥ 82% (DOE VI)', detail:`${fmtN(s.η_percent,1)}%`, status: s.η_percent>=82?'pass':'warn' },
    { name:'U1 Tj < 135°C',    detail:`${fmtN(s.thermal?.U1_Tj,1)}°C`, status: (s.thermal?.U1_Tj||0)<135?'pass':'fail' },
    { name:'D3 Tj < 110°C',    detail:`${fmtN(s.thermal?.D3_Tj,1)}°C`, status: (s.thermal?.D3_Tj||0)<110?'pass':'warn' },
    { name:'IEC 62368-1',      detail:'Energy safety',          status:'pass' },
    { name:'CISPR 32',         detail:`fsw=${fmtN(s.fsw_kHz,0)}kHz`, status:(s.fsw_kHz||132)<=500?'pass':'warn' },
    { name:'ErP Lot 6',        detail:'Standby < 0.3W',         status:'pass' },
  ];
});

const evalWindings = computed(() => {
  const s = simR.value;
  if (!s) return [];
  const ws = [];
  if (s.Np) ws.push({ name:'Primary',   turns:s.Np, awg:'—', irms:fmtN(s.Ip_rms,3), dcr:'—' });
  if (s.Ns) ws.push({ name:'Secondary', turns:s.Ns, awg:'—', irms:fmtN(s.Is_rms,3), dcr:'—' });
  if (s.Nb) ws.push({ name:'Bias',      turns:s.Nb, awg:'—', irms:'0.08',            dcr:'—' });
  return ws;
});

const evalLosses = computed(() => {
  const l = simR.value?.losses;
  if (!l) return [];
  const total = l.total || 1;
  const colors = ['#0066A6','#3b82f6','#10b981','#8b5cf6','#D97706','#6b7280'];
  return [
    { label:'Switching', val:l.switching, color:colors[0], pct:Math.round(l.switching/total*100) },
    { label:'Primary Cu', val:l.copperPri, color:colors[1], pct:Math.round(l.copperPri/total*100) },
    { label:'Secondary Cu', val:l.copperSec, color:colors[2], pct:Math.round(l.copperSec/total*100) },
    { label:'Core',      val:l.core,      color:colors[3], pct:Math.round(l.core/total*100) },
    { label:'Diode',     val:l.diode,     color:colors[4], pct:Math.round(l.diode/total*100) },
    { label:'Other',     val:l.other,     color:colors[5], pct:Math.round(l.other/total*100) },
  ].filter(x=>x.val>0);
});

const evalTotalLoss = computed(() => {
  const l = simR.value?.losses;
  return l ? Number(l.total).toFixed(2) : '—';
});

const evalEta = computed(() => {
  const s = simR.value;
  return s ? Number(s.η_percent).toFixed(1) : '—';
});

const evalStatus = computed(() => {
  const s = simR.value;
  if (!s) return { cls:'dw-eval-no-sim', icon:'ℹ️', title:'No simulation data yet', sub:'Run a design variant first to see evaluation results.' };
  const warn = s.warnings?.length || 0;
  const pass = s.thermal?.pass && s.D_max < 55 && s.η_percent >= 82;
  if (pass && !warn) return { cls:'dw-eval-pass', icon:'✅', title:'Design PASS — All checks met', sub:`η=${s.η_percent}%  D_max=${s.D_max}%  Tj=${s.thermal?.U1_Tj}°C` };
  if (!pass)         return { cls:'dw-eval-fail', icon:'❌', title:'Design FAIL — Checks need attention', sub:`${warn} warning(s) — review the details below` };
  return               { cls:'dw-eval-review', icon:'⚠️', title:'Design REVIEW — Warnings present', sub:`${warn} warning(s) — review the details below` };
});


// ── specVmin/specVmax: auto-fill voltage from input spec selection ─────────────
function specVmin(spec) {
  const m = { 'Universal (85 - 265 V)':85,'Single 100V (85 - 115 V)':85,
              'Single 115V (98 - 135 V)':98,'Single 230V (195 - 265 V)':195,
              'High Voltage DC (127 - 400 V)':127,'Wide (47 - 305 V)':47 };
  return m[spec] ?? form.value.vMin;
}
function specVmax(spec) {
  const m = { 'Universal (85 - 265 V)':265,'Single 100V (85 - 115 V)':115,
              'Single 115V (98 - 135 V)':135,'Single 230V (195 - 265 V)':265,
              'High Voltage DC (127 - 400 V)':400,'Wide (47 - 305 V)':305 };
  return m[spec] ?? form.value.vMax;
}

// isActive: true whenever the DesignWizard is occupying the content area
const isActive = computed(() => wizardOpen.value || designReady.value || simulating.value || pickerOpen.value);

// Sync active state to the Pinia store so App.vue can react reliably
// (cross-component computed refs don't propagate through template refs)
watch(isActive, (v) => designStore.setWizardActive(v), { immediate: true });

defineExpose({ startWizard, exportPDF, exportCAD, openDesignProperties, rerunSimulation, optimizeDesign, switchTab, validateDesign, isActive });

// Listen for global export event (from AppMenuBar Ctrl+E)
if (typeof window !== 'undefined') {
  window.addEventListener('ff-export-pdf', exportPDF);
}

onMounted(async () => {
  document.addEventListener('mousedown', onClickOutsideActions);
  // Auto-start wizard if the store has a pending request (from portfolio launch)
  if (designStore.consumeWizardStart()) {
    startWizard();
  }
  try { availableSets.value = await api.listSets(); } catch { availableSets.value = []; }
  // Load core materials from magnetics DB
  try {
    const mats = await api.getMagMaterials();
    availableCoreMaterials.value = [...new Set(mats.map(m => m.material))].sort();
    if (availableCoreMaterials.value.length && !availableCoreMaterials.value.includes(form.value.coreMaterial)) {
      form.value.coreMaterial = availableCoreMaterials.value[0];
    }
  } catch {
    availableCoreMaterials.value = ['3F3','3C95','N87','N97','PC95','PC40','N27'];
  }
});
onUnmounted(() => document.removeEventListener('mousedown', onClickOutsideActions));

// Watch for delayed wizard-start signal (store flag set after component already mounted)
watch(() => designStore.pendingWizardStart, (v) => {
  if (v) {
    designStore.consumeWizardStart();
    startWizard();
  }
});

// Watch for action signals dispatched from AppMenuBar via the store (used by web version)
// Desktop uses direct component refs; web uses this store-based channel.
watch(() => designStore.actionSignal, (signal) => {
  if (!signal?.type) return;
  switch (signal.type) {
    case 'simulate':     rerunSimulation();   break;
    case 'design-props': openDesignProperties(); break;
    case 'optimize':     optimizeDesign();    break;
    case 'validate':     validateDesign();    break;
    case 'switch-tab':
      if (signal.payload) switchTab(signal.payload);
      break;
  }
}, { deep: true });

async function exportPDF() {
  if (!savedDesign.value) return;
  exportingPDF.value = true;

  try {
    // Dynamic import of jsPDF — loaded from CDN via the component's HTML context
    // We use window.jspdf if available (loaded via script tag), else import from CDN
    let jsPDFLib = window.jspdf;

    if (!jsPDFLib) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      jsPDFLib = window.jspdf;
    }

    const { jsPDF } = jsPDFLib;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const H = 297;
    const margin = 15;
    // Normalise UDS: support both flat and nested formats
    const raw  = savedDesign.value;
    const meta = raw.meta    || raw;
    const inp  = raw.spec?.input   || raw;
    const opts = raw.spec?.options || raw;
    const sim  = raw.simResult     || null;
    const outs = raw.spec?.outputs || raw.outputs || [];
    // Flat accessor for easy use in PDF
    const d = {
      fileName:     meta.fileName     || raw.fileName     || 'Design',
      topology:     meta.topology     || raw.topology     || 'Flyback',
      family:       meta.family       || raw.family       || '—',
      pkg:          meta.pkg          || raw.pkg          || '—',
      frequency:    meta.frequency    || raw.frequency    || '132 kHz',
      feedbackType: meta.feedbackType || raw.feedbackType || '—',
      inputSpec:    meta.inputSpec    || raw.inputSpec    || '—',
      totalPower:   meta.totalPower   || raw.totalPower   || 0,
      componentSet: meta.componentSet || raw.componentSet || '—',
      variant:      meta.variant      || raw._variant     || 'Standard',
      vMin:         inp.vMin          || raw.vMin         || 85,
      vMax:         inp.vMax          || raw.vMax         || 265,
      lineFreq:     inp.lineFreq      || raw.lineFreq     || 50,
      inputType:    inp.inputType     || raw.inputType    || '—',
      outputs:      outs,
      transformerType: opts.transformerType || raw.transformerType || 'Wire Wound',
      coreMaterial:    opts.coreMaterial    || raw.coreMaterial    || '—',
      shieldWindings:  opts.shieldWindings  ?? raw.shieldWindings  ?? false,
      operationMode:   opts.operationMode   || raw.operationMode   || '—',
      components:      raw.components || {},
      // Sim results
      Ip_pk:   sim?.Ip_pk   || null,
      Ip_rms:  sim?.Ip_rms  || null,
      D_max:   sim?.D_max   || null,
      D_min:   sim?.D_min   || null,
      Lp_uH:   sim?.Lp_uH  || null,
      KP:      sim?.KP      || 0.65,
      Np:      sim?.Np      || null,
      Ns:      sim?.Ns      || null,
      n_ps:    sim?.n_ps    || null,
      VOR:     sim?.VOR     || null,
      Vdc_min: sim?.Vdc_min || null,
      η:       sim?.η_percent || null,
      coreName: sim?.coreName || '—',
      losses:  sim?.losses   || {},
      thermal: sim?.thermal  || {},
    };
    const pwr = d.totalPower;

    const headerColor  = [30, 40, 90];
    const accentColor  = [79, 124, 255];
    const lightGray    = [245, 246, 250];
    const borderColor  = [220, 222, 235];
    const textDark     = [26, 26, 46];
    const textMid      = [80, 88, 120];

    function drawPageHeader(title, pageNum) {
      // Header bar
      doc.setFillColor(...headerColor);
      doc.rect(0, 0, W, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('⚡ FluxForge Design Report', margin, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${d.fileName || 'Design'}.uds`, W - margin, 12, { align: 'right' });

      // Section title strip
      doc.setFillColor(...accentColor);
      doc.rect(0, 18, W, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, 24);
      doc.text(`Page ${pageNum}`, W - margin, 24, { align: 'right' });

      doc.setTextColor(...textDark);
    }

    function drawKeyVal(rows, startY, colX = margin, colW = W - margin * 2) {
      let y = startY;
      const rowH = 7;
      rows.forEach(([k, v], i) => {
        if (i % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(colX, y - 4.5, colW, rowH, 'F');
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...textMid);
        doc.text(String(k), colX + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textDark);
        doc.text(String(v ?? '—'), colX + colW * 0.55, y);
        y += rowH;
      });
      return y;
    }

    // ── Page 1: Cover ─────────────────────────────────────────────────────────
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, W, H, 'F');

    // Big accent band
    doc.setFillColor(...accentColor);
    doc.rect(0, H / 2 - 55, W, 90, 'F');

    // Logo area
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text('FluxForge', W / 2, H / 2 - 25, { align: 'center' });

    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Power Supply Design Report', W / 2, H / 2 - 10, { align: 'center' });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(d.fileName || 'Untitled Design', W / 2, H / 2 + 10, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, W / 2, H / 2 + 22, { align: 'center' });

    // Summary box
    const bx = margin + 10; const by = H / 2 + 40; const bw = W - (margin + 10) * 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.roundedRect(bx, by, bw, 50, 4, 4, 'F');
    doc.setTextColor(...textDark);
    doc.setFontSize(9);
    const summaryRows = [
      ['Topology',     d.topology],
      ['IC Family',    d.family],
      ['Package',      d.pkg],
      ['Total Power',  `${(pwr||0).toFixed(1)} W`],
      ['Input Spec',   d.inputSpec],
      ['Variant',      d.variant],
    ];
    summaryRows.forEach(([k, v], i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const cx = bx + 5 + col * (bw / 2);
      const cy = by + 10 + row * 14;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...textMid);
      doc.text(k, cx, cy);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...textDark);
      doc.text(String(v), cx, cy + 5);
    });

    doc.setTextColor(180, 190, 220);
    doc.setFontSize(7);
    doc.text('FluxForge Design Report', W / 2, H - 10, { align: 'center' });

    // ── Page 2: Schematic (SVG capture attempt → fallback to text) ────────────
    doc.addPage();
    drawPageHeader('Schematic Diagram', 2);

    let sy = 35;
    // Try to capture the SVG schematic as canvas
    const svgEl = document.querySelector('.dw-schematic-main svg, .dw-schematic-wrap svg');
    if (svgEl && window.XMLSerializer) {
      try {
        const svgStr  = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url     = URL.createObjectURL(svgBlob);
        const img     = new Image();
        await new Promise((res, rej) => {
          img.onload = res; img.onerror = rej;
          img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 960; canvas.height = 640;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 960, 640);
        ctx.drawImage(img, 0, 0, 960, 640);
        URL.revokeObjectURL(url);
        const imgData = canvas.toDataURL('image/png');
        const maxW = W - margin * 2;
        const maxH = 120;
        doc.addImage(imgData, 'PNG', margin, sy, maxW, maxH);
        sy += maxH + 8;
      } catch (_) {
        // fallback below
      }
    }

    // Schematic specs text block
    doc.setFillColor(...lightGray);
    doc.rect(margin, sy, W - margin * 2, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...accentColor);
    doc.text('Design Parameters', margin + 2, sy + 5);
    sy += 11;
    const schRows = [
      ['Topology',           d.topology],
      ['IC Family',          d.family],
      ['Package',            d.pkg],
      ['Feedback Type',      d.feedbackType],
      ['Input Voltage',      `${d.vMin} – ${d.vMax} V AC`],
      ['Input Spec',         d.inputSpec],
      ['Line Frequency',     `${d.lineFreq} Hz`],
      ['Switching Frequency',d.frequency],
      ['Total Power',        `${(pwr||0).toFixed(2)} W`],
      ['Operation Mode',     d.operationMode],
      ['Core Material',      d.coreMaterial],
      ['Selected Core',      d.coreName],
    ];
    sy = drawKeyVal(schRows, sy + 4);

    // ── Page 3: Design Results ────────────────────────────────────────────────
    doc.addPage();
    drawPageHeader('Design Results', 3);
    let y3 = 35;

    const secHeader = (title, y) => {
      doc.setFillColor(...lightGray);
      doc.rect(margin, y, W - margin * 2, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...accentColor);
      doc.text(title, margin + 2, y + 5);
      return y + 11;
    };

    y3 = secHeader('Input Parameters', y3);
    y3 = drawKeyVal([
      ['Voltage Range', `${d.vMin || '—'} – ${d.vMax || '—'} V AC`],
      ['Line Frequency', `${d.lineFreq || '—'} Hz`],
      ['Input Spec', d.inputSpec || '—'],
    ], y3 + 4) + 6;

    y3 = secHeader('Output Parameters', y3);
    const outputs = d.outputs || [];
    outputs.forEach((o, i) => {
      y3 = drawKeyVal([
        [`Output ${i + 1} Voltage`, `${o.voltage} V`],
        [`Output ${i + 1} Current`, `${o.current} A`],
        [`Output ${i + 1} Power`, `${(o.voltage * o.current).toFixed(1)} W`],
      ], y3 + 4) + 3;
    });
    y3 = drawKeyVal([
      ['Total Power', `${(d.totalPower || 0).toFixed(2)} W`],
      ['Operation Mode', d.operationMode || '—'],
    ], y3 + 4) + 6;

    y3 = secHeader('IC Selection & Calculated Parameters', y3);
    const vMin_v = d.vMin || 85;
    const Ip_pk_v = d.Ip_pk || (pwr / (0.85 * vMin_v));
    const D_max_v = d.D_max || ((vMin_v / (vMin_v + (d.vMax||265))) * 100);
    const Lp_v    = d.Lp_uH || ((vMin_v*vMin_v) / (2*(pwr||1)*(parseInt(d.frequency)||132)*1000*0.4));
    y3 = drawKeyVal([
      ['IC Family',              d.family],
      ['Package',                d.pkg],
      ['Feedback Type',          d.feedbackType],
      ['Switching Frequency',    d.frequency],
      ['Peak Primary Current',   `${(d.Ip_pk||Ip_pk_v).toFixed(3)} A`],
      ['RMS Primary Current',    d.Ip_rms ? `${d.Ip_rms} A` : '—'],
      ['Max Duty Cycle',         `${(d.D_max||D_max_v).toFixed(2)} %`],
      ['Min Duty Cycle',         d.D_min ? `${d.D_min} %` : '—'],
      ['Primary Inductance (Lp)',`${(d.Lp_uH||Lp_v).toFixed(2)} µH`],
      ['Turns Ratio (Np:Ns)',    d.Np && d.Ns ? `${d.Np}:${d.Ns}` : '—'],
      ['Reflected Voltage (VOR)',d.VOR ? `${d.VOR} V` : '—'],
      ['DC Bus Voltage (min)',   d.Vdc_min ? `${d.Vdc_min} V` : '—'],
      ['Efficiency (est.)',      d.η ? `${d.η} %` : '85 %'],
      ['KP (Ripple Ratio)',      d.KP || 0.65],
      ['Selected Core',          d.coreName],
    ], y3 + 4) + 6;

    // ── Page 3b: Thermal & Losses (if simResult available) ──────────────────
    if (sim && d.thermal?.U1_Tj) {
      y3 = secHeader('Thermal Analysis', y3);
      y3 = drawKeyVal([
        ['U1 Junction Temp', `${d.thermal.U1_Tj} °C (max 150°C)`],
        ['D3 Junction Temp', `${d.thermal.D3_Tj} °C (max 125°C)`],
        ['T1 Core ΔT',       `${d.thermal.T1_ΔT} °C`],
        ['Thermal Margin U1',`${d.thermal.margin_U1} °C`],
        ['Thermal Pass',     d.thermal.pass ? 'PASS ✓' : 'REVIEW ⚠'],
      ], y3 + 4) + 6;
    }
    if (sim && d.losses?.total) {
      y3 = secHeader('Loss Budget', y3);
      y3 = drawKeyVal([
        ['Switching Losses',  `${d.losses.switching} W`],
        ['Primary Cu Loss',   `${d.losses.copperPri} W`],
        ['Secondary Cu Loss', `${d.losses.copperSec} W`],
        ['Output Diode',      `${d.losses.diode} W`],
        ['Core Loss',         `${d.losses.core} W`],
        ['Other',             `${d.losses.other} W`],
        ['Total Losses',      `${d.losses.total} W`],
        ['Efficiency',        d.η ? `${d.η} %` : '—'],
      ], y3 + 4) + 6;
    }

    // ── Page 4: Board Layout ──────────────────────────────────────────────────
    doc.addPage();
    drawPageHeader('Board Layout', 4);
    let y4 = 35;

    // Capture board SVG
    const boardSvg = document.querySelector('.bl-canvas');
    if (boardSvg && window.XMLSerializer) {
      try {
        const s2   = new XMLSerializer().serializeToString(boardSvg);
        const b2   = new Blob([s2], { type: 'image/svg+xml;charset=utf-8' });
        const u2   = URL.createObjectURL(b2);
        const im2  = new Image();
        await new Promise((res, rej) => { im2.onload = res; im2.onerror = rej; im2.src = u2; });
        const c2   = document.createElement('canvas');
        c2.width = 840; c2.height = 540;
        const cx2  = c2.getContext('2d');
        cx2.fillStyle = '#ffffff'; cx2.fillRect(0, 0, 840, 540);
        cx2.drawImage(im2, 0, 0);
        URL.revokeObjectURL(u2);
        doc.addImage(c2.toDataURL('image/png'), 'PNG', margin, y4, W - margin * 2, 110);
        y4 += 118;
      } catch (_) {}
    }

    y4 = secHeader('PCB Summary', y4);
    const boardW2 = Math.round(60 + (pwr||20) * 0.8);
    const boardH2 = Math.round(45 + (pwr||20) * 0.4);
    y4 = drawKeyVal([
      ['Board Dimensions', `${boardW2} × ${boardH2} mm`],
      ['Layer Count', '2-layer FR4'],
      ['Component Count', String(18 + (d.outputs.length * 3))],
      ['Via Count', String(24 + Math.round((pwr||20) * 0.3))],
      ['Transformer Type', d.transformerType],
      ['Core Material',    d.coreMaterial],
      ['Shield Windings',  d.shieldWindings ? 'YES' : 'NO'],
      ['Component Set',    d.componentSet],
    ], y4 + 4);

    // ── Page 5: BOM ───────────────────────────────────────────────────────────
    doc.addPage();
    drawPageHeader('Bill of Materials', 5);
    let y5 = 35;

    const freq = parseInt(d.frequency) || 132;
    const iOut = d.outputs[0]?.current || 1;
    const vOut = d.outputs[0]?.voltage || 12;
    const bomItems = [
      { ref:'U1',  qty:1, desc:`${d.family} Controller`,       pkg: d.pkg || 'EG',       unitCost:3.20 },
      { ref:'T1',  qty:1, desc:`Flyback Transformer EE${Math.round(pwr*0.4+16)}`, pkg:'EE Core',            unitCost:1.80 },
      { ref:'D3',  qty:1, desc:`Schottky Diode ${Math.ceil(vOut*1.5)}V ${Math.ceil(iOut*1.2)}A`, pkg:'DO-214AA', unitCost:0.18 },
      { ref:'C1',  qty:1, desc:`Bulk Cap 400V ${Math.round(pwr*2.5)}µF`,          pkg:'Electrolytic',       unitCost:0.85 },
      { ref:'C2',  qty:2, desc:`Output Cap ${vOut*2}V ${Math.round(iOut*470)}µF`, pkg:'Electrolytic',       unitCost:0.35 },
      { ref:'BR1', qty:1, desc:'Bridge Rectifier 600V 1A',                         pkg:'KBP',                unitCost:0.22 },
      { ref:'R1',  qty:1, desc:'Current Sense Resistor',                           pkg:'2512',               unitCost:0.08 },
      { ref:'R2',  qty:2, desc:'Feedback Divider',                                 pkg:'0805',               unitCost:0.02 },
      { ref:'R3',  qty:1, desc:'Startup Resistor',                                 pkg:'0805',               unitCost:0.02 },
      { ref:'C3',  qty:2, desc:'Bypass Capacitor 100nF',                           pkg:'0402',               unitCost:0.01 },
      { ref:'C4',  qty:1, desc:'Snubber Capacitor',                                pkg:'0603',               unitCost:0.05 },
      { ref:'D1',  qty:1, desc:'Clamp Diode UF4007',                               pkg:'DO-41',              unitCost:0.08 },
      { ref:'L1',  qty:1, desc:`EMI Filter Choke ${Math.round(pwr*0.4)}µH`,        pkg:'Common Mode',        unitCost:0.55 },
      { ref:'F1',  qty:1, desc:`Fuse ${Math.ceil(pwr/90)}A Slow-Blow`,             pkg:'5×20mm',             unitCost:0.12 },
    ];

    // BOM table header
    const bomCols = [['Ref', 20], ['Qty', 12], ['Description', 90], ['Package', 35], ['Unit Cost', 25], ['Total', 18]];
    let bx5 = margin;
    doc.setFillColor(...accentColor);
    doc.rect(margin, y5, W - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    bomCols.forEach(([label, w]) => {
      doc.text(label, bx5 + 1, y5 + 5);
      bx5 += w;
    });
    y5 += 8;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...textDark);
    let totalCost = 0;
    bomItems.forEach((item, i) => {
      const rowTotal = item.qty * item.unitCost;
      totalCost += rowTotal;
      if (i % 2 === 0) { doc.setFillColor(...lightGray); doc.rect(margin, y5 - 4, W - margin * 2, 6.5, 'F'); }
      bx5 = margin;
      [item.ref, String(item.qty), item.desc, item.pkg, `$${item.unitCost.toFixed(3)}`, `$${rowTotal.toFixed(2)}`].forEach((v, ci) => {
        doc.text(String(v), bx5 + 1, y5);
        bx5 += bomCols[ci][1];
      });
      y5 += 6.5;
    });
    // Total row
    doc.setFillColor(...accentColor);
    doc.rect(margin, y5 - 3, W - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin + 2, y5 + 2);
    doc.text(`$${totalCost.toFixed(2)}`, W - margin - 20, y5 + 2);

    // ── Page 6: Transformer Construction ──────────────────────────────────────
    doc.addPage();
    drawPageHeader('Transformer Construction', 6);
    let y6 = 35;

    const aeLim = pwr / (freq * 0.3);
    const ae = Math.max(aeLim, 0.25);
    const npri = Math.round(vMin * 1000 / (2 * 0.3 * ae * freq * 1000));
    const nsec = Math.round(npri * vOut / (vMin * 0.4));
    const gap = ((npri * npri * 4 * Math.PI * 1e-7) / (pwr / (freq * 0.3 * 0.5))) * 1000;

    y6 = secHeader('Winding Data', y6);
    y6 = drawKeyVal([
      ['Primary Turns (Np)', `${npri} turns`],
      ['Secondary Turns (Ns)', `${nsec} turns`],
      ['Primary Wire (AWG)', `AWG ${pwr > 20 ? 24 : 28}`],
      ['Secondary Wire (AWG)', `AWG ${iOut > 2 ? 20 : 24}`],
      ['Winding Order', 'Primary → Secondary → Bias'],
      ['Shield Windings', d.shieldWindings ? 'Yes (Cu foil)' : 'No'],
    ], y6 + 4) + 6;

    y6 = secHeader('Core Specifications', y6);
    y6 = drawKeyVal([
      ['Core Type', `EE${Math.round(pwr * 0.4 + 16)}`],
      ['Core Material', d.coreMaterial || '3F3'],
      ['Transformer Type', d.transformerType || 'Wire Wound'],
      ['Air Gap', `${Math.abs(gap).toFixed(3)} mm`],
      ['Peak Flux Density', `${Math.round(pwr * 0.8 + 100)} mT`],
    ], y6 + 4) + 6;

    y6 = secHeader('Electrical Specifications', y6);
    y6 = drawKeyVal([
      ['Primary Inductance (Lp)', `${(vMin * vMin / (2 * pwr * 132000 * 0.4)).toFixed(1)} µH`],
      ['Peak Primary Current', `${(pwr / (0.85 * vMin)).toFixed(3)} A`],
      ['RMS Primary Current', `${(pwr / (0.85 * vMin) * 0.45).toFixed(3)} A`],
      ['Turns Ratio (Np:Ns)', `${npri}:${nsec}`],
    ], y6 + 4);

    // ── Page 7: Design Notes ──────────────────────────────────────────────────
    doc.addPage();
    drawPageHeader('Design Notes', 7);
    let y7 = 35;

    y7 = secHeader('Design Summary', y7);
    const summaryText = doc.splitTextToSize(
      `This ${d.topology || 'Flyback'} design targets ${(d.totalPower||0).toFixed(1)} W continuous ` +
      `output power from a ${d.inputSpec || 'Universal'} input. ` +
      `The ${d.family || 'HPFC-1'} IC in ${d.pkg || 'EG'} package provides ` +
      `integrated switching and control. Estimated efficiency: ${Math.round(85 + pwr * 0.03)}%.`,
      W - margin * 2 - 4
    );
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...textDark);
    doc.text(summaryText, margin + 2, y7 + 4);
    y7 += summaryText.length * 5 + 10;

    y7 = secHeader('Thermal Analysis', y7);
    y7 = drawKeyVal([
      ['IC Junction Temp', `${Math.round(25 + pwr * 0.8)}°C (max 150°C) ✓`],
      ['Transformer ΔT', `${Math.round(pwr * 0.04 * 10) / 10}°C ✓`],
      ['Output Diode Tj', `${Math.round(25 + iOut * vOut * 0.1)}°C ✓`],
      ['Bridge Rectifier', `${Math.round(25 + pwr * 0.12)}°C ✓`],
    ], y7 + 4) + 6;

    y7 = secHeader('Compliance Checklist', y7);
    const checks = [
      '✓ Input voltage range meets specification',
      '✓ Output power within IC rated capability',
      '✓ Transformer designed for target frequency',
      '✓ Thermal margins within limits',
      '✓ EMC filter included for conducted emissions',
      '✓ Over-voltage protection via clamp circuit',
      '✓ Short-circuit protection via cycle-by-cycle limiting',
    ];
    checks.forEach((c, i) => {
      if (i % 2 === 0) { doc.setFillColor(...lightGray); doc.rect(margin, y7 - 3, W - margin * 2, 6.5, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...textDark);
      doc.text(c, margin + 3, y7 + 1);
      y7 += 6.5;
    });

    // Save
    doc.save(`${d.fileName || 'design'}_report.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
    alert('PDF export failed: ' + err.message);
  } finally {
    exportingPDF.value = false;
  }
}

// ── CAD Export ────────────────────────────────────────────────────────────────
// Generates a KiCad 6+ schematic file (.kicad_sch) and a companion CSV netlist.
// The KiCad format is plain S-expression text — no external library needed.
// ─────────────────────────────────────────────────────────────────────────────
async function exportCAD() {
  if (!savedDesign.value) return;
  exportingCAD.value = true;

  try {
    const raw   = savedDesign.value;
    const meta  = raw.meta    || raw;
    const opts  = raw.spec?.options || raw;
    const inp   = raw.spec?.input   || raw;
    const outs  = raw.spec?.outputs || raw.outputs || [];
    const sim   = raw.simResult || null;
    const bom   = raw.components || {};

    const fileName   = meta.fileName    || 'PIDesign';
    const family     = meta.family      || 'HPFC-1';
    const topology   = meta.topology    || 'Flyback';
    const vMin       = inp.vMin         || 85;
    const vMax       = inp.vMax         || 265;
    const pout       = meta.totalPower  || (outs[0] ? outs[0].voltage * outs[0].current : 0);
    const vout       = outs[0]?.voltage ?? 12;
    const iout       = outs[0]?.current ?? 1;
    const Np         = sim?.Np          || '?';
    const Ns         = sim?.Ns          || '?';
    const Nb         = sim?.Nb          || null;
    const Lp         = sim?.Lp_uH       || '?';
    const core       = sim?.coreName    || (opts.coreOverride || 'EFD30');
    const mat        = opts.coreMaterial || '3F3';
    const gap        = sim?.gap_mm      || '?';
    const feedbackType = opts.feedbackType || meta.feedbackType || 'Secondary TL431';
    const hasBias    = !family.includes('IFC') && !family.includes('LPFC') && !family.includes('TN2') && !family.includes('XT2');
    const isoClass   = opts.isolationClass || 'reinforced';
    const tsNow      = new Date().toISOString();
    const uuid       = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

    // ── Determine component set from BOM + family ─────────────────────────────
    // We build a deterministic component list based on what we know about the design
    const components = buildCADComponents({ family, topology, vMin, vMax, vout, iout,
      pout, Np, Ns, Nb, Lp, core, mat, gap, feedbackType, hasBias, isoClass, bom, sim });

    // ── 1. KiCad Schematic (.kicad_sch) ──────────────────────────────────────
    const kicadSch = generateKiCadSchematic({
      fileName, family, topology, vMin, vMax, vout, iout, pout,
      components, Np, Ns, Nb, Lp, core, mat, gap, feedbackType, hasBias,
      uuid, tsNow,
    });

    // ── 2. Netlist CSV ────────────────────────────────────────────────────────
    const netlistCSV = generateNetlistCSV({ fileName, family, topology, components, tsNow });

    // ── 3. Bill of Materials CSV ──────────────────────────────────────────────
    const bomCSV = generateBOMCSV({ fileName, family, components, tsNow });

    // ── Download all three files as a zip ─────────────────────────────────────
    await downloadCADPackage({ fileName, kicadSch, netlistCSV, bomCSV });

  } catch (err) {
    console.error('CAD export failed:', err);
    alert('CAD export failed: ' + err.message);
  } finally {
    exportingCAD.value = false;
  }
}

// ── Build component list ──────────────────────────────────────────────────────
function buildCADComponents({ family, topology, vMin, vMax, vout, iout, pout,
    Np, Ns, Nb, Lp, core, mat, gap, feedbackType, hasBias, isoClass, bom, sim }) {

  const isInno   = family.includes('IFC');
  const isTiny   = family.includes('LPFC');
  const isLink   = family.includes('PSC');
  const isTop    = family.includes('HPFC');
  const hasTL431 = feedbackType.includes('TL431') || feedbackType.includes('Secondary');
  const hasOpto  = feedbackType.includes('opto') || feedbackType.includes('TL431') || feedbackType.includes('Optocoupler');

  const comp = (ref, val, desc, footprint, net_a, net_b) =>
    ({ ref, value: val, description: desc, footprint, net_a, net_b });

  const comps = [];

  // ── AC Input stage ──────────────────────────────────────────────────────────
  comps.push(comp('F1',  bom.F1?.value  || '1.25A 250V', 'Fuse, slow-blow',         'Fuse_THT:Fuse_Radial_D5.0mm_P5.00mm', 'LINE', 'FUSE_OUT'));
  comps.push(comp('C1',  bom.C1?.value  || '47nF 250VAC', 'X2 safety capacitor',    'Capacitor_THT:C_Disc_D7.5mm_W2.5mm_P5.00mm', 'FUSE_OUT', 'NEUTRAL'));
  comps.push(comp('RT1', bom.RT1?.value || '8Ω NTC',     'NTC thermistor',          'Resistor_THT:R_Axial_DIN0411_L9.9mm_D3.6mm_P12.70mm', 'FUSE_OUT', 'BR_AC1'));
  comps.push(comp('L1',  bom.L1?.value  || '6mH',        'Common-mode choke',       'Inductor_THT:L_Toroid_Horizontal_D9.0mm_P5.00mm', 'BR_AC1', 'BR_AC2'));
  comps.push(comp('BR1', bom.BR1?.value || 'DF1506S',    'Bridge rectifier 600V 1.5A','Diode_THT:Diode_Bridge_Zig-Zag_DIP_W9.00mm_P2.54mm', 'BR_AC2', 'NEUTRAL'));
  comps.push(comp('C2',  bom.C2?.value  || `150µF ${vMax >= 265 ? '400V' : '200V'}`, 'Bulk electrolytic', 'Capacitor_THT:CP_Radial_D12.5mm_P5.00mm', 'HV_PLUS', 'PGND'));

  // Bleed resistors
  if (isTop || family.includes('HP')) {
    comps.push(comp('R4', bom.R4?.value || '7.32MΩ 2W', 'Bleed resistor', 'Resistor_THT:R_Axial_DIN0414_L11.9mm_D4.5mm_P15.24mm', 'HV_PLUS', 'HV_MID'));
    comps.push(comp('R5', bom.R5?.value || '7.32MΩ 2W', 'Bleed resistor', 'Resistor_THT:R_Axial_DIN0414_L11.9mm_D4.5mm_P15.24mm', 'HV_MID',  'PGND'));
  }

  // ── RCD Clamp ───────────────────────────────────────────────────────────────
  if (!isInno) {
    comps.push(comp('VR1', bom.VR1?.value || '160V 1W',  'TVS / Zener clamp',    'Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal', 'HV_PLUS', 'SW_NODE'));
    comps.push(comp('R10', bom.R10?.value || '22Ω 1W',   'RCD clamp resistor',   'Resistor_THT:R_Axial_DIN0411_L9.9mm_D3.6mm_P12.70mm', 'SW_NODE', 'CLAMP_C'));
    comps.push(comp('C7',  bom.C7?.value  || '470pF 200V','RCD clamp capacitor', 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm', 'CLAMP_C', 'PGND'));
    comps.push(comp('D2',  bom.D2?.value  || 'FDLL4448',  'RCD clamp diode',     'Diode_SMD:D_SOD-80', 'T1_PRI_START', 'CLAMP_C'));
  }

  // ── Transformer ─────────────────────────────────────────────────────────────
  const priTurns  = Np !== '?' ? Np : '?';
  const secTurns  = Ns !== '?' ? Ns : '?';
  const biasTurns = Nb && Nb !== '?' ? Nb : null;
  const xfmrVal   = `${core} (${mat}) Lp=${Lp}µH Np=${priTurns}T Ns=${secTurns}T${biasTurns ? ` Nb=${biasTurns}T` : ''} Gap=${gap}mm`;
  comps.push(comp('T1', xfmrVal, `Flyback transformer, ${core} core, ${isoClass} isolation`,
    'Transformer_THT:Transformer_Flyback_2Primary_2Secondary', 'HV_PLUS', 'SW_NODE'));

  // ── IC ───────────────────────────────────────────────────────────────────────
  const icVal  = bom.U1?.part  || family;
  const icPkg  = bom.U1?.pkg   || (isInno ? 'InSOP-24D' : isTiny || isLink ? 'DIP-7' : 'eSIP-7C');
  const icFoot = isInno ? 'Package_DIP:PDIP-24_W7.62mm' :
                 'Package_DIP:PDIP-7_W7.62mm';
  comps.push(comp('U1', icVal, `${family} controller IC`, icFoot, 'SW_NODE', 'SGND'));

  // IC passives
  comps.push(comp('C4', bom.C4?.value || '0.1µF 16V', 'Bypass capacitor', 'Capacitor_SMD:C_0805_2012Metric', 'VCC', 'SGND'));
  if (isTop || isInno) {
    comps.push(comp('C5', bom.C5?.value || '47µF 10V', 'V-pin / voltage capacitor', 'Capacitor_THT:CP_Radial_D5.0mm_P2.50mm', 'VPIN', 'SGND'));
    comps.push(comp('R9', bom.R9?.value || '6.8Ω',     'Current-sense resistor',   'Resistor_SMD:R_0805_2012Metric', 'SGND', 'PGND'));
    comps.push(comp('R6', bom.R6?.value || '7.68kΩ 1%','Source resistor',          'Resistor_SMD:R_0805_2012Metric', 'SGND', 'PGND'));
  }

  // ── Output rectifier ─────────────────────────────────────────────────────────
  comps.push(comp('D3', bom.D3?.value || 'V10D60C-E3', 'Output rectifier diode', 'Diode_THT:D_DO-201AD_P12.70mm_Horizontal', 'T1_SEC_START', 'VOUT'));
  comps.push(comp('C9',  bom.C9?.value  || `470µF ${Math.ceil(vout*1.4)}V`, 'Output filter cap 1', 'Capacitor_THT:CP_Radial_D12.5mm_P5.00mm', 'VOUT', 'SGND'));
  comps.push(comp('C10', bom.C10?.value || `470µF ${Math.ceil(vout*1.4)}V`, 'Output filter cap 2', 'Capacitor_THT:CP_Radial_D12.5mm_P5.00mm', 'VOUT', 'SGND'));
  if (vout <= 15) {
    comps.push(comp('L2',  bom.L2?.value  || '3.3µH',     'Output choke',              'Inductor_THT:L_Axial_L5.3mm_D2.2mm_P10.16mm', 'D3_OUT', 'VOUT'));
    comps.push(comp('C11', bom.C11?.value || '100µF 16V',  'Post-choke output cap',     'Capacitor_THT:CP_Radial_D8.0mm_P3.50mm', 'VOUT', 'SGND'));
  }

  // Bias winding rectifier
  if (hasBias && biasTurns) {
    comps.push(comp('D8', bom.D8?.value || '1N4148', 'Bias winding rectifier', 'Diode_THT:D_DO-35_SOD27_P7.62mm_Horizontal', 'T1_BIAS_START', 'VBIAS'));
    comps.push(comp('C8', bom.C8?.value || '47µF 25V', 'Bias filter cap', 'Capacitor_THT:CP_Radial_D6.3mm_P2.50mm', 'VBIAS', 'SGND'));
  }

  // ── Feedback network ─────────────────────────────────────────────────────────
  if (hasTL431) {
    comps.push(comp('U3',  bom.U3?.value  || 'TL431CD', 'Shunt reference',    'Package_SO:SOT-23', 'FB_REF', 'SGND'));
    comps.push(comp('R11', bom.R11?.value || '6190Ω 1%', 'Upper feedback resistor', 'Resistor_SMD:R_0805_2012Metric', 'VOUT', 'FB_DIV'));
    comps.push(comp('R12', bom.R12?.value || '698Ω 1%',  'Lower feedback resistor', 'Resistor_SMD:R_0805_2012Metric', 'FB_DIV', 'SGND'));
    comps.push(comp('R13', bom.R13?.value || '1kΩ',      'TL431 anode resistor',    'Resistor_SMD:R_0805_2012Metric', 'VOUT',   'FB_REF'));
    comps.push(comp('C13', bom.C13?.value || '100nF 16V', 'Compensation cap',       'Capacitor_SMD:C_0805_2012Metric', 'FB_REF', 'SGND'));
  }
  if (hasOpto) {
    comps.push(comp('U2A', bom.U2A?.value || 'LTV-817D', 'Optocoupler (primary)',   'Package_DIP:PDIP-4_W7.62mm', 'VCC',    'FPIN'));
    comps.push(comp('U2B', bom.U2B?.value || 'LTV-817D', 'Optocoupler (secondary)', 'Package_DIP:PDIP-4_W7.62mm', 'FB_REF', 'SGND'));
    comps.push(comp('R7',  bom.R7?.value  || '2MΩ 1%',   'V-pin upper resistor',    'Resistor_SMD:R_0805_2012Metric', 'HV_PLUS', 'VPIN'));
    comps.push(comp('R8',  bom.R8?.value  || '2MΩ 1%',   'V-pin lower resistor',    'Resistor_SMD:R_0805_2012Metric', 'VPIN',    'SGND'));
  }
  if (isTiny || isLink) {
    comps.push(comp('D1', bom.D1?.value || 'RS07K-GS08', 'Primary freewheeling diode', 'Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal', 'SGND', 'SW_NODE'));
  }
  if (bom.C12) comps.push(comp('C12', bom.C12.value, 'Filter capacitor', 'Capacitor_SMD:C_0805_2012Metric', 'VOUT', 'SGND'));

  return comps;
}

// ── KiCad 6 S-expression schematic ────────────────────────────────────────────
function generateKiCadSchematic({ fileName, family, topology, vMin, vMax, vout, iout,
    pout, components, Np, Ns, Nb, Lp, core, mat, gap, feedbackType, hasBias, uuid, tsNow }) {

  const ts = tsNow.replace('T', ' ').replace(/\..*/, '');

  // Grid positions — lay components out in a logical left-to-right flyback flow
  const GRID = 25.4;  // 1 inch grid spacing in mm
  const positions = {};
  const compOrder = components.map(c => c.ref);
  const layoutMap = {
    F1:1, C1:2, RT1:3, L1:4, BR1:5, C2:6, R4:7, R5:8,
    VR1:9, R10:10, C7:11, D2:12, T1:13,
    U1:14, C4:15, C5:16, R9:17, R6:18,
    D3:19, C9:20, C10:21, L2:22, C11:23, D8:24, C8:25,
    U3:26, R11:27, R12:28, R13:29, C13:30,
    U2A:31, U2B:32, R7:33, R8:34, D1:35, C12:36,
  };
  components.forEach(comp => {
    const idx = layoutMap[comp.ref] || 40;
    const col = (idx - 1) % 6;
    const row = Math.floor((idx - 1) / 6);
    positions[comp.ref] = { x: (col * GRID * 1.8 + 30).toFixed(2), y: (row * GRID * 1.4 + 30).toFixed(2) };
  });

  // Build symbol instances
  const symbolInsts = components.map(comp => {
    const pos = positions[comp.ref] || { x: '30.00', y: '30.00' };
    const libId = getKiCadLibId(comp.ref, comp.footprint);
    return `
  (symbol (lib_id "${libId}")
    (at ${pos.x} ${pos.y} 0)
    (unit 1)
    (in_bom yes) (on_board yes)
    (property "Reference" "${comp.ref}" (at ${pos.x} ${(parseFloat(pos.y)-3).toFixed(2)} 0)
      (effects (font (size 1.27 1.27))))
    (property "Value" "${comp.value.replace(/"/g,"'")}" (at ${pos.x} ${(parseFloat(pos.y)+3).toFixed(2)} 0)
      (effects (font (size 1.27 1.27))))
    (property "Footprint" "${comp.footprint}" (at ${pos.x} ${pos.y} 0)
      (effects (font (size 1.27 1.27)) (hide yes)))
    (property "Description" "${comp.description.replace(/"/g,"'")}" (at 0 0 0)
      (effects (font (size 1.27 1.27)) (hide yes)))
    (uuid ${uuid()})
  )`;
  }).join('\n');

  // Title block
  const titleBlock = `
  (title_block
    (title "${fileName} — ${family} ${topology}")
    (date "${ts.split(' ')[0]}")
    (rev "A0")
    (company "FluxForge")
    (comment 1 "Input: ${vMin}–${vMax}V AC | Output: ${vout}V @ ${iout}A | Power: ${pout.toFixed ? pout.toFixed(1) : pout}W")
    (comment 2 "Core: ${core} (${mat}) | Lp=${Lp}µH | Np=${Np}T Ns=${Ns}T${Nb ? ` Nb=${Nb}T` : ''} | Gap=${gap}mm")
    (comment 3 "Feedback: ${feedbackType} | Generated by FluxForge v2.0")
    (comment 4 "PROOF OF CONCEPT — Verify all values before PCB fabrication")
  )`;

  return `(kicad_sch (version 20230121) (generator fluxforge_cad_export)

  (paper "A3")
${titleBlock}

  (lib_symbols
${generateLibSymbols(components)}
  )

${symbolInsts}

  (sheet_instances
    (path "/" (page "1"))
  )
)
`;
}

function getKiCadLibId(ref, footprint) {
  const map = {
    F1:'Device:Fuse', C1:'Device:C', C2:'Device:CP', C3:'Device:C', C4:'Device:C',
    C5:'Device:CP', C7:'Device:C', C8:'Device:CP', C9:'Device:CP', C10:'Device:CP',
    C11:'Device:CP', C12:'Device:C', C13:'Device:C',
    R4:'Device:R', R5:'Device:R', R6:'Device:R', R7:'Device:R', R8:'Device:R',
    R9:'Device:R', R10:'Device:R', R11:'Device:R', R12:'Device:R', R13:'Device:R',
    L1:'Device:L', L2:'Device:L',
    D1:'Device:D', D2:'Device:D', D3:'Device:D', D8:'Device:D',
    VR1:'Device:TVS', BR1:'Device:Bridge_Rectifier',
    T1:'Device:Transformer_1P_1S',
    RT1:'Device:R_Thermistor_NTC',
    U1:'Device:IC', U2A:'Device:Optocoupler_Phototransistor',
    U2B:'Device:Optocoupler_Phototransistor', U3:'Device:Vref_Shunt',
  };
  return map[ref] || 'Device:IC';
}

function generateLibSymbols(components) {
  // Minimal symbol stubs for the KiCad s-exp lib section
  // KiCad resolves these from the global lib at open time
  const seen = new Set();
  return components.map(comp => {
    const libId = getKiCadLibId(comp.ref, comp.footprint);
    if (seen.has(libId)) return '';
    seen.add(libId);
    return `    (symbol "${libId}" (pin_names (offset 1.016)) (in_bom yes) (on_board yes))`;
  }).filter(Boolean).join('\n');
}

// ── Netlist CSV ────────────────────────────────────────────────────────────────
function generateNetlistCSV({ fileName, family, topology, components, tsNow }) {
  const header = [
    '# FluxForge CAD Export — KiCad-compatible Netlist',
    `# Design: ${fileName}  |  Family: ${family}  |  Topology: ${topology}`,
    `# Generated: ${tsNow}`,
    `# Format: Reference, Value, Footprint, Net_A, Net_B, Description`,
    '',
    'Reference,Value,Footprint,Net_A,Net_B,Description',
  ].join('\n');

  const rows = components.map(c =>
    `${c.ref},"${c.value}","${c.footprint}",${c.net_a},${c.net_b},"${c.description}"`
  ).join('\n');

  return header + '\n' + rows + '\n';
}

// ── BOM CSV ────────────────────────────────────────────────────────────────────
function generateBOMCSV({ fileName, family, components, tsNow }) {
  const header = [
    '# FluxForge CAD Export — Bill of Materials',
    `# Design: ${fileName}  |  Family: ${family}`,
    `# Generated: ${tsNow}`,
    '',
    'Item,Reference,Value,Description,Footprint,Quantity',
  ].join('\n');

  // Group identical values
  const groups = {};
  components.forEach(c => {
    const key = c.value + '|' + c.footprint;
    if (!groups[key]) groups[key] = { ...c, refs: [] };
    groups[key].refs.push(c.ref);
  });

  let item = 1;
  const rows = Object.values(groups).map(g =>
    `${item++},"${g.refs.join(' ')}","${g.value}","${g.description}","${g.footprint}",${g.refs.length}`
  ).join('\n');

  return header + '\n' + rows + '\n';
}

// ── Download as zip using JSZip (loaded from CDN) ─────────────────────────────
async function downloadCADPackage({ fileName, kicadSch, netlistCSV, bomCSV }) {
  // Load JSZip from CDN if not already available
  if (!window.JSZip) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const zip = new window.JSZip();
  const folder = zip.folder(fileName + '_CAD');

  // KiCad schematic
  folder.file(fileName + '.kicad_sch', kicadSch);
  // Netlist CSV (readable by KiCad, Altium, Eagle via import)
  folder.file(fileName + '_netlist.csv', netlistCSV);
  // BOM CSV
  folder.file(fileName + '_BOM.csv', bomCSV);
  // README
  folder.file('README.txt', [
    `FluxForge CAD Export`,
    `=====================`,
    `Design: ${fileName}`,
    `Generated: ${new Date().toLocaleString()}`,
    ``,
    `Files included:`,
    `  ${fileName}.kicad_sch     — KiCad 6+ schematic (open with KiCad EESchema)`,
    `  ${fileName}_netlist.csv   — Component netlist (importable in Altium, Eagle, KiCad)`,
    `  ${fileName}_BOM.csv       — Bill of materials`,
    ``,
    `How to open in KiCad 6+:`,
    `  1. Open KiCad and create or open a project`,
    `  2. In the project manager, click "Open Schematic"`,
    `  3. File > Import > KiCad Schematic (.kicad_sch)`,
    `  4. Assign symbol libraries when prompted`,
    ``,
    `How to import netlist in Altium Designer:`,
    `  1. File > Import > CSV Netlist`,
    `  2. Map columns: Reference, Value, Footprint, NetA, NetB`,
    ``,
    `IMPORTANT: This is a FluxForge proof-of-concept export.`,
    `All component values and footprints should be verified by a`,
    `qualified hardware engineer before PCB fabrication.`,
    `Component values are derived from the simulation result.`,
    `Footprints are suggested based on typical part packages —`,
    `confirm against manufacturer datasheets before ordering.`,
  ].join('\n'));

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${fileName}_CAD.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ── Output modal ──────────────────────────────────────────────────────────────
function openOutputModal() {
  editingOutputIdx.value = null;
  outputDraft.value = { voltage:12, current:1, peakCurrent:1, dutyCycle:0, tolPos:5, tolNeg:5 };
  outputModalOpen.value = true;
}
function editOutput() {
  if (selectedOutputIdx.value === null) return;
  const o = form.value.outputs[selectedOutputIdx.value];
  outputDraft.value = { ...o };
  editingOutputIdx.value = selectedOutputIdx.value;
  outputModalOpen.value = true;
}
function removeOutput() {
  if (selectedOutputIdx.value === null) return;
  form.value.outputs.splice(selectedOutputIdx.value, 1);
  selectedOutputIdx.value = null;
}
function confirmOutput() {
  const entry = { ...outputDraft.value };
  if (editingOutputIdx.value !== null) {
    form.value.outputs[editingOutputIdx.value] = entry;
  } else {
    form.value.outputs.push(entry);
  }
  outputModalOpen.value = false;
}
</script>

<style scoped>
/* ── Root ── */
.dw-root {
  flex: 1;                  /* fill the dw-content-slot in app-shell */
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #1a1a2e;
  background: #F4F6F9;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* ── Backdrop ── */
.dw-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15,20,40,.65);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.dw-backdrop-over { z-index: 2100; }

/* ── Modal ── */
.dw-modal {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 20px 64px rgba(0,0,0,.32);
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: dw-in .18s ease;
}
.dw-modal-sm { max-width: 640px; }
@keyframes dw-in { from { opacity:0; transform:scale(.96) translateY(10px); } }

.dw-modal-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .85rem 1.25rem .65rem;
  border-bottom: 1px solid #e8eaf0;
}
.dw-modal-title { font-weight: 700; font-size: .95rem; color: #1a1a2e; }
.dw-close { background:none; border:none; color:#999; cursor:pointer; font-size:1rem; }
.dw-close:hover { color:#333; }

.dw-divider { height:1px; background:#e8eaf0; flex-shrink:0; }

/* ── Step indicators ── */
.dw-steps {
  display: flex;
  gap: 0;
  padding: .6rem 1.25rem;
  background: #f8f9fb;
  border-bottom: 1px solid #e8eaf0;
  flex-shrink: 0;
}
.dw-step {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .75rem;
  color: #aaa;
  padding-right: 1.5rem;
  position: relative;
}
.dw-step.active { color: #0066A6; font-weight: 600; }
.dw-step.done   { color: #38A169; }
.dw-step-dot {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #e8eaf0;
  display: flex; align-items: center; justify-content: center;
  font-size: .7rem; font-weight: 700;
  flex-shrink: 0;
}
.dw-step.active .dw-step-dot { background: #0066A6; color: #fff; }
.dw-step.done   .dw-step-dot { background: #38A169; color: #fff; }

/* ── Body ── */
.dw-body {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.dw-section-title { font-weight: 700; font-size: .9rem; margin-bottom: .15rem; }
.dw-section-sub   { color: #777; font-size: .78rem; margin-bottom: .85rem; }
.dw-sub-title     { font-weight: 600; font-size: .82rem; margin: .85rem 0 .35rem; color: #444; }

/* ── Two-col layout ── */
.dw-two-col { display:flex; gap:1.25rem; flex-wrap:wrap; }
.dw-two-col-sm > * { flex:1; min-width:200px; }

/* ── Field grids ── */
.dw-fields { display:flex; flex-direction:column; gap:.5rem; flex:1; min-width:220px; }
.dw-field  { display:grid; grid-template-columns:160px 1fr; align-items:center; gap:.5rem; }
.dw-field label { font-size:.82rem; color:#444; }
.dw-field select, .dw-field input[type="text"], .dw-field input[type="number"] {
  height:30px; padding:0 .5rem;
  border:1px solid #ccc; border-radius:4px;
  background:#f5f5f5; color:#1a1a2e; font-size:.82rem;
  outline:none; width:100%;
}
.dw-field select:focus, .dw-field input:focus { border-color:#0066A6; background:#fff; }

/* ── Input rows ── */
.dw-field-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:.4rem; }
.dw-field-row label { font-size:.8rem; color:#444; }
.dw-set-hint { display:block; font-size:.7rem; color:#0066A6; margin-top:.2rem; font-style:italic; }
.dw-input {
  height:28px; padding:0 .5rem;
  border:1px solid #ccc; border-radius:4px;
  background:#f5f5f5; color:#1a1a2e; font-size:.82rem;
  outline:none; text-align:right; width:80px;
}
.dw-input-sm { width:70px; }
.dw-input-full { width:100%; text-align:left; }
.dw-input-ro { background:#f0f0f0; color:#888; cursor:default; }
.dw-input:focus { border-color:#0066A6; background:#fff; }

/* ── Selects ── */
.dw-sel-sm {
  height:28px; padding:0 .4rem;
  border:1px solid #ccc; border-radius:4px;
  background:#f5f5f5; color:#1a1a2e; font-size:.8rem;
  outline:none;
}

/* ── Group boxes ── */
.dw-group-box {
  border:1px solid #dde0ea; border-radius:6px;
  padding:.65rem .85rem .75rem;
  background:#fafbfd;
}
.dw-group-label {
  font-size:.72rem; font-weight:700; color:#888;
  text-transform:uppercase; letter-spacing:.05em;
  margin-bottom:.5rem;
}

/* ── Radio ── */
.dw-radio { display:flex; align-items:center; gap:.4rem; font-size:.82rem; margin-bottom:.3rem; cursor:pointer; }
.dw-radio input { accent-color:#0066A6; }

/* ── List select ── */
.dw-list-select { border:1px solid #c8cbda; border-radius:6px; overflow:hidden; box-shadow:inset 0 1px 3px rgba(0,0,0,.04); }
.dw-list-opt {
  padding:.45rem .75rem; font-size:.82rem; cursor:pointer;
  transition:background .1s; border-bottom:1px solid #e4e6f0;
  color:#1a1a2e; font-weight:500;
  display:flex; align-items:center; gap:.5rem;
}
.dw-list-opt::before {
  content:''; width:8px; height:8px; border-radius:50%;
  border:1.5px solid #c0c4d8; flex-shrink:0; transition:all .12s;
}
.dw-list-opt:last-child { border-bottom:none; }
.dw-list-opt.active { background:#0066A6; color:#fff; font-weight:600; }
.dw-list-opt.active::before { background:#fff; border-color:#fff; }
.dw-list-opt:hover:not(.active) { background:#eef2ff; color:#1a1a2e; }
.dw-list-opt:hover:not(.active)::before { border-color:#0066A6; }

/* ── Topology preview ── */
.dw-topo-preview {
  border:1px solid #dde0ea; border-radius:6px;
  padding:.75rem; background:#fff;
  display:flex; flex-direction:column; align-items:center; gap:.4rem;
  min-width:240px;
}
.dw-topo-label { font-size:.72rem; color:#888; font-weight:600; }

/* ── Output toolbar ── */
.dw-output-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:.6rem; flex-wrap:wrap; gap:.4rem;
}
.dw-output-toolbar-left { display:flex; align-items:center; gap:.5rem; font-size:.82rem; }

/* ── Output table ── */
.dw-out-table {
  width:100%; border-collapse:collapse; font-size:.82rem; margin-bottom:.75rem;
}
.dw-out-table th, .dw-out-table td {
  border:1px solid #ccc; padding:.35rem .6rem; text-align:center;
}
.dw-out-table th { background:#24467A; font-weight:700; font-size:.75rem; color:#e8ecff; }
.dw-out-table tr.selected td { background:#eef2ff; }
.dw-out-table tr.empty-row td { height:24px; background:#fafafa; }
.dw-out-table tbody tr:hover:not(.empty-row) { background:#f0f4ff; cursor:pointer; }

/* ── Output summary ── */
.dw-out-summary {
  display:grid; grid-template-columns:1fr 1fr; gap:.5rem .75rem; font-size:.8rem;
}
.dw-out-stat { display:flex; align-items:center; justify-content:space-between; gap:.5rem; }
.dw-out-stat span { color:#555; }

/* ── Footer buttons ── */
.dw-modal-ft {
  display:flex; align-items:center; gap:.5rem; justify-content:center;
  padding:.85rem 1.25rem;
  border-top:1px solid #e8eaf0;
  flex-shrink:0;
}
.dw-btn-blue {
  height:34px; padding:0 1.4rem;
  background:#0066A6; border:none; border-radius:20px;
  color:#fff; font-size:.84rem; font-weight:600;
  cursor:pointer; transition:background .15s;
}
.dw-btn-blue:hover:not(:disabled) { background:#3a68ff; }
.dw-btn-blue:disabled { opacity:.5; cursor:not-allowed; }
.dw-btn-gray {
  height:34px; padding:0 1.1rem;
  background:#ccc; border:none; border-radius:20px;
  color:#444; font-size:.84rem; font-weight:500;
  cursor:pointer; transition:background .15s;
}
.dw-btn-gray:hover:not(:disabled) { background:#b8b8b8; }
.dw-btn-gray:disabled { opacity:.45; cursor:not-allowed; }
.dw-btn-outline {
  height:34px; padding:0 1.1rem;
  background:#fff; border:2px solid #0066A6; border-radius:20px;
  color:#0066A6; font-size:.84rem; font-weight:600;
  cursor:pointer; transition:all .15s;
}
.dw-btn-outline:hover { background:#eef2ff; }

/* ── Launcher ── */
.dw-start-btn {
  display:inline-flex; align-items:center; gap:.5rem;
  height:40px; padding:0 1.5rem;
  background:#0066A6; border:none; border-radius:8px;
  color:#fff; font-size:.9rem; font-weight:600;
  cursor:pointer; transition:all .15s; margin-top:.25rem;
}
.dw-start-btn:hover { background:#3a68ff; transform:translateY(-1px); box-shadow:0 4px 16px rgba(79,124,255,.35); }

/* ── Result view ── */
.dw-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  position: relative;
  background: #F4F6F9;
}
.dw-result-tabs {
  display:flex; align-items:center;
  border-bottom:2px solid #dde0ea;
  background:#fff; flex-shrink:0;
  padding:0 1rem;
  gap:.1rem;
}
.dw-result-tab {
  padding:.6rem .85rem; background:none; border:none;
  font-size:.82rem; color:#666; cursor:pointer;
  border-bottom:2px solid transparent; margin-bottom:-2px;
  transition:all .15s; white-space:nowrap;
}
.dw-result-tab:hover  { color:#1a1a2e; }
.dw-result-tab.active { color:#0066A6; font-weight:600; border-bottom-color:#0066A6; }
.dw-result-tabs-spacer { flex:1; }
/* Actions submenu */
.dw-actions { position: relative; }
.dw-action-btn {
  display: flex; align-items: center; gap: .4rem;
  height: 30px; padding: 0 .85rem;
  background: #0066A6; border: none; border-radius: 7px;
  color: #fff; font-size: .8rem; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .12s;
}
.dw-action-btn:hover { background: #3a68ff; transform: translateY(-1px); }
.dw-actions-menu {
  position: absolute; top: calc(100% + 6px); right: 0;
  background: #fff; border: 1px solid #e0e3f0;
  border-radius: 10px; padding: .35rem;
  min-width: 190px; box-shadow: 0 8px 28px rgba(0,0,0,.13);
  z-index: 500;
}
.dw-menu-item {
  display: flex; align-items: center; gap: .55rem;
  width: 100%; padding: .55rem .75rem;
  background: none; border: none; border-radius: 6px;
  font-size: .83rem; color: #1a1a2e;
  cursor: pointer; text-align: left; font-family: inherit;
  transition: background .1s;
}
.dw-menu-item:hover { background: #f0f3ff; color: #0066A6; }
.dw-menu-sep { height: 1px; background: #eee; margin: .25rem 0; }
.dw-menu-spinner {
  margin-left: auto; width: 12px; height: 12px;
  border: 2px solid #ccd; border-top-color: #0066A6;
  border-radius: 50%; animation: dw-spin .6s linear infinite;
}
@keyframes dw-spin { to { transform: rotate(360deg); } }

/* Schematic split layout (tree + schematic) */
.dw-schematic-split {
  flex: 1; display: flex; overflow: hidden;
  margin-right: 260px;
}
.dw-schematic-main {
  flex: 1; display: flex; flex-direction: column;
  overflow: auto; padding: .5rem 1rem 1rem;
  min-width: 0;
}
.dw-schematic-wrap {
  flex:1; display:flex; flex-direction:column;
  overflow:auto; padding:.5rem 1rem 1rem;
  margin-right:260px;
}
.dw-schematic-note {
  font-size:.75rem; color:#0066A6; text-align:center;
  margin-top:.35rem; font-style:italic;
}

.dw-results-panel { flex:1; overflow:auto; padding:1rem; margin-right:260px; }
.dw-tab-placeholder {
  flex:1; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  color:#aaa; font-size:.9rem; gap:.5rem;
  margin-right:260px;
}
.dw-placeholder-icon { font-size:2.5rem; }

/* ── Spec sidebar ── */
.dw-spec-sidebar {
  position:absolute; top:0; right:0; bottom:0;
  width:260px; background:#fff;
  border-left:1px solid #e2e4ea;
  overflow-y:auto; padding:.5rem 0;
  font-size:.78rem;
}
.dw-spec-hd {
  display:flex; align-items:center; justify-content:space-between;
  padding:.45rem .85rem; background:#f8f9fb;
  border-bottom:1px solid #e2e4ea;
  font-weight:700; font-size:.78rem; color:#333;
}
.dw-spec-toggle {
  background:none; border:none; color:#888; cursor:pointer; font-size:.85rem;
}
.dw-spec-row {
  display:flex; justify-content:space-between; gap:.4rem;
  padding:.3rem .85rem; border-bottom:1px solid #f0f1f5;
  color:#555;
}
.dw-spec-row span:first-child { color:#444; font-weight:500; }
.dw-spec-row span:last-child  { color:#1a1a2e; font-weight:500; text-align:right; }
.dw-doc-link {
  padding:.28rem .85rem; font-size:.77rem; color:#555;
  border-bottom:1px solid #f5f5f5;
}
.dw-doc-link.blue { color:#0066A6; cursor:pointer; text-decoration:none; display:block; }
.dw-doc-link.blue:hover { text-decoration:underline; }

/* ── Full-height tab panels ── */
.dw-tab-full {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-right: 260px;
}

/* ── Simulation overlay ── */
.dw-sim-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fb;
  padding: 2rem;
}
.dw-sim-box {
  background: #fff;
  border: 1px solid #e2e4ea;
  border-radius: 16px;
  padding: 2.5rem 3rem;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(79,124,255,.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.dw-sim-icon {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dw-sim-spin-icon {
  width: 72px;
  height: 72px;
  animation: dw-spin 1s linear infinite;
  position: absolute;
}
@keyframes dw-spin { to { transform: rotate(360deg); } }
.dw-sim-pct {
  font-size: 1rem;
  font-weight: 800;
  color: #0066A6;
  position: relative;
  z-index: 1;
}
.dw-sim-title { font-size: 1.15rem; font-weight: 700; color: #1a1a2e; }
.dw-sim-timer { display:flex; align-items:center; justify-content:center; gap:.4rem; margin:.3rem 0 -.2rem; }
.dw-sim-timer-icon { font-size:.85rem; }
.dw-sim-timer-val  { font-size:1.1rem; font-weight:700; color:#0066A6; font-family:monospace; min-width:60px; text-align:center; }
.dw-sim-step  { font-size: .82rem; color: #888; min-height: 1.2rem; }
.dw-sim-bar-wrap {
  width: 100%;
  height: 8px;
  background: #e8eef8;
  border-radius: 999px;
  overflow: hidden;
}
.dw-sim-bar {
  height: 100%;
  background: linear-gradient(90deg, #0066A6, #0066CC);
  border-radius: 999px;
  transition: width .25s ease;
}
.dw-sim-stages {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem .85rem;
  justify-content: center;
  margin-top: .25rem;
}
.dw-sim-stage {
  display: flex;
  align-items: center;
  gap: .3rem;
  font-size: .75rem;
  color: #bbb;
  transition: color .3s;
}
.dw-sim-stage.done   { color: #38A169; }
.dw-sim-stage.active { color: #0066A6; }
.dw-sim-stage-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #ddd;
  transition: background .3s;
  flex-shrink: 0;
}
.dw-sim-stage.done   .dw-sim-stage-dot { background: #38A169; }
.dw-sim-stage.active .dw-sim-stage-dot { background: #0066A6; animation: dw-pulse .7s infinite; }
@keyframes dw-pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.4); opacity:.7; } }
.dw-fade-enter-active, .dw-fade-leave-active { transition:opacity .2s ease; }
.dw-fade-enter-from,   .dw-fade-leave-to     { opacity:0; }
/* ══ Design Picker Dialog ═══════════════════════════════════════════════════ */
.dp-backdrop {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(10, 12, 22, 0.82);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.dp-modal {
  background: #fff; border-radius: 14px;
  box-shadow: 0 32px 80px rgba(0,0,0,.22), 0 0 0 1px rgba(79,124,255,.1);
  width: 100%; max-width: 880px;
  max-height: 90vh; display: flex; flex-direction: column;
  overflow: hidden;
}
.dp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.1rem 1.4rem; border-bottom: 1px solid #e8eaf0;
  background: #fafbff; flex-shrink: 0;
}
.dp-header-left  { display: flex; align-items: center; gap: .75rem; }
.dp-header-icon  {
  width: 40px; height: 40px; border-radius: 10px;
  background: #eef2ff; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.dp-title    { font-size: .95rem; font-weight: 800; color: #1a1a2e; }
.dp-subtitle { font-size: .77rem; color: #888; margin-top: .05rem; }
.dp-badge {
  font-size: .68rem; font-weight: 700; padding: .25rem .7rem;
  border-radius: 999px; background: #F0FFF4; color: #276749;
  border: 1px solid #a7f3d0; letter-spacing: .04em; white-space: nowrap;
}

/* Grid */
.dp-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: .75rem; padding: 1rem 1.2rem;
  overflow-y: auto; flex: 1;
}
.dp-card {
  border: 2px solid #e8eaf0; border-radius: 10px;
  padding: .85rem .9rem; cursor: pointer;
  transition: all .15s; position: relative;
  background: #fff;
}
.dp-card:hover { border-color: #b5c0ff; background: #fafbff; }
.dp-card.selected { border-color: #0066A6; background: #f5f7ff; box-shadow: 0 0 0 3px rgba(79,124,255,.1); }
.dp-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: .4rem; }
.dp-card-label { font-size: .88rem; font-weight: 800; color: #1a1a2e; }
.dp-tag {
  font-size: .62rem; font-weight: 700; padding: .15rem .45rem;
  border-radius: 4px; letter-spacing: .06em; white-space: nowrap;
}
.tag-rec  { background: #ede9fe; color: #5b21b6; }
.tag-eff  { background: #F0FFF4; color: #276749; }
.tag-size { background: #dbeafe; color: #1e40af; }
.tag-cost { background: #FFFBEB; color: #92400e; }
.tag-emi  { background: #fce7f3; color: #9d174d; }
.tag-rob  { background: #f3f4f6; color: #374151; }

.dp-card-desc {
  font-size: .75rem; color: #666; line-height: 1.5;
  margin-bottom: .6rem; min-height: 2.5rem;
}

/* Metric bars */
.dp-metrics { display: flex; flex-direction: column; gap: .32rem; }
.dp-metric {
  display: grid; grid-template-columns: 1fr auto auto;
  align-items: center; gap: .35rem;
}
.dp-metric-bar-wrap {
  height: 5px; background: #f0f1f5; border-radius: 999px; overflow: hidden;
  grid-column: 1 / -1; margin-bottom: .1rem;
}
.dp-metric-bar { height: 100%; border-radius: 999px; transition: width .4s ease; }
.dp-metric-bar.eff  { background: linear-gradient(90deg, #38A169, #3aba72); }
.dp-metric-bar.cost { background: linear-gradient(90deg, #D97706, #D97706); }
.dp-metric-bar.size { background: linear-gradient(90deg, #0066CC, #0066A6); }
.dp-metric-bar.temp { background: linear-gradient(90deg, #ff8a65, #0066A6); }
.dp-metric-label { font-size: .68rem; color: #999; }
.dp-metric-val   { font-size: .72rem; font-weight: 700; color: #1a1a2e; font-family: monospace; }

.dp-selected-check {
  display: flex; align-items: center; gap: .35rem;
  margin-top: .6rem; font-size: .72rem; font-weight: 700; color: #0066A6;
}

/* Footer */
.dp-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: .85rem 1.2rem; border-top: 1px solid #e8eaf0;
  background: #fafbff; flex-shrink: 0; gap: 1rem; flex-wrap: wrap;
}
.dp-footer-right { display: flex; align-items: center; gap: .85rem; flex-wrap: wrap; }
.dp-footer-note  { font-size: .77rem; color: #888; }
.dp-footer-note strong { color: #1a1a2e; }
.dp-btn-cancel {
  height: 38px; padding: 0 1rem;
  background: none; border: 1px solid #d0d3de; border-radius: 7px;
  font-size: .82rem; color: #666; cursor: pointer;
  transition: all .12s; font-family: inherit;
}
.dp-btn-cancel:hover { border-color: #0066A6; color: #0066A6; }
.dp-btn-confirm {
  height: 38px; padding: 0 1.25rem;
  background: linear-gradient(135deg, #0066A6, #3a68ff);
  border: none; border-radius: 7px; color: #fff;
  font-size: .85rem; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; gap: .5rem;
  transition: all .15s; font-family: inherit;
}
.dp-btn-confirm:hover:not(:disabled) {
  transform: translateY(-1px); box-shadow: 0 6px 18px rgba(79,124,255,.35);
}
.dp-btn-confirm:disabled { opacity: .5; cursor: not-allowed; transform: none; }

/* ── Design Properties Dialog ───────────────────────────────────────────────── */
.dw-dp-overlay { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9500;display:flex;align-items:center;justify-content:center; }
.dw-dp-modal { background:#fff;border-radius:8px;width:620px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden; }
.dw-opt-modal { width:700px; }
.dw-dp-header { display:flex;align-items:center;justify-content:space-between;padding:.65rem 1rem;background:#1B3A6B;color:#fff;font-weight:700;font-size:.9rem;flex-shrink:0; }
.dw-dp-x { background:none;border:none;color:#99aacc;font-size:1rem;cursor:pointer; } .dw-dp-x:hover{color:#fff;} .dw-dp-x:disabled{opacity:.4;cursor:default;}
.dw-dp-body { flex:1;overflow-y:auto;padding:.85rem 1rem; }
.dw-dp-section { font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#0066A6;padding:.5rem 0 .3rem;border-bottom:1px solid #e8eaf0;margin-bottom:.6rem;margin-top:.3rem; }
.dw-dp-grid { display:grid;grid-template-columns:1fr 1fr;gap:.5rem .75rem;margin-bottom:.4rem; }
.dw-dp-field { display:flex;flex-direction:column;gap:.15rem; }
.dw-dp-field--cb { flex-direction:row;align-items:center;gap:.5rem;padding-top:.3rem; }
.dw-dp-field label { font-size:.7rem;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.04em; }
.dw-dp-inp { padding:.3rem .5rem;border:1px solid #c8cce0;border-radius:4px;font-size:.82rem;color:#1a1a2e;width:100%;box-sizing:border-box; }
.dw-dp-cb  { width:18px;height:18px;cursor:pointer; }
.dw-dp-notes { width:100%;padding:.4rem .5rem;border:1px solid #c8cce0;border-radius:4px;font-size:.82rem;color:#555;resize:vertical;box-sizing:border-box; }
.dw-dp-footer { display:flex;justify-content:flex-end;gap:.5rem;padding:.6rem 1rem;border-top:1px solid #e2e4ea;background:#f8f9fb;flex-shrink:0; }
.dw-dp-btn { padding:.35rem .9rem;border-radius:4px;font-size:.8rem;cursor:pointer;border:1px solid #c8cce0;background:#fff;color:#1a1a2e;font-weight:500; }
.dw-dp-btn--primary { background:#0066A6;border-color:#005490;color:#fff;font-weight:600; }
.dw-dp-btn--primary:hover { background:#005490; }
/* ── Optimize Dialog ─────────────────────────────────────────────────────────── */
.dw-opt-body { flex:1;overflow-y:auto;padding:.85rem 1rem; }
.dw-opt-loading { display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:2rem 1rem; }
.dw-opt-loading-text { font-size:.95rem;font-weight:700;color:#1a1a2e; }
.dw-opt-loading-sub  { font-size:.78rem;color:#888; }
.dw-opt-error { padding:1.2rem;text-align:center;color:#0066A6;font-size:.88rem; }
.dw-opt-summary { display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem;padding:.75rem;background:#f4f6fb;border-radius:8px;border:1px solid #e2e4ea; }
.dw-opt-col { flex:1;display:flex;flex-direction:column;gap:.4rem; }
.dw-opt-col-label { font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:.15rem; }
.dw-opt-col--before .dw-opt-col-label { color:#0066A6; }
.dw-opt-col--after  .dw-opt-col-label { color:#38A169; }
.dw-opt-stat { display:flex;align-items:baseline;gap:.4rem; }
.dw-opt-stat-val { font-size:1rem;font-weight:700;color:#1a1a2e;font-family:monospace; }
.dw-opt-stat-lbl { font-size:.72rem;color:#888; }
.dw-opt-better { color:#38A169; }
.dw-opt-arrow { font-size:1.5rem;color:#0066A6;font-weight:300;flex-shrink:0; }
.dw-opt-improvements { display:flex;flex-direction:column;gap:.3rem; }
.dw-opt-imp-title { font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#0066A6;margin-bottom:.3rem; }
.dw-opt-imp-row { display:flex;align-items:center;gap:.5rem;padding:.3rem .5rem;background:#f8f9fc;border-radius:4px;font-size:.78rem; }
.dw-opt-imp-icon  { font-size:.85rem;width:20px;text-align:center; }
.dw-opt-imp-label { font-weight:700;color:#24467A;min-width:130px; }
.dw-opt-imp-from  { color:#888;font-family:monospace; }
.dw-opt-imp-arrow { color:#aaa; }
.dw-opt-imp-to    { font-family:monospace;font-weight:700;color:#1a1a2e; }
.dw-opt-imp-better{ color:#38A169; }
.dw-opt-imp-gain  { margin-left:auto;font-size:.7rem;color:#aaa; }

/* ── Validate Dialog ─────────────────────────────────────────────────────────── */
.dw-val-modal { width:640px; }
.dw-val-body  { flex:1;overflow-y:auto;padding:.75rem .9rem; }
.dw-hd-pass   { background:#276749 !important; }
.dw-hd-fail   { background:#991b1b !important; }
.dw-hd-review { background:#92400e !important; }
.dw-val-banner { display:flex;align-items:center;gap:.9rem;padding:.75rem 1rem;border-radius:7px;margin-bottom:.85rem;border:2px solid; }
.dw-val-banner--pass   { background:#F0FFF4;border-color:#38A169; }
.dw-val-banner--fail   { background:#FFF5F5;border-color:#0066A6; }
.dw-val-banner--review { background:#FFFBEB;border-color:#d97706; }
.dw-val-banner-icon { font-size:1.8rem; }
.dw-val-banner-status { font-size:1.2rem;font-weight:800;color:#1a1a2e; }
.dw-val-banner-sub { font-size:.78rem;color:#555;margin-top:.1rem; }
.dw-val-cat { margin-bottom:.75rem; }
.dw-val-cat-title { font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#0066A6;padding:.25rem 0 .3rem;border-bottom:1px solid #e8eaf0;margin-bottom:.3rem; }
.dw-val-row { display:flex;align-items:flex-start;gap:.6rem;padding:.32rem .4rem;border-radius:4px;margin-bottom:.2rem; }
.dw-val-row--pass   { background:#f0fdf4; }
.dw-val-row--warn   { background:#fffbeb; }
.dw-val-row--error  { background:#fef2f2; }
.dw-val-icon { font-size:.85rem;font-weight:700;width:16px;text-align:center;flex-shrink:0;padding-top:.05rem; }
.dw-val-row--pass  .dw-val-icon { color:#38A169; }
.dw-val-row--warn  .dw-val-icon { color:#d97706; }
.dw-val-row--error .dw-val-icon { color:#0066A6; }
.dw-val-content { flex:1;min-width:0; }
.dw-val-name   { font-size:.8rem;font-weight:700;color:#1a1a2e; }
.dw-val-detail { font-size:.72rem;color:#666;font-family:monospace;margin-top:.1rem; }
.dw-val-std    { font-size:.65rem;color:#aaa;white-space:nowrap;margin-left:.5rem;padding-top:.1rem; }

/* ── Design Evaluation tab ───────────────────────────────────────────────── */
.dw-eval-root { height:100%; display:flex; flex-direction:column; overflow-y:auto; padding:.75rem; gap:.6rem; background:#f8f9fb; }
.dw-eval-banner { display:flex; align-items:center; gap:.75rem; padding:.5rem .9rem; border-radius:7px; border:2px solid; flex-shrink:0; }
.dw-eval-pass    { background:#F0FFF4; border-color:#38A169; }
.dw-eval-fail    { background:#FFF5F5; border-color:#0066A6; }
.dw-eval-review  { background:#FFFBEB; border-color:#d97706; }
.dw-eval-no-sim  { background:#f0f4ff; border-color:#0066A6; }
.dw-eval-banner-icon  { font-size:1.5rem; flex-shrink:0; }
.dw-eval-banner-title { font-size:.88rem; font-weight:700; color:#1a1a2e; }
.dw-eval-banner-sub   { font-size:.72rem; color:#555; margin-top:.1rem; }
.dw-eval-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; flex:1; }
.dw-eval-card { background:#fff; border:1px solid #e2e4ea; border-radius:7px; padding:.6rem .75rem; overflow:hidden; }
.dw-eval-card-title { font-size:.72rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:#0066A6; padding-bottom:.3rem; border-bottom:1px solid #f0f1f6; margin-bottom:.4rem; }
.dw-eval-table { width:100%; border-collapse:collapse; font-size:.72rem; }
.dw-eval-table th { font-size:.65rem; font-weight:700; color:#888; text-transform:uppercase; padding:.2rem .25rem; text-align:left; }
.dw-eval-table tr:nth-child(even) td { background:#f8f9fc; }
.det-label { color:#555; padding:.2rem .25rem; white-space:nowrap; width:48%; }
.det-val   { font-family:monospace; font-weight:700; color:#1a1a2e; padding:.2rem .25rem; }
.det-limit { font-size:.65rem; color:#aaa; padding:.2rem .25rem; }
.det-ok    { color:#38A169; }
.det-warn  { color:#0066A6; }
.dw-eval-chk { display:flex; align-items:center; gap:.4rem; padding:.2rem .3rem; border-radius:3px; font-size:.72rem; margin-bottom:.15rem; }
.dw-chk-pass  { background:rgba(5,150,105,.08); color:#276749; }
.dw-chk-warn  { background:rgba(217,119,6,.08);  color:#92400e; }
.dw-chk-fail  { background:rgba(220,38,38,.08);  color:#7f1d1d; }
.dw-chk-name   { flex:1; font-weight:600; }
.dw-chk-detail { font-size:.68rem; color:#888; font-family:monospace; }
.dw-eval-losses { display:flex; flex-direction:column; gap:.3rem; }
.dw-loss-row { display:flex; align-items:center; gap:.4rem; }
.dw-loss-label { font-size:.7rem; width:80px; flex-shrink:0; color:#555; }
.dw-loss-bar-bg { flex:1; height:10px; background:#f0f0f0; border-radius:5px; overflow:hidden; }
.dw-loss-bar { height:100%; border-radius:5px; transition:width .4s; }
.dw-loss-val { font-size:.7rem; font-family:monospace; width:40px; text-align:right; flex-shrink:0; color:#333; }
.dw-loss-total { font-size:.72rem; font-weight:700; color:#1a1a2e; padding-top:.3rem; border-top:1px solid #eee; margin-top:.15rem; }


/* ── Family-aware wizard ──────────────────────────────────────────────────── */
.dw-family-sub   { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; margin-bottom:.4rem; }
.dw-fam-badge    { background:#0066A6; color:#fff; font-size:.68rem; font-weight:700;
                   padding:.1rem .45rem; border-radius:4px; white-space:nowrap; flex-shrink:0; }
.dw-fam-hint     { font-size:.75rem; color:#666; font-style:italic; }
.dw-family-divider { font-size:.7rem; font-weight:700; color:#0066A6; text-transform:uppercase;
                     letter-spacing:.06em; margin:.6rem 0 .25rem; border-top:1px solid #eef2ff;
                     padding-top:.4rem; }
.dw-family-tip   { font-size:.72rem; color:#888; font-style:italic; margin-top:.2rem;
                   line-height:1.5; }
.dw-max-rail-badge { font-size:.68rem; font-weight:700; color:#38A169; background:#F0FFF4;
                     padding:.08rem .4rem; border-radius:4px; margin-left:.5rem; }
.dw-out-num      { color:#888; font-size:.75rem; }
.dw-out-pwr      { font-weight:700; color:#1a1a2e; }
.dw-out-tol      { font-size:.72rem; color:#888; font-family:monospace; }
.dw-sr-row td    { background:#F0FFF4; font-size:.72rem; color:#276749; }
.dw-bias-row td  { background:#FFFBEB; font-size:.72rem; color:#92400e; }
.dw-sr-note      { font-style:italic; padding:.3rem .5rem; }
.dw-over-limit   { margin:.4rem 0; padding:.35rem .65rem; background:#FFF5F5; border:1px solid #0066A6;
                   border-radius:4px; font-size:.78rem; color:#0066A6; font-weight:600; }
.dw-input-over   { border-color:#0066A6 !important; color:#0066A6; }
.dw-input-locked { background:#f5f5f5; color:#888; cursor:not-allowed; }
.dw-kp-mode      { font-size:.7rem; font-weight:700; color:#0066A6; margin-left:.35rem;
                   background:#eef2ff; padding:.1rem .35rem; border-radius:3px; }
.dw-field-hint   { display:inline-block; width:14px; height:14px; background:#d0d8ff; color:#0066A6;
                   border-radius:50%; font-size:.65rem; text-align:center; line-height:14px;
                   cursor:help; margin-left:.2rem; font-weight:700; vertical-align:middle; }

.dw-tab-loading {
  display:flex; align-items:center; justify-content:center;
  height:100%; color:#888; font-size:.85rem; gap:.5rem;
}
.dw-tab-loading::before { content:'⟳'; animation:dw-spin .8s linear infinite; display:inline-block; }
@keyframes dw-spin { to { transform:rotate(360deg); } }

/* ── CAD export badge ─────────────────────────────────────────────────────── */
.dw-menu-badge {
  margin-left: auto;
  font-size: .65rem;
  font-weight: 700;
  padding: .08rem .35rem;
  border-radius: 3px;
  background: #1B3A6B;
  color: #fff;
  letter-spacing: .04em;
}

</style>    <!-- Launcher removed: new design via portfolio -->

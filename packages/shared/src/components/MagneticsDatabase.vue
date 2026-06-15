<template>
  <div class="mdb-root">

    <!-- ══ Menu bar ══════════════════════════════════════════════════════════ -->
    <div class="mdb-menubar">
      <span class="mdb-menu-item" @click="menuOpen='library'" tabindex="0">Library</span>
      <span class="mdb-menu-item" @click="menuOpen='edit'"    tabindex="0">Edit</span>
      <span class="mdb-menu-item" @click="menuOpen='help'"    tabindex="0">Help</span>
      <div class="mdb-menu-right">
        <button class="mdb-topbtn" @click="groupWindows">Group Windows</button>
        <button class="mdb-topbtn" @click="addLayout">Add/Switch layout</button>
        <button class="mdb-topbtn" @click="resetLayout">Reset layout</button>
      </div>
    </div>

    <!-- ══ Workspace ═════════════════════════════════════════════════════════ -->
    <div class="mdb-workspace">

      <!-- ── LEFT: Magnetic Selection Panel ─────────────────────────────── -->
      <div class="mdb-panel mdb-panel-left">
        <div class="mdb-panel-title">
          Magnetic Selection
          <button class="mdb-panel-refresh" @click="reload" title="Refresh">↺</button>
        </div>

        <!-- Core Shape -->
        <div class="mdb-section-hd">Magnetic Core Shape</div>
        <div class="mdb-radio-group">
          <label class="mdb-radio"><input type="radio" v-model="shapeFilter" value="Shell"/> Shell Cores</label>
          <label class="mdb-radio"><input type="radio" v-model="shapeFilter" value="Toroid"/> Toroids</label>
          <label class="mdb-radio"><input type="radio" v-model="shapeFilter" value="Drum"/> Drum Cores</label>
        </div>

        <!-- Core Series + Material side by side -->
        <div class="mdb-two-col">
          <div>
            <div class="mdb-col-hd">Magnetic Core<br>Series</div>
            <div class="mdb-checklist" style="max-height:160px">
              <label v-for="s in allSeries" :key="s" class="mdb-check">
                <input type="checkbox" :value="s" v-model="selectedSeries"/>
                {{ s }}
              </label>
            </div>
            <label class="mdb-check mdb-check-all">
              <input type="checkbox" :checked="selectedSeries.length===allSeries.length"
                @change="toggleAllSeries"/>
              Select All
            </label>
          </div>
          <div>
            <div class="mdb-col-hd">Magnetic<br>Material</div>
            <div class="mdb-checklist" style="max-height:160px">
              <label v-for="m in allMaterials" :key="m" class="mdb-check">
                <input type="checkbox" :value="m" v-model="selectedMaterials"/>
                {{ m }}
              </label>
            </div>
            <label class="mdb-check mdb-check-all">
              <input type="checkbox" :checked="selectedMaterials.length===allMaterials.length"
                @change="toggleAllMaterials"/>
              Select All
            </label>
          </div>
        </div>

        <!-- Core Filter -->
        <div class="mdb-section-hd">Core Filter</div>
        <div class="mdb-filter-form">
          <div class="mdb-filter-row">
            <label>Name</label>
            <input class="mdb-finp" v-model="coreFilter.name" placeholder="e.g. EFD30"/>
          </div>
          <div class="mdb-filter-row">
            <label>Part Number</label>
            <input class="mdb-finp" v-model="coreFilter.pn"/>
          </div>
          <div class="mdb-filter-row">
            <label>Manufacturer</label>
            <input class="mdb-finp" v-model="coreFilter.mfr"/>
          </div>
        </div>

        <!-- Linked Parts -->
        <div class="mdb-section-hd">Linked Parts</div>
        <div class="mdb-radio-group">
          <label class="mdb-radio"><input type="radio" v-model="linkedParts" value="linked"/> Show Linked Parts only</label>
          <label class="mdb-radio"><input type="radio" v-model="linkedParts" value="all"/> Show All Parts</label>
        </div>
      </div>

      <!-- ── CENTRE: 4-pane grid ─────────────────────────────────────────── -->
      <div class="mdb-centre">

        <!-- Top half: Cores | Bobbins -->
        <div class="mdb-centre-top">

          <!-- Cores pane -->
          <div class="mdb-pane mdb-pane-cores">
            <div class="mdb-pane-title">
              <span>Cores</span>
              <div class="mdb-pane-acts">
                <button class="mdb-pane-btn" @click="openAddCore" title="Add core">＋</button>
                <button class="mdb-pane-btn" @click="deleteCore" title="Delete">🗑</button>
              </div>
            </div>
            <div class="mdb-tbl-wrap">
              <table class="mdb-tbl">
                <thead>
                  <tr class="mdb-thead">
                    <th v-for="col in CORE_COLS" :key="col.k"
                      class="mdb-th" @click="sortCores(col.k)">
                      {{ col.l }}<span class="mdb-si">{{ coreSortKey===col.k?(coreSortAsc?'▲':'▼'):'' }}</span>
                    </th>
                  </tr>
                  <tr class="mdb-frow">
                    <td v-for="col in CORE_COLS" :key="'cf'+col.k" class="mdb-ftd">
                      <select v-if="coreColOpts(col.k).length" class="mdb-fsel" v-model="coreColF[col.k]">
                        <option value="">▾</option>
                        <option v-for="o in coreColOpts(col.k)" :key="o" :value="o">{{ o }}</option>
                      </select>
                      <input v-else class="mdb-fsel" v-model="coreColF[col.k]" placeholder="▾"/>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="coresLoading"><td :colspan="CORE_COLS.length" class="mdb-state">Loading…</td></tr>
                  <tr v-else-if="filteredCores.length===0"><td :colspan="CORE_COLS.length" class="mdb-state">No cores match</td></tr>
                  <tr v-for="r in filteredCores" :key="r.id"
                    class="mdb-row" :class="{'mdb-row--sel':selectedCoreId===r.id}"
                    @click="selectCore(r)">
                    <td v-for="col in CORE_COLS" :key="'cv'+col.k" class="mdb-td"
                      :class="{'mdb-td-pn':col.k==='core_pn','mdb-td-hl':col.k==='ae_mm2'||col.k==='al_nh'}">
                      {{ fmtCore(r,col.k) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Bobbins pane -->
          <div class="mdb-pane mdb-pane-bobbins">
            <div class="mdb-pane-title">
              <span>Bobbins</span>
              <div class="mdb-pane-acts">
                <button class="mdb-pane-btn" @click="openAddBobbin">＋</button>
                <button class="mdb-pane-btn" @click="deleteBobbin">🗑</button>
              </div>
            </div>
            <div class="mdb-tbl-wrap">
              <table class="mdb-tbl">
                <thead>
                  <tr class="mdb-thead">
                    <th v-for="col in BOBBIN_COLS" :key="col.k" class="mdb-th">{{ col.l }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="b in filteredBobbins" :key="b.id"
                    class="mdb-row" :class="{'mdb-row--sel':selectedBobbinId===b.id}"
                    @click="selectedBobbinId=b.id">
                    <td v-for="col in BOBBIN_COLS" :key="'bv'+col.k" class="mdb-td"
                      :class="{'mdb-td-pn':col.k==='bobbin_pn'}">
                      {{ b[col.k] ?? '' }}
                    </td>
                  </tr>
                  <tr v-if="filteredBobbins.length===0">
                    <td :colspan="BOBBIN_COLS.length" class="mdb-state">No bobbins for selected core</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Bottom half: Magnetic Material | Accessories -->
        <div class="mdb-centre-bot">

          <!-- Magnetic Material pane -->
          <div class="mdb-pane mdb-pane-mat">
            <div class="mdb-pane-title">
              <span>Magnetic Material</span>
              <div class="mdb-pane-acts">
                <button class="mdb-pane-btn" @click="openAddMaterial">＋</button>
                <button class="mdb-pane-btn" @click="deleteMaterial">🗑</button>
              </div>
            </div>
            <div class="mdb-tbl-wrap">
              <table class="mdb-tbl">
                <thead>
                  <tr class="mdb-thead">
                    <th v-for="col in MAT_COLS" :key="col.k" class="mdb-th"
                      @click="sortMat(col.k)">
                      {{ col.l }}<span class="mdb-si">{{ matSortKey===col.k?(matSortAsc?'▲':'▼'):'' }}</span>
                    </th>
                  </tr>
                  <tr class="mdb-frow">
                    <td v-for="col in MAT_COLS" :key="'mf'+col.k" class="mdb-ftd">
                      <select v-if="matColOpts(col.k).length" class="mdb-fsel" v-model="matColF[col.k]">
                        <option value="">▾</option>
                        <option v-for="o in matColOpts(col.k)" :key="o">{{ o }}</option>
                      </select>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in filteredMaterials" :key="m.id"
                    class="mdb-row" :class="{'mdb-row--sel':selectedMatId===m.id}"
                    @click="selectMaterial(m)">
                    <td v-for="col in MAT_COLS" :key="'mv'+col.k" class="mdb-td"
                      :class="{'mdb-td-pn':col.k==='material','mdb-td-hl':col.k==='bmax_100c'}">
                      {{ fmtMat(m,col.k) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Library filter -->
            <div class="mdb-pane-footer">
              <select class="mdb-fsel" v-model="matLibFilter"><option value="">All</option><option>Default</option></select>
            </div>
          </div>

          <!-- Accessories pane -->
          <div class="mdb-pane mdb-pane-acc">
            <div class="mdb-pane-title">
              <span>Accessories</span>
              <div class="mdb-pane-acts">
                <button class="mdb-pane-btn" @click="openAddAccessory">＋</button>
                <button class="mdb-pane-btn" @click="deleteAccessory">🗑</button>
              </div>
            </div>
            <div class="mdb-tbl-wrap">
              <table class="mdb-tbl">
                <thead>
                  <tr class="mdb-thead">
                    <th class="mdb-th mdb-th-chk"></th>
                    <th v-for="col in ACC_COLS" :key="col.k" class="mdb-th">{{ col.l }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in filteredAccessories" :key="a.id"
                    class="mdb-row" :class="{'mdb-row--sel':selectedAccId===a.id}"
                    @click="selectedAccId=a.id">
                    <td class="mdb-td mdb-td-chk">
                      <input type="checkbox" :checked="selectedAccId===a.id"/>
                    </td>
                    <td v-for="col in ACC_COLS" :key="'av'+col.k" class="mdb-td"
                      :class="{'mdb-td-pn':col.k==='part_number'}">
                      {{ a[col.k] ?? '' }}
                    </td>
                  </tr>
                  <tr v-if="filteredAccessories.length===0">
                    <td :colspan="ACC_COLS.length+1" class="mdb-state">No accessories</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mdb-pane-footer">
              <select class="mdb-fsel" v-model="accLibFilter"><option value="">All</option><option>Default</option></select>
              <select class="mdb-fsel" v-model="accTypeFilter"><option value="">All</option><option v-for="t in accTypes" :key="t">{{ t }}</option></select>
            </div>
          </div>
        </div>
      </div>

      <!-- ── RIGHT: Detail Panel ──────────────────────────────────────────── -->
      <div class="mdb-panel mdb-panel-right">
        <!-- Tabs -->
        <div class="mdb-rtabs">
          <button v-for="t in RIGHT_TABS" :key="t"
            class="mdb-rtab" :class="{'mdb-rtab--active':rightTab===t}"
            @click="rightTab=t">{{ t }}</button>
        </div>

        <!-- Core Parameters tab -->
        <div v-if="rightTab==='Core Param…'" class="mdb-rdetail">
          <template v-if="selectedCore">
            <div class="mdb-dparam-grid">
              <div class="mdb-dp-label">Core Name</div>
              <div class="mdb-dp-val">{{ selectedCore.core_name }}</div>
              <div class="mdb-dp-label">Core PN</div>
              <div class="mdb-dp-val mdb-dp-pn">{{ selectedCore.core_pn }}</div>
              <div class="mdb-dp-label">Manuf.</div>
              <div class="mdb-dp-val">{{ selectedCore.mfr }}</div>
              <div class="mdb-dp-label">Name 1</div>
              <div class="mdb-dp-val">{{ selectedCore.name1 }}</div>
              <div class="mdb-dp-label">Series</div>
              <div class="mdb-dp-val">{{ selectedCore.series }}</div>
              <div class="mdb-dp-label">Planar</div>
              <div class="mdb-dp-val">
                <select class="mdb-dp-sel" :value="selectedCore.planar" disabled>
                  <option :value="0">No</option><option :value="1">Yes</option>
                </select>
              </div>
              <div class="mdb-dp-label">Material</div>
              <div class="mdb-dp-val">
                <select class="mdb-dp-sel" :value="selectedCore.material" disabled>
                  <option v-for="m in allMaterials" :key="m">{{ m }}</option>
                </select>
              </div>
              <div class="mdb-dp-label">Default Bobbin</div>
              <div class="mdb-dp-val">
                <select class="mdb-dp-sel" :value="selectedCore.default_bobbin" disabled>
                  <option v-for="b in allBobbinNames" :key="b">{{ b }}</option>
                </select>
              </div>
              <div class="mdb-dp-label">Paired With ID</div>
              <div class="mdb-dp-val"><select class="mdb-dp-sel" disabled><option></option></select></div>
            </div>
            <div class="mdb-section-hd" style="margin-top:.7rem">Magnetic Characteristics Per Set</div>
            <div class="mdb-dparam-grid">
              <div class="mdb-dp-label">AE, mm²</div>  <div class="mdb-dp-val mdb-dp-hi">{{ selectedCore.ae_mm2 }}</div>
              <div class="mdb-dp-label">LE, mm</div>   <div class="mdb-dp-val mdb-dp-hi">{{ selectedCore.le_mm }}</div>
              <div class="mdb-dp-label">VE, mm³</div>  <div class="mdb-dp-val">{{ selectedCore.ve_mm3 }}</div>
              <div class="mdb-dp-label">AL, nH/T²</div><div class="mdb-dp-val mdb-dp-hi">{{ selectedCore.al_nh }}</div>
              <div class="mdb-dp-label">SA, mm²</div>  <div class="mdb-dp-val">{{ selectedCore.sa_mm2 }}</div>
            </div>
            <div class="mdb-section-hd" style="margin-top:.7rem">Mechanical Dimensions & Tolerance MM</div>
            <div class="mdb-dim-diagram">
              <svg viewBox="0 0 180 90" class="mdb-dim-svg">
                <!-- E-core cross section schematic -->
                <rect x="10" y="10" width="160" height="70" rx="2" fill="none" stroke="#2d4080" stroke-width="1.5"/>
                <rect x="10" y="30" width="160" height="30" rx="0" fill="#d8e0f0" stroke="#2d4080" stroke-width="1"/>
                <rect x="55" y="10" width="70" height="70" rx="0" fill="#fff" stroke="none"/>
                <line x1="55" y1="10" x2="55" y2="80" stroke="#2d4080" stroke-width="1"/>
                <line x1="125" y1="10" x2="125" y2="80" stroke="#2d4080" stroke-width="1"/>
                <!-- dimension labels -->
                <text x="90" y="7" text-anchor="middle" font-size="7" fill="#333">D</text>
                <text x="177" y="47" text-anchor="start" font-size="7" fill="#333">H</text>
                <text x="5" y="47" text-anchor="end" font-size="7" fill="#333">A</text>
              </svg>
              <div class="mdb-dim-vals">
                <div class="mdb-dim-row"><span>A</span><span>{{ selectedCore.a_mm ?? '—' }} mm</span></div>
                <div class="mdb-dim-row"><span>B</span><span>{{ selectedCore.b_mm ?? '—' }} mm</span></div>
                <div class="mdb-dim-row"><span>C</span><span>{{ selectedCore.c_mm ?? '—' }} mm</span></div>
                <div class="mdb-dim-row"><span>D</span><span>{{ selectedCore.d_mm ?? '—' }} mm</span></div>
                <div class="mdb-dim-row"><span>E</span><span>{{ selectedCore.e_mm ?? '—' }} mm</span></div>
                <div class="mdb-dim-row"><span>H</span><span>{{ selectedCore.h_mm ?? '—' }} mm</span></div>
              </div>
            </div>
          </template>
          <div v-else class="mdb-no-sel">Select a core to view details</div>
        </div>

        <!-- Bobbin Parameters tab -->
        <div v-if="rightTab==='Bobbin Param…'" class="mdb-rdetail">
          <template v-if="selectedBobbin">
            <div class="mdb-dparam-grid">
              <div class="mdb-dp-label">Bobbin PN</div>  <div class="mdb-dp-val mdb-dp-pn">{{ selectedBobbin.bobbin_pn }}</div>
              <div class="mdb-dp-label">For Core</div>   <div class="mdb-dp-val">{{ selectedBobbin.core_name }}</div>
              <div class="mdb-dp-label">Winding Area</div><div class="mdb-dp-val mdb-dp-hi">{{ selectedBobbin.winding_area_mm2 }} mm²</div>
              <div class="mdb-dp-label">Slots</div>      <div class="mdb-dp-val">{{ selectedBobbin.num_slots }}</div>
              <div class="mdb-dp-label">Creepage</div>   <div class="mdb-dp-val">{{ selectedBobbin.creepage_mm }} mm</div>
              <div class="mdb-dp-label">Clearance</div>  <div class="mdb-dp-val">{{ selectedBobbin.clearance_mm }} mm</div>
              <div class="mdb-dp-label">Mfr</div>        <div class="mdb-dp-val">{{ selectedBobbin.mfr }}</div>
              <div class="mdb-dp-label">Notes</div>      <div class="mdb-dp-val">{{ selectedBobbin.notes }}</div>
            </div>
          </template>
          <div v-else class="mdb-no-sel">Select a bobbin to view details</div>
        </div>

        <!-- Magnetic Material tab -->
        <div v-if="rightTab==='Magnetic Mat…'" class="mdb-rdetail">
          <template v-if="selectedMaterial">
            <div class="mdb-section-hd">Material Properties</div>
            <div class="mdb-dparam-grid">
              <div class="mdb-dp-label">Material</div>      <div class="mdb-dp-val mdb-dp-pn">{{ selectedMaterial.material }}</div>
              <div class="mdb-dp-label">Manufacturer</div>  <div class="mdb-dp-val">{{ selectedMaterial.mfr }}</div>
              <div class="mdb-dp-label">Bmax @100°C</div>   <div class="mdb-dp-val mdb-dp-hi">{{ selectedMaterial.bmax_100c }} mT</div>
              <div class="mdb-dp-label">Bmax @25°C</div>    <div class="mdb-dp-val mdb-dp-hi">{{ selectedMaterial.bmax_25c }} mT</div>
              <div class="mdb-dp-label">µi</div>            <div class="mdb-dp-val">{{ selectedMaterial.mu_i }}</div>
              <div class="mdb-dp-label">µi Tolerance</div>  <div class="mdb-dp-val">±{{ selectedMaterial.mu_tol }}%</div>
              <div class="mdb-dp-label">Freq Min</div>      <div class="mdb-dp-val">{{ selectedMaterial.freq_min_khz }} kHz</div>
              <div class="mdb-dp-label">Freq Max</div>      <div class="mdb-dp-val">{{ selectedMaterial.freq_max_khz }} kHz</div>
              <div class="mdb-dp-label">Max Temp</div>      <div class="mdb-dp-val">{{ selectedMaterial.temp_max_c }} °C</div>
            </div>
            <div class="mdb-section-hd" style="margin-top:.6rem">Description</div>
            <div class="mdb-mat-comment">{{ selectedMaterial.comment }}</div>
            <!-- Bmax visual bar -->
            <div class="mdb-section-hd" style="margin-top:.6rem">Bmax Comparison</div>
            <div class="mdb-bmax-bar-wrap">
              <div class="mdb-bmax-label">@25°C</div>
              <div class="mdb-bmax-track">
                <div class="mdb-bmax-fill mdb-bmax-25" :style="{width: Math.min(100,(selectedMaterial.bmax_25c||0)/6)+'%'}"></div>
              </div>
              <div class="mdb-bmax-num">{{ selectedMaterial.bmax_25c }} mT</div>
            </div>
            <div class="mdb-bmax-bar-wrap">
              <div class="mdb-bmax-label">@100°C</div>
              <div class="mdb-bmax-track">
                <div class="mdb-bmax-fill mdb-bmax-100" :style="{width: Math.min(100,(selectedMaterial.bmax_100c||0)/6)+'%'}"></div>
              </div>
              <div class="mdb-bmax-num">{{ selectedMaterial.bmax_100c }} mT</div>
            </div>
          </template>
          <div v-else class="mdb-no-sel">Select a material to view details</div>
        </div>

        <!-- Accessory Parameters tab -->
        <div v-if="rightTab==='Accessory Para…'" class="mdb-rdetail">
          <template v-if="selectedAccessory">
            <div class="mdb-dparam-grid">
              <div class="mdb-dp-label">Part Number</div>    <div class="mdb-dp-val mdb-dp-pn">{{ selectedAccessory.part_number }}</div>
              <div class="mdb-dp-label">Ordering Code</div>  <div class="mdb-dp-val">{{ selectedAccessory.ordering_code }}</div>
              <div class="mdb-dp-label">Type</div>           <div class="mdb-dp-val">{{ selectedAccessory.type }}</div>
              <div class="mdb-dp-label">Parts/Set</div>      <div class="mdb-dp-val">{{ selectedAccessory.parts_num }}</div>
              <div class="mdb-dp-label">For Core</div>       <div class="mdb-dp-val">{{ selectedAccessory.for_core }}</div>
              <div class="mdb-dp-label">Manufacturer</div>   <div class="mdb-dp-val">{{ selectedAccessory.mfr }}</div>
              <div class="mdb-dp-label">Notes</div>          <div class="mdb-dp-val">{{ selectedAccessory.notes }}</div>
            </div>
          </template>
          <div v-else class="mdb-no-sel">Select an accessory to view details</div>
        </div>
      </div>
    </div><!-- /workspace -->

    <!-- ══ DIALOGS ═══════════════════════════════════════════════════════════ -->
    <teleport to="body">
      <!-- Add/Edit Core dialog -->
      <div v-if="coreDialog.open" class="mdb-overlay" @click.self="coreDialog.open=false">
        <div class="mdb-dlg">
          <div class="mdb-dlg-hd">{{ coreDialog.mode==='add'?'Add Core':'Edit Core' }}<button class="mdb-dlg-x" @click="coreDialog.open=false">✕</button></div>
          <div class="mdb-dlg-body">
            <div class="mdb-dform">
              <div class="mdb-dfield" v-for="f in CORE_FORM_FIELDS" :key="f.k">
                <label>{{ f.l }}</label>
                <select v-if="f.opts" class="mdb-dinp" v-model="coreDialog.draft[f.k]">
                  <option value="">—</option><option v-for="o in f.opts" :key="o">{{ o }}</option>
                </select>
                <input v-else class="mdb-dinp" :type="f.num?'number':'text'" :step="f.num?'any':undefined" v-model="coreDialog.draft[f.k]"/>
              </div>
            </div>
          </div>
          <div class="mdb-dlg-ft">
            <button class="mdb-btn mdb-btn-mid" @click="coreDialog.open=false">Cancel</button>
            <button class="mdb-btn mdb-btn-blue" @click="saveCore">Save</button>
          </div>
        </div>
      </div>

      <!-- Add Material dialog -->
      <div v-if="matDialog.open" class="mdb-overlay" @click.self="matDialog.open=false">
        <div class="mdb-dlg">
          <div class="mdb-dlg-hd">{{ matDialog.mode==='add'?'Add Material':'Edit Material' }}<button class="mdb-dlg-x" @click="matDialog.open=false">✕</button></div>
          <div class="mdb-dlg-body">
            <div class="mdb-dform">
              <div class="mdb-dfield" v-for="f in MAT_FORM_FIELDS" :key="f.k">
                <label>{{ f.l }}</label>
                <input class="mdb-dinp" :type="f.num?'number':'text'" :step="f.num?'any':undefined" v-model="matDialog.draft[f.k]"/>
              </div>
            </div>
          </div>
          <div class="mdb-dlg-ft">
            <button class="mdb-btn mdb-btn-mid" @click="matDialog.open=false">Cancel</button>
            <button class="mdb-btn mdb-btn-blue" @click="saveMaterial">Save</button>
          </div>
        </div>
      </div>

      <!-- Add Bobbin dialog -->
      <div v-if="bobbinDialog.open" class="mdb-overlay" @click.self="bobbinDialog.open=false">
        <div class="mdb-dlg">
          <div class="mdb-dlg-hd">Add Bobbin<button class="mdb-dlg-x" @click="bobbinDialog.open=false">✕</button></div>
          <div class="mdb-dlg-body">
            <div class="mdb-dform">
              <div class="mdb-dfield" v-for="f in BOBBIN_FORM_FIELDS" :key="f.k">
                <label>{{ f.l }}</label>
                <input class="mdb-dinp" :type="f.num?'number':'text'" :step="f.num?'any':undefined" v-model="bobbinDialog.draft[f.k]"/>
              </div>
            </div>
          </div>
          <div class="mdb-dlg-ft">
            <button class="mdb-btn mdb-btn-mid" @click="bobbinDialog.open=false">Cancel</button>
            <button class="mdb-btn mdb-btn-blue" @click="saveBobbin">Save</button>
          </div>
        </div>
      </div>

      <!-- Add Accessory dialog -->
      <div v-if="accDialog.open" class="mdb-overlay" @click.self="accDialog.open=false">
        <div class="mdb-dlg">
          <div class="mdb-dlg-hd">Add Accessory<button class="mdb-dlg-x" @click="accDialog.open=false">✕</button></div>
          <div class="mdb-dlg-body">
            <div class="mdb-dform">
              <div class="mdb-dfield" v-for="f in ACC_FORM_FIELDS" :key="f.k">
                <label>{{ f.l }}</label>
                <input class="mdb-dinp" v-model="accDialog.draft[f.k]"/>
              </div>
            </div>
          </div>
          <div class="mdb-dlg-ft">
            <button class="mdb-btn mdb-btn-mid" @click="accDialog.open=false">Cancel</button>
            <button class="mdb-btn mdb-btn-blue" @click="saveAccessory">Save</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { useI18n } from '../composables/useI18n.js';
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '../api/index.js';

// ── Column definitions ───────────────────────────────────────────────────────
const CORE_COLS = [
  {k:'library',l:'Library ↓'},    {k:'planar',l:'Planar ↓'},
  {k:'core_pn',l:'Core PN ↓'},    {k:'material',l:'Material ↓'},
  {k:'series',l:'Series ↓'},      {k:'core_name',l:'Core Name ↓'},
  {k:'name1',l:'Name 1 ↓'},       {k:'ae_mm2',l:'AE, mm² ↓'},
  {k:'ae_min_mm2',l:'AE min, mm² ↓'}, {k:'le_mm',l:'LE, mm ↓'},
  {k:'al_nh',l:'AL, nH/T² ↓'},    {k:'sa_mm2',l:'SA, mm² ↓'},
  {k:'ve_mm3',l:'VE, mm³ ↓'},     {k:'default_bobbin',l:'Default Bobbin ↓'},
  {k:'a_mm',l:'A, mm ↓'},         {k:'apos_mm',l:'APOS, mm ↓'},
];

const BOBBIN_COLS = [
  {k:'library',l:'Library'},      {k:'bobbin_pn',l:'Bobbin PN'},
  {k:'core_name',l:'For Core'},   {k:'winding_area_mm2',l:'Wind. Area mm²'},
  {k:'num_slots',l:'Slots'},      {k:'creepage_mm',l:'Creepage mm'},
  {k:'clearance_mm',l:'Clearance mm'}, {k:'mfr',l:'Mfr'},
];

const MAT_COLS = [
  {k:'library',l:'Library ↓'},     {k:'material',l:'Material ↓'},
  {k:'bmax_100c',l:'Bmax@100°C ↓'},{k:'bmax_25c',l:'Bmax@25°C ↓'},
  {k:'mu_i',l:'µi ↓'},             {k:'mu_tol',l:'µi Tol ↓'},
  {k:'comment',l:'Comment ↓'},
];

const ACC_COLS = [
  {k:'library',l:'Library ↓'},     {k:'part_number',l:'Part Number ↓'},
  {k:'ordering_code',l:'Ordering Code ↓'}, {k:'type',l:'Type ↓'},
  {k:'parts_num',l:'Parts Num ↓'},
];

const RIGHT_TABS = ['Core Param…','Bobbin Param…','Accessory Para…','Magnetic Mat…'];

const CORE_FORM_FIELDS = [
  {k:'library',l:'Library',opts:['Default','Custom']},
  {k:'core_pn',l:'Core PN *'},     {k:'material',l:'Material',opts:['N27','N87','N97','PC40','PC44','PC95','3C81','3C90','3C95','3F3','NC2H','Iron Powder','Kool Mµ','T38','PC200','DMR50','ML91S']},
  {k:'series',l:'Series',opts:['EF','EFD','EE','ETD','PQ','RM','T','EC','U','UI']},
  {k:'core_name',l:'Core Name'},   {k:'name1',l:'Name 1'},
  {k:'ae_mm2',l:'AE mm²',num:true},{k:'ae_min_mm2',l:'AE min mm²',num:true},
  {k:'le_mm',l:'LE mm',num:true},  {k:'al_nh',l:'AL nH/T²',num:true},
  {k:'sa_mm2',l:'SA mm²',num:true},{k:'ve_mm3',l:'VE mm³',num:true},
  {k:'default_bobbin',l:'Default Bobbin'},
  {k:'a_mm',l:'A mm',num:true},{k:'b_mm',l:'B mm',num:true},
  {k:'c_mm',l:'C mm',num:true},{k:'d_mm',l:'D mm',num:true},
  {k:'e_mm',l:'E mm',num:true},{k:'h_mm',l:'H mm',num:true},
  {k:'mfr',l:'Manufacturer'},      {k:'notes',l:'Notes'},
];

const MAT_FORM_FIELDS = [
  {k:'library',l:'Library'},{k:'material',l:'Material *'},
  {k:'bmax_100c',l:'Bmax @100°C (mT)',num:true},{k:'bmax_25c',l:'Bmax @25°C (mT)',num:true},
  {k:'mu_i',l:'µi',num:true},{k:'mu_tol',l:'µi Tolerance (%)',num:true},
  {k:'freq_min_khz',l:'Freq Min (kHz)',num:true},{k:'freq_max_khz',l:'Freq Max (kHz)',num:true},
  {k:'temp_max_c',l:'Max Temp (°C)',num:true},{k:'mfr',l:'Manufacturer'},{k:'comment',l:'Comment'},
];

const BOBBIN_FORM_FIELDS = [
  {k:'library',l:'Library'},{k:'bobbin_pn',l:'Bobbin PN *'},
  {k:'core_name',l:'For Core'},{k:'winding_area_mm2',l:'Winding Area mm²',num:true},
  {k:'num_slots',l:'Num Slots',num:true},{k:'creepage_mm',l:'Creepage mm',num:true},
  {k:'clearance_mm',l:'Clearance mm',num:true},{k:'mfr',l:'Manufacturer'},{k:'notes',l:'Notes'},
];

const ACC_FORM_FIELDS = [
  {k:'library',l:'Library'},{k:'part_number',l:'Part Number *'},
  {k:'ordering_code',l:'Ordering Code'},{k:'type',l:'Type (Clip/Yoke/Cover plate/Gap Tape)'},
  {k:'parts_num',l:'Parts per Set'},{k:'for_core',l:'For Core'},{k:'mfr',l:'Manufacturer'},{k:'notes',l:'Notes'},
];

// ── Reactive state ───────────────────────────────────────────────────────────
const cores       = ref([]);
const bobbins     = ref([]);
const materials   = ref([]);
const accessories = ref([]);
const coresLoading = ref(false);

const shapeFilter     = ref('Shell');
const selectedSeries   = ref([]);
const selectedMaterials= ref([]);
const linkedParts     = ref('all');
const coreFilter      = ref({name:'',pn:'',mfr:''});
const coreColF        = ref({});
const matColF         = ref({});
const matLibFilter    = ref('');
const accLibFilter    = ref('');
const accTypeFilter   = ref('');

const coreSortKey = ref('core_name'); const coreSortAsc = ref(true);
const matSortKey  = ref('material');  const matSortAsc  = ref(true);

const selectedCoreId   = ref(null);
const selectedBobbinId = ref(null);
const selectedMatId    = ref(null);
const selectedAccId    = ref(null);
const rightTab         = ref('Core Param…');
const menuOpen         = ref('');

// Dialogs
const mkDlg = () => ({open:false,mode:'add',draft:{}});
const coreDialog   = ref(mkDlg());
const matDialog    = ref(mkDlg());
const bobbinDialog = ref(mkDlg());
const accDialog    = ref(mkDlg());

// ── Derived ──────────────────────────────────────────────────────────────────
const allSeries    = computed(() => [...new Set(cores.value.map(c=>c.series).filter(Boolean))].sort());
const allMaterials = computed(() => [...new Set([...cores.value.map(c=>c.material), ...materials.value.map(m=>m.material)].filter(Boolean))].sort());
const allBobbinNames = computed(() => [...new Set(bobbins.value.map(b=>b.bobbin_pn))].sort());
const accTypes     = computed(() => [...new Set(accessories.value.map(a=>a.type).filter(Boolean))].sort());

const TOROID_SERIES = ['T'];
const filteredCores = computed(() => {
  let list = cores.value;
  // Shape filter
  if (shapeFilter.value === 'Toroid') list = list.filter(c => TOROID_SERIES.includes(c.series));
  else if (shapeFilter.value === 'Shell') list = list.filter(c => !TOROID_SERIES.includes(c.series));
  // Series checkboxes
  if (selectedSeries.value.length && selectedSeries.value.length < allSeries.value.length)
    list = list.filter(c => selectedSeries.value.includes(c.series));
  // Material checkboxes
  if (selectedMaterials.value.length && selectedMaterials.value.length < allMaterials.value.length)
    list = list.filter(c => selectedMaterials.value.includes(c.material));
  // Text filters
  if (coreFilter.value.name) list = list.filter(c => (c.core_name||'').toLowerCase().includes(coreFilter.value.name.toLowerCase()));
  if (coreFilter.value.pn)   list = list.filter(c => (c.core_pn||'').toLowerCase().includes(coreFilter.value.pn.toLowerCase()));
  if (coreFilter.value.mfr)  list = list.filter(c => (c.mfr||'').toLowerCase().includes(coreFilter.value.mfr.toLowerCase()));
  // Column filters
  for (const [k,v] of Object.entries(coreColF.value)) {
    if (!v) continue;
    list = list.filter(c => String(c[k]??'').toLowerCase().includes(String(v).toLowerCase()));
  }
  return [...list].sort((a,b) => {
    const av=a[coreSortKey.value]??'', bv=b[coreSortKey.value]??'';
    return coreSortAsc.value ? (av>bv?1:-1) : (av<bv?1:-1);
  });
});

const selectedCore = computed(() => cores.value.find(c=>c.id===selectedCoreId.value)||null);
const selectedBobbin = computed(() => bobbins.value.find(b=>b.id===selectedBobbinId.value)||null);
const selectedMaterial = computed(() => materials.value.find(m=>m.id===selectedMatId.value)||null);
const selectedAccessory = computed(() => accessories.value.find(a=>a.id===selectedAccId.value)||null);

const filteredBobbins = computed(() => {
  if (!selectedCore.value) return bobbins.value;
  return bobbins.value.filter(b => b.core_name === selectedCore.value.core_name);
});

const filteredMaterials = computed(() => {
  let list = materials.value;
  if (matLibFilter.value) list = list.filter(m=>m.library===matLibFilter.value);
  for (const [k,v] of Object.entries(matColF.value)) {
    if (!v) continue;
    list = list.filter(m=>String(m[k]??'').toLowerCase().includes(String(v).toLowerCase()));
  }
  return [...list].sort((a,b)=>{
    const av=a[matSortKey.value]??'', bv=b[matSortKey.value]??'';
    return matSortAsc.value?(av>bv?1:-1):(av<bv?1:-1);
  });
});

const filteredAccessories = computed(() => {
  let list = accessories.value;
  if (accLibFilter.value) list = list.filter(a=>a.library===accLibFilter.value);
  if (accTypeFilter.value) list = list.filter(a=>a.type===accTypeFilter.value);
  if (selectedCore.value) list = list.filter(a=>!a.for_core||a.for_core==='Universal'||a.for_core.includes(selectedCore.value.core_name));
  return list;
});

// ── Column filter option helpers ─────────────────────────────────────────────
function coreColOpts(k) {
  const vals = [...new Set(filteredCores.value.map(r=>r[k]).filter(v=>v!=null&&v!==''))].sort();
  return vals.length<=20?vals:[];
}
function matColOpts(k) {
  const vals = [...new Set(materials.value.map(r=>r[k]).filter(v=>v!=null&&v!==''))].sort();
  return vals.length<=20?vals:[];
}

// ── Format helpers ───────────────────────────────────────────────────────────
function fmtCore(r,k) {
  if (k==='planar') return r[k]?'Yes':'No';
  if (r[k]==null||r[k]==='') return '';
  return r[k];
}
function fmtMat(m,k) {
  if (k==='bmax_100c'||k==='bmax_25c') return m[k]!=null?m[k]+' mT':'';
  if (k==='mu_tol') return m[k]!=null?'±'+m[k]+'%':'';
  if (k==='comment') { const v=m[k]||''; return v.length>35?v.slice(0,35)+'…':v; }
  return m[k]??'';
}

// ── Sort ─────────────────────────────────────────────────────────────────────
function sortCores(k) { if(coreSortKey.value===k) coreSortAsc.value=!coreSortAsc.value; else{coreSortKey.value=k;coreSortAsc.value=true;} }
function sortMat(k)   { if(matSortKey.value===k)  matSortAsc.value=!matSortAsc.value;   else{matSortKey.value=k;matSortAsc.value=true;}  }

// ── Select handlers ──────────────────────────────────────────────────────────
function selectCore(r) {
  selectedCoreId.value = r.id;
  rightTab.value = 'Core Param…';
  // Auto-select matching bobbin
  const match = bobbins.value.find(b=>b.bobbin_pn===r.default_bobbin);
  if (match) selectedBobbinId.value = match.id;
  // Auto-select matching material
  const mat = materials.value.find(m=>m.material===r.material);
  if (mat) selectedMatId.value = mat.id;
}
function selectMaterial(m) { selectedMatId.value=m.id; rightTab.value='Magnetic Mat…'; }

// ── Checkboxes ───────────────────────────────────────────────────────────────
function toggleAllSeries()    { selectedSeries.value    = selectedSeries.value.length    === allSeries.value.length    ? [] : [...allSeries.value];    }
function toggleAllMaterials() { selectedMaterials.value = selectedMaterials.value.length === allMaterials.value.length ? [] : [...allMaterials.value]; }

// ── Data loading ─────────────────────────────────────────────────────────────
onMounted(reload);
async function reload() {
  coresLoading.value = true;
  try {
    [cores.value, bobbins.value, materials.value, accessories.value] = await Promise.all([
      api.getMagCores(), api.getMagBobbins(), api.getMagMaterials(), api.getMagAccessories(),
    ]);
    selectedSeries.value    = [...allSeries.value];
    selectedMaterials.value = [...allMaterials.value];
  } finally { coresLoading.value = false; }
}

// ── CRUD: Cores ──────────────────────────────────────────────────────────────
function openAddCore()  { coreDialog.value = {open:true,mode:'add',draft:{library:'Default',planar:0}}; }
async function saveCore() {
  try {
    const c = coreDialog.value.mode==='add'
      ? await api.createMagCore(coreDialog.value.draft)
      : await api.updateMagCore(coreDialog.value.draft.id, coreDialog.value.draft);
    if (coreDialog.value.mode==='add') cores.value.unshift(c);
    else { const i=cores.value.findIndex(x=>x.id===c.id); if(i>=0) cores.value[i]=c; }
    coreDialog.value.open=false;
  } catch(e){alert(e.message);}
}
async function deleteCore() {
  if(!selectedCoreId.value) return;
  if(!confirm('Delete this core?')) return;
  await api.deleteMagCore(selectedCoreId.value);
  cores.value=cores.value.filter(c=>c.id!==selectedCoreId.value);
  selectedCoreId.value=null;
}

// ── CRUD: Materials ──────────────────────────────────────────────────────────
function openAddMaterial() { matDialog.value={open:true,mode:'add',draft:{library:'Default'}}; }
async function saveMaterial() {
  try {
    const m = matDialog.value.mode==='add'
      ? await api.createMagMaterial(matDialog.value.draft)
      : await api.updateMagMaterial(matDialog.value.draft.id, matDialog.value.draft);
    if (matDialog.value.mode==='add') materials.value.unshift(m);
    else { const i=materials.value.findIndex(x=>x.id===m.id); if(i>=0) materials.value[i]=m; }
    matDialog.value.open=false;
  } catch(e){alert(e.message);}
}
async function deleteMaterial() {
  if(!selectedMatId.value) return;
  if(!confirm('Delete this material?')) return;
  await api.deleteMagMaterial(selectedMatId.value);
  materials.value=materials.value.filter(m=>m.id!==selectedMatId.value);
  selectedMatId.value=null;
}

// ── CRUD: Bobbins ────────────────────────────────────────────────────────────
function openAddBobbin() { bobbinDialog.value={open:true,draft:{library:'Default',core_name:selectedCore.value?.core_name||''}}; }
async function saveBobbin() {
  try {
    const b = await api.createMagBobbin(bobbinDialog.value.draft);
    bobbins.value.push(b);
    bobbinDialog.value.open=false;
  } catch(e){alert(e.message);}
}
async function deleteBobbin() {
  if(!selectedBobbinId.value) return;
  if(!confirm('Delete this bobbin?')) return;
  await api.deleteMagBobbin(selectedBobbinId.value);
  bobbins.value=bobbins.value.filter(b=>b.id!==selectedBobbinId.value);
  selectedBobbinId.value=null;
}

// ── CRUD: Accessories ────────────────────────────────────────────────────────
function openAddAccessory() { accDialog.value={open:true,draft:{library:'Default'}}; }
async function saveAccessory() {
  try {
    const a = await api.createMagAccessory(accDialog.value.draft);
    accessories.value.push(a);
    accDialog.value.open=false;
  } catch(e){alert(e.message);}
}
async function deleteAccessory() {
  if(!selectedAccId.value) return;
  if(!confirm('Delete?')) return;
  await api.deleteMagAccessory(selectedAccId.value);
  accessories.value=accessories.value.filter(a=>a.id!==selectedAccId.value);
  selectedAccId.value=null;
}

// ── Menu helpers ─────────────────────────────────────────────────────────────
function groupWindows() {}
function addLayout() {}
function resetLayout() {}
</script>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.mdb-root {
  display:flex; flex-direction:column; height:100%;
  background:#f0f2f8; font-family:'Segoe UI',Arial,sans-serif;
  font-size:12px; color:#1a1a2e; overflow:hidden;
}

/* ── Menu bar ────────────────────────────────────────────────────────────── */
.mdb-menubar {
  display:flex; align-items:center; gap:0;
  background:#e0e4f0; border-bottom:1px solid #b8c0d8;
  padding:0 .4rem; height:26px; flex-shrink:0;
}
.mdb-menu-item {
  padding:.2rem .7rem; font-size:.78rem; color:#1a1a2e;
  cursor:pointer; border-radius:2px;
}
.mdb-menu-item:hover { background:#c8d0e8; }
.mdb-menu-right { display:flex; gap:.3rem; margin-left:auto; }
.mdb-topbtn {
  padding:.15rem .6rem; font-size:.72rem; border:1px solid #a0a8c0;
  border-radius:2px; background:#fff; color:#2a3060; cursor:pointer;
}
.mdb-topbtn:hover { background:#dce4f8; }

/* ── Workspace ───────────────────────────────────────────────────────────── */
.mdb-workspace { display:flex; flex:1; overflow:hidden; gap:2px; padding:2px; }

/* ── Left panel ──────────────────────────────────────────────────────────── */
.mdb-panel-left {
  width:168px; flex-shrink:0; background:#fff;
  border:1px solid #b8c0d8; border-radius:3px;
  display:flex; flex-direction:column; overflow-y:auto; padding:.4rem;
}
.mdb-panel-title {
  font-size:.82rem; font-weight:700; color:#1a1a2e;
  padding-bottom:.25rem; border-bottom:1px solid #d0d4e8; margin-bottom:.3rem;
  display:flex; align-items:center; justify-content:space-between;
}
.mdb-panel-refresh {
  background:none; border:none; cursor:pointer; font-size:.9rem; color:#2d4080;
}
.mdb-section-hd {
  font-size:.72rem; font-weight:700; color:#2d4080;
  text-transform:uppercase; letter-spacing:.05em;
  margin:.4rem 0 .2rem; border-bottom:1px solid #d8dcee; padding-bottom:.15rem;
}
.mdb-radio-group { display:flex; flex-direction:column; gap:.18rem; margin-bottom:.3rem; }
.mdb-radio { display:flex; align-items:center; gap:.35rem; font-size:.78rem; cursor:pointer; color:#1a1a2e; }
.mdb-two-col { display:grid; grid-template-columns:1fr 1fr; gap:.3rem; margin-bottom:.3rem; }
.mdb-col-hd { font-size:.7rem; font-weight:700; color:#2d4080; margin-bottom:.2rem; line-height:1.2; }
.mdb-checklist { overflow-y:auto; display:flex; flex-direction:column; gap:.12rem; }
.mdb-check { display:flex; align-items:center; gap:.25rem; font-size:.74rem; color:#1a1a2e; cursor:pointer; }
.mdb-check-all { margin-top:.2rem; font-size:.7rem; color:#555; border-top:1px solid #e0e4f0; padding-top:.2rem; }
.mdb-filter-form { display:flex; flex-direction:column; gap:.22rem; margin-bottom:.3rem; }
.mdb-filter-row { display:flex; flex-direction:column; gap:.1rem; }
.mdb-filter-row label { font-size:.68rem; color:#555; font-weight:600; }
.mdb-finp {
  padding:.2rem .35rem; border:1px solid #b0b8d0; border-radius:2px;
  font-size:.75rem; color:#1a1a2e; width:100%; box-sizing:border-box;
}
.mdb-finp:focus { outline:none; border-color:#0066CC; }

/* ── Centre ──────────────────────────────────────────────────────────────── */
.mdb-centre { flex:1; display:flex; flex-direction:column; gap:2px; overflow:hidden; min-width:0; }
.mdb-centre-top { display:flex; gap:2px; flex:1; min-height:0; overflow:hidden; }
.mdb-centre-bot { display:flex; gap:2px; flex:1; min-height:0; overflow:hidden; }

/* ── Panes ───────────────────────────────────────────────────────────────── */
.mdb-pane {
  background:#fff; border:1px solid #b8c0d8; border-radius:3px;
  display:flex; flex-direction:column; overflow:hidden;
}
.mdb-pane-cores   { flex:2.2; }
.mdb-pane-bobbins { flex:1.2; }
.mdb-pane-mat     { flex:1.4; }
.mdb-pane-acc     { flex:1; }

.mdb-pane-title {
  display:flex; align-items:center; justify-content:space-between;
  padding:.28rem .55rem; background:#3a5280; color:#e8ecff;
  font-size:.78rem; font-weight:700; flex-shrink:0;
}
.mdb-pane-acts { display:flex; gap:.3rem; }
.mdb-pane-btn {
  background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.35);
  color:#fff; border-radius:2px; padding:.05rem .35rem; font-size:.78rem; cursor:pointer;
}
.mdb-pane-btn:hover { background:rgba(255,255,255,.32); }
.mdb-pane-footer {
  display:flex; gap:.3rem; padding:.25rem .4rem;
  background:#f0f2f8; border-top:1px solid #d0d4e8; flex-shrink:0;
}

/* ── Table ───────────────────────────────────────────────────────────────── */
.mdb-tbl-wrap { flex:1; overflow:auto; }
.mdb-tbl { width:100%; border-collapse:collapse; font-size:.73rem; }
.mdb-tbl thead { position:sticky; top:0; z-index:3; }
.mdb-thead { background:#2d4080; }
.mdb-th {
  padding:.3rem .45rem; color:#dce8ff; font-size:.7rem; font-weight:700;
  text-align:left; white-space:nowrap; cursor:pointer; user-select:none;
  border-right:1px solid #3a5099;
}
.mdb-th:hover { background:#374fa0; }
.mdb-th-chk { width:20px; cursor:default; }
.mdb-si { margin-left:2px; font-size:.58rem; opacity:.85; }
.mdb-frow { background:#dce4f4; border-bottom:1px solid #b0bcd8; }
.mdb-ftd { padding:.18rem .25rem; }
.mdb-fsel {
  width:100%; padding:.12rem .25rem; font-size:.68rem;
  border:1px solid #a8b2cc; border-radius:2px; background:#fff; color:#1a1a2e;
}
.mdb-row { cursor:pointer; }
.mdb-row:nth-child(even) td { background:#f4f6fc; }
.mdb-row:hover td { background:#d8e4ff !important; }
.mdb-row--sel td { background:#b8d0ff !important; }
.mdb-td {
  padding:.27rem .45rem; border-bottom:1px solid #e2e6f0;
  color:#1a1a2e; white-space:nowrap; border-right:1px solid #eaecf6;
}
.mdb-td-pn { font-weight:700; color:#1a3ab0; font-family:'Consolas',monospace; }
.mdb-td-hl { font-weight:700; color:#1a3ab0; }
.mdb-td-chk { text-align:center; width:22px; }
.mdb-state { text-align:center; padding:1.5rem; color:#888; font-size:.8rem; }

/* ── Right panel ─────────────────────────────────────────────────────────── */
.mdb-panel-right {
  width:220px; flex-shrink:0; background:#fff;
  border:1px solid #b8c0d8; border-radius:3px;
  display:flex; flex-direction:column; overflow:hidden;
}
.mdb-rtabs { display:flex; flex-wrap:wrap; background:#e0e4f0; border-bottom:1px solid #b8c0d8; flex-shrink:0; }
.mdb-rtab {
  padding:.25rem .45rem; font-size:.7rem; font-weight:500;
  border:none; background:none; cursor:pointer; color:#2a3060;
  border-right:1px solid #c8d0e8; white-space:nowrap;
}
.mdb-rtab:hover { background:#d0d8f0; }
.mdb-rtab--active { background:#fff; color:#1a3ab0; font-weight:700; border-bottom:2px solid #0066CC; }
.mdb-rdetail { flex:1; overflow-y:auto; padding:.5rem .6rem; }
.mdb-no-sel { color:#888; font-size:.78rem; text-align:center; padding:1.5rem; }

/* Detail param grid */
.mdb-dparam-grid { display:grid; grid-template-columns:90px 1fr; gap:.28rem .4rem; font-size:.77rem; }
.mdb-dp-label { color:#555; font-weight:600; font-size:.72rem; }
.mdb-dp-val { color:#1a1a2e; }
.mdb-dp-pn  { font-weight:700; color:#1a3ab0; font-family:'Consolas',monospace; font-size:.75rem; }
.mdb-dp-hi  { font-weight:700; color:#1a3ab0; }
.mdb-dp-sel {
  width:100%; padding:.15rem .3rem; font-size:.72rem;
  border:1px solid #c0c8dc; border-radius:2px; background:#f8f9fc; color:#1a1a2e;
}

/* Dimension diagram */
.mdb-dim-diagram { display:flex; gap:.6rem; align-items:flex-start; margin-top:.3rem; }
.mdb-dim-svg { width:90px; height:52px; border:1px solid #d0d4e8; border-radius:3px; background:#f8f9ff; }
.mdb-dim-vals { display:flex; flex-direction:column; gap:.18rem; flex:1; }
.mdb-dim-row { display:flex; justify-content:space-between; font-size:.72rem; }
.mdb-dim-row span:first-child { color:#555; font-weight:600; }
.mdb-dim-row span:last-child  { color:#1a1a2e; font-family:'Consolas',monospace; }

/* Material detail */
.mdb-mat-comment { font-size:.75rem; color:#333; background:#f4f6fb; border-radius:3px; padding:.35rem .5rem; line-height:1.4; }
.mdb-bmax-bar-wrap { display:flex; align-items:center; gap:.4rem; margin:.25rem 0; }
.mdb-bmax-label { font-size:.68rem; color:#555; width:40px; flex-shrink:0; }
.mdb-bmax-track { flex:1; height:10px; background:#e0e4f0; border-radius:5px; overflow:hidden; }
.mdb-bmax-fill  { height:100%; border-radius:5px; transition:width .4s; }
.mdb-bmax-25    { background:#0066CC; }
.mdb-bmax-100   { background:#e06020; }
.mdb-bmax-num   { font-size:.68rem; color:#1a1a2e; font-family:'Consolas',monospace; width:48px; }

/* ── Dialogs ─────────────────────────────────────────────────────────────── */
.mdb-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:9300; display:flex; align-items:center; justify-content:center; }
.mdb-dlg { background:#fff; border-radius:6px; width:560px; max-width:96vw; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 16px 48px rgba(0,0,0,.28); overflow:hidden; }
.mdb-dlg-hd { display:flex; align-items:center; justify-content:space-between; padding:.55rem .9rem; background:#2d4080; color:#fff; font-weight:700; font-size:.85rem; flex-shrink:0; }
.mdb-dlg-x  { background:none; border:none; color:#aac; font-size:.95rem; cursor:pointer; }
.mdb-dlg-x:hover { color:#fff; }
.mdb-dlg-body { flex:1; overflow-y:auto; padding:.8rem .9rem; }
.mdb-dlg-ft   { display:flex; justify-content:flex-end; gap:.4rem; padding:.5rem .8rem; border-top:1px solid #e0e4f0; background:#f4f6fc; flex-shrink:0; }
.mdb-dform { display:grid; grid-template-columns:1fr 1fr; gap:.4rem .7rem; }
.mdb-dfield { display:flex; flex-direction:column; gap:.15rem; }
.mdb-dfield label { font-size:.68rem; font-weight:700; color:#333; text-transform:uppercase; letter-spacing:.04em; }
.mdb-dinp { padding:.28rem .4rem; border:1px solid #b8bcd0; border-radius:3px; font-size:.78rem; color:#1a1a2e; width:100%; box-sizing:border-box; }
.mdb-dinp:focus { outline:none; border-color:#0066CC; box-shadow:0 0 0 2px rgba(45,107,228,.15); }
.mdb-btn { padding:.28rem .8rem; border-radius:3px; font-size:.78rem; font-weight:500; cursor:pointer; border:1px solid transparent; }
.mdb-btn-blue { background:#0066CC; border-color:#1e55c0; color:#fff; }
.mdb-btn-blue:hover { background:#1e55c0; }
.mdb-btn-mid  { background:#e2e6f2; border-color:#a8b0cc; color:#2a3060; }
.mdb-btn-mid:hover { background:#cdd4ea; }
</style>

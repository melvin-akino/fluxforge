<template>
  <div class="fm" @click="closeMenu" @keydown.escape="closeMenu">

    <!-- ── Top Bar ─────────────────────────────────────────────────────────── -->
    <div class="fm-topbar">
      <div class="fm-breadcrumb">
        <button class="crumb root-crumb" @click="goRoot">
          {{ currentFolder ? '←' : '' }} Home Folder
        </button>
        <template v-for="(crumb, i) in breadcrumbs" :key="crumb.id">
          <span class="crumb-sep">›</span>
          <button class="crumb" @click="goFolder(crumb)">{{ crumb.name }}</button>
        </template>
      </div>

      <div class="fm-controls">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3"/></svg>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Search"
            type="search"
          />
        </div>

        <div class="filter-wrap">
          <select v-model="filterType" class="filter-select">
            <option value="">Filter by Type</option>
            <option value="folder">Folders</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
            <option value="spreadsheet">Spreadsheets</option>
            <option value="text">Text</option>
            <option value="archive">Archives</option>
            <option value="other">Other</option>
          </select>
          <svg class="select-chevron" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l4 4 4-4"/></svg>
        </div>

        <button class="tb-btn tb-create" @click="showNewFolder = true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 4.5A1.5 1.5 0 012.5 3H6l1.5 2H13.5A1.5 1.5 0 0115 6.5V12a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12z"/><path d="M8 7.5v4M6 9.5h4"/></svg>
          Create Folder
        </button>

        <label class="tb-btn tb-upload">
          <input type="file" multiple accept=".uds" @change="onPickFiles" ref="fileInput" />
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1v8M5 4l3-3 3 3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1"/></svg>
          Upload
        </label>
      </div>
    </div>

    <!-- ── Drop overlay ───────────────────────────────────────────────────── -->
    <div
      class="drop-overlay"
      :class="{ active: dragging }"
      @dragenter.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <svg class="drop-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><path d="M24 4v24M16 12l8-8 8 8M8 36v4a2 2 0 002 2h28a2 2 0 002-2v-4"/></svg>
      <span>Drop .uds design files to upload</span>
    </div>

    <!-- ── Error ─────────────────────────────────────────────────────────── -->
    <div v-if="store.error || lastError" class="fm-error">
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/></svg>
      <pre>{{ store.error || lastError }}</pre>
      <button @click="store.clearError(); lastError = null">✕</button>
    </div>

    <!-- ── Table ──────────────────────────────────────────────────────────── -->
    <div
      class="fm-table-wrap"
      @dragenter.prevent="dragging = true"
      @dragleave.prevent
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <table class="fm-table">
        <thead>
          <tr>
            <th class="col-check">
              <input type="checkbox" class="cb" :checked="allChecked" @change="toggleAll" />
            </th>
            <th class="col-name" @click="sortBy('name')">
              Name <span class="sort-icon">{{ sortArrow('name') }}</span>
            </th>
            <th class="col-notes" @click="sortBy('notes')">
              Annotation <span class="sort-icon">{{ sortArrow('notes') }}</span>
            </th>
            <th class="col-type" @click="sortBy('mime_type')">
              Type <span class="sort-icon">{{ sortArrow('mime_type') }}</span>
            </th>
            <th class="col-date" @click="sortBy('created_at')">
              Modification date
              <span class="sort-icon">
                <svg v-if="sortCol === 'created_at' && sortDir < 0" viewBox="0 0 10 12" fill="currentColor" width="10" height="12"><path d="M5 12L0 5h10zM5 0l5 5H0z" opacity=".3"/><path d="M5 12L0 5h10z"/></svg>
                <svg v-else-if="sortCol === 'created_at'" viewBox="0 0 10 12" fill="currentColor" width="10" height="12"><path d="M5 12L0 5h10zM5 0l5 5H0z" opacity=".3"/><path d="M5 0l5 5H0z"/></svg>
                <svg v-else viewBox="0 0 10 12" fill="currentColor" width="10" height="12" opacity=".35"><path d="M5 12L0 5h10zM5 0l5 5H0z"/></svg>
              </span>
            </th>
            <th class="col-action">Action</th>
          </tr>
        </thead>
        <tbody>

          <!-- Loading -->
          <tr v-if="store.loading">
            <td colspan="6" class="td-state"><span class="spin">⟳</span> Loading…</td>
          </tr>

          <!-- Empty -->
          <tr v-else-if="visibleItems.length === 0 && !searchQuery && !filterType">
            <td colspan="6" class="td-state td-empty">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" width="36" height="36"><path d="M8 12h32v28H8zM16 12V8h16v4"/></svg>
              <span>No files yet. Upload a file or create a folder.</span>
            </td>
          </tr>

          <!-- No results -->
          <tr v-else-if="visibleItems.length === 0">
            <td colspan="6" class="td-state">No results for "{{ searchQuery || filterType }}"</td>
          </tr>

          <!-- Parent (..) row -->
          <tr v-if="currentFolder" class="fm-row fm-row-parent" @dblclick="goUp">
            <td class="col-check"></td>
            <td class="col-name">
              <div class="cell-name">
                <span class="file-thumb folder-thumb">
                  <svg viewBox="0 0 20 16" fill="#f5a623" width="18" height="15"><path d="M0 3a2 2 0 012-2h5.586a1 1 0 01.707.293L9.707 2.707A1 1 0 0010.414 3H18a2 2 0 012 2v9a2 2 0 01-2 2H2a2 2 0 01-2-2V3z"/></svg>
                </span>
                <span class="fname">..</span>
              </div>
            </td>
            <td></td><td class="col-type-cell muted">Go up one level</td><td></td><td></td>
          </tr>

          <!-- Rows -->
          <tr
            v-for="item in visibleItems"
            :key="(item.isFolder ? 'f-' : 'file-') + item.id"
            class="fm-row"
            :class="{ selected: checkedIds.has(item.id), 'fm-row-uds': isUds(item) }"
            @dblclick="item.isFolder ? enterFolder(item) : (isUds(item) ? emit('open-design', item) : null)"
          >
            <td class="col-check">
              <input type="checkbox" class="cb" :checked="checkedIds.has(item.id)"
                @change="toggleCheck(item.id)" @click.stop />
            </td>

            <td class="col-name">
              <div class="cell-name">
                <!-- Folder icon -->
                <span v-if="item.isFolder" class="file-thumb folder-thumb">
                  <svg viewBox="0 0 20 16" fill="#f5a623" width="18" height="15"><path d="M0 3a2 2 0 012-2h5.586a1 1 0 01.707.293L9.707 2.707A1 1 0 0010.414 3H18a2 2 0 012 2v9a2 2 0 01-2 2H2a2 2 0 01-2-2V3z"/></svg>
                </span>
                <!-- File icon pill -->
                <span v-else class="file-thumb" :class="thumbClass(item)">
                  {{ thumbLabel(item) }}
                </span>

                <!-- Rename in-place -->
                <span v-if="renamingId !== item.id" class="fname" :title="item.isFolder ? item.name : item.original_name">
                  {{ item.isFolder ? item.name : item.original_name }}
                </span>
                <input
                  v-else
                  v-model="renameText"
                  class="rename-input"
                  @keyup.enter="confirmRename(item)"
                  @keyup.escape="renamingId = null"
                  @blur="confirmRename(item)"
                  ref="renameInputEl"
                  @click.stop
                />
                <!-- UDS open link -->
                <button v-if="isUds(item) && renamingId !== item.id"
                  class="uds-open-btn"
                  @click.stop="emit('open-design', item)"
                  title="Open in Design Viewer">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" width="10" height="10"><path d="M1 6s1.5-3 5-3 5 3 5 3-1.5 3-5 3-5-3-5-3z"/><circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none"/></svg>
                  Open Design
                </button>
              </div>
            </td>

            <td class="col-notes-cell">
              <span class="annotation" :title="item.notes">{{ item.notes || '' }}</span>
            </td>

            <td class="col-type-cell">{{ item.isFolder ? 'Folder' : fmtType(item.mime_type, item.original_name) }}</td>

            <td class="col-date-cell">{{ fmtDate(item.created_at) }}</td>

            <td class="col-action-cell" @click.stop>
              <button class="action-btn" @click.stop="openMenu($event, item)" title="More options">
                <svg viewBox="0 0 16 4" fill="currentColor" width="16" height="4"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/></svg>
              </button>
            </td>
          </tr>

        </tbody>
      </table>
    </div>

    <!-- ── Status bar ─────────────────────────────────────────────────────── -->
    <div class="fm-statusbar">
      <span>
        <template v-if="checkedIds.size > 0">{{ checkedIds.size }} selected · </template>
        {{ store.total }} file{{ store.total !== 1 ? 's' : '' }}{{ folders.length ? `, ${folders.length} folder${folders.length !== 1 ? 's' : ''}` : '' }}
      </span>
      <span v-if="store.totalSize" class="status-size">{{ fmtSize(store.totalSize) }}</span>
    </div>

    <!-- ── Context Menu ────────────────────────────────────────────────────── -->
    <teleport to="body">
      <transition name="ctx">
        <div
          v-if="menu.open"
          class="ctx-menu"
          :style="{ top: menu.y + 'px', left: menu.x + 'px' }"
          @click.stop
        >
          <template v-if="menu.item?.isFolder">
            <button class="ctx-item" @click="doAction('open')">Open</button>
            <button class="ctx-item" @click="doAction('rename')">Rename</button>
            <div class="ctx-sep"/>
            <button class="ctx-item ctx-danger" @click="doAction('delete')">Delete</button>
          </template>
          <template v-else>
            <button v-if="isUds(menu.item)" class="ctx-item ctx-item-design" @click="doAction('open')">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M1 6s1.5-3 5-3 5 3 5 3-1.5 3-5 3-5-3-5-3z"/><circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none"/></svg>
              Open Design
            </button>
            <button v-else class="ctx-item" @click="doAction('open')">Open</button>
            <button class="ctx-item" @click="doAction('download')">Download</button>
            <button class="ctx-item" @click="doAction('saveas')">Save As..</button>
            <button class="ctx-item" @click="doAction('rename')">Rename</button>
            <button class="ctx-item" @click="doAction('moveto')">Move to..</button>
            <button class="ctx-item" @click="doAction('notes')">Edit Annotation</button>
            <div class="ctx-sep"/>
            <button class="ctx-item ctx-danger" @click="doAction('delete')">Delete</button>
          </template>
        </div>
      </transition>
    </teleport>

    <!-- ── New Folder modal ───────────────────────────────────────────────── -->
    <teleport to="body">
      <div v-if="showNewFolder" class="modal-backdrop" @click.self="showNewFolder = false">
        <div class="modal">
          <div class="modal-hd">
            <span>Create New Folder</span>
            <button class="modal-close" @click="showNewFolder = false">✕</button>
          </div>
          <div class="modal-bd">
            <label class="field-label">Folder name</label>
            <input v-model="newFolderName" class="field-input" placeholder="Untitled Folder"
              @keyup.enter="createFolder" ref="folderNameInput" />
          </div>
          <div class="modal-ft">
            <button class="btn-ghost" @click="showNewFolder = false">Cancel</button>
            <button class="btn-primary" @click="createFolder" :disabled="!newFolderName.trim()">Create</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ── Annotation modal ───────────────────────────────────────────────── -->
    <teleport to="body">
      <div v-if="notesTarget" class="modal-backdrop" @click.self="closeNotes">
        <div class="modal">
          <div class="modal-hd">
            <span>Edit Annotation</span>
            <button class="modal-close" @click="closeNotes">✕</button>
          </div>
          <div class="modal-bd">
            <label class="field-label">{{ notesTarget.original_name }}</label>
            <textarea v-model="notesText" class="field-textarea" placeholder="Add a note about this file…" rows="4" />
          </div>
          <div class="modal-ft">
            <button class="btn-ghost" @click="closeNotes">Cancel</button>
            <button class="btn-primary" @click="saveNotes" :disabled="store.saving">
              {{ store.saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ── Move To modal ──────────────────────────────────────────────────── -->
    <teleport to="body">
      <div v-if="moveTarget" class="modal-backdrop" @click.self="moveTarget = null">
        <div class="modal">
          <div class="modal-hd">
            <span>Move to…</span>
            <button class="modal-close" @click="moveTarget = null">✕</button>
          </div>
          <div class="modal-bd">
            <label class="field-label">Select destination</label>
            <div class="move-list">
              <button class="move-opt" :class="{ active: moveDestId === null }" @click="moveDestId = null">
                <svg viewBox="0 0 20 16" fill="#f5a623" width="16" height="13"><path d="M0 3a2 2 0 012-2h5.586a1 1 0 01.707.293L9.707 2.707A1 1 0 0010.414 3H18a2 2 0 012 2v9a2 2 0 01-2 2H2a2 2 0 01-2-2V3z"/></svg>
                Home (root)
              </button>
              <button v-for="f in folders" :key="f.id"
                class="move-opt"
                :class="{ active: moveDestId === f.id }"
                @click="moveDestId = f.id">
                <svg viewBox="0 0 20 16" fill="#f5a623" width="16" height="13"><path d="M0 3a2 2 0 012-2h5.586a1 1 0 01.707.293L9.707 2.707A1 1 0 0010.414 3H18a2 2 0 012 2v9a2 2 0 01-2 2H2a2 2 0 01-2-2V3z"/></svg>
                {{ f.name }}
              </button>
            </div>
          </div>
          <div class="modal-ft">
            <button class="btn-ghost" @click="moveTarget = null">Cancel</button>
            <button class="btn-primary" @click="confirmMove">Move Here</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ── Toast ──────────────────────────────────────────────────────────── -->
    <teleport to="body">
      <transition name="toast">
        <div v-if="toast" class="fm-toast" :class="toast.type">{{ toast.message }}</div>
      </transition>
    </teleport>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { useFilesStore } from '../stores/useFilesStore.js';

const emit  = defineEmits(['download', 'open-design']);
const store = useFilesStore();

// ── State ─────────────────────────────────────────────────────────────────────
const dragging      = ref(false);
const fileInput     = ref(null);
const lastError     = ref(null);
const toast         = ref(null);
const searchQuery   = ref('');
const filterType    = ref('');

// Folders (client-side, virtual)
const folders       = ref([]);
const currentFolder = ref(null);
const breadcrumbs   = ref([]);

// Sort
const sortCol = ref('created_at');
const sortDir = ref(-1);

// Selection (checkboxes)
const checkedIds = ref(new Set());

// Rename
const renamingId    = ref(null);
const renameText    = ref('');
const renameInputEl = ref(null);

// Context menu
const menu = ref({ open: false, x: 0, y: 0, item: null });

// Modals
const showNewFolder   = ref(false);
const newFolderName   = ref('');
const folderNameInput = ref(null);
const notesTarget     = ref(null);
const notesText       = ref('');
const moveTarget      = ref(null);
const moveDestId      = ref(null);

// ── Computed ──────────────────────────────────────────────────────────────────

const currentSubFolders = computed(() => {
  const cid = currentFolder.value?.id ?? null;
  return folders.value.filter(f => (f.parent_id ?? null) === cid);
});

const currentFiles = computed(() => {
  const cid = currentFolder.value?.id ?? null;
  return store.files.filter(f => (f.folder_id ?? null) === cid);
});

const visibleItems = computed(() => {
  let fItems = currentSubFolders.value.map(f => ({ ...f, isFolder: true }));
  let files  = currentFiles.value.map(f => ({ ...f, isFolder: false }));

  // Search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    fItems = fItems.filter(f => f.name.toLowerCase().includes(q));
    files  = files.filter(f =>
      (f.original_name || '').toLowerCase().includes(q) ||
      (f.notes || '').toLowerCase().includes(q)
    );
  }

  // Type filter
  if (filterType.value) {
    if (filterType.value === 'folder') {
      files = [];
    } else {
      fItems = [];
      files  = files.filter(f => typeCategory(f.mime_type, f.original_name) === filterType.value);
    }
  }

  const all = [...fItems, ...files];
  return all.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    const av = a[sortCol.value] ?? '';
    const bv = b[sortCol.value] ?? '';
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * sortDir.value;
  });
});

const allChecked = computed(() =>
  visibleItems.value.length > 0 &&
  visibleItems.value.every(i => checkedIds.value.has(i.id))
);

// ── Sorting ───────────────────────────────────────────────────────────────────
function sortBy(col) {
  sortDir.value  = (sortCol.value === col) ? sortDir.value * -1 : 1;
  sortCol.value  = col;
}
function sortArrow(col) {
  if (sortCol.value !== col) return '↕';
  return sortDir.value > 0 ? '↑' : '↓';
}

// ── Checkboxes ────────────────────────────────────────────────────────────────
function toggleCheck(id) {
  const s = new Set(checkedIds.value);
  s.has(id) ? s.delete(id) : s.add(id);
  checkedIds.value = s;
}
function toggleAll() {
  if (allChecked.value) {
    checkedIds.value = new Set();
  } else {
    checkedIds.value = new Set(visibleItems.value.map(i => i.id));
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function goRoot()        { currentFolder.value = null; breadcrumbs.value = []; }
function goUp()          { if (!breadcrumbs.value.length) return; currentFolder.value = breadcrumbs.value[breadcrumbs.value.length - 2] ?? null; breadcrumbs.value = breadcrumbs.value.slice(0, -1); }
function enterFolder(f)  { currentFolder.value = f; breadcrumbs.value = [...breadcrumbs.value, f]; }
function goFolder(crumb) { const i = breadcrumbs.value.findIndex(b => b.id === crumb.id); currentFolder.value = crumb; breadcrumbs.value = breadcrumbs.value.slice(0, i + 1); }

// ── Create Folder ─────────────────────────────────────────────────────────────
watch(showNewFolder, v => { if (v) nextTick(() => folderNameInput.value?.focus()); });

function createFolder() {
  const name = newFolderName.value.trim();
  if (!name) return;
  folders.value.push({ id: Date.now(), name, parent_id: currentFolder.value?.id ?? null, created_at: new Date().toISOString() });
  showNewFolder.value = false;
  newFolderName.value = '';
  showToast(`Folder "${name}" created`, 'success');
}

// ── Upload ────────────────────────────────────────────────────────────────────
async function onPickFiles(e) {
  for (const f of Array.from(e.target.files || [])) await doUpload(f);
  if (fileInput.value) fileInput.value.value = '';
}
async function onDrop(e) {
  dragging.value = false;
  for (const f of Array.from(e.dataTransfer?.files || [])) await doUpload(f);
}
async function doUpload(file) {
  if (!file.name.toLowerCase().endsWith('.uds')) {
    showError(`Only .uds design files can be uploaded. "${file.name}" was skipped.`);
    return;
  }
  try {
    const entry = await store.upload(file);
    if (entry && currentFolder.value) entry.folder_id = currentFolder.value.id;
    showToast(`Uploaded "${file.name}"`, 'success');
  } catch (e) {
    const msg = e?.message || String(e) || 'Unknown error';
    console.error('[FileManager] upload failed:', e);
    showError(`Upload failed for "${file.name}": ${msg}`);
  }
}

// ── Context menu ──────────────────────────────────────────────────────────────
function openMenu(event, item) {
  const btn  = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const menuW = 180, menuH = item.isFolder ? 110 : 240;
  let x = rect.right - menuW;
  let y = rect.bottom + 4;
  if (x < 8) x = 8;
  if (y + menuH > window.innerHeight) y = rect.top - menuH - 4;
  menu.value = { open: true, x, y, item };
}
function closeMenu() { menu.value.open = false; }

async function doAction(action) {
  const item = menu.value.item;
  closeMenu();
  if (!item) return;

  if (action === 'open')     { item.isFolder ? enterFolder(item) : (isUds(item) ? emit('open-design', item) : emit('download', item)); return; }
  if (action === 'download' || action === 'saveas') { emit('download', item); return; }
  if (action === 'rename')   { startRename(item); return; }
  if (action === 'notes')    { notesTarget.value = item; notesText.value = item.notes || ''; return; }
  if (action === 'moveto')   { moveTarget.value = item; moveDestId.value = item.folder_id ?? null; return; }

  if (action === 'delete') {
    if (item.isFolder) {
      folders.value = folders.value.filter(f => f.id !== item.id);
      showToast('Folder deleted', 'info');
    } else {
      try { await store.remove(item.id); showToast('File deleted', 'info'); }
      catch (e) { showError(`Delete failed: ${e?.message || e}`); }
    }
  }
}

// ── Rename ────────────────────────────────────────────────────────────────────
function startRename(item) {
  renamingId.value = item.id;
  renameText.value = item.isFolder ? item.name : item.original_name;
  nextTick(() => {
    const el = Array.isArray(renameInputEl.value) ? renameInputEl.value[0] : renameInputEl.value;
    el?.focus(); el?.select();
  });
}
async function confirmRename(item) {
  const name = renameText.value.trim();
  renamingId.value = null;
  if (!name) return;
  if (item.isFolder) {
    const f = folders.value.find(f => f.id === item.id);
    if (f) { f.name = name; showToast(`Renamed to "${name}"`, 'success'); }
  } else {
    const f = store.files.find(f => f.id === item.id);
    if (f) { f.original_name = name; showToast(`Renamed to "${name}"`, 'success'); }
  }
}

// ── Move To ───────────────────────────────────────────────────────────────────
function confirmMove() {
  if (!moveTarget.value) return;
  const file = store.files.find(f => f.id === moveTarget.value.id);
  if (file) file.folder_id = moveDestId.value;
  const dest = moveDestId.value ? folders.value.find(f => f.id === moveDestId.value)?.name || 'folder' : 'Home';
  showToast(`Moved to ${dest}`, 'success');
  moveTarget.value = null;
}

// ── Annotation ────────────────────────────────────────────────────────────────
function closeNotes() { notesTarget.value = null; notesText.value = ''; }
async function saveNotes() {
  try {
    await store.updateNotes(notesTarget.value.id, notesText.value.trim() || null);
    showToast('Annotation saved', 'success');
    closeNotes();
  } catch (e) { showError(`Failed to save: ${e?.message || e}`); }
}

// ── Type helpers ──────────────────────────────────────────────────────────────
function typeCategory(mime, name) {
  if (!mime) {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(ext)) return 'image';
    if (['doc','docx','pdf','odt','rtf'].includes(ext)) return 'document';
    if (['xls','xlsx','csv','ods'].includes(ext)) return 'spreadsheet';
    if (['txt','md','json','xml','yaml','yml','log'].includes(ext)) return 'text';
    if (['zip','rar','tar','gz','7z'].includes(ext)) return 'archive';
    return 'other';
  }
  if (mime.startsWith('image/'))  return 'image';
  if (mime.startsWith('video/'))  return 'other';
  if (mime.startsWith('audio/'))  return 'other';
  if (mime === 'application/pdf' || mime.includes('word') || mime.includes('opendocument.text')) return 'document';
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') return 'spreadsheet';
  if (mime.startsWith('text/'))   return 'text';
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) return 'archive';
  return 'other';
}

function fmtType(mime, name) {
  const cat = typeCategory(mime, name);
  if (!mime) {
    const ext = (name || '').split('.').pop().toUpperCase();
    return ext ? `${ext} file` : 'File';
  }
  const map = {
    'application/pdf': 'PDF document',
    'image/png': 'PNG image', 'image/jpeg': 'JPEG image',
    'image/gif': 'GIF image', 'image/webp': 'WebP image',
    'image/svg+xml': 'SVG image',
    'text/plain': 'Text file', 'text/markdown': 'Markdown',
    'text/csv': 'CSV spreadsheet', 'application/json': 'JSON file',
    'application/zip': 'ZIP archive',
  };
  if (map[mime]) return map[mime];
  if (mime.startsWith('image/')) return 'Image';
  if (mime.startsWith('video/')) return 'Video';
  if (mime.startsWith('audio/')) return 'Audio';
  if (mime.includes('word'))     return 'Word document';
  if (mime.includes('sheet') || mime.includes('excel')) return 'Spreadsheet';
  return mime.split('/')[1]?.toUpperCase() || 'File';
}

// Thumb label + colour class for file type pill
function thumbLabel(item) {
  if (!item.mime_type) {
    const ext = (item.original_name || '').split('.').pop().toUpperCase();
    return ext.slice(0, 4) || 'FILE';
  }
  const map = {
    'application/pdf': 'PDF',
    'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/gif': 'GIF',
    'image/webp': 'WEBP', 'image/svg+xml': 'SVG',
    'text/plain': 'TXT', 'text/markdown': 'MD',
    'text/csv': 'CSV', 'application/json': 'JSON',
    'application/zip': 'ZIP',
  };
  if (map[item.mime_type]) return map[item.mime_type];
  if (item.mime_type.startsWith('image/')) return 'IMG';
  if (item.mime_type.startsWith('video/')) return 'VID';
  if (item.mime_type.startsWith('audio/')) return 'AUD';
  if (item.mime_type.includes('word'))     return 'DOC';
  if (item.mime_type.includes('sheet') || item.mime_type.includes('excel')) return 'XLS';
  return 'FILE';
}

function thumbClass(item) {
  const cat = typeCategory(item.mime_type, item.original_name);
  return {
    'thumb-image':    cat === 'image',
    'thumb-doc':      cat === 'document',
    'thumb-sheet':    cat === 'spreadsheet',
    'thumb-text':     cat === 'text',
    'thumb-archive':  cat === 'archive',
    'thumb-other':    cat === 'other',
  };
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  const units = ['B','KB','MB','GB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < 3) { v /= 1024; i++; }
  return `${v.toFixed(i ? 1 : 0)} ${units[i]}`;
}
function fmtDate(dt) {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return dt; }
}

function isUds(item) {
  return !item.isFolder && (item.original_name || '').toLowerCase().endsWith('.uds');
}

function showToast(message, type = 'info') {
  toast.value = { message, type };
  setTimeout(() => { toast.value = null; }, 3000);
}
function showError(msg) { lastError.value = msg; console.error('[FileManager]', msg); }
</script>

<style scoped>
/* ── Root ── */
.fm {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #1a1a2e;
  position: relative;
}

/* ── Top bar ── */
.fm-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .55rem 1rem;
  background: #f8f9fb;
  border-bottom: 1px solid #e2e4ea;
  flex-shrink: 0;
  gap: .75rem;
  flex-wrap: wrap;
}

.fm-breadcrumb {
  display: flex;
  align-items: center;
  gap: .25rem;
  font-size: .82rem;
  color: #555;
  min-width: 120px;
}
.crumb {
  background: none;
  border: none;
  color: #555;
  font-size: .82rem;
  cursor: pointer;
  padding: .2rem .3rem;
  border-radius: 4px;
}
.crumb:hover { background: #e8eaf0; color: #1a1a2e; }
.root-crumb   { font-weight: 600; color: #1a1a2e; }
.crumb-sep    { color: #aaa; font-size: .75rem; }

.fm-controls {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
}

/* Search */
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: .55rem;
  width: 14px; height: 14px;
  color: #999;
  pointer-events: none;
}
.search-input {
  height: 32px;
  padding: 0 .75rem 0 2rem;
  border: 1px solid #d0d3de;
  border-radius: 6px;
  background: #fff;
  font-size: .82rem;
  color: #1a1a2e;
  width: 200px;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.search-input:focus { border-color: #0066A6; box-shadow: 0 0 0 3px rgba(79,124,255,.15); }
.search-input::-webkit-search-cancel-button { cursor: pointer; }

/* Filter select */
.filter-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.filter-select {
  height: 32px;
  padding: 0 2rem 0 .65rem;
  border: 1px solid #d0d3de;
  border-radius: 6px;
  background: #fff;
  font-size: .82rem;
  color: #1a1a2e;
  appearance: none;
  cursor: pointer;
  outline: none;
  transition: border-color .15s;
}
.filter-select:focus { border-color: #0066A6; }
.select-chevron {
  position: absolute;
  right: .55rem;
  width: 10px; height: 6px;
  color: #777;
  pointer-events: none;
}

/* Toolbar buttons */
.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  height: 32px;
  padding: 0 .85rem;
  border-radius: 6px;
  font-size: .82rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
  border: 1px solid transparent;
}
.tb-btn svg { width: 13px; height: 13px; flex-shrink: 0; }
.tb-btn input { display: none; }

.tb-create {
  background: #fff;
  border-color: #d0d3de;
  color: #1a1a2e;
}
.tb-create:hover { background: #f0f1f8; border-color: #b0b3c6; }

.tb-upload {
  background: #0066A6;
  border-color: #0066A6;
  color: #fff;
}
.tb-upload:hover { background: #3a68ff; border-color: #3a68ff; }

/* ── Drop overlay ── */
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(240,242,255,.9);
  border: 2px dashed #0066A6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: .75rem;
  color: #0066A6;
  font-size: 1rem;
  font-weight: 600;
  pointer-events: none;
  opacity: 0;
  transition: opacity .18s;
}
.drop-overlay.active { opacity: 1; pointer-events: all; }
.drop-icon { width: 40px; height: 40px; }

/* ── Error ── */
.fm-error {
  display: flex;
  align-items: flex-start;
  gap: .5rem;
  padding: .55rem 1rem;
  background: #fff3f3;
  border-bottom: 1px solid #fcc;
  color: #c0392b;
  font-size: .8rem;
  flex-shrink: 0;
}
.fm-error pre { flex: 1; white-space: pre-wrap; word-break: break-all; font-family: inherit; margin: 0; }
.fm-error button { background: none; border: none; color: inherit; cursor: pointer; font-size: .95rem; flex-shrink: 0; }

/* ── Table wrap ── */
.fm-table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  min-height: 0;
  background: #fff;
}

/* ── Table ── */
.fm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .84rem;
  table-layout: fixed;
}

.fm-table thead tr {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f8f9fb;
}

.fm-table th {
  padding: .55rem .75rem;
  text-align: left;
  font-size: .75rem;
  font-weight: 700;
  color: #1a1a2e;
  border-bottom: 2px solid #c0c4d8;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color .12s;
}
.fm-table th:hover { color: #1a1a2e; }
.sort-icon { font-size: .7rem; margin-left: .2rem; opacity: .6; }

/* Column widths */
.col-check  { width: 36px; padding: .55rem .5rem .55rem .75rem !important; cursor: default !important; }
.col-name   { width: auto; min-width: 200px; }
.col-notes  { width: 22%; }
.col-type   { width: 14%; }
.col-date   { width: 18%; }
.col-action { width: 72px; text-align: center !important; cursor: default !important; }

/* ── Rows ── */
.fm-row td {
  padding: .48rem .75rem;
  border-bottom: 1px solid #f0f1f5;
  color: #1a1a2e;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fm-row:last-child td { border-bottom: none; }
.fm-row:hover td { background: #f5f6ff; }
.fm-row.selected td { background: #eef1ff; }
.fm-row-parent td { cursor: pointer; color: #1a1a2e; font-size: .8rem; }
.muted { color: #555 !important; font-size: .78rem !important; }

/* Checkbox */
.cb {
  width: 15px;
  height: 15px;
  accent-color: #0066A6;
  cursor: pointer;
}

/* Name cell */
.cell-name {
  display: flex;
  align-items: center;
  gap: .6rem;
  min-width: 0;
}
.fname {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: #1a1a2e;
}

/* File type pills */
.file-thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 20px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .03em;
  flex-shrink: 0;
  color: #fff;
}
.folder-thumb  { background: transparent; color: transparent; width: 20px; padding: 0; }
.thumb-image   { background: #10b981; }
.thumb-doc     { background: #3b82f6; }
.thumb-sheet   { background: #38A169; }
.thumb-text    { background: #8b5cf6; }
.thumb-archive { background: #D97706; }
.thumb-other   { background: #6b7280; }

/* Annotation cell */
.col-notes-cell { color: #333; font-style: italic; font-size: .8rem; }
.annotation { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Type / date cells */
.col-type-cell { color: #222; font-size: .8rem; }
.col-date-cell { color: #333; font-size: .79rem; font-variant-numeric: tabular-nums; }
.col-action-cell { text-align: center; }

/* Action button — always visible */
.action-btn {
  background: none;
  border: 1px solid #d0d3de;
  border-radius: 4px;
  color: #666;
  width: 28px;
  height: 24px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .12s;
  opacity: 1;
  font-size: .85rem;
}
.action-btn:hover { background: #e8eaf0; border-color: #aaa; color: #333; }

/* Empty / loading */
.td-state {
  text-align: center !important;
  padding: 3rem 1rem !important;
  color: #555 !important;
}
.td-empty > * { display: block; margin: 0 auto .5rem; color: #888; }
.spin { display: inline-block; animation: spin 1s linear infinite; font-size: 1.2rem; }
@keyframes spin { to { transform: rotate(360deg); } }

/* UDS design open button */
.uds-open-btn {
  display: inline-flex;
  align-items: center;
  gap: .3rem;
  padding: .15rem .5rem;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 4px;
  color: #0066A6;
  font-size: .7rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all .13s;
  opacity: 0;
}
.fm-row:hover .uds-open-btn,
.fm-row.selected .uds-open-btn { opacity: 1; }
.uds-open-btn:hover { background: #0066A6; color: #fff; border-color: #0066A6; }
.fm-row-uds .fname { color: #0066A6; }

/* Rename input */
.rename-input {
  background: #fff;
  border: 1px solid #0066A6;
  border-radius: 4px;
  color: #1a1a2e;
  font-size: .84rem;
  padding: .15rem .4rem;
  width: 100%;
  outline: none;
  box-shadow: 0 0 0 2px rgba(79,124,255,.2);
}

/* ── Status bar ── */
.fm-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .3rem 1rem;
  background: #f8f9fb;
  border-top: 1px solid #e2e4ea;
  font-size: .74rem;
  color: #444;
  flex-shrink: 0;
}
.status-size { font-variant-numeric: tabular-nums; }

/* ── Context menu ── */
.ctx-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #dde0ea;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0,0,0,.14), 0 2px 6px rgba(0,0,0,.08);
  padding: 4px;
  min-width: 168px;
}
.ctx-enter-active { animation: ctx-in .12s ease; }
.ctx-leave-active { animation: ctx-in .1s ease reverse; }
@keyframes ctx-in { from { opacity:0; transform: scale(.95) translateY(-4px); } }

.ctx-item {
  display: block;
  width: 100%;
  padding: .4rem .8rem;
  background: none;
  border: none;
  color: #1a1a2e;
  font-size: .84rem;
  text-align: left;
  cursor: pointer;
  border-radius: 5px;
  transition: background .1s;
}
.ctx-item:hover { background: #f0f2ff; }
.ctx-item.ctx-danger { color: #c0392b; }
.ctx-item.ctx-danger:hover { background: #fff0f0; }
.ctx-item.ctx-item-design { color: #0066A6; font-weight: 600; }
.ctx-item.ctx-item-design:hover { background: #eef2ff; }
.ctx-sep { height: 1px; background: #eee; margin: 3px 6px; }

/* ── Modals ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.modal {
  background: #fff;
  border: 1px solid #dde0ea;
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 16px 56px rgba(0,0,0,.18);
  overflow: hidden;
  animation: modal-in .16s ease;
}
@keyframes modal-in { from { opacity:0; transform: scale(.96) translateY(8px); } }

.modal-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .85rem 1.1rem;
  border-bottom: 1px solid #eee;
  font-weight: 600;
  font-size: .9rem;
  color: #1a1a2e;
}
.modal-close { background: none; border: none; color: #999; cursor: pointer; font-size: 1rem; transition: color .12s; }
.modal-close:hover { color: #333; }
.modal-bd { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: .5rem; }
.modal-ft { display: flex; gap: .5rem; justify-content: flex-end; padding: .8rem 1.1rem; border-top: 1px solid #eee; }

.field-label { font-size: .78rem; color: #666; font-weight: 500; }
.field-input {
  width: 100%;
  height: 36px;
  padding: 0 .75rem;
  border: 1px solid #d0d3de;
  border-radius: 6px;
  font-size: .875rem;
  color: #1a1a2e;
  background: #fff;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.field-input:focus { border-color: #0066A6; box-shadow: 0 0 0 3px rgba(79,124,255,.15); }

.field-textarea {
  width: 100%;
  padding: .5rem .75rem;
  border: 1px solid #d0d3de;
  border-radius: 6px;
  font-size: .875rem;
  color: #1a1a2e;
  background: #fff;
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color .15s, box-shadow .15s;
}
.field-textarea:focus { border-color: #0066A6; box-shadow: 0 0 0 3px rgba(79,124,255,.15); }

.btn-ghost {
  height: 34px;
  padding: 0 1rem;
  background: #fff;
  border: 1px solid #d0d3de;
  border-radius: 6px;
  font-size: .84rem;
  color: #555;
  cursor: pointer;
  transition: all .15s;
}
.btn-ghost:hover { background: #f5f6ff; border-color: #b0b3c6; color: #1a1a2e; }

.btn-primary {
  height: 34px;
  padding: 0 1rem;
  background: #0066A6;
  border: 1px solid #0066A6;
  border-radius: 6px;
  font-size: .84rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all .15s;
}
.btn-primary:hover:not(:disabled) { background: #3a68ff; }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }

/* Move list */
.move-list { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow-y: auto; }
.move-opt {
  display: flex;
  align-items: center;
  gap: .5rem;
  width: 100%;
  padding: .45rem .6rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: .85rem;
  color: #1a1a2e;
  cursor: pointer;
  text-align: left;
  transition: all .1s;
}
.move-opt:hover { background: #f5f6ff; border-color: #dde0ea; }
.move-opt.active { background: #eef1ff; border-color: #0066A6; font-weight: 500; }

/* ── Toast ── */
.fm-toast {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  padding: .55rem 1rem;
  border-radius: 8px;
  font-size: .82rem;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
}
.fm-toast.success { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
.fm-toast.error   { background: #fff0f0; border: 1px solid #fca5a5; color: #991b1b; }
.fm-toast.info    { background: #f0f4ff; border: 1px solid #a5b4fc; color: #3730a3; }
.toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toast-enter-from,   .toast-leave-to     { opacity: 0; transform: translateY(6px); }
</style>

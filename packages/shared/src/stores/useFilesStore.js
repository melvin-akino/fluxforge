import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/index.js';

export const useFilesStore = defineStore('files', () => {
  const files   = ref([]);
  const loading = ref(false);
  const saving  = ref(false);
  const error   = ref(null);
  const selected = ref(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  const total      = computed(() => files.value.length);
  const totalSize  = computed(() => files.value.reduce((s, f) => s + (f.size || 0), 0));

  // ── Actions ────────────────────────────────────────────────────────────────
  async function fetchAll() {
    loading.value = true; error.value = null;
    try { files.value = await api.listFiles(); }
    catch (e) { error.value = e.message; }
    finally { loading.value = false; }
  }

  async function upload(fileOrPath) {
    saving.value = true; error.value = null;
    try {
      const entry = await api.uploadFile(fileOrPath);
      files.value.unshift(entry);
      return entry;
    } catch (e) { error.value = e.message; throw e; }
    finally { saving.value = false; }
  }

  async function copy(id) {
    saving.value = true; error.value = null;
    try {
      const entry = await api.copyFile(id);
      files.value.unshift(entry);
      return entry;
    } catch (e) { error.value = e.message; throw e; }
    finally { saving.value = false; }
  }

  async function updateNotes(id, notes) {
    saving.value = true; error.value = null;
    try {
      const updated = await api.updateFileNotes(id, notes);
      const idx = files.value.findIndex(f => f.id === id);
      if (idx !== -1) files.value[idx] = updated;
      if (selected.value?.id === id) selected.value = updated;
      return updated;
    } catch (e) { error.value = e.message; throw e; }
    finally { saving.value = false; }
  }

  async function remove(id) {
    saving.value = true; error.value = null;
    try {
      await api.deleteFile(id);
      files.value = files.value.filter(f => f.id !== id);
      if (selected.value?.id === id) selected.value = null;
    } catch (e) { error.value = e.message; throw e; }
    finally { saving.value = false; }
  }

  function selectFile(f) { selected.value = f ? { ...f } : null; }
  function clearError()  { error.value = null; }

  return {
    files, loading, saving, error, selected,
    total, totalSize,
    fetchAll, upload, copy, updateNotes, remove, selectFile, clearError,
  };
});

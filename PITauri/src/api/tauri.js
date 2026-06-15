import { invoke } from '@tauri-apps/api/core';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const tauriApi = {
  // Files
  listFiles() { return invoke('get_all_files'); },

  async uploadFile(file) {
    const base64   = await fileToBase64(file);
    const mimeType = file.type || null;
    return invoke('import_file_base64', {
      originalName: file.name,
      base64Data:   base64,
      mimeType,
    });
  },

  copyFile(id)               { return invoke('copy_file',         { id }); },
  updateFileNotes(id, notes) { return invoke('update_file_notes', { id, notes }); },
  deleteFile(id)             { return invoke('delete_file',       { id }); },
  getUploadDir()             { return invoke('get_upload_dir'); },

  // Read a plain-text file from disk (used for .uds re-open)
  async fetchFileContent(storedName) {
    const uploadDir = await invoke('get_upload_dir');
    const content   = await invoke('read_file_text', { path: `${uploadDir}/${storedName}` });
    return JSON.parse(content);
  },

  fileUrl(storedName) {
    // Desktop: return a local file:// URL via the upload dir
    return `http://localhost:1420/uploads/${storedName}`;
  },
};

// Components — fall back to embedded static data until Rust command is added
Object.assign(tauriApi, {
  async getComponents(params = {}) {
    // Tauri desktop: query SQLite directly via Rust invoke when available
    try {
      return await invoke('get_components', params);
    } catch {
      // Fallback: fetch from web server if running mock-server alongside
      const BASE = 'http://localhost:8081';
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null)));
      const res = await fetch(`${BASE}/api/components${qs.toString()?'?'+qs:''}`);
      if (res.ok) return res.json();
      return [];
    }
  },
  getComponentTypes() { return this.getComponents().then(r => [...new Set(r.map(c=>c.type))].map(t=>({type:t}))); },
});

// Magnetics API — fallback to mock-server
Object.assign(tauriApi, {
  async _magReq(path, opts) {
    const BASE = 'http://localhost:8081';
    try {
      const r = await fetch(BASE+path, opts);
      if (!r.ok) return opts?.method === 'DELETE' ? null : [];
      if (r.status === 204 || r.headers.get('content-length') === '0') return null;
      return r.json();
    } catch { return opts?.method === 'DELETE' ? null : []; }
  },
  getMagCores(params={})    { const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v)).toString(); return this._magReq('/api/mag/cores'+(q?'?'+q:'')); },
  getMagBobbins()           { return this._magReq('/api/mag/bobbins'); },
  getMagMaterials()         { return this._magReq('/api/mag/materials'); },
  getMagAccessories(p={})   { const q=new URLSearchParams(Object.entries(p).filter(([,v])=>v)).toString(); return this._magReq('/api/mag/accessories'+(q?'?'+q:'')); },
  createMagCore(d)          { return this._magReq('/api/mag/cores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  updateMagCore(id,d)       { return this._magReq(`/api/mag/cores/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  deleteMagCore(id)         { return this._magReq(`/api/mag/cores/${id}`,{method:'DELETE'}); },
  createMagBobbin(d)        { return this._magReq('/api/mag/bobbins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  updateMagBobbin(id,d)     { return this._magReq(`/api/mag/bobbins/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  deleteMagBobbin(id)       { return this._magReq(`/api/mag/bobbins/${id}`,{method:'DELETE'}); },
  createMagMaterial(d)      { return this._magReq('/api/mag/materials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  updateMagMaterial(id,d)   { return this._magReq(`/api/mag/materials/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  deleteMagMaterial(id)     { return this._magReq(`/api/mag/materials/${id}`,{method:'DELETE'}); },
  createMagAccessory(d)     { return this._magReq('/api/mag/accessories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  deleteMagAccessory(id)    { return this._magReq(`/api/mag/accessories/${id}`,{method:'DELETE'}); },
  listSets()                { return this._magReq('/api/component-sets'); },
  getSet(id)                { return this._magReq(`/api/component-sets/${id}`); },
  createSet(d)              { return this._magReq('/api/component-sets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  updateSet(id,d)           { return this._magReq(`/api/component-sets/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); },
  deleteSet(id)             { return this._magReq(`/api/component-sets/${id}`,{method:'DELETE'}); },
  addToSet(setId,compId,role){ return this._magReq(`/api/component-sets/${setId}/components`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component_id:compId,role})}); },
  removeFromSet(setId,cid)  { return this._magReq(`/api/component-sets/${setId}/components/${cid}`,{method:'DELETE'}); },
  getCompatible(id)         { return this._magReq(`/api/components/${id}/compatible`); },
  addCompatible(id,cid,r)   { return this._magReq(`/api/components/${id}/compatible`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({compat_id:cid,reason:r})}); },
  removeCompatible(id,cid)  { return this._magReq(`/api/components/${id}/compatible/${cid}`,{method:'DELETE'}); },
});

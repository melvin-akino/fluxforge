// HTTP adapter — talks to Express/SQLite server via fetch().

const BASE = () => import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8081';

async function request(path, options = {}) {
  const res = await fetch(`${BASE()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  return res.json();
}

export const httpApi = {
  // Files
  listFiles() { return request('/api/files'); },

  async uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE()}/api/files`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Upload failed ${res.status}: ${await res.text()}`);
    return res.json();
  },

  copyFile(id)           { return request(`/api/files/${id}/copy`, { method: 'POST' }); },
  updateFileNotes(id, n) { return request(`/api/files/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ notes: n }) }); },
  deleteFile(id)         { return request(`/api/files/${id}`, { method: 'DELETE' }); },

  // Fetch the raw content of a stored file (for .uds re-open)
  async fetchFileContent(storedName) {
    const res = await fetch(`${BASE()}/uploads/${storedName}`);
    if (!res.ok) throw new Error(`File fetch failed ${res.status}`);
    return res.json();
  },

  fileUrl(storedName) { return `${BASE()}/uploads/${storedName}`; },
};

// Append components API (added after initial file)
Object.assign(httpApi, {
  getComponents(params = {}) {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null)));
    return request(`/api/components${qs.toString() ? '?'+qs : ''}`);
  },
  getComponentTypes() { return request('/api/components/types'); },
});

// Append full Components CRUD + Sets API
Object.assign(httpApi, {
  createComponent(data)       { return request('/api/components', { method:'POST', body:JSON.stringify(data) }); },
  updateComponent(id, data)   { return request(`/api/components/${id}`, { method:'PUT', body:JSON.stringify(data) }); },
  deleteComponent(id)         { return request(`/api/components/${id}`, { method:'DELETE' }); },
  getCompatible(id)           { return request(`/api/components/${id}/compatible`); },
  addCompatible(id, compatId, reason) { return request(`/api/components/${id}/compatible`, { method:'POST', body:JSON.stringify({compat_id:compatId,reason}) }); },
  removeCompatible(id, cid)   { return request(`/api/components/${id}/compatible/${cid}`, { method:'DELETE' }); },
  // Component Sets
  listSets()                  { return request('/api/component-sets'); },
  getSet(id)                  { return request(`/api/component-sets/${id}`); },
  createSet(data)             { return request('/api/component-sets', { method:'POST', body:JSON.stringify(data) }); },
  updateSet(id, data)         { return request(`/api/component-sets/${id}`, { method:'PUT', body:JSON.stringify(data) }); },
  deleteSet(id)               { return request(`/api/component-sets/${id}`, { method:'DELETE' }); },
  addToSet(setId, componentId, role) { return request(`/api/component-sets/${setId}/components`, { method:'POST', body:JSON.stringify({component_id:componentId,role}) }); },
  removeFromSet(setId, cid)   { return request(`/api/component-sets/${setId}/components/${cid}`, { method:'DELETE' }); },
});

// Magnetics API
Object.assign(httpApi, {
  getMagCores(params={})    { const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v)).toString(); return request('/api/mag/cores'+(q?'?'+q:'')); },
  getMagCore(id)            { return request(`/api/mag/cores/${id}`); },
  createMagCore(d)          { return request('/api/mag/cores',{method:'POST',body:JSON.stringify(d)}); },
  updateMagCore(id,d)       { return request(`/api/mag/cores/${id}`,{method:'PUT',body:JSON.stringify(d)}); },
  deleteMagCore(id)         { return request(`/api/mag/cores/${id}`,{method:'DELETE'}); },
  getMagBobbins()           { return request('/api/mag/bobbins'); },
  createMagBobbin(d)        { return request('/api/mag/bobbins',{method:'POST',body:JSON.stringify(d)}); },
  updateMagBobbin(id,d)     { return request(`/api/mag/bobbins/${id}`,{method:'PUT',body:JSON.stringify(d)}); },
  deleteMagBobbin(id)       { return request(`/api/mag/bobbins/${id}`,{method:'DELETE'}); },
  getMagMaterials()         { return request('/api/mag/materials'); },
  createMagMaterial(d)      { return request('/api/mag/materials',{method:'POST',body:JSON.stringify(d)}); },
  updateMagMaterial(id,d)   { return request(`/api/mag/materials/${id}`,{method:'PUT',body:JSON.stringify(d)}); },
  deleteMagMaterial(id)     { return request(`/api/mag/materials/${id}`,{method:'DELETE'}); },
  getMagAccessories(params={}){ const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v)).toString(); return request('/api/mag/accessories'+(q?'?'+q:'')); },
  createMagAccessory(d)     { return request('/api/mag/accessories',{method:'POST',body:JSON.stringify(d)}); },
  deleteMagAccessory(id)    { return request(`/api/mag/accessories/${id}`,{method:'DELETE'}); },
});

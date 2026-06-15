import { httpApi } from './http.js';

let _adapter = httpApi;

export function registerAdapter(adapter) { _adapter = adapter; }

export const isTauri = () =>
  typeof window !== 'undefined' && (
    import.meta.env?.VITE_IS_TAURI === 'true' ||
    '__TAURI__' in window || '__TAURI_INTERNALS__' in window
  );

// Helper: proxy every method from the adapter dynamically
// This means any method added to httpApi (or tauriApi) via Object.assign
// is automatically available here — no manual listing needed.
export const api = new Proxy({}, {
  get(_, key) {
    return (...args) => {
      if (typeof _adapter[key] === 'function') {
        return _adapter[key](...args);
      }
      throw new Error(`api.${String(key)} is not implemented in the current adapter`);
    };
  },
  has(_, key) {
    return typeof _adapter[key] === 'function';
  },
});

export default api;

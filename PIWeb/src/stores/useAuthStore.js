import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const API = '/api/auth';

function load(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function clear(key) {
  try { localStorage.removeItem(key); } catch {}
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(load('ff_token', null));
  const user  = ref(load('ff_user',  null));

  const isLoggedIn = computed(() => !!(token.value && user.value));

  function _authHeaders() {
    return { 'Content-Type': 'application/json',
             ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}) };
  }

  function _set(t, u) {
    token.value = t;
    user.value  = u;
    save('ff_token', t);
    save('ff_user',  u);
  }

  async function register(email, name, password) {
    const res  = await fetch(`${API}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    _set(data.token, data.user);
    return data.user;
  }

  async function login(email, password) {
    const res  = await fetch(`${API}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    _set(data.token, data.user);
    return data.user;
  }

  async function logout() {
    if (token.value) {
      try { await fetch(`${API}/logout`, { method: 'POST', headers: _authHeaders() }); } catch {}
    }
    token.value = null;
    user.value  = null;
    clear('ff_token');
    clear('ff_user');
  }

  async function checkSession() {
    if (!token.value) return false;
    try {
      const res = await fetch(`${API}/me`, { headers: _authHeaders() });
      if (!res.ok) { await logout(); return false; }
      const data = await res.json();
      user.value = data.user;
      save('ff_user', data.user);
      return true;
    } catch {
      return false;
    }
  }

  return { token, user, isLoggedIn, register, login, logout, checkSession };
});

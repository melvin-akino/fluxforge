<template>
  <div class="auth-root">
    <!-- Animated background circuit grid -->
    <div class="auth-bg">
      <svg class="auth-bg-svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="circuit" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M0 40 H30 M50 40 H80 M40 0 V30 M40 50 V80" stroke="#EEF2F7" stroke-width="1" fill="none"/>
            <circle cx="40" cy="40" r="3" fill="none" stroke="#EEF2F7" stroke-width="1"/>
            <circle cx="0"  cy="40" r="1.5" fill="#EEF2F7"/>
            <circle cx="80" cy="40" r="1.5" fill="#EEF2F7"/>
            <circle cx="40" cy="0"  r="1.5" fill="#EEF2F7"/>
            <circle cx="40" cy="80" r="1.5" fill="#EEF2F7"/>
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#circuit)"/>
        <!-- Glowing traces -->
        <path d="M100,150 H300 V250 H500 V150 H700" stroke="#0D7377" stroke-width="1.5" fill="none" opacity="0.2" stroke-dasharray="8,4"/>
        <path d="M50,350 H200 V450 H600 V350 H750" stroke="#38A169" stroke-width="1.5" fill="none" opacity="0.15" stroke-dasharray="6,6"/>
        <circle cx="300" cy="250" r="4" fill="#0D7377" opacity="0.4"/>
        <circle cx="500" cy="250" r="4" fill="#0D7377" opacity="0.4"/>
        <circle cx="200" cy="450" r="4" fill="#38A169" opacity="0.35"/>
        <circle cx="600" cy="450" r="4" fill="#38A169" opacity="0.35"/>
      </svg>
      <!-- Radial glow -->
      <div class="auth-glow"/>
    </div>

    <!-- Card -->
    <div class="auth-card">
      <!-- Brand -->
      <div class="auth-brand">
        <div class="auth-brand-icon">
          <svg viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="rgba(124,131,255,0.15)"/>
            <path d="M20 8 L28 20 L20 18 L20 32 L12 20 L20 22 Z" fill="#0D7377"/>
          </svg>
        </div>
        <span class="auth-brand-name">FluxForge</span>
        <span class="auth-brand-badge">WEB</span>
      </div>

      <h1 class="auth-heading">Welcome back</h1>
      <p class="auth-sub">Sign in to your account to continue</p>

      <!-- Form -->
      <form class="auth-form" @submit.prevent="submit">
        <div class="auth-field" :class="{ error: fieldErrors.email }">
          <label>Email address</label>
          <div class="auth-input-wrap">
            <svg class="input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 5l7 5 7-5"/></svg>
            <input
              v-model="form.email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              :disabled="loading"
              @input="clearFieldError('email')"
            />
          </div>
          <span v-if="fieldErrors.email" class="field-err">{{ fieldErrors.email }}</span>
        </div>

        <div class="auth-field" :class="{ error: fieldErrors.password }">
          <label>Password</label>
          <div class="auth-input-wrap">
            <svg class="input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="12" height="8" rx="2"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
            <input
              v-model="form.password"
              :type="showPw ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
              :disabled="loading"
              @input="clearFieldError('password')"
            />
            <button type="button" class="pw-toggle" @click="showPw = !showPw" tabindex="-1">
              <svg v-if="!showPw" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="15" height="15"><path d="M1 8s2-4 7-4 7 4 7 4-2 4-7 4-7-4-7-4z"/><circle cx="8" cy="8" r="2"/></svg>
              <svg v-else viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="15" height="15"><path d="M1 8s2-4 7-4 7 4 7 4-2 4-7 4-7-4-7-4z"/><circle cx="8" cy="8" r="2"/><line x1="2" y1="2" x2="14" y2="14"/></svg>
            </button>
          </div>
          <span v-if="fieldErrors.password" class="field-err">{{ fieldErrors.password }}</span>
        </div>

        <div v-if="errorMsg" class="auth-error">
          <svg viewBox="0 0 14 14" fill="currentColor" width="13" height="13"><path d="M7 0a7 7 0 100 14A7 7 0 007 0zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 017 3zm0 7.5a1 1 0 110-2 1 1 0 010 2z"/></svg>
          {{ errorMsg }}
        </div>

        <button type="submit" class="auth-submit" :disabled="loading">
          <span v-if="!loading">Sign In</span>
          <span v-else class="auth-spinner"/>
        </button>
      </form>

      <div class="auth-divider"><span>or</span></div>

      <p class="auth-switch">
        Don't have an account?
        <router-link to="/register">Create one free</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';

const router    = useRouter();
const route     = useRoute();
const authStore = useAuthStore();

const form     = reactive({ email: '', password: '' });
const loading  = ref(false);
const errorMsg = ref('');
const showPw   = ref(false);
const fieldErrors = reactive({ email: '', password: '' });

function clearFieldError(f) { fieldErrors[f] = ''; errorMsg.value = ''; }

function validate() {
  let ok = true;
  if (!form.email.trim()) { fieldErrors.email = 'Email is required'; ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { fieldErrors.email = 'Enter a valid email'; ok = false; }
  if (!form.password) { fieldErrors.password = 'Password is required'; ok = false; }
  return ok;
}

async function submit() {
  if (!validate()) return;
  loading.value  = true;
  errorMsg.value = '';
  try {
    await authStore.login(form.email, form.password);
    // Always go to welcome after login — no /design or /new-design URLs
    const redirect = route.query.redirect;
    const safe = redirect && !['/design','/new-design','/'].includes(redirect) ? redirect : '/welcome';
    router.push(safe);
  } catch (e) {
    errorMsg.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  background: #F4F6F9;
  overflow: hidden;
}

/* Background */
.auth-bg { position:absolute; inset:0; z-index:0; pointer-events:none; }
.auth-bg-svg { width:100%; height:100%; position:absolute; inset:0; }
.auth-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  width: 600px;
  height: 600px;
  background: radial-gradient(ellipse at center, rgba(124,131,255,.12) 0%, transparent 70%);
  pointer-events: none;
}

/* Card */
.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: #FFFFFF;
  border: 1px solid #D1D9E6;
  border-radius: 16px;
  padding: 2.25rem 2rem;
  box-shadow: 0 24px 64px rgba(0,0,0,.5), 0 0 0 1px rgba(124,131,255,.08);
}

/* Brand */
.auth-brand {
  display: flex;
  align-items: center;
  gap: .6rem;
  margin-bottom: 1.75rem;
}
.auth-brand-icon { width: 36px; height: 36px; flex-shrink: 0; }
.auth-brand-name { font-size: 1.05rem; font-weight: 800; color: #1A1A1A; }
.auth-brand-badge {
  font-size: .6rem; font-weight: 700; letter-spacing: .1em;
  padding: .15rem .5rem; border-radius: 999px;
  background: rgba(86,212,138,.12); color: #38A169;
  border: 1px solid rgba(86,212,138,.25);
}

/* Headings */
.auth-heading { font-size: 1.5rem; font-weight: 800; color: #1A1A1A; margin: 0 0 .3rem; letter-spacing: -.01em; }
.auth-sub     { font-size: .875rem; color: #5A6A7E; margin: 0 0 1.75rem; }

/* Form */
.auth-form { display: flex; flex-direction: column; gap: 1rem; }
.auth-field { display: flex; flex-direction: column; gap: .35rem; }
.auth-field label { font-size: .78rem; font-weight: 600; color: #8899AA; letter-spacing: .02em; }
.auth-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: .85rem;
  width: 15px; height: 15px;
  color: #8899AA;
  pointer-events: none;
  flex-shrink: 0;
}
.auth-input-wrap input {
  width: 100%;
  height: 44px;
  padding: 0 2.75rem 0 2.75rem;
  background: #FFFFFF;
  border: 1px solid #D1D9E6;
  border-radius: 8px;
  color: #1A1A1A;
  font-size: .9rem;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  font-family: inherit;
}
.auth-input-wrap input::placeholder { color: #C8D4E4; }
.auth-input-wrap input:focus {
  border-color: #0D7377;
  box-shadow: 0 0 0 3px rgba(124,131,255,.18);
}
.auth-input-wrap input:disabled { opacity: .5; cursor: not-allowed; }
.auth-field.error .auth-input-wrap input { border-color: #0D7377; }
.auth-field.error .auth-input-wrap input:focus { box-shadow: 0 0 0 3px rgba(255,107,107,.18); }
.field-err { font-size: .75rem; color: #0D7377; }

.pw-toggle {
  position: absolute;
  right: .8rem;
  background: none;
  border: none;
  color: #8899AA;
  cursor: pointer;
  padding: .2rem;
  display: flex;
  align-items: center;
  transition: color .12s;
}
.pw-toggle:hover { color: #0D7377; }

/* Error banner */
.auth-error {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .65rem .85rem;
  background: rgba(255,107,107,.1);
  border: 1px solid rgba(255,107,107,.25);
  border-radius: 8px;
  font-size: .82rem;
  color: #0D7377;
}

/* Submit */
.auth-submit {
  height: 46px;
  width: 100%;
  background: linear-gradient(135deg, #0D7377 0%, #0D7377 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: .9rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: .25rem;
  transition: all .15s;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: .01em;
  font-family: inherit;
}
.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124,131,255,.4);
}
.auth-submit:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.auth-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Divider */
.auth-divider {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin: 1.25rem 0 1rem;
  color: #C8D4E4;
  font-size: .78rem;
}
.auth-divider::before, .auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #D1D9E6;
}

/* Switch */
.auth-switch { text-align: center; font-size: .84rem; color: #5A6A7E; }
.auth-switch a { color: #0D7377; font-weight: 600; }
.auth-switch a:hover { color: #0D7377; }
</style>

<template>
  <div class="auth-root">
    <div class="auth-bg">
      <svg class="auth-bg-svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="circuit2" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M0 40 H30 M50 40 H80 M40 0 V30 M40 50 V80" stroke="#EEF2F7" stroke-width="1" fill="none"/>
            <circle cx="40" cy="40" r="3" fill="none" stroke="#EEF2F7" stroke-width="1"/>
            <circle cx="0"  cy="40" r="1.5" fill="#EEF2F7"/>
            <circle cx="80" cy="40" r="1.5" fill="#EEF2F7"/>
            <circle cx="40" cy="0"  r="1.5" fill="#EEF2F7"/>
            <circle cx="40" cy="80" r="1.5" fill="#EEF2F7"/>
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#circuit2)"/>
        <path d="M100,200 H400 V300 H700 V200" stroke="#38A169" stroke-width="1.5" fill="none" opacity="0.18" stroke-dasharray="8,4"/>
        <path d="M50,400 H300 V480 H500 V400 H750" stroke="#0D7377" stroke-width="1.5" fill="none" opacity="0.14" stroke-dasharray="6,6"/>
        <circle cx="400" cy="300" r="4" fill="#38A169" opacity="0.4"/>
        <circle cx="700" cy="200" r="4" fill="#38A169" opacity="0.3"/>
        <circle cx="300" cy="480" r="4" fill="#0D7377" opacity="0.35"/>
        <circle cx="500" cy="480" r="4" fill="#0D7377" opacity="0.35"/>
      </svg>
      <div class="auth-glow auth-glow-green"/>
    </div>

    <div class="auth-card">
      <div class="auth-brand">
        <div class="auth-brand-icon">
          <svg viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="rgba(86,212,138,0.12)"/>
            <path d="M20 8 L28 20 L20 18 L20 32 L12 20 L20 22 Z" fill="#38A169"/>
          </svg>
        </div>
        <span class="auth-brand-name">FluxForge</span>
        <span class="auth-brand-badge">WEB</span>
      </div>

      <h1 class="auth-heading">Create your account</h1>
      <p class="auth-sub">Start designing power supplies in minutes</p>

      <!-- Progress dots -->
      <div class="auth-progress">
        <div v-for="n in 3" :key="n" class="auth-prog-dot" :class="{ active: currentStep >= n, done: currentStep > n }">
          <span v-if="currentStep > n">✓</span>
          <span v-else>{{ n }}</span>
        </div>
        <div class="auth-prog-line" :style="{ width: `${((currentStep-1)/2)*100}%` }"/>
      </div>

      <form class="auth-form" @submit.prevent="submit">

        <!-- Step 1: Account -->
        <transition name="step-fade" mode="out-in">
        <div v-if="currentStep === 1" key="s1" class="auth-step">
          <div class="step-label">Step 1 — Account details</div>

          <div class="auth-field" :class="{ error: fieldErrors.name }">
            <label>Full name</label>
            <div class="auth-input-wrap">
              <svg class="input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.5-5 6-5s6 2 6 5"/></svg>
              <input v-model="form.name" type="text" placeholder="Jane Engineer" autocomplete="name" :disabled="loading" @input="clearFieldError('name')" />
            </div>
            <span v-if="fieldErrors.name" class="field-err">{{ fieldErrors.name }}</span>
          </div>

          <div class="auth-field" :class="{ error: fieldErrors.email }">
            <label>Email address</label>
            <div class="auth-input-wrap">
              <svg class="input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 5l7 5 7-5"/></svg>
              <input v-model="form.email" type="email" placeholder="you@example.com" autocomplete="email" :disabled="loading" @input="clearFieldError('email')" />
            </div>
            <span v-if="fieldErrors.email" class="field-err">{{ fieldErrors.email }}</span>
          </div>

          <button type="button" class="auth-submit" @click="nextStep" :disabled="loading">Continue</button>
        </div>
        </transition>

        <!-- Step 2: Password -->
        <transition name="step-fade" mode="out-in">
        <div v-if="currentStep === 2" key="s2" class="auth-step">
          <div class="step-label">Step 2 — Secure your account</div>

          <div class="auth-field" :class="{ error: fieldErrors.password }">
            <label>Password</label>
            <div class="auth-input-wrap">
              <svg class="input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="12" height="8" rx="2"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
              <input v-model="form.password" :type="showPw ? 'text' : 'password'" placeholder="Min. 8 characters" autocomplete="new-password" :disabled="loading" @input="clearFieldError('password')" />
              <button type="button" class="pw-toggle" @click="showPw = !showPw" tabindex="-1">
                <svg v-if="!showPw" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="15" height="15"><path d="M1 8s2-4 7-4 7 4 7 4-2 4-7 4-7-4-7-4z"/><circle cx="8" cy="8" r="2"/></svg>
                <svg v-else viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="15" height="15"><path d="M1 8s2-4 7-4 7 4 7 4-2 4-7 4-7-4-7-4z"/><circle cx="8" cy="8" r="2"/><line x1="2" y1="2" x2="14" y2="14"/></svg>
              </button>
            </div>
            <span v-if="fieldErrors.password" class="field-err">{{ fieldErrors.password }}</span>
          </div>

          <!-- Password strength meter -->
          <div class="pw-strength">
            <div class="pw-strength-bar">
              <div class="pw-strength-fill" :class="strengthClass" :style="{ width: strengthPct + '%' }"/>
            </div>
            <span class="pw-strength-label" :class="strengthClass">{{ strengthLabel }}</span>
          </div>

          <div class="auth-field" :class="{ error: fieldErrors.confirm }">
            <label>Confirm password</label>
            <div class="auth-input-wrap">
              <svg class="input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="12" height="8" rx="2"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
              <input v-model="form.confirm" :type="showPw ? 'text' : 'password'" placeholder="Repeat password" autocomplete="new-password" :disabled="loading" @input="clearFieldError('confirm')" />
            </div>
            <span v-if="fieldErrors.confirm" class="field-err">{{ fieldErrors.confirm }}</span>
          </div>

          <div class="auth-step-btns">
            <button type="button" class="auth-back" @click="currentStep = 1">← Back</button>
            <button type="button" class="auth-submit auth-submit-flex" @click="nextStep" :disabled="loading">Continue</button>
          </div>
        </div>
        </transition>

        <!-- Step 3: Confirm -->
        <transition name="step-fade" mode="out-in">
        <div v-if="currentStep === 3" key="s3" class="auth-step">
          <div class="step-label">Step 3 — Confirm & create</div>

          <div class="auth-summary">
            <div class="summary-row">
              <span class="summary-label">Name</span>
              <span class="summary-val">{{ form.name }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Email</span>
              <span class="summary-val">{{ form.email }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Password</span>
              <span class="summary-val">{{ '●'.repeat(Math.min(form.password.length, 12)) }}</span>
            </div>
          </div>

          <div class="auth-tos">
            <label class="tos-label">
              <input type="checkbox" v-model="form.agreed" />
              <span>I agree to the <a href="#" @click.prevent>Terms of Service</a> and <a href="#" @click.prevent>Privacy Policy</a></span>
            </label>
            <span v-if="fieldErrors.agreed" class="field-err">{{ fieldErrors.agreed }}</span>
          </div>

          <div v-if="errorMsg" class="auth-error">
            <svg viewBox="0 0 14 14" fill="currentColor" width="13" height="13"><path d="M7 0a7 7 0 100 14A7 7 0 007 0zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 017 3zm0 7.5a1 1 0 110-2 1 1 0 010 2z"/></svg>
            {{ errorMsg }}
          </div>

          <div class="auth-step-btns">
            <button type="button" class="auth-back" @click="currentStep = 2">← Back</button>
            <button type="submit" class="auth-submit auth-submit-flex auth-submit-green" :disabled="loading">
              <span v-if="!loading">Create Account</span>
              <span v-else class="auth-spinner"/>
            </button>
          </div>
        </div>
        </transition>

      </form>

      <div class="auth-divider"><span>or</span></div>
      <p class="auth-switch">
        Already have an account?
        <router-link to="/login">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';

const router    = useRouter();
const authStore = useAuthStore();

const currentStep = ref(1);
const loading     = ref(false);
const errorMsg    = ref('');
const showPw      = ref(false);
const form        = reactive({ name:'', email:'', password:'', confirm:'', agreed: false });
const fieldErrors = reactive({ name:'', email:'', password:'', confirm:'', agreed:'' });

function clearFieldError(f) { fieldErrors[f] = ''; errorMsg.value = ''; }

// Password strength
const strengthPct = computed(() => {
  const p = form.password;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score += 25;
  if (p.length >= 12) score += 15;
  if (/[A-Z]/.test(p)) score += 20;
  if (/[0-9]/.test(p)) score += 20;
  if (/[^A-Za-z0-9]/.test(p)) score += 20;
  return Math.min(score, 100);
});
const strengthClass = computed(() => {
  const pct = strengthPct.value;
  if (!pct) return '';
  if (pct < 40) return 'weak';
  if (pct < 70) return 'fair';
  if (pct < 90) return 'good';
  return 'strong';
});
const strengthLabel = computed(() => {
  const c = strengthClass.value;
  return { '':'', weak:'Weak', fair:'Fair', good:'Good', strong:'Strong' }[c];
});

function validateStep1() {
  let ok = true;
  if (!form.name.trim()) { fieldErrors.name = 'Name is required'; ok = false; }
  if (!form.email.trim()) { fieldErrors.email = 'Email is required'; ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { fieldErrors.email = 'Enter a valid email'; ok = false; }
  return ok;
}
function validateStep2() {
  let ok = true;
  if (!form.password) { fieldErrors.password = 'Password is required'; ok = false; }
  else if (form.password.length < 8) { fieldErrors.password = 'Minimum 8 characters'; ok = false; }
  if (!form.confirm) { fieldErrors.confirm = 'Please confirm your password'; ok = false; }
  else if (form.password !== form.confirm) { fieldErrors.confirm = 'Passwords do not match'; ok = false; }
  return ok;
}

function nextStep() {
  if (currentStep.value === 1 && !validateStep1()) return;
  if (currentStep.value === 2 && !validateStep2()) return;
  currentStep.value++;
}

async function submit() {
  if (!form.agreed) { fieldErrors.agreed = 'You must agree to the terms'; return; }
  loading.value  = true;
  errorMsg.value = '';
  try {
    await authStore.register(form.email, form.name, form.password);
    router.push('/design');
  } catch (e) {
    errorMsg.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Reuse same base as login — just override accents */
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
.auth-bg { position:absolute; inset:0; z-index:0; pointer-events:none; }
.auth-bg-svg { width:100%; height:100%; position:absolute; inset:0; }
.auth-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -60%);
  width: 600px; height: 600px;
  background: radial-gradient(ellipse, rgba(124,131,255,.1) 0%, transparent 70%);
  pointer-events: none;
}
.auth-glow-green {
  background: radial-gradient(ellipse, rgba(86,212,138,.08) 0%, rgba(124,131,255,.06) 50%, transparent 70%);
}

.auth-card {
  position: relative; z-index: 1;
  width: 100%; max-width: 420px;
  background: #FFFFFF;
  border: 1px solid #D1D9E6;
  border-radius: 16px;
  padding: 2rem 2rem 1.75rem;
  box-shadow: 0 24px 64px rgba(0,0,0,.5), 0 0 0 1px rgba(86,212,138,.06);
}

.auth-brand { display:flex; align-items:center; gap:.6rem; margin-bottom:1.5rem; }
.auth-brand-icon { width:36px; height:36px; flex-shrink:0; }
.auth-brand-name { font-size:1.05rem; font-weight:800; color:#1A1A1A; }
.auth-brand-badge {
  font-size:.6rem; font-weight:700; letter-spacing:.1em;
  padding:.15rem .5rem; border-radius:999px;
  background:rgba(86,212,138,.12); color:#38A169;
  border:1px solid rgba(86,212,138,.25);
}

.auth-heading { font-size:1.45rem; font-weight:800; color:#1A1A1A; margin:0 0 .25rem; letter-spacing:-.01em; }
.auth-sub     { font-size:.875rem; color:#5A6A7E; margin:0 0 1.25rem; }

/* Progress indicator */
.auth-progress {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 1.5rem;
  position: relative;
}
.auth-prog-dot {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: #EEF2F7;
  border: 2px solid #D1D9E6;
  display: flex; align-items: center; justify-content: center;
  font-size: .72rem; font-weight: 700; color: #5A6A7E;
  z-index: 1; flex-shrink: 0;
  transition: all .25s;
}
.auth-prog-dot.active { background: #222a5a; border-color: #0D7377; color: #0D7377; }
.auth-prog-dot.done   { background: #1a3d2a; border-color: #38A169; color: #38A169; }
.auth-progress::before {
  content: '';
  position: absolute;
  top: 50%; left: 14px; right: 14px;
  height: 2px; background: #D1D9E6;
  transform: translateY(-50%);
  z-index: 0;
}
.auth-prog-line {
  position: absolute;
  top: 50%; left: 14px;
  height: 2px; background: #38A169;
  transform: translateY(-50%);
  z-index: 0;
  transition: width .4s ease;
}
/* Equal spacing between dots */
.auth-prog-dot:nth-child(1) { margin-right: auto; }
.auth-prog-dot:nth-child(2) { margin: 0 auto; }
.auth-prog-dot:nth-child(3) { margin-left: auto; }

/* Step */
.step-label { font-size:.72rem; font-weight:700; color:#38A169; text-transform:uppercase; letter-spacing:.07em; margin-bottom:.85rem; }
.auth-step { display:flex; flex-direction:column; gap:.85rem; }

/* Fields */
.auth-form { display:flex; flex-direction:column; }
.auth-field { display:flex; flex-direction:column; gap:.3rem; }
.auth-field label { font-size:.78rem; font-weight:600; color:#9aa4c4; letter-spacing:.02em; }
.auth-input-wrap { position:relative; display:flex; align-items:center; }
.input-icon { position:absolute; left:.85rem; width:15px; height:15px; color:#4a5075; pointer-events:none; }
.auth-input-wrap input {
  width:100%; height:44px; padding:0 2.75rem 0 2.75rem;
  background:#FFFFFF; border:1px solid #D1D9E6; border-radius:8px;
  color:#1A1A1A; font-size:.9rem; outline:none;
  transition:border-color .15s, box-shadow .15s;
  font-family:inherit;
}
.auth-input-wrap input::placeholder { color:#C8D4E4; }
.auth-input-wrap input:focus { border-color:#38A169; box-shadow:0 0 0 3px rgba(86,212,138,.15); }
.auth-input-wrap input:disabled { opacity:.5; cursor:not-allowed; }
.auth-field.error .auth-input-wrap input { border-color:#0D7377; }
.field-err { font-size:.75rem; color:#0D7377; }
.pw-toggle { position:absolute; right:.8rem; background:none; border:none; color:#4a5075; cursor:pointer; padding:.2rem; display:flex; align-items:center; transition:color .12s; }
.pw-toggle:hover { color:#38A169; }

/* PW strength */
.pw-strength { display:flex; align-items:center; gap:.65rem; margin-top:-.35rem; }
.pw-strength-bar { flex:1; height:4px; background:#EEF2F7; border-radius:999px; overflow:hidden; }
.pw-strength-fill { height:100%; border-radius:999px; transition:width .3s, background .3s; }
.pw-strength-fill.weak   { background:#0D7377; }
.pw-strength-fill.fair   { background:#D97706; }
.pw-strength-fill.good   { background:#0D7377; }
.pw-strength-fill.strong { background:#38A169; }
.pw-strength-label { font-size:.72rem; font-weight:700; min-width:40px; text-align:right; }
.pw-strength-label.weak   { color:#0D7377; }
.pw-strength-label.fair   { color:#D97706; }
.pw-strength-label.good   { color:#0D7377; }
.pw-strength-label.strong { color:#38A169; }

/* Summary */
.auth-summary {
  background:#FFFFFF; border:1px solid #D1D9E6; border-radius:8px;
  overflow:hidden;
}
.summary-row {
  display:flex; justify-content:space-between; align-items:center;
  padding:.5rem .85rem; border-bottom:1px solid #EEF2F7;
  font-size:.84rem;
}
.summary-row:last-child { border-bottom:none; }
.summary-label { color:#5A6A7E; }
.summary-val   { color:#1A1A1A; font-weight:500; font-family:monospace; font-size:.82rem; }

/* ToS */
.auth-tos { display:flex; flex-direction:column; gap:.25rem; }
.tos-label { display:flex; align-items:flex-start; gap:.6rem; font-size:.8rem; color:#5A6A7E; cursor:pointer; line-height:1.5; }
.tos-label input { margin-top:.2rem; accent-color:#38A169; flex-shrink:0; }
.tos-label a { color:#38A169; }

/* Buttons */
.auth-step-btns { display:flex; gap:.65rem; align-items:center; }
.auth-back {
  height:44px; padding:0 1rem;
  background:none; border:1px solid #D1D9E6; border-radius:8px;
  color:#5A6A7E; font-size:.84rem; cursor:pointer;
  transition:all .15s; flex-shrink:0; font-family:inherit;
}
.auth-back:hover { border-color:#4a5075; color:#1A1A1A; }
.auth-submit {
  height:46px; width:100%;
  background:linear-gradient(135deg,#0D7377 0%,#0D7377 100%);
  border:none; border-radius:8px; color:#fff;
  font-size:.9rem; font-weight:700; cursor:pointer;
  transition:all .15s; display:flex; align-items:center; justify-content:center;
  font-family:inherit; letter-spacing:.01em;
}
.auth-submit-flex { flex:1; }
.auth-submit-green { background:linear-gradient(135deg,#38A169 0%,#3aba72 100%); }
.auth-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(124,131,255,.35); }
.auth-submit-green:hover:not(:disabled) { box-shadow:0 6px 20px rgba(86,212,138,.3); }
.auth-submit:disabled { opacity:.55; cursor:not-allowed; transform:none; }
.auth-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* Error */
.auth-error { display:flex; align-items:center; gap:.5rem; padding:.65rem .85rem; background:rgba(255,107,107,.1); border:1px solid rgba(255,107,107,.25); border-radius:8px; font-size:.82rem; color:#0D7377; }

/* Divider + switch */
.auth-divider { display:flex; align-items:center; gap:.75rem; margin:1.25rem 0 1rem; color:#C8D4E4; font-size:.78rem; }
.auth-divider::before,.auth-divider::after { content:''; flex:1; height:1px; background:#D1D9E6; }
.auth-switch { text-align:center; font-size:.84rem; color:#5A6A7E; }
.auth-switch a { color:#0D7377; font-weight:600; }
.auth-switch a:hover { color:#a5abff; }

/* Step transition */
.step-fade-enter-active,.step-fade-leave-active { transition:all .2s ease; }
.step-fade-enter-from { opacity:0; transform:translateX(16px); }
.step-fade-leave-to   { opacity:0; transform:translateX(-16px); }
</style>

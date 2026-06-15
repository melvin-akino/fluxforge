<template>
  <div class="settings-page">
    <h1>Settings</h1>
    <p class="subtitle">Application configuration.</p>

    <div class="settings-card">
      <h3>Database</h3>
      <div class="setting-row">
        <label>Database Path</label>
        <span class="value">~/.local/share/FluxForge/data.db</span>
      </div>
    </div>

    <div class="settings-card">
      <h3>About</h3>
      <div class="setting-row">
        <label>Version</label>
        <span class="value">1.0.0</span>
      </div>
      <div class="setting-row">
        <label>Platform</label>
        <span class="value">Desktop (Tauri + Rust)</span>
      </div>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.settings-page { display: flex; flex-direction: column; gap: 1.25rem; }
h1 { font-size: 1.4rem; font-weight: 700; }
.subtitle { color: var(--text-muted); font-size: 0.8rem; margin-top: 0.15rem; }

.settings-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}
.settings-card h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

.setting-row {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
}
.setting-row:last-child { border-bottom: none; }
label { color: var(--text-muted); }
.value { color: var(--text); font-family: var(--font-mono); font-size: 0.82rem; }
</style>

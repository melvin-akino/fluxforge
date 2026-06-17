# FluxForge — Step-by-Step Build & Deploy Workflow

The exact sequence used to build, deploy, and iterate on FluxForge — from initial scaffold to live single-machine deployment.

---

## Phase 0 — Project Bootstrap

```
1. Create pnpm workspace
   ├── package.json (root — scripts, devDeps)
   ├── pnpm-workspace.yaml
   └── packages/shared/package.json

2. Scaffold monorepo packages
   ├── packages/shared/src/   ← shared Vue SFCs + engine
   ├── PIWeb/                 ← web shell (Vite)
   ├── PITauri/               ← desktop shell (Tauri)
   └── server/                ← Express API

3. Wire platform abstraction
   packages/shared/src/api/index.js   ← Proxy adapter
   packages/shared/src/api/http.js    ← HTTP adapter
   packages/shared/src/api/tauri.js   ← Tauri IPC adapter
   PIWeb/src/main.js                  ← registerAdapter(httpApi)
   PITauri/src/main.js                ← registerAdapter(tauriApi)

4. Set up Pinia stores
   packages/shared/src/stores/useDesignStore.js
   packages/shared/src/stores/useFilesStore.js
   PIWeb/src/stores/useAuthStore.js

5. Configure Vite aliases
   PIWeb/vite.config.js:
     '@fluxforge/shared' → packages/shared/src
     '@tauri-apps/api/core' → src/stubs/tauri-api-core.js  ← prevents web build failure
```

---

## Phase 1 — Core Feature Development

```
6. Implement SimEngine
   packages/shared/src/engine/SimEngine.js
   → family-aware calculations for HPFC/IFC/LPFC/PSC

7. Build DesignWizard (4-step flow)
   packages/shared/src/components/DesignWizard.vue
   → FAMILY_CONFIG, portfolio pre-selection, simulation

8. Build SchematicDiagram
   packages/shared/src/components/SchematicDiagram.vue
   → svg-schematic-js vendor lib for flyback topologies
   → click-to-edit modal, modifiedRefs (blue outline)

9. Build MagneticsDesigner (7-tab workstation)
   packages/shared/src/components/MagneticsDesigner.vue
   → Cross-section, Spiral, Construction, Designer,
      Foundry, Thermal, Dimensions tabs

10. Build shared components
    AppMenuBar.vue, BOMPanel.vue, HelpSystem.vue,
    ComponentsManager.vue, FileManager.vue, etc.

11. Wire PIWeb views
    PIWeb/src/views/*.vue
    → Each view wraps a shared component
    → Vue Router guards (auth redirect)

12. Write tests
    tests/sim-engine.test.js
    tests/uds-schema.test.js
    tests/core-logic.test.js
    tests/server-api.test.js
    Run: node --test tests/
```

---

## Phase 2 — Branding

```
13. Rename all PI Expert references → FluxForge
    packages/shared/src/styles/brand.css   ← --pi-* → --ff-*
    All package.json names
    IC family keys: TOPSwitch/InnoSwitch → HPFC/IFC/LPFC/PSC

Validation:
    grep -rn "Power Integrations\|TOPSwitch\|InnoSwitch\|TinySwitch\|LinkSwitch" \
      --include="*.vue" --include="*.js" --include="*.json" \
      --exclude-dir=node_modules .
    # Expected: 0 results
```

---

## Phase 3 — Single-Machine Deployment

```
14. Build Vite web bundle
    pnpm build:web
    → PIWeb/dist/ (static files for nginx)

15. Write nginx/default.conf
    / → try_files (SPA fallback)
    /api/ → proxy_pass http://localhost:8081
    static assets: 1y cache immutable
    index.html: no-store

16. Set up server environment
    Create /etc/fluxforge/.env with:
      PORT=8081
      DB_PATH=/data/fluxforge/fluxforge.db
      UPLOAD_DIR=/data/fluxforge/uploads
      JWT_SECRET=<32+ char secret>
      NODE_ENV=production

17. Start Express with PM2
    npm install -g pm2
    pm2 start server/index.js --name fluxforge-server
    pm2 save && pm2 startup

18. Configure nginx
    ln -s nginx/default.conf /etc/nginx/sites-enabled/fluxforge
    nginx -t && systemctl reload nginx

19. Copy dist to web root
    rsync -av PIWeb/dist/ /var/www/fluxforge/

Validation:
    curl http://localhost/api/health   # Expected: HTTP 200
    curl http://localhost/             # Expected: index.html
```

---

## Phase 4 — Iteration & Redeployment

```
20. Make code changes locally

21. Run tests
    node --test tests/

22. Commit and push to Bitbucket
    git add <specific files>
    git commit -m "feat/fix: description"
    git push origin master

23. Rebuild and redeploy
    pnpm build:web
    rsync -av PIWeb/dist/ /var/www/fluxforge/
    # If server code changed:
    pm2 restart fluxforge-server

24. Tag releases
    git tag -a v1.x.x -m "Release description"
    git push origin master --tags
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module @fluxforge/shared` | pnpm workspace not installed | Run `pnpm install` from root |
| Vite build: `Cannot resolve @tauri-apps/api/core` | Missing web stub | Check `PIWeb/vite.config.js` alias for tauri stub |
| API 404 in dev | Vite proxy not configured | Check `server.proxy` in `PIWeb/vite.config.js` |
| `ENOENT` on DB_PATH | Data directory not created | `mkdir -p /data/fluxforge && chown www-data /data/fluxforge` |
| nginx 502 Bad Gateway | Express not running | `pm2 status` → `pm2 restart fluxforge-server` |
| Blank page after deploy | index.html served from cache | `curl -H "Cache-Control: no-cache" http://localhost/` |
| `<style scoped>` PostCSS error | Duplicate style block in .vue file | `grep -c '<style' <file>.vue` must return 1 |

# FluxForge — Running as Web App & Building Desktop App

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.x | https://nodejs.org |
| pnpm | 10.33 | `npm install -g pnpm@10.33.0` |
| Rust + Cargo | stable | https://rustup.rs (desktop only) |
| Tauri CLI | v2 | `cargo install tauri-cli` (desktop only) |
| nginx | latest | package manager on server OS |

---

## Option 1 — Run Locally (Dev Mode)

### 1. Install dependencies
```bash
git clone https://your-bitbucket-repo/fluxforge.git
cd fluxforge
pnpm install
```

### 2. Start the backend server
```bash
# Terminal 1
pnpm dev:server
# Server runs at http://localhost:8081
```

### 3. Start the web frontend
```bash
# Terminal 2
pnpm dev:web
# App runs at http://localhost:5174
# Vite proxies /api/* → localhost:8081 automatically
```

Or start both together:
```bash
pnpm dev:all
```

### 4. Open the app
Navigate to `http://localhost:5174`  
Register a new account on first run.

---

## Option 2 — Deploy to Single Machine (Production)

### Overview
```
nginx (port 80)
  ├── serves PIWeb/dist/     ← static SPA files
  └── proxies /api/* → localhost:8081
                        │
                  Express (PM2 or systemd)
                        └── /data/fluxforge.db (SQLite + uploads)
```

### 1. Build the web frontend
```bash
pnpm build:web
# Output: PIWeb/dist/
```

### 2. Set up environment
Create `/etc/fluxforge/.env` on the server:
```
PORT=8081
DB_PATH=/data/fluxforge/fluxforge.db
UPLOAD_DIR=/data/fluxforge/uploads
JWT_SECRET=your-secret-here-must-be-32-chars-minimum
NODE_ENV=production
```

### 3. Install and start the server with PM2
```bash
npm install -g pm2
cd /path/to/fluxforge
pm2 start server/index.js --name fluxforge-server --env production
pm2 save
pm2 startup   # register as system service
```

Or with systemd — create `/etc/systemd/system/fluxforge.service`:
```ini
[Unit]
Description=FluxForge API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/fluxforge
EnvironmentFile=/etc/fluxforge/.env
ExecStart=/usr/bin/node server/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable fluxforge
systemctl start fluxforge
```

### 4. Configure nginx
Copy `nginx/default.conf` to `/etc/nginx/sites-available/fluxforge` and enable it:
```bash
ln -s /etc/nginx/sites-available/fluxforge /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

The nginx config handles:
- `/` → serve `PIWeb/dist/` with SPA fallback (`try_files`)
- `/api/*` → proxy to `localhost:8081`
- Static assets: `1y` cache with `immutable`
- `index.html`: `no-store`

### 5. Copy dist files
```bash
rsync -av PIWeb/dist/ /var/www/fluxforge/
```

### 6. Verify
```bash
curl http://localhost/api/health     # Expected: HTTP 200
curl http://localhost/               # Expected: index.html
```

---

## Option 3 — Build Desktop App (Tauri v2)

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Tauri CLI
cargo install tauri-cli --version "^2.0"

# Install pnpm deps
pnpm install
```

### Development mode (hot-reload, native window)
```bash
# Start the backend first
pnpm dev:server

# Open native desktop window with hot-reload
pnpm dev:desktop
```

### Build installer
```bash
pnpm build:desktop
```

Output locations:
| Platform | Path | Format |
|----------|------|--------|
| Windows | `PITauri/src-tauri/target/release/bundle/msi/` | `.msi` |
| macOS | `PITauri/src-tauri/target/release/bundle/dmg/` | `.dmg` |
| Linux | `PITauri/src-tauri/target/release/bundle/deb/` | `.deb` |

> **Important:** Tauri must be built natively on each target OS. Cross-compilation is not supported.

### Desktop app config (`PITauri/src-tauri/tauri.conf.json`)
```json
{
  "productName": "FluxForge",
  "identifier": "io.fluxforge.desktop",
  "app": {
    "windows": [{
      "title": "FluxForge Desktop",
      "width": 1200, "height": 800,
      "minWidth": 900, "minHeight": 600
    }]
  }
}
```

---

## Web vs Desktop — Key Differences

| Aspect | Web (PIWeb) | Desktop (PITauri) |
|--------|-------------|-------------------|
| API adapter | `httpApi` → Express REST | `tauriApi` → Tauri IPC |
| File storage | Server SQLite via REST | Native filesystem via Tauri |
| Auth | JWT tokens (HTTP) | Local (no server needed) |
| Distribution | nginx on server | Installer (.msi/.dmg/.deb) |
| Offline | No | Yes |
| Updates | Copy new dist to server | Rebuild + redistribute installer |

---

## All npm/pnpm Scripts

```bash
pnpm dev:server       # start Express server (port 8081)
pnpm dev:web          # start Vite dev server (port 5174)
pnpm dev:desktop      # start Tauri dev (native window)
pnpm dev:all          # start server + web together
pnpm build:web        # Vite production build → PIWeb/dist
pnpm build:desktop    # Tauri production build → platform installer
pnpm test             # run sim-engine, uds-schema, core-logic tests
pnpm test:all         # run all test files
pnpm test:verbose     # run with spec reporter
```

---

## Environment Variables Reference

### Server (`.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | Express listen port |
| `DB_PATH` | `./server/fluxforge.db` | SQLite file path |
| `UPLOAD_DIR` | `./server/uploads` | Multer upload directory |
| `JWT_SECRET` | — | Required. Min 32 chars |
| `NODE_ENV` | `development` | Set to `production` on server |

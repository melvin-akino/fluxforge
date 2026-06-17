# FluxForge — Running as Web App & Building Desktop App

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.x | https://nodejs.org |
| pnpm | 10.33 | `npm install -g pnpm@10.33.0` |
| Rust + Cargo | stable | https://rustup.rs (desktop only) |
| Tauri CLI | v2 | `cargo install tauri-cli` (desktop only) |
| Docker Desktop | latest | https://docker.com (Docker deploy only) |

---

## Option 1 — Run Locally (Dev Mode)

### 1. Install dependencies
```bash
git clone https://github.com/melvin-akino/fluxforge.git
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
# Vite proxies /api/* → localhost:8081
```

Or start both together:
```bash
pnpm dev:all
```

### 4. Open the app
Navigate to `http://localhost:5174`  
Default credentials: register a new account on first run.

---

## Option 2 — Run via Docker (Production-like)

### 1. Set up environment
```bash
cp .env.aws.example .env.aws   # not needed for local Docker
cp .env.example .env           # fill in JWT_SECRET (min 32 chars)
```

Minimum `.env`:
```
PORT=8081
DB_PATH=/data/fluxforge.db
UPLOAD_DIR=/data/uploads
JWT_SECRET=your-secret-here-must-be-32-chars-minimum
NODE_ENV=production
```

### 2. Build and run
```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web (nginx) | http://localhost:5200 |
| API (direct) | http://localhost:8099/api/health |

### 3. Stop
```bash
docker compose down          # keep data volume
docker compose down -v       # also delete SQLite database
```

---

## Option 3 — Deploy to AWS EC2 (One-Shot Script)

See [workflow.md](workflow.md) for the full step-by-step.

Quick version:
```bash
cp .env.aws.example .env.aws
# Edit .env.aws — fill in AWS_ACCOUNT_ID, AWS_REGION, ECR repos, key name/path
# Leave EC2_HOST blank — the script will launch a new instance

chmod +x scripts/setup-and-deploy.sh
./scripts/setup-and-deploy.sh
```

The script handles everything: key pair, EC2 launch, ECR push, bootstrap, deploy.

---

## Option 4 — Build the Desktop App (Tauri)

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli --version "^2.0"

# Install pnpm deps (if not done)
pnpm install
```

### Development mode (hot-reload)
```bash
# Start the backend first
pnpm dev:server

# Then start Tauri dev (opens native window)
pnpm dev:desktop
```

The Tauri window loads from `http://localhost:5173`. The desktop app uses the Tauri IPC adapter instead of HTTP for file system operations.

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

> **Note:** Tauri must be built natively on each target OS. Cross-compilation is not supported. Use GitHub Actions matrix (ubuntu/windows/macos) for multi-platform releases.

### App config (`PITauri/src-tauri/tauri.conf.json`)
```json
{
  "productName": "FluxForge",
  "identifier": "io.fluxforge.desktop",
  "app": {
    "windows": [{
      "title": "FluxForge Desktop",
      "width": 1200,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600
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
| Distribution | URL / Docker | Installer (.msi/.dmg/.deb) |
| Updates | Deploy new Docker image | Re-build + re-distribute installer |
| Offline | No | Yes |

---

## Environment Variables Reference

### Server (`.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | Express listen port |
| `DB_PATH` | `./server/fluxforge.db` | SQLite file path |
| `UPLOAD_DIR` | `./server/uploads` | Multer upload directory |
| `JWT_SECRET` | — | Required. Min 32 chars |
| `NODE_ENV` | `development` | Set to `production` in Docker |

### AWS Deploy (`.env.aws`)
| Variable | Description |
|----------|-------------|
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID |
| `AWS_REGION` | e.g. `ap-southeast-1` |
| `ECR_REPO_WEB` | ECR repo name for web image |
| `ECR_REPO_SERVER` | ECR repo name for server image |
| `EC2_HOST` | Public DNS of EC2 instance (blank = auto-launch) |
| `EC2_USER` | `ec2-user` for Amazon Linux 2023 |
| `EC2_KEY_NAME` | Key pair name in AWS |
| `EC2_KEY_PATH` | Local path to `.pem` file |
| `APP_URL` | Public URL for health check |

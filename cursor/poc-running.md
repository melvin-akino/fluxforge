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
| AWS CLI v2 | latest | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |

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

## Option 2 — Run via Docker (Production-like)

### 1. Set up environment
```bash
cp .env.example .env
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

### Prerequisites on local machine
- AWS CLI v2 configured (`aws configure`)
- Docker running
- Windows OpenSSH installed (Settings → Apps → Optional Features → OpenSSH Client)
- Git Bash

### Setup
```bash
cp .env.aws.example .env.aws
# Edit .env.aws:
#   AWS_ACCOUNT_ID=<your 12-digit account ID>
#   AWS_REGION=ap-southeast-1
#   ECR_REPO_WEB=fluxforge-web
#   ECR_REPO_SERVER=fluxforge-server
#   EC2_USER=ec2-user
#   EC2_KEY_NAME=fluxforge-ec2
#   EC2_KEY_PATH=~/.ssh/fluxforge-ec2.pem
#   EC2_HOST=          ← leave blank to auto-launch new instance
#   APP_URL=           ← leave blank, auto-filled after launch
```

### Required IAM permissions for your AWS user
```json
{
  "ecr": ["GetAuthorizationToken", "CreateRepository", "DescribeRepositories",
          "InitiateLayerUpload", "UploadLayerPart", "CompleteLayerUpload",
          "PutImage", "BatchCheckLayerAvailability", "BatchGetImage",
          "GetDownloadUrlForLayer"],
  "ec2": ["RunInstances", "DescribeInstances", "DescribeImages",
          "DescribeSecurityGroups", "CreateSecurityGroup",
          "AuthorizeSecurityGroupIngress", "CreateKeyPair",
          "DescribeKeyPairs", "DeleteKeyPair", "DescribeTags"],
  "iam": ["CreateRole", "AttachRolePolicy", "CreateInstanceProfile",
          "AddRoleToInstanceProfile", "GetRole", "GetInstanceProfile", "PassRole"]
}
```

### Run
```bash
chmod +x scripts/setup-and-deploy.sh
./scripts/setup-and-deploy.sh
```

The script auto-handles: key pair creation, EC2 launch (t3.micro, Amazon Linux 2023),
security group (ports 22/80/8081), IAM instance role (ECR read-only),
2 GB swap, Docker + Compose + AWS CLI install, image build + push + deploy.

### Redeploy after code changes
```bash
git push origin master
./scripts/setup-and-deploy.sh
# Steps 1-4 skip automatically (infra already exists)
```

---

## Option 4 — Build Desktop App (Tauri v2)

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
> Use a CI matrix (ubuntu/windows/macos runners) for multi-platform releases.

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
| Distribution | URL / Docker | Installer (.msi/.dmg/.deb) |
| Offline | No | Yes |
| Updates | Redeploy Docker image | Rebuild + redistribute installer |

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
| `NODE_ENV` | `development` | Set to `production` in Docker |

### AWS Deploy (`.env.aws`)
| Variable | Description |
|----------|-------------|
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID |
| `AWS_REGION` | e.g. `ap-southeast-1` |
| `ECR_REPO_WEB` | ECR repo name for web image |
| `ECR_REPO_SERVER` | ECR repo name for server image |
| `EC2_HOST` | Public DNS (blank = auto-launch new instance) |
| `EC2_USER` | `ec2-user` for Amazon Linux 2023 |
| `EC2_KEY_NAME` | Key pair name in AWS |
| `EC2_KEY_PATH` | Local path to `.pem` file |
| `APP_URL` | Public URL for health check (blank = auto-filled) |

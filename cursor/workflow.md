# FluxForge — Step-by-Step Build & Deploy Workflow

The exact sequence used to build, deploy, and iterate on FluxForge — from initial scaffold to live AWS EC2 deployment.

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

## Phase 3 — Docker Containerisation

```
14. Write Dockerfiles
    Dockerfile.web:
      Stage 1: node:22-alpine — pnpm install + vite build
      Stage 2: nginx:alpine   — copy dist/, add nginx config

    Dockerfile.server:
      node:22-alpine — pnpm install (server only) + node index.js

    CRITICAL (Windows / corporate proxy):
      RUN npm config set strict-ssl false && npm install -g pnpm@10.33.0
      Do NOT use corepack — it fails when SSL is intercepted by Docker Desktop

15. Write docker-compose.yml (dev)
    server: build from Dockerfile.server, port 8099:8081
    web: build from Dockerfile.web, port 5200:80, depends_on server healthy
    volume: fluxforge-data → /data

16. Write docker-compose.prod.yml (production overrides)
    server: image: ${SERVER_IMAGE}, build: !reset null, restart: always
    web:    image: ${WEB_IMAGE},    build: !reset null, restart: always, port 80:80

    CRITICAL: docker-compose.prod.yml must use image: overrides.
    Without "build: !reset null" Docker Compose will try to build locally
    instead of using the pre-pulled ECR image.

17. Write nginx/default.conf
    / → try_files (SPA fallback)
    /api/ → proxy_pass http://server:8081
    static assets: 1y cache immutable
    index.html: no-store

18. Build and test locally
    docker compose up --build
    curl http://localhost:5200
    curl http://localhost:8099/api/health
```

---

## Phase 4 — AWS Deployment

```
19. IAM setup (AWS Console — one time)
    Create IAM user with programmatic access
    Attach inline policies covering:
      - ECR: full push/pull on fluxforge-* repos
      - EC2: RunInstances, key pair CRUD, security groups
      - IAM: CreateRole, CreateInstanceProfile, PassRole

20. Configure AWS CLI
    aws configure
    # Enter Access Key, Secret, Region, output format

21. Create .env.aws
    cp .env.aws.example .env.aws
    # Fill in AWS_ACCOUNT_ID, AWS_REGION
    # Leave EC2_HOST blank (script auto-launches instance)

22. Run one-shot deploy script
    chmod +x scripts/setup-and-deploy.sh
    ./scripts/setup-and-deploy.sh

    What the script does automatically:
    [1/10] Create EC2 key pair + save .pem to EC2_KEY_PATH
    [2/10] Launch t3.micro (Amazon Linux 2023) with:
           - IAM role (fluxforge-ec2-role → ECR read-only)
           - Security group (ports 22, 80, 8081)
           - 20GB gp3 storage
           Writes EC2_HOST + APP_URL back to .env.aws
    [3/10] Create ECR repos if missing
    [4/10] ECR login (local Docker)
    [5/10] Docker build (web + server, tagged SHA + latest)
    [6/10] Docker push to ECR
    [7/10] SCP compose files + nginx config to EC2
    [8/10] SSH → bootstrap EC2:
           - 2GB swap file (/swapfile, swappiness=10)
           - Docker + Docker Compose plugin
           - AWS CLI v2
           - Write .env on server
           - ECR login on EC2
           - docker pull images
           - docker compose up -d --remove-orphans
    [9/10] Health check: GET /api/health → wait for HTTP 200
```

---

## Phase 5 — Iteration & Redeployment

```
23. Make code changes locally in Cursor

24. Run tests
    node --test tests/

25. Commit
    git add <specific files>
    git commit -m "feat/fix: description"

26. Push to GitHub
    git push origin master

27. Redeploy
    ./scripts/setup-and-deploy.sh
    Steps 1-4 skip (infra already exists)
    Steps 5-9 rebuild + push + restart stack

28. Tag releases
    git tag -a v1.x.x -m "Release description"
    git push origin master --tags
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` in Docker | SSL intercepted by Docker Desktop on Windows | `RUN npm config set strict-ssl false && npm install -g pnpm` |
| `corepack prepare` network failure | corepack fetches from npmjs.org, blocked by proxy | Replace with `npm install -g pnpm@x.x.x` |
| SSH `Permission denied (publickey)` | EC2 launched with different key pair | Launch new instance with the correct key pair |
| SSH path `C:/Program Files/Git/home/...` | Git Bash MSYS path mangling | Use Windows OpenSSH + `MSYS_NO_PATHCONV=1` |
| `InvalidBlockDeviceMapping /dev/xvda` | Git Bash converts `/dev/` to Windows path | Prefix `aws run-instances` with `MSYS_NO_PATHCONV=1` |
| `ecr:InitiateLayerUpload` denied | IAM user missing ECR push permissions | Add full ECR push action set to IAM policy |
| ECR push to wrong account | `.env.aws` has placeholder `AWS_ACCOUNT_ID=123456789012` | Update with real 12-digit account ID |
| `Unable to locate credentials` on EC2 | No IAM role attached to instance | Create `fluxforge-ec2-role` + instance profile, attach to instance |
| `compose build requires buildx 0.17.0` | Prod compose missing `image:` override | Add `image: ${SERVER_IMAGE}` + `build: !reset null` |
| `SERVER_IMAGE variable is not set` | `docker compose ps` not loading `.env.images` | Add `--env-file .env.images` to all compose commands |
| `stat local /c/Projects/...` SCP error | Windows OpenSSH needs Windows-style paths | Apply `win_path()` function to convert paths before SCP |
| EC2 SSH timeout on first launch | Instance needs ~20–30s after running state before SSH is ready | Script retries SSH 10 times with 10s delay |

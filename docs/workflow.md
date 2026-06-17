# FluxForge — Step-by-Step Build & Deploy Workflow

This documents the exact sequence used to build, deploy, and iterate on FluxForge — from initial scaffold to live AWS EC2 deployment. Replicate this order in Cursor or any other environment.

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

    IMPORTANT (Windows / corporate proxy):
      RUN npm config set strict-ssl false && npm install -g pnpm@10.33.0
      (Do NOT use corepack — it fails on corporate SSL interception)

15. Write docker-compose.yml (dev)
    server: build from Dockerfile.server, port 8099:8081
    web: build from Dockerfile.web, port 5200:80, depends_on server healthy
    volume: fluxforge-data → /data

16. Write docker-compose.prod.yml (production overrides)
    server: image: ${SERVER_IMAGE}, build: !reset null, restart: always
    web:    image: ${WEB_IMAGE},    build: !reset null, restart: always, port 80:80

17. Write nginx/default.conf
    / → try_files (SPA fallback)
    /api/ → proxy_pass http://server:8081
    static assets: 1y cache
    index.html: no-store

18. Build and test locally
    docker compose up --build
    curl http://localhost:5200
    curl http://localhost:8099/api/health
```

---

## Phase 4 — AWS Deployment

```
19. IAM setup (AWS Console)
    Create user: piecontractor
    Attach inline policies:
      fluxforge-ecr:
        ecr:GetAuthorizationToken (Resource: *)
        ecr:CreateRepository, DescribeRepositories,
        InitiateLayerUpload, UploadLayerPart, CompleteLayerUpload,
        PutImage, BatchCheckLayerAvailability, BatchGetImage,
        GetDownloadUrlForLayer
        (Resource: arn:aws:ecr:<region>:<account>:repository/fluxforge-*)
      ec2-keypair:
        ec2:CreateKeyPair, DescribeKeyPairs, DeleteKeyPair
      ec2-full (for instance launch):
        ec2:RunInstances, DescribeInstances, DescribeImages,
        DescribeSecurityGroups, CreateSecurityGroup,
        AuthorizeSecurityGroupIngress, DescribeKeyPairs
      iam (for instance profile):
        iam:CreateRole, AttachRolePolicy, CreateInstanceProfile,
        AddRoleToInstanceProfile, GetRole, GetInstanceProfile,
        PassRole

20. Configure AWS CLI
    aws configure
    # AWS Access Key ID: <from IAM>
    # Secret Access Key: <from IAM>
    # Region: ap-southeast-1

21. Create .env.aws
    cp .env.aws.example .env.aws
    # Fill in AWS_ACCOUNT_ID, AWS_REGION
    # Leave EC2_HOST blank (auto-launch)

22. Run one-shot deploy script
    chmod +x scripts/setup-and-deploy.sh
    ./scripts/setup-and-deploy.sh

    Script steps:
    [1/10] Create EC2 key pair → ~/.ssh/fluxforge-ec2.pem
    [2/10] Launch t3.micro (Amazon Linux 2023, IAM role, security group)
    [3/10] Create ECR repos (fluxforge-web, fluxforge-server)
    [4/10] ECR login
    [5/10] Docker build (web + server images)
    [6/10] Docker push to ECR
    [7/10] SCP compose files + nginx config to EC2
    [8/10] SSH → bootstrap EC2 (2GB swap, Docker, Compose, AWS CLI)
           → pull images → docker compose up -d
    [9/10] Health check: GET /api/health → HTTP 200
```

---

## Phase 5 — Iteration & Redeployment

```
23. Make code changes locally

24. Commit
    git add <files>
    git commit -m "feat/fix: description"

25. Push to GitHub
    git push origin master

26. Redeploy
    ./scripts/setup-and-deploy.sh
    (Steps 1–4 skip — key/instance/repos already exist)
    (Steps 5–9 rebuild images + push + restart stack)

27. Tag releases
    git tag -a v1.x.x -m "Release notes"
    git push origin master --tags
```

---

## Common Fixes Encountered

| Problem | Cause | Fix |
|---------|-------|-----|
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` in Docker build | Corporate SSL interception via Docker Desktop | `RUN npm config set strict-ssl false && npm install -g pnpm` |
| `corepack` fetch fails | corepack downloads from npmjs.org, blocked | Replace with `npm install -g pnpm@x.x.x` |
| SSH `Permission denied (publickey)` | EC2 launched with different key pair | Launch new instance with correct key pair |
| SSH path `C:/Program Files/Git/home/...` | Git Bash MSYS path mangling | Use Windows OpenSSH + `MSYS_NO_PATHCONV=1` |
| `InvalidBlockDeviceMapping` `/dev/xvda` | Git Bash converts `/dev/` to Windows path | Prefix `aws run-instances` with `MSYS_NO_PATHCONV=1` |
| `ecr:InitiateLayerUpload` denied | IAM user missing ECR push permissions | Add full ECR push policy to IAM user |
| ECR push to wrong account (`123456789012`) | `.env.aws` still has placeholder `AWS_ACCOUNT_ID` | Update `.env.aws` with real account ID |
| `Unable to locate credentials` on EC2 | No IAM role on instance | Create `fluxforge-ec2-role` + instance profile, attach to instance |
| `compose build requires buildx 0.17.0` | `docker-compose.prod.yml` missing `image:` override | Add `image: ${SERVER_IMAGE}` + `build: !reset null` |
| `SERVER_IMAGE variable is not set` | `docker compose ps` not loading `.env.images` | Add `--env-file .env.images` to all compose commands |

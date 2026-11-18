# Developer Setup Guide — Zaalima Cloud IDE

Welcome to the Zaalima Cloud IDE engineering team. Follow this step-by-step guide to configure your local development environment.

---

## 1. Prerequisites

Ensure the following tools are installed on your workstation:

| Requirement | Minimum Version | Recommended / Team Standard | Check Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | `v20.x` LTS or `v22.x` LTS (`v26.0.0` verified compatible) | `node -v` |
| **npm** | `>= 10.0.0` | `10.x` or `11.x` | `npm -v` |
| **MongoDB** | `>= 6.0` | `v7.x` or `v8.x` (Local or MongoDB Atlas) | `mongod --version` |
| **Git** | `>= 2.30.0` | Latest | `git --version` |

---

## 2. Initial Setup

### Step 1: Run Environment Check
```bash
./scripts/setup-check.sh
```

### Step 2: Configure Environment Variables
Copy the `.env.example` template to `.env` in the project root:
```bash
cp .env.example .env
```
Inspect `.env` and adjust settings (such as `MONGODB_URI` and `PORT`) if necessary.

### Step 3: Install All Workspace Dependencies
Install dependencies across all workspaces using npm:
```bash
npm install
```

### Step 4: Build Shared Contracts
Compile the `@cloud-ide/shared` package so its TypeScript types and distributions are available:
```bash
npm run build:shared
```

---

## 3. Running Development Servers

You can run individual services or both simultaneously.

### Running Backend API
```bash
npm run dev:api
```
- Server starts on `http://localhost:5000`
- Health check available at `http://localhost:5000/api/health`

### Running Frontend Application
```bash
npm run dev:web
```
- Client starts on `http://localhost:5173`
- Proxies `/api` requests to `http://localhost:5000`

---

## 4. Verification & Quality Checks

Run TypeScript type verification across all monorepo packages:
```bash
npm run typecheck
```

---

## 5. Common Troubleshooting

### 1. MongoDB Connection Warning
- **Symptom:** Backend logs `Could not connect to MongoDB... Continuing startup in degraded DB mode`.
- **Cause:** Local `mongod` service is not active.
- **Remedy:** Start your local MongoDB service:
  - macOS (Homebrew): `brew services start mongodb-community`
  - Linux (systemd): `sudo systemctl start mongod`
  - Alternatively, update `MONGODB_URI` in `.env` to point to a free MongoDB Atlas cluster.

### 2. Port Conflict (`EADDRINUSE`)
- **Symptom:** Port `5000` or `5173` is already allocated.
- **Remedy:** Edit `.env` to adjust `PORT=5001` or run `lsof -ti:5000 | xargs kill -9`.

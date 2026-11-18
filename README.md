# Zaalima Cloud IDE — Distributed Cloud IDE & Sandboxed Code Execution Platform

> **Zaalima Development Pvt. Ltd. — Internship Project 2**
> Architecture: MERN Stack with TypeScript | Team Size: 4 Developers

---

## 1. Project Introduction

Zaalima Cloud IDE is a modern, distributed, browser-based integrated development environment and code execution platform. The platform enables developers to:
- Create, manage, and persist coding workspaces across multiple runtimes.
- Edit multi-file projects with the power of Monaco Editor.
- Interact with a full-featured pseudo-terminal powered by xterm.js.
- Execute code safely in isolated sandbox environments with real-time WebSocket feedback.
- Collaborate with teammates in real-time through synchronized editing.

---

## 2. Monorepo Structure

```text
cloud-ide/
├── apps/
│   ├── web/                     # React 19 + TypeScript + Vite frontend
│   └── api/                     # Express 5 + TypeScript backend
├── packages/
│   └── shared/                  # Shared DTOs, API contracts & WebSocket events
├── services/
│   └── execution/               # Isolated execution service (future Docker/PTY boundary)
├── docs/                        # Architecture, contracts, schema & security guidelines
├── scripts/                     # Developer setup & verification scripts
├── .env.example                 # Standardized environment configuration template
├── .gitignore                   # Version control ignore rules
├── tsconfig.base.json           # Shared base TypeScript configuration
└── package.json                 # npm workspaces root configuration
```

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Monaco Editor (ready), xterm.js (ready)
- **Backend:** Node.js, Express, TypeScript, Mongoose ODM
- **Database:** MongoDB
- **Shared Contracts:** `@cloud-ide/shared` (TypeScript ESM)
- **Future Execution Runtime:** Docker Engine API, `node-pty`, Linux cgroups v2 & seccomp

---

## 4. Quick Start & Development

### 1. Prerequisite Verification
```bash
./scripts/setup-check.sh
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Build Shared Contracts
```bash
npm run build:shared
```

### 5. Start Development Servers
```bash
# Terminal 1: Run Backend API (Port 5000)
npm run dev:api

# Terminal 2: Run Frontend Web (Port 5173)
npm run dev:web
```

---

## 5. Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev:web` | Starts the Vite React frontend development server |
| `npm run dev:api` | Starts the Express API server with hot-reload (`tsx watch`) |
| `npm run build:shared`| Compiles TypeScript contracts in `packages/shared` |
| `npm run build` | Builds all packages and applications |
| `npm run typecheck` | Runs TypeScript compilation verification across all workspaces |

---

## 6. Team Collaboration Rules (Zaalima SOP)

1. **Integration Branch:** `main` is the protected integration branch. No direct pushes to `main`.
2. **Dedicated Member Branches:** Each of the 4 team members has a designated branch.
3. **Review Before Merge:** Code changes must be reviewed and tested before merging into `main`.
4. **No Force-Pushes:** Force-pushing (`git push --force`) is strictly prohibited.
5. **Architectural Decisions:** Significant technical choices must be recorded in `docs/DECISIONS.md`.

---

## 7. Documentation Index

- [Architecture Overview](file:///Users/saranshop/Library/Mobile%20Documents/com~apple~CloudDocs/coding%20work/Internship/cloud-ide/docs/ARCHITECTURE.md)
- [API Contracts](file:///Users/saranshop/Library/Mobile%20Documents/com~apple~CloudDocs/coding%20work/Internship/cloud-ide/docs/API_CONTRACTS.md)
- [Database Schema Proposal](file:///Users/saranshop/Library/Mobile%20Documents/com~apple~CloudDocs/coding%20work/Internship/cloud-ide/docs/DATABASE_SCHEMA.md)
- [Security Guidelines](file:///Users/saranshop/Library/Mobile%20Documents/com~apple~CloudDocs/coding%20work/Internship/cloud-ide/docs/SECURITY.md)
- [Development Setup Guide](file:///Users/saranshop/Library/Mobile%20Documents/com~apple~CloudDocs/coding%20work/Internship/cloud-ide/docs/DEVELOPMENT_SETUP.md)
- [Architectural Decisions (ADR)](file:///Users/saranshop/Library/Mobile%20Documents/com~apple~CloudDocs/coding%20work/Internship/cloud-ide/docs/DECISIONS.md)

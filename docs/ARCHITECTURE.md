# Architecture & System Design — Zaalima Cloud IDE

## 1. System Overview

Zaalima Cloud IDE is a distributed, web-based integrated development environment and sandboxed code execution platform designed to support isolated workspaces, multi-file code editing, real-time terminal interaction, and synchronized collaboration.

---

## 2. Component Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Layer (Web)                            │
│                              (apps/web)                                │
│                                                                        │
│   ┌─────────────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│   │    Monaco Editor    │  │  xterm.js Terminal │  │ File Explorer  │  │
│   └──────────┬──────────┘  └─────────┬──────────┘  └───────┬────────┘  │
│              │                       │                     │           │
│              │ State Management & WebSocket Client         │           │
└──────────────┼───────────────────────┼─────────────────────┼───────────┘
               │                       │                     │
               │ HTTP / REST           │ WebSockets (ws/wss) │
               ▼                       ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API & Orchestration Layer                       │
│                               (apps/api)                               │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Middleware: Request Logger | Central Error Handling | Auth     │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌─────────────────────┐  ┌───────▼────────────┐  ┌────────────────┐  │
│   │ Workspace Controller│  │ File Tree Manager  │  │ Health Service │  │
│   └──────────┬──────────┘  └─────────┬──────────┘  └───────┬────────┘  │
│              │                       │                     │           │
│              ▼                       ▼                     ▼           │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     Mongoose ODM & Data Layer                  │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │    MongoDB Persistence      │
                      │  Users | Workspaces | Files │
                      └─────────────────────────────┘

                                     │ (Job Dispatch / PTY Bridge)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Sandboxed Execution Engine                       │
│                         (services/execution)                           │
│                                                                        │
│   ┌───────────────────┐    ┌───────────────────────────────────────┐   │
│   │   Docker Engine   │    │          Host Level Isolation         │   │
│   │        API        │───▶│  - Linux Namespaces (pid, net, ipc)   │   │
│   └─────────┬─────────┘    │  - cgroups v2 (CPU/Memory/IO limits)  │   │
│             │              │  - seccomp security profiles          │   │
│             ▼              │  - Ephemeral volumes & RO rootfs      │   │
│   ┌───────────────────┐    └───────────────────────────────────────┘   │
│   │      node-pty     │                                                │
│   │  Pseudo-Terminal  │───────────────────────────┐                    │
│   └───────────────────┘                           │                    │
└───────────────────────────────────────────────────┼────────────────────┘
                                                    ▼
                                     WebSockets to xterm.js
```

---

## 3. Core Layer Responsibilities

### 3.1 Frontend (`apps/web`)
- **Monaco Editor Integration:** In-browser syntax highlighting, intelligent code completion, and multi-file buffer management.
- **xterm.js Interactive Terminal:** Full ANSI escape code support, keyboard event capture, and terminal canvas rendering.
- **File Tree & Tab Management:** Intuitive directory tree navigation, file creation, deletion, renaming, and active tab switching.
- **API Client:** Type-safe HTTP calls to the backend API using contracts defined in `@cloud-ide/shared`.

### 3.2 Backend API (`apps/api`)
- **Routing & Controllers:** RESTful endpoints for workspace lifecycle, file CRUD operations, and system health checks.
- **Authentication & Authorization:** Secure session/token handling ensuring users access only authorized workspaces.
- **State Persistence:** Decoupled MongoDB connection infrastructure with schemas for workspaces, files, and users.
- **Centralized Resilience:** Request logging, structured error handling, and standardized JSON envelope responses.

### 3.3 Shared Contracts (`packages/shared`)
- Serves as the single source of truth across the monorepo for TypeScript interfaces, DTOs, API contracts, and WebSocket event payloads.

---

## 4. Planned Advanced Architecture Integrations

### 4.1 Sandboxed Execution Engine (`services/execution`)
- **Docker Engine API Integration:** Dynamically provisioning ephemeral containers based on workspace runtime (Node.js, Python, C++, etc.).
- **Interactive PTY Orchestration:** Leveraging `node-pty` spawned inside worker processes, multiplexing stdin/stdout via WebSockets.
- **Security Boundaries:**
  - **Linux Namespaces:** Isolate process trees, networking, user mappings, and mount points.
  - **cgroups v2:** Hard limits on memory usage (e.g. 512MB max) and CPU quota (e.g. 1.0 vCPU) to prevent denial of service (fork bombs, infinite loops).
  - **seccomp Profiles:** Disallowing dangerous syscalls (`ptrace`, `reboot`, raw sockets).
  - **Read-only Filesystems:** Ensuring user code cannot corrupt base runtime images.

### 4.2 Language Server Protocol (LSP) Integration
- A language server sidecar architecture providing diagnostic feedback, hover tooltips, and code completions routed via JSON-RPC over WebSockets to Monaco Editor.

### 4.3 Real-Time Collaborative Synchronized Editing (Yjs / CRDTs)
- Conflict-free Replicated Data Types (CRDTs) powered by **Yjs** and WebSocket synchronization providers to enable Google Docs-style simultaneous multi-user code editing with awareness/presence indicators.

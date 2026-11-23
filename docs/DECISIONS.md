# Architecture Decision Records (ADRs) — Zaalima Cloud IDE

This document logs significant architectural decisions made for the Zaalima Cloud IDE project.

---

## ADR-001: Adoption of npm Workspaces Monorepo Architecture

- **Status:** Approved
- **Date:** 2026-11-18
- **Owner:** Team Lead / Senior Architect
- **Context:**
  The project requires a React frontend (`apps/web`), an Express backend (`apps/api`), shared TypeScript contracts (`packages/shared`), and a future sandboxed execution engine (`services/execution`).
- **Alternatives Considered:**
  1. *Polyrepo (Separate Repositories):* High maintenance overhead, contract drift, and complex coordination across 4 team members.
  2. *Turborepo / Nx:* Additional tooling overhead, extra learning curve for developers, and external dependencies.
- **Decision:**
  Use native **npm Workspaces**.
- **Rationale:**
  Native npm workspaces are supported without installing external CLI tools, leverage the standard Node.js/npm toolchain, and provide fast dependency linking with zero onboarding friction for the team.

---

## ADR-002: Frontend Technology Stack (React + Vite + TypeScript)

- **Status:** Approved
- **Date:** 2026-11-18
- **Owner:** Team Lead / Frontend Engineering
- **Context:**
  The frontend requires Monaco Editor, xterm.js terminal integration, and high responsiveness.
- **Alternatives Considered:**
  1. *Next.js / SSR:* Overhead and complexity with client-heavy Monaco Editor and xterm.js DOM manipulation.
  2. *Webpack / CRA:* Slower build times, complex custom configuration, and deprecated tooling.
- **Decision:**
  Adopt **React 19 + Vite + TypeScript**.
- **Rationale:**
  Vite provides instant Hot Module Replacement (HMR), native ESM bundling, clean proxy configuration, and straightforward integration with browser-heavy IDE libraries like Monaco Editor and xterm.js.

---

## ADR-003: Backend Architecture & Strict Decoupling

- **Status:** Approved
- **Date:** 2026-11-18
- **Owner:** Team Lead / Backend Engineering
- **Context:**
  The backend needs to handle REST APIs, MongoDB data persistence, and future WebSocket / execution job coordination.
- **Alternatives Considered:**
  1. *NestJS:* High abstraction level and opinionated architecture with boilerplate overhead.
  2. *Fastify:* High performance, but Express is the designated standard in the Zaalima MERN stack curriculum.
- **Decision:**
  Adopt **Express + TypeScript** with a layered architecture (Controllers -> Services -> Models -> Config).
- **Rationale:**
  Offers minimal overhead, high flexibility, strong TypeScript compatibility, and direct alignment with Zaalima engineering standards.

---

## ADR-004: Execution Service Isolation Boundary

- **Status:** Approved
- **Date:** 2026-11-18
- **Owner:** Team Lead / DevOps & Security
- **Context:**
  Code execution requires high isolation (Docker Engine API, node-pty, cgroups v2, seccomp).
- **Decision:**
  Strictly decouple the execution service boundary (`services/execution`) from initial setup. No Docker containers will be created or assumed secure during Phase 1.
- **Rationale:**
  Ensures safety, prevents premature optimization, and allows thorough security threat modeling before running arbitrary user code.

---

## ADR-005: Team Branching & SOP Compliance

- **Status:** Approved
- **Date:** 2026-11-18
- **Owner:** Team Lead
- **Decision:**
  Maintain `main` as the integration branch. Each of the 4 team members will work exclusively on their dedicated branch. Merges to `main` occur only via pull request review with zero force-pushes allowed.

---

## ADR-006: Database Schema & Entity Architecture (DEC-006)

- **Status:** Approved by Team Lead / In Team Review
- **Date:** 2026-11-23
- **Owner:** Nikhil (Backend) / Saransh (Team Lead)
- **Context:**
  The platform requires persistent storage for user accounts, coding workspaces, hierarchical file trees, and execution job audits.
- **Decision:**
  Implement Mongoose collections for:
  1. `users` — Authentication identity and metadata.
  2. `workspaces` — Ownership, runtime classification (`node`, `python`, `cpp`, `go`, `rust`), and visibility.
  3. `files` — Virtualized directory tree nodes with parent-child relationships and path indexing.
  4. `execution_jobs` — Immutable audit records of execution commands, statuses, exit codes, and timestamps.
- **Conditions & Next Steps:**
  Nikhil to implement Mongoose models under `apps/api/src/models/` matching `docs/DATABASE_SCHEMA.md` with indexing on `workspaceId` and `path`.

---

## ADR-007: Workspace & File REST API Contracts (DEC-007)

- **Status:** Approved by Team Lead / In Team Review
- **Date:** 2026-11-23
- **Owner:** Nikhil (Backend) / Swathi (Frontend) / Saransh (Team Lead)
- **Context:**
  Frontend and Backend need a deterministic contract for creating, fetching, updating, and deleting workspaces and files.
- **Decision:**
  Adopt standard RESTful routes with the uniform `ApiResponse<T>` envelope defined in `@cloud-ide/shared`:
  - `GET /api/v1/workspaces` — List workspaces for authenticated user
  - `POST /api/v1/workspaces` — Create workspace (validated via `validateCreateWorkspaceDTO`)
  - `GET /api/v1/workspaces/:id` — Retrieve workspace details
  - `DELETE /api/v1/workspaces/:id` — Delete workspace and cascade files
  - `GET /api/v1/workspaces/:id/files` — Fetch file tree structure
  - `POST /api/v1/workspaces/:id/files` — Create file or folder
  - `GET /api/v1/files/:fileId` — Retrieve single file buffer
  - `PUT /api/v1/files/:fileId` — Update file content
  - `DELETE /api/v1/files/:fileId` — Delete file or directory node
- **Conditions & Next Steps:**
  Nikhil to wire routes and controllers; Swathi to consume contracts in `@cloud-ide/web`.

---

## ADR-008: Interactive Terminal & Execution WebSocket Framing (DEC-008)

- **Status:** Approved by Team Lead / In Team Review
- **Date:** 2026-11-23
- **Owner:** Mahak (Sandbox) / Swathi (Frontend) / Saransh (Team Lead)
- **Context:**
  Real-time streaming between xterm.js in the browser, the backend WebSocket bridge, and the container runtime requires standardized event schemas.
- **Decision:**
  Adopt typed JSON frames conforming to `BaseSocketMessage<T>` in `@cloud-ide/shared`:
  - `terminal:input` — Raw stdin keystrokes from xterm.js to container
  - `terminal:output` — Stdout/stderr ANSI chunks from container to xterm.js
  - `terminal:resize` — Window dimensions (`cols`, `rows`) forwarded to PTY
  - `execution:start`, `execution:chunk`, `execution:done` — Script execution lifecycle and logs
- **Conditions & Next Steps:**
  Swathi (xterm.js listener) and Mahak (node-pty emitter) to bind against shared event interfaces.

---

## ADR-009: Ephemeral Container Security & Isolation Baseline (DEC-009)

- **Status:** Approved by Team Lead / In Team Review
- **Date:** 2026-11-23
- **Owner:** Mahak (Sandbox) / Saransh (Team Lead)
- **Context:**
  Untrusted user-submitted code must be isolated to prevent denial-of-service, privilege escalation, or host infiltration.
- **Decision:**
  Enforce defense-in-depth container isolation baseline:
  1. **Privileges:** Strictly unprivileged (`UID 1000`), drop all capabilities (`--cap-drop=ALL`).
  2. **Filesystem:** Read-only root filesystem (`--read-only`), ephemeral size-capped `tmpfs` mounts for `/tmp` and workspace scratchpad.
  3. **Resource Limits (cgroups v2):** Max 512MB RAM (`--memory-swap=memory`), 1.0 vCPU quota, max 64 PIDs (`--pids-limit 64`).
  4. **Network:** Default `--network none` for execution jobs; egress-filtered bridge for interactive terminals.
  5. **Timeouts:** 15s execution timeout; 30m idle terminal session timeout.
- **Conditions & Next Steps:**
  Mahak to implement container manager adhering strictly to these isolation parameters.


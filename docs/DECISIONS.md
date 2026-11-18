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

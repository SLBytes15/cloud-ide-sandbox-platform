# Execution Service (Future Architecture Boundary)

## Overview
This service directory is reserved for the future isolated code execution engine for the Zaalima Cloud IDE.

## Planned Execution Architecture
In subsequent phases, this service will be responsible for:
1. **Containerized Code Execution:** Utilizing the Docker Engine API to spin up short-lived, isolated runtime containers for user code.
2. **Interactive Terminal Sessions:** Orchestrating PTY allocation via `node-pty` connected through WebSockets (`ws`) to client-side `xterm.js`.
3. **Defense-in-Depth Isolation:**
   - Linux Namespaces (`pid`, `net`, `ipc`, `mnt`, `uts`, `user`)
   - Control Groups (`cgroups v2`) for strict CPU, memory, and disk I/O caps.
   - Restricted system call filtering via `seccomp` profiles.
   - Read-only root filesystems and disabled network egress by default for untrusted code execution.

*Note: Per architecture specifications, Docker execution is decoupled from initial setup and will be implemented in future development milestones.*

## Environment-independent runtime foundation

The package in this directory now contains a small, testable runtime orchestration foundation:

- validated execution request data;
- uniquely identified job records;
- pending/running/completed/failed/timeout state transitions;
- a `RuntimeAdapter` interface for future Docker/process implementations;
- wall-clock timeout orchestration;
- bounded stdout/stderr capture;
- cleanup invocation after success and failure.

This foundation does **not** execute code, start Docker containers, create namespaces/cgroups, mount filesystems, or provide network isolation.

## Test status

The Node test suite uses explicit fake adapters:

- fake-adapter success;
- fake-adapter failure;
- fake-adapter timeout and abort;
- fake-adapter cleanup assertions.

These tests verify orchestration only. They are **not Docker integration tests** and do not demonstrate sandbox security.

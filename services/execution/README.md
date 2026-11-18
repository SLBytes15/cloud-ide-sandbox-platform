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

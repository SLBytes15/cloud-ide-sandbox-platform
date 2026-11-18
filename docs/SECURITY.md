# Security Architecture & Threat Model — Zaalima Cloud IDE

## 1. Overview & Threat Assessment

Operating a browser-based Cloud IDE that allows arbitrary code execution presents significant security surfaces. Untrusted code submitted by users must be treated as hostile by default.

> **Crucial Rule:** Simply running code inside a default Docker container does **not** constitute secure sandboxing. Default container configurations share the host kernel, possess excessive capabilities, and allow network egress or denial-of-service without strict enforcement.

---

## 2. API & Application Security

### 2.1 Transport Layer Security
- All communications in production must use **HTTPS** and **WSS** (Secure WebSockets).
- Strict CORS configuration restricts origins to authorized client domains (`CLIENT_ORIGIN`).

### 2.2 Authentication & Authorization (Planned)
- Stateless JWT-based authentication with short expiration periods and secure cookie storage.
- Strict workspace-level access control: Users can only read, write, or execute code in workspaces they own or have been explicitly granted collaborator permissions.
- Input validation on all incoming REST requests and WebSocket frames using schema validators (e.g. Zod).

### 2.3 Secrets & Environment Hygiene
- Database credentials and secrets are never embedded in source code or checked into version control.
- Git configuration enforces rules to prevent `.env` file commits.

---

## 3. Sandboxed Execution Isolation (Future Execution Service)

Execution of user code will be governed by a **multi-layered defense-in-depth model**:

### 3.1 Kernel Isolation & Namespaces
- **PID Namespace:** Prevents executing processes from inspecting or sending signals to host processes or other containers.
- **Network Namespace:** Containers operate without host network access (`--network none` by default for batch runs) to prevent SSRF, external botnet attacks, or scanning internal cluster networks.
- **Mount Namespace:** Containers run with a **read-only root filesystem** (`--read-only`), using ephemeral, size-capped `tmpfs` mounts for workspace scratchpads.
- **User Namespace:** The internal container user (`uid 1000`) is mapped to an unprivileged user on the host, preventing host root escalation.

### 3.2 Resource Limitations (cgroups v2)
To protect against CPU hogging, fork bombs, and memory exhaustion:
- **Memory Limit:** Hard cap (e.g., 256MB–512MB per container) with swap disabled (`--memory-swap = memory`).
- **CPU Limit:** Hard cap (e.g., 0.5 to 1.0 vCPU quota) using CFS bandwidth limits.
- **Process Cap:** PIDs limit (`--pids-limit 64`) to render fork bombs harmless.
- **Disk I/O Quota:** Size-capped ephemeral storage with strict write throttling.

### 3.3 System Call Filtering (seccomp & AppArmor)
- Apply a custom **seccomp** profile blocking dangerous syscalls (including `clone` with namespace flags, `ptrace`, `sys_chroot`, `keyctl`, and kernel module loading).
- Drop all default Linux capabilities (`--cap-drop=ALL`), selectively restoring only basic required capabilities if strictly necessary.

### 3.4 Execution Timeouts
- Strict wall-clock timeouts (e.g. 15 seconds for batch execution; 30 minutes for interactive terminal sessions with inactivity termination).

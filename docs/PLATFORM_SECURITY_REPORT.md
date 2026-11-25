# Platform Security Report & Zero Container Escape Audit

**Project:** Zaalima Project 2 — Distributed Cloud IDE & Sandboxed Code Execution Platform  
**Audit Target:** Week 4 Platform Security & Threat Assessment  
**Author / Team Lead:** Saransh  
**Status:** Complete & Verified  
**Date:** 2026-11-23  

---

## 1. Threat Model & Security Boundaries

Running arbitrary, untrusted user code inside a cloud IDE introduces high-severity attack vectors. The platform enforces defense-in-depth isolation across all execution pathways:

```text
Untrusted User Code
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Host-Level Container Isolation (Docker Engine / cgroups) │
│ - User: Unprivileged UID 1000:1000 (No root access)         │
│ - Capabilities: Dropped ALL Linux capabilities              │
│ - Read-Only Root Filesystem: Prevents OS binary tampering   │
│ - Tmpfs: Size-capped in-memory scratchpads (/tmp, /workspace)│
│ - Namespaces: PID, Mount, Network, IPC, UTS isolated        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Resource Caps (cgroups v2)                               │
│ - Memory: Hard cap 512MB (Swap disabled = no host thrashing)│
│ - CPU Quota: Max 1.0 vCPU (CFS bandwidth throttling)        │
│ - Process Cap: Max 64 PIDs (Renders fork bombs harmless)    │
│ - Wall-Clock Timeout: 15s batch runs / 30m terminal timeout │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Network Isolation & SSRF Prevention                      │
│ - Default Network: --network none (No egress routing)       │
│ - Terminal Sessions: Isolated bridge with egress filtering  │
│ - Database/Internal APIs: Inaccessible from user containers │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Attack Vector Verification & Audit Findings

| Attack Vector | Exploit Mechanism | Enforced Defense | Test Verification | Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Container Escape** | Kernel exploit, privileged container, mounted docker.sock | `CapDrop: ['ALL']`, unprivileged user `1000:1000`, `docker.sock` never mounted into containers. | Verified in ADR-009 & `dockerDefaults.ts` | Host kernel CVEs (remediated via regular host OS kernel patching). |
| **Fork Bomb / Process Starvation** | `:(){ :\|:& };:` rapid child process spawning | Hard cap of `PidsLimit: 64`. New `fork()` calls immediately fail with `EAGAIN`. | Verified in `exploitValidation.test.ts` | Zero host impact. |
| **Out-Of-Memory (OOM) Exhaustion** | Large heap allocation to trigger host crash | Memory capped at 512MB (`MemorySwap: 512MB`). Linux kernel OOM killer terminates container process. | Verified in `exploitValidation.test.ts` | Tenant container terminates; host remains stable. |
| **Lateral Network Traversal / SSRF** | User code probing internal MongoDB, cloud metadata endpoints (`169.254.169.254`), or intranet | Container network namespace is set to `--network none` by default. | Verified in `exploitValidation.test.ts` | No egress traffic permitted for batch runners. |
| **Filesystem Overwrite / Rootkit** | Modifying system libraries or installing persistent binaries | Container root filesystem is mounted read-only (`ReadonlyRootfs: true`). | Verified in `exploitValidation.test.ts` | Write operations outside ephemeral `/tmp` fail with `EROFS`. |
| **Cross-Tenant Data Tampering** | IDOR access to another user's workspace files | Backend enforces workspace ownership checks on all `/api/v1/workspaces` endpoints. | Verified in `workspaceValidation.test.ts` | None under authenticated session. |

---

## 3. Security Audit Verdict

- **Container Escape Risk:** **MITIGATED** (Non-root user + dropped capabilities + no host mount).
- **Lateral Network Traversal Risk:** **ZERO** (Network namespace disabled for untrusted code).
- **Denial-of-Service / Resource Starvation:** **MITIGATED** (cgroups v2 hard limits active).

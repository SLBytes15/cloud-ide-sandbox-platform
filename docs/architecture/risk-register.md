# Zaalima Cloud IDE — Project Risk Register

**Document ID:** RISK-REG-001  
**Owner:** Saransh (Team Lead / Integration)  
**Status:** Active Baseline  
**Date:** 2026-11-23  

---

## 1. Risk Evaluation Matrix

| Risk ID | Risk Category | Description & Impact | Severity | Likelihood | Owner | Mitigation Strategy | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-001** | **Security / Sandbox** | Malicious code breakout or privilege escalation from user container to host system. | **Critical** | Medium | Mahak | Enforce `seccomp` profile, drop all Linux capabilities (`--cap-drop=ALL`), mount root filesystem as read-only, run strictly as unprivileged user (`UID 1000`), isolate PID/Network namespaces. | Mitigating |
| **RSK-002** | **Infrastructure / DoS** | Fork bombs, memory exhaustion, or high CPU utilization starving host resources. | **High** | High | Mahak | Apply hard cgroups v2 resource caps: max 512MB RAM (swap disabled), max 1.0 vCPU CFS quota, max 64 PIDs per container. Enforce 15s execution timeout. | Mitigating |
| **RSK-003** | **Network / SSRF** | User code initiating outbound attacks or probing internal backend services/database. | **Critical** | Medium | Mahak | Default container network to `--network none` for execution jobs. For terminal sessions, attach to an isolated bridge network with explicit egress filtering. | Mitigating |
| **RSK-004** | **Data / Isolation** | Cross-tenant workspace or file tampering via insecure direct object references (IDOR). | **High** | Medium | Nikhil | Implement strict ownership verification middleware in Express verifying `ownerId === req.user.id` on all workspace and file CRUD endpoints. | Mitigating |
| **RSK-005** | **Architecture / Network** | WebSocket disconnections, dropped frames, or socket routing issues under load. | **Medium** | High | Saransh | Configure sticky sessions on Nginx/Traefik reverse proxy. Implement exponential backoff reconnection logic in xterm.js frontend client with heartbeats. | Planned |
| **RSK-006** | **Development / Tooling** | Inconsistent developer environments (e.g., Docker daemon unavailable on local workstations). | **Medium** | High | Saransh | Provide mock execution adapters and contract fixtures in `@cloud-ide/shared` allowing frontend and backend development to proceed offline without Docker. | **Mitigated** |
| **RSK-007** | **Performance / Latency** | Subsecond short-script execution requirement failing due to cold container start latency. | **High** | High | Mahak / Nikhil | Pre-warm lightweight warm container pools or reuse minimal scratch containers. Benchmark execution latency with statistical evidence. | Open |
| **RSK-008** | **Coordination / Drift** | Teammate PR merge conflicts and branch boundary violations. | **Medium** | Low | Saransh | Enforce single-owner branch rules, isolated shared types in `@cloud-ide/shared`, and mandatory review via PR against `main`. | **Mitigated** |

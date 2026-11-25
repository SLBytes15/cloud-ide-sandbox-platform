# Sandbox Security Review - 2026-11-24

## 1. Scope and evidence

This review evaluates the repository state on branch `mahak` for the sandbox/execution runtime. It distinguishes source/config evidence from runtime verification and explicitly records unavailable evidence.

Review date: 2026-11-24  
Repository: `SLBytes15/cloud-ide-sandbox-platform`  
Branch: `mahak`  
Start state: `## mahak...origin/mahak`, with no working-tree changes  
No destructive or adversarial sandbox experiments were performed.

Primary evidence:

- `services/execution/README.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/DECISIONS.md`
- `docs/DATABASE_SCHEMA.md`
- `packages/shared/src/types/execution.ts`
- `packages/shared/src/events/websocket.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/package.json`
- `apps/web/src/App.tsx`
- `package.json`

## Finding classification

1. **Verified from source/config:** repository files, package dependencies, Express routes, shared contracts, and documented architecture/settings.
2. **Not functionally tested because Docker was unavailable:** container lifecycle, namespace/cgroup enforcement, network isolation, streams, resource limits, timeout, and cleanup.
3. **Design risks requiring approval:** image, non-root identity, filesystem/mount policy, CPU/memory/PID/storage limits, network policy, capabilities/seccomp, secrets, output bounds, and cleanup.
4. **Implementation still missing:** Docker client, execution endpoint, container lifecycle, process/PTY streams, timeout orchestration, authorization, persistence, and cleanup.

## 2. Executive conclusion

The Docker/container execution boundary is **not implemented**. The repository contains planning documentation, shared TypeScript contracts, and a small environment-independent runtime orchestration foundation, but no Docker lifecycle code, process runner, PTY integration, WebSocket execution server, container cleanup implementation, or Docker integration test suite.

The repository should not be described as providing Docker or untrusted-code isolation until an execution service exists and is verified in a dedicated environment. The only enforceable result in the current state is that no execution route or runtime control path is present in the inspected API.

## 3. Docker lifecycle audit

| Lifecycle stage | Observed state | Evidence | Risk/limitation |
|---|---|---|---|
| Docker client | No Dockerode or Docker SDK dependency; no Docker CLI wrapper | `apps/api/package.json`; `services/execution/README.md`; repository search | No Engine API client exists |
| Create | Not implemented | No implementation under `services/execution` | Container state cannot be created or inspected |
| Start | Not implemented | No implementation under `services/execution` | No execution transition exists |
| Attach/execute | Not implemented | No `node-pty`, PTY, or process-execution dependency or source | No stream or process implementation exists |
| Stop | Not implemented | No signal or stop handler | Runtime stop behavior is unknown |
| Remove | Not implemented | No container removal or orphan cleanup implementation | Orphan cleanup is unknown |
| State transitions | Not implemented | Shared type defines statuses only | No state machine or persistence implementation |
| Repeated stop/remove | Not implemented | No lifecycle API | Idempotency cannot be verified |
| Daemon errors | Not implemented | No Docker client/error handling | Behavior cannot be verified |
| Timeout handling | Documentation only | `docs/SECURITY.md`; `docs/ARCHITECTURE.md` | No enforced timeout |
| Browser-to-Docker boundary | Browser cannot directly control Docker in current source | Browser only calls `/api/health`; no Docker dependency in browser | Existing browser code has no direct Docker path, but no execution authorization boundary exists |

Additional evidence: `apps/api/src/routes/index.ts` mounts only `/health` routes, and `apps/api/src/app.ts` exposes only health and 404 handlers. Therefore no execution endpoint is available for the browser or external caller.

## 4. Runtime configuration review

The following values are proposed in documentation only unless marked as source-observed. They are **not verified enforcement settings**.

| Setting | Observed/configured value | Code/config path | Verification method | Result/limitation |
|---|---|---|---|---|
| Privileged mode | No setting; documentation says to avoid it | `docs/SECURITY.md`; no runtime code | Source and dependency search | Not implemented; absent config does not prove a future secure default |
| Capabilities | No setting; documentation says `--cap-drop=ALL` | `docs/SECURITY.md` | Source search | Not implemented |
| User identity | Proposed `uid 1000` | `docs/SECURITY.md` | Documentation review | Not implemented and not verified |
| Root filesystem | Proposed read-only root filesystem | `docs/SECURITY.md`; `docs/ARCHITECTURE.md` | Documentation review | No container config exists |
| Writable temporary paths | Proposed size-capped ephemeral `tmpfs` | `docs/SECURITY.md` | Documentation review | No mounts or size limits exist |
| Bind mounts/host paths | No mount implementation or approved host-path policy | `services/execution/README.md` | Source search | No mounts exist today, but no future mount guard is implemented |
| Network mode | Proposed `--network none` for batch runs | `docs/SECURITY.md` | Documentation review | Not implemented |
| CPU | Proposed 0.5–1.0 vCPU; no runtime value | `docs/SECURITY.md` | Documentation review | Not enforced |
| Memory | Proposed 256MB–512MB; no runtime value | `docs/SECURITY.md` | Documentation review | Not enforced |
| Swap | Proposed `--memory-swap = memory`; no runtime value | `docs/SECURITY.md` | Documentation review | Not enforced |
| PIDs | Proposed `--pids-limit 64`; no runtime value | `docs/SECURITY.md` | Documentation review | Not enforced |
| Disk I/O/storage | Proposed capped ephemeral storage; no implementation | `docs/SECURITY.md` | Documentation review | Not enforced |
| seccomp | Proposed custom profile; no profile file | `docs/SECURITY.md`; `docs/ARCHITECTURE.md` | File/config search | No profile or applied option exists |
| Security options | No Docker security options | No runtime code/config | Source search | Not implemented |
| Environment/secrets | API environment values are for `NODE_ENV`, `PORT`, `CLIENT_ORIGIN`, and database configuration | `apps/api/src/config/env.ts`; `apps/api/src/config/database.ts` | Source/config review | No execution secret injection or filtering exists |
| Logs | API structured logging exists only for API lifecycle | `apps/api/src/utils/logger.ts`; `apps/api/src/server.ts` | Source review | No execution/container log collector or redaction policy exists |
| Cleanup | API shutdown closes HTTP server and disconnects database only | `apps/api/src/server.ts` | Source review | No runtime/container cleanup is wired to shutdown |

`docs/DATABASE_SCHEMA.md` proposes execution-job persistence, but no execution model or repository implementation exists.

## 5. Process and stream lifecycle audit

| Scenario | Observed behavior | Evidence | Verification result |
|---|---|---|---|
| Process start | Not implemented | No process runner or Docker source | No runtime test possible |
| stdin | No PTY or stdin implementation | No `node-pty` dependency/source | No runtime test possible |
| stdout/stderr | No stream collector | Shared WebSocket event names exist only as types | No runtime test possible |
| Exit status | Execution job type allows `exitCode`; no collector | `packages/shared/src/types/execution.ts` | No runtime test possible |
| Normal completion | Not implemented | No completion handler | No runtime test possible |
| Invalid command | Not implemented | No command validation/execution route | No runtime test possible |
| Wall-clock timeout | Not implemented | Documentation only | No runtime test possible |
| Client disconnect | No WebSocket server or disconnect handler | Repository search | No runtime test possible |
| Runtime error | No runtime error path | No execution service | No runtime test possible |
| Container/process termination | Not implemented | No lifecycle code | No runtime test possible |
| Cleanup after normal/error/timeout/disconnect | Not implemented | No cleanup code | No evidence |
| Orphan detection/recovery | Not implemented | No leases, sweeper, or orphan listing | No evidence |
| Rapid/long output | No bounded-output implementation | Shared `output?: string` is a data type only | No evidence |

An environment-independent runtime foundation was added under `services/execution`. Its fake-adapter tests cover request validation, job-state transitions, timeout, success/failure, and cleanup invocation. They do not start Docker or establish container security.

## 6. Safe resource validation

### Configuration/inspection

- `docker version` was run safely.
- Exact diagnostic: PowerShell reports `docker : The term 'docker' is not recognized as the name of a cmdlet, function, script file, or operable program.`
- This establishes CLI-missing status only; daemon availability could not be tested because the CLI is unavailable.
- No Docker daemon inspection, container listing, image pulling, or container creation was performed.
- No resource-limit or container-security options were available to inspect.

### Functional tests

- `npm run typecheck`: passed after dependencies were restored.
- `npm run build`: passed.
- Root `npm test`: could not run because no root `test` script exists.
- `npm test --workspace=@cloud-ide/execution`: passed 6 fake-adapter tests.
- Docker lifecycle, container cleanup, and isolation test suites do not exist and remain blocked.

### Adversarial tests

Not performed. Fork bombs, OOM attacks, escape payloads, network traversal, privilege escalation, and destructive resource tests are out of scope for this shared host and require an approved, dedicated isolated environment.

## 7. Threat model

| Threat | Preconditions | Mitigation required | Evidence in current repository | Residual risk |
|---|---|---|---|---|
| Container escape / host kernel compromise | Execution service is implemented with untrusted code but weak runtime/kernel isolation | Dedicated hardened runtime, patching, least privilege, seccomp, read-only filesystem, no privileged mode | ADR-004 defers execution, no runtime controls implemented | High while execution remains absent or before a dedicated runtime is verified |
| Privilege escalation | Container runs privileged or retains excessive capabilities/user namespace is misconfigured | Run unprivileged mapped user, drop all capabilities, no privileged mode, narrow seccomp | Documentation proposes these controls, but no enforcement exists | High until implementation and runtime verification |
| Host filesystem exposure | Host paths are bind-mounted or workspace mounts permit traversal | Reject host-root mounts, enforce workspace-specific mounts, validate paths, read-only mounts where appropriate | No mount implementation or policy enforcement exists | Unknown; no host mount is currently configured |
| Lateral network access/SSRF | Execution network egress remains enabled or internal network access is reachable | Default disconnected network, explicit allowlists, DNS/egress controls, metadata-blocking policy | Documentation proposes `--network none`, but no enforcement exists | High until networking is implemented and tested |
| CPU/memory/PID/storage exhaustion | Unbounded execution or missing resource limits | Enforce CPU, memory/swap, PIDs, disk/output limits and queue/capacity controls | Documentation proposes limits, but no runtime config exists | High until limits are enforced |
| Secret leakage | Secrets enter execution environment or logs, or cross-workspace environment values are reused | Minimal per-job credentials, filtering/redaction, short-lived scoped secrets, secret-free logs | API database/env configuration exists, but no execution injection or log policy exists | Unknown; no secret delivery path currently exists |
| Cross-workspace access | Missing authentication, workspace ownership, mount isolation, or shared credentials | Server-side authorization before job creation/stream, unique workspace mounts, tenant isolation | No auth/workspace/execution route implementation exists | High for the future execution phase; no execution path exists today |
| Long-running process/resource leak | Timeout, disconnect, daemon crash, or duplicate cancel leaves containers/processes | Wall-clock/inactivity timeout, lease state, sweeper, idempotent stop/remove, bounded output, orphan recovery | No execution lifecycle or cleanup implementation exists | High until lifecycle handling is verified |
| Log/output abuse | Rapid/large stdout/stderr or terminal escape sequences | Bounded output, chunk limits, rate limiting, redaction, controlled terminal rendering | No output collector or bounds exist | Unknown |

## 8. Acceptance assessment

| Acceptance item | Status | Evidence |
|---|---|---|
| Security claims map to code/config/evidence | Partially met | Claims are classified by source evidence or unavailable runtime evidence |
| Cleanup orchestration checked | Partially met | Fake-adapter success/failure/timeout tests pass; Docker/container cleanup remains blocked |
| No unsafe experiments | Met | Only CLI availability and source/config inspection were performed |
| No unapproved policy changes | Met | No architecture, security, or runtime policy was changed |
| Work on `mahak` | Met | Review performed on `mahak` |

## 9. Prerequisites for implementation

Before execution code is considered secure:

1. ADR-004 must be followed by an explicitly approved implementation design.
2. Authentication and workspace authorization must precede execution dispatch and stream access.
3. Docker Engine API and node-pty use must be confined to an isolated execution service.
4. Container defaults must define a non-privileged user, dropped capabilities, read-only root filesystem, controlled writable mounts, disabled network, resource limits, seccomp, output bounds, and secret policy.
5. Create/start/attach/execute/stop/remove handling must include idempotency and all error/timeout/disconnect paths.
6. Normal completion, timeout, cancellation, daemon loss, and process/workspace disconnect must trigger container/process cleanup and orphan recovery.
7. Runtime tests must run in a dedicated environment. Host-shared resource and adversarial tests must not be used to validate isolation.

## 10. Validation commands

| Command | Result |
|---|---|
| `git branch --show-current` | `mahak` |
| `git status --short --branch` | `## mahak...origin/mahak` |
| `docker version` | NOT RUN - exact diagnostic: Docker CLI not recognized by PowerShell |
| `npm install` | Completed; 181 packages added |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Root `npm test` | NOT RUN - no root `test` script exists |
| `npm test --workspace=@cloud-ide/execution` | Passed - 6 fake-adapter tests |

No commit or push was created. The user must perform Git review and any push/pull-request steps themselves.

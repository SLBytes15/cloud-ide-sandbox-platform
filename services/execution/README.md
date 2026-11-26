# Execution Service

## Overview
This package provides execution-job orchestration and a Docker Engine container-lifecycle adapter. Container process execution and stream collection are not connected to the API yet, and user code must not be executed directly on the API host.

## Planned capabilities
The execution service is intended to provide:
1. **Containerized Code Execution:** Utilizing the Docker Engine API to spin up short-lived, isolated runtime containers for user code.
2. **Interactive Terminal Sessions:** Orchestrating PTY allocation via `node-pty` connected through WebSockets (`ws`) to client-side `xterm.js`.
3. **Defense-in-Depth Isolation:**
   - Linux Namespaces (`pid`, `net`, `ipc`, `mnt`, `uts`, `user`)
   - Control Groups (`cgroups v2`) for strict CPU, memory, and disk I/O caps.
   - Restricted system call filtering via `seccomp` profiles.
   - Read-only root filesystems and disabled network egress by default for untrusted code execution.

## Runtime foundation and current boundary

The package contains testable runtime orchestration and a Docker Engine container-lifecycle adapter:

- validated execution request data;
- uniquely identified job records;
- pending/running/completed/failed/timeout state transitions;
- a `RuntimeAdapter` interface;
- Docker Engine create/start/stop/remove lifecycle calls with configured resource controls;
- wall-clock timeout orchestration;
- bounded stdout/stderr capture;
- cleanup invocation after success and failure.

The API's script runner intentionally refuses to execute code until a verified isolated container execution adapter is configured. It must not fall back to spawning user code as a child process on the API host. The lifecycle manager also fails closed when Docker Engine is unavailable; the mock manager is for tests and is not reported as a live runtime.

The Docker adapter configures memory, CPU, PID, read-only-root-filesystem, tmpfs, network mode, and dropped capabilities in the container create request. These are configuration-level controls only: they have not been verified against a live Docker daemon in this environment. No claim is made here about container escape resistance or production-grade isolation.

## Test status

The Node test suite uses explicit fake adapters and mock managers:

- fake-adapter success;
- fake-adapter failure;
- fake-adapter timeout and abort;
- fake-adapter cleanup assertions and repeated cleanup;
- a check that the execution runner rejects requests rather than running code on the host.

These tests verify orchestration and mock behavior only. They are **not Docker integration tests** and do not demonstrate sandbox security.

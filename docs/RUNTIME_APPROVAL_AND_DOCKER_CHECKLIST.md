# Runtime Approval Proposal and Docker Validation Checklist

## Team Approval Chat proposal

This proposal requires explicit team approval before implementation or infrastructure changes. It does not itself approve any runtime behavior.

### Proposed container runtime defaults

- Use a purpose-built, pinned runtime image; do not use the latest tag.
- Run as a mapped non-root user (target UID/GID 1000); never run privileged.
- Mount the root filesystem read-only.
- Provide only a dedicated writable work directory with a size-capped ephemeral volume or tmpfs.
- Allow no host bind mounts. Workspace and file paths must be server-generated and validated before mounting.
- Network mode defaults to `none`/no network namespace access. Any network feature requires a separate approved allowlist and metadata-endpoint block.
- Apply hard CPU, memory, swap, PID, and disk limits.
- Drop all Linux capabilities and use a restrictive seccomp profile.
- Clear inherited environment variables. Inject only explicitly approved, short-lived, workspace-scoped values; never host secrets or credentials.
- Capture stdout/stderr with total and per-chunk limits, reject binary/unsafe terminal control handling, and retain only bounded logs.
- Enforce wall-clock timeout and inactivity policy. All stop/remove operations must be idempotent.
- Clean up on normal completion, non-zero exit, timeout, cancellation, runtime error, client disconnect, and daemon loss; use orphan recovery for interrupted jobs.

### Decisions requiring approval

The team must approve each item:

1. Base image and runtime image registry.
2. Non-root UID/GID and host user namespace mapping.
3. Writable work directory implementation and storage/size limits.
4. CPU, memory, swap, PID, and disk values.
5. Network policy and any permitted egress destinations.
6. Seccomp/AppArmor profile and capability exceptions.
7. Mount layout and path-validation rules.
8. Environment and secret policy.
9. Output limits and log retention.
10. Cancellation and orphan-cleanup semantics.

## Docker-enabled validation checklist

Run only on a dedicated approved runner, not a shared development host. Mark all items NOT RUN until runtime evidence exists.

- [ ] NOT RUN - Docker CLI and daemon availability/permission evidence.
- [ ] NOT RUN - authenticated workspace request creates a unique job.
- [ ] NOT RUN - successful short-lived container execution returns stdout, stderr, exit code, and completed status.
- [ ] NOT RUN - timeout terminates the process/container and records timeout status.
- [ ] NOT RUN - non-zero exit records stderr and failed/completed status according to the approved state model.
- [ ] NOT RUN - cancellation terminates the process/container and removes resources.
- [ ] NOT RUN - oversized stdout/stderr is truncated and does not exhaust memory/disk.
- [ ] NOT RUN - cleanup succeeds after success.
- [ ] NOT RUN - cleanup succeeds after timeout and adapter/runtime failure.
- [ ] NOT RUN - cleanup handles duplicate stop/remove requests without errors.
- [ ] NOT RUN - orphan/container recovery is verified after simulated daemon or worker loss.
- [ ] NOT RUN - container runs non-root with all capabilities dropped.
- [ ] NOT RUN - root filesystem is read-only and only approved writable paths accept writes.
- [ ] NOT RUN - memory limit triggers without host impact.
- [ ] NOT RUN - CPU limit is effective.
- [ ] NOT RUN - PID limit prevents fork-bomb host impact.
- [ ] NOT RUN - network access is disabled or matches the approved allowlist.
- [ ] NOT RUN - seccomp blocks denied syscalls.
- [ ] NOT RUN - mount traversal and host-path escape attempts are denied.
- [ ] NOT RUN - inherited/secrets/environment leakage is absent.

Destructive/adversarial tests require separate written authorization and a controlled disposable environment.

# Frontend Execution Readiness — 2026-11-25

## Scope

- Owner: Swathi, Frontend / IDE Experience
- Working branch: `swathi`
- Starting local commit: `dc9b3f3` (`fix(frontend): harden workspace and terminal UX`)
- Latest `main` inspected on GitHub: `144f60d` (`Merge pull request #8 from SLBytes15/mahak`)
- This pass changes frontend execution readiness only. It does not change API, authentication, tenant isolation, or runtime implementation.

## Contract and runtime findings

- `docs/API_CONTRACTS.md` documents health, workspace, and file endpoints, but no execution request or response contract.
- `packages/shared/src/types/execution.ts` defines `ExecutionRequest` with `workspaceId`, optional `entryFile`, and optional `command`; `ExecutionStatus` is `pending`, `running`, `completed`, `failed`, or `timeout`.
- Current API source has `POST /api/v1/workspaces/:id/execute` and reads `code`, `runtime`, and optional `timeoutMs` from the request body. The execution service currently starts a host process with `child_process.spawn`; Docker isolation is not part of this path.
- The current endpoint and shared request type therefore do not agree, and the implementation does not establish an isolated runtime. The frontend does not submit code to this endpoint while the API contract and runtime boundary are unresolved.
- No stop/cancel operation is exposed by the current API contract. The UI does not offer a stop control or claim a cancelled state.

## Changes

- Added a one-shot execution panel separate from the interactive terminal.
- Added UI labels for idle, pending, running, completed, failed, timeout, and request-error presentation. These are display states only; no backend result is fabricated.
- Disabled **Run** and added a visible explanation that the execution contract and isolated runtime are pending. The panel warns against running untrusted code through the current backend path.
- Added output/error presentation helpers that avoid displaying identical error text twice.
- Added focused frontend tests for supported state labels and output rendering.

## Verification

- `npm.cmd --workspace @cloud-ide/web run test`: passed, 8 tests.
- `npm.cmd --workspace @cloud-ide/web run typecheck`: passed.
- `npm.cmd --workspace @cloud-ide/web run build`: Vite's default config loader failed because this environment denied access while reading a parent directory outside the workspace. After the passing typecheck, `npm.cmd exec --workspace @cloud-ide/web -- vite build --configLoader runner` passed. Vite emitted its existing large-chunk warning (main JS about 4.75 MB raw / 1.25 MB gzip; TypeScript worker about 7.09 MB raw).
- `git diff --check`: passed; Git printed only its standard LF-to-CRLF notice for the test file.
- No frontend lint script is defined in `apps/web/package.json`.
- No browser screenshot or live API execution was performed. The backend execution path was deliberately left disconnected pending contract and isolation agreement.

## Coordination and blockers

- The current environment does not expose the team's approval chat. Contract questions were posted on the relevant merged PR discussions: [Backend PR #6](https://github.com/SLBytes15/cloud-ide-sandbox-platform/pull/6) and [Sandbox PR #8](https://github.com/SLBytes15/cloud-ide-sandbox-platform/pull/8). No approval was received during this pass.
- Contract clarification is still needed from Backend and Sandbox owners: agree on the request/response shape, supported status/output fields, and the isolated execution boundary before enabling Run.
- `git fetch origin` could not update local refs because this environment denied write access to `.git/FETCH_HEAD`. The latest `main` commit and source files were inspected through the connected GitHub repository instead. Sync `swathi` with `origin/main` from the local terminal before pushing these changes.

## Next step

After the team documents and approves the execution contract and runtime boundary, enable the smallest matching frontend path and add request/error/output tests against that exact schema.

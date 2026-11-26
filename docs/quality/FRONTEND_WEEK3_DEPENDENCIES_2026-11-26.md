# Frontend Week 3 Dependency Map — 2026-11-26

Owner: Swathi (frontend / IDE experience)

This map records the interfaces visible in the repository and the work still needed before each Week 3 feature can be integrated. It does not approve a new API or claim runtime/security validation.

| Feature | Existing frontend/backend interfaces | Dependencies before frontend integration |
| --- | --- | --- |
| LSP proxy over WebSockets | The API server mounts `/ws/lsp` (`apps/api/src/services/lspProxy.ts`). The architecture describes JSON-RPC over WebSockets to Monaco. | Agree on authentication, workspace/language selection, JSON-RPC framing and reconnect/error behavior. Confirm the proxy connects to the intended language server and define the Monaco client lifecycle (document open/change/close, diagnostics, completion). The current proxy source is a scaffold and no LSP WebSocket client/provider is wired in `apps/web`. |
| Short-script execution with incremental logs | Shared types define execution job status and result fields (`packages/shared/src/types/execution.ts`). Shared WebSocket declarations define `execution:start`, `execution:chunk`, and `execution:done` payloads (`packages/shared/src/events/websocket.ts`). The runtime runner accepts an `onChunk` callback (`services/execution/src/scriptRunner.ts`). | Publish one approved request, response, and stream contract, including endpoint, auth/workspace checks, output limits, errors, and terminal status. Wire the runner callback to an authenticated event publisher and agree on how HTTP completion relates to stream completion. `docs/API_CONTRACTS.md` still has no execution endpoint; current API code reads `code`, `runtime`, and `timeoutMs`, unlike shared `ExecutionRequest` (`workspaceId`, `entryFile`, `command`). The current runner uses host `spawn`, so the route is not evidence of isolated execution. Keep the Run action disabled until the contract and execution boundary are approved and verified. |
| Yjs pair programming | The shared WebSocket types declare `collaboration:sync` with a base64 update, and the API mounts `/ws/collaboration` (`apps/api/src/services/collaborationRoom.ts`). | Add and approve a Yjs document/provider lifecycle, update encoding/decoding and awareness/presence messages, plus workspace authorization and reconnect/snapshot behavior. The repository has a relay-shaped collaboration socket but no Yjs package or frontend editor binding; the current event alone is not a complete Yjs protocol. |

## Evidence and scope

- Week 3 feature names are taken from `docs/FINAL_REVIEW_REPORT.md` and the existing architecture and shared event declarations; no separate official brief is present in this checkout.
- This frontend change is limited to execution output-panel empty-state resilience. It does not submit code, add an endpoint, add a WebSocket path, or change backend/runtime files.
- `ExecutionPanel` now accepts the shared `ExecutionJob` type through a typed view adapter. This is a model-to-display boundary only; it is not wired to the current route because that route's request/response contract is unresolved.
- Accessibility/responsive review: toolbar and close controls are native buttons (keyboard operable), the execution status uses a polite live region, request errors use an alert, and the existing narrow-screen CSS reduces panel height and hides the long workspace/file label. No browser or screen-reader run was performed.
- Verification: `npm.cmd --workspace @cloud-ide/web run test` passed 10/10; `npm.cmd --workspace @cloud-ide/web run typecheck` passed. The normal build command hit a parent-directory access denial; `npm.cmd exec --workspace @cloud-ide/web -- vite build --configLoader runner` passed, with Vite's existing large-chunk warning.
- Once the owners approve the execution request/response and runtime boundary, the next frontend slice can add API and stream wiring plus request/error/stream tests using fixtures from that approved contract.

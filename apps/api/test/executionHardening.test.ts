import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateExecutionInput,
  executeCode,
  ALLOWED_RUNTIMES,
  MIN_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MS,
  activeWorkspaceExecutions,
  isWorkspaceExecuting,
} from '../src/controllers/execution.controller.js';
import {
  inMemoryFiles,
  deleteFallbackFilesByWorkspace,
  deleteFile,
  buildFileTree,
} from '../src/controllers/file.controller.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { BadRequestError, ConflictError } from '../src/utils/errors.js';
import type { FileNode } from '@cloud-ide/shared';

function createMockExpress(body: any = {}, params: any = {}) {
  const req: any = {
    method: 'POST',
    path: '/api/v1/workspaces/execute',
    params,
    body,
    user: { id: 'usr_test_nithin', tenantId: 'tenant_zaalima' },
  };

  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };

  let nextCalledWith: any = null;
  const next = (err?: any) => {
    nextCalledWith = err;
  };

  return { req, res, next, getNextErr: () => nextCalledWith };
}

describe('Execution Job API Foundation & Input Validation (Task 1.D)', () => {
  it('should export approved runtime whitelist and timeout boundaries', () => {
    assert.deepEqual(ALLOWED_RUNTIMES, ['node', 'python', 'cpp', 'go', 'rust']);
    assert.equal(MIN_TIMEOUT_MS, 100);
    assert.equal(MAX_TIMEOUT_MS, 30000);
    assert.equal(DEFAULT_TIMEOUT_MS, 5000);
  });

  it('should accept valid execution input with defaults', () => {
    const input = validateExecutionInput('ws_test_01', {
      code: 'console.log("hello world");',
    });

    assert.equal(input.workspaceId, 'ws_test_01');
    assert.equal(input.runtime, 'node');
    assert.equal(input.code, 'console.log("hello world");');
    assert.equal(input.timeoutMs, 5000);
  });

  it('should accept all approved runtimes with custom timeouts', () => {
    for (const runtime of ALLOWED_RUNTIMES) {
      const input = validateExecutionInput('ws_test_01', {
        code: 'print("hello")',
        runtime,
        timeoutMs: 10000,
      });
      assert.equal(input.runtime, runtime);
      assert.equal(input.timeoutMs, 10000);
    }
  });

  it('should fall back to ws_default when workspaceId is missing', () => {
    const input = validateExecutionInput(undefined, {
      code: 'console.log("no workspace");',
    });
    assert.equal(input.workspaceId, 'ws_default');
  });

  it('should reject non-object body payload', () => {
    assert.throws(
      () => validateExecutionInput('ws_test_01', 'string-payload' as any),
      (err: any) => err instanceof BadRequestError && err.message.includes('valid JSON object')
    );
    assert.throws(
      () => validateExecutionInput('ws_test_01', ['array-payload'] as any),
      (err: any) => err instanceof BadRequestError && err.message.includes('valid JSON object')
    );
  });

  it('should reject missing, empty, or whitespace-only code', () => {
    assert.throws(
      () => validateExecutionInput('ws_test_01', {}),
      (err: any) => err instanceof BadRequestError && err.message.includes('code" is required')
    );
    assert.throws(
      () => validateExecutionInput('ws_test_01', { code: 12345 }),
      (err: any) => err instanceof BadRequestError && err.message.includes('must be a string')
    );
    assert.throws(
      () => validateExecutionInput('ws_test_01', { code: '   \n\t  ' }),
      (err: any) => err instanceof BadRequestError && err.message.includes('must not be empty')
    );
  });

  it('should reject code containing NUL byte injection', () => {
    assert.throws(
      () => validateExecutionInput('ws_test_01', { code: 'console.log("bad\0payload");' }),
      (err: any) => err instanceof BadRequestError && err.message.includes('NUL character')
    );
  });

  it('should reject unsupported runtimes', () => {
    const invalidRuntimes = ['ruby', 'bash', 'php', 'powershell', 'sh'];
    for (const runtime of invalidRuntimes) {
      assert.throws(
        () => validateExecutionInput('ws_test_01', { code: 'echo test', runtime }),
        (err: any) => err instanceof BadRequestError && err.message.includes('Invalid runtime')
      );
    }
  });

  it('should reject out-of-range, non-integer, or non-numeric timeoutMs', () => {
    const invalidTimeouts = [-1, 0, 50, 30001, 100000, 'not-a-number', 1500.5];
    for (const timeoutMs of invalidTimeouts) {
      assert.throws(
        () => validateExecutionInput('ws_test_01', { code: 'console.log(1)', timeoutMs }),
        (err: any) => err instanceof BadRequestError && err.message.includes('timeoutMs')
      );
    }
  });

  it('should handle executeCode controller invocation and route execution failure cleanly', async () => {
    const { req, res, next, getNextErr } = createMockExpress(
      { code: 'console.log(1);', runtime: 'node' },
      { id: 'ws_nithin_01' }
    );

    await executeCode(req, res, next);

    const err = getNextErr();
    assert.ok(err, 'Expected error forwarded to next() when runtime adapter is unavailable');
    assert.equal(err.name, 'RuntimeUnavailableError');
    assert.equal(err.statusCode, 503);
    assert.equal(err.code, 'RUNTIME_UNAVAILABLE');

    // Verify errorHandler outputs structured 503 response envelope
    errorHandler(err, req, res, next);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'RUNTIME_UNAVAILABLE');
    assert.ok(res.body.error.message.includes('Isolated code execution is unavailable'));
  });

  it('should reject duplicate execution requests when an execution is already in flight for the workspace', async () => {
    const wsId = 'ws_duplicate_test';
    // Manually mark workspace as executing
    activeWorkspaceExecutions.add(wsId);
    assert.equal(isWorkspaceExecuting(wsId), true);

    const { req, res, next, getNextErr } = createMockExpress(
      { code: 'console.log("duplicate");', runtime: 'node' },
      { id: wsId }
    );

    await executeCode(req, res, next);

    const err = getNextErr();
    assert.ok(err, 'Expected duplicate execution to be rejected');
    assert.ok(err instanceof ConflictError);
    assert.equal(err.statusCode, 409);
    assert.equal(err.code, 'CONFLICT');
    assert.ok(err.message.includes('already in progress'));

    // Clean up
    activeWorkspaceExecutions.delete(wsId);
    assert.equal(isWorkspaceExecuting(wsId), false);
  });

  it('should release workspace execution lock in finally block even when execution fails', async () => {
    const wsId = 'ws_lock_cleanup_test';
    const { req, res, next } = createMockExpress(
      { code: 'console.log("cleanup test");', runtime: 'node' },
      { id: wsId }
    );

    await executeCode(req, res, next);

    // Verify lock is cleared after execution throws RuntimeUnavailableError
    assert.equal(isWorkspaceExecuting(wsId), false);
    assert.equal(activeWorkspaceExecutions.has(wsId), false);
  });
});

describe('Fallback File Storage Idempotency & Cascade Deletion (Task 1.B)', () => {
  it('should handle deleteFallbackFilesByWorkspace idempotently without throwing', () => {
    const testWsId = 'ws_idempotency_test';

    // 1. Initial delete on nonexistent workspace
    const res1 = deleteFallbackFilesByWorkspace(testWsId);
    assert.equal(res1, false);

    // 2. Add files
    inMemoryFiles.set(testWsId, [
      {
        id: 'file_01',
        workspaceId: testWsId,
        name: 'index.ts',
        path: '/index.ts',
        type: 'file',
        size: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    assert.equal(inMemoryFiles.has(testWsId), true);

    // 3. First delete: returns true
    const res2 = deleteFallbackFilesByWorkspace(testWsId);
    assert.equal(res2, true);
    assert.equal(inMemoryFiles.has(testWsId), false);

    // 4. Repeated delete: returns false, does not throw or corrupt state
    const res3 = deleteFallbackFilesByWorkspace(testWsId);
    assert.equal(res3, false);

    // 5. Deleting with null, undefined, or empty string is safe
    assert.equal(deleteFallbackFilesByWorkspace(null as any), false);
    assert.equal(deleteFallbackFilesByWorkspace(undefined as any), false);
    assert.equal(deleteFallbackFilesByWorkspace(''), false);
  });

  it('should cascade delete directory and all descendants in fallback storage', async () => {
    const wsId = 'ws_cascade_deep';
    const initialFiles: FileNode[] = [
      {
        id: 'dir_src',
        workspaceId: wsId,
        name: 'src',
        path: '/src',
        type: 'directory',
        size: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'dir_comp',
        workspaceId: wsId,
        name: 'components',
        path: '/src/components',
        type: 'directory',
        parentId: 'dir_src',
        size: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'file_button',
        workspaceId: wsId,
        name: 'Button.tsx',
        path: '/src/components/Button.tsx',
        type: 'file',
        parentId: 'dir_comp',
        size: 150,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'file_readme',
        workspaceId: wsId,
        name: 'README.md',
        path: '/README.md',
        type: 'file',
        parentId: null,
        size: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    inMemoryFiles.set(wsId, initialFiles);

    // Delete directory /src (fileId: dir_src)
    const { req, res, next } = createMockExpress({}, { fileId: 'dir_src' });
    await deleteFile(req, res, next);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);

    const remaining = inMemoryFiles.get(wsId) || [];
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'file_readme');
    assert.equal(remaining[0].name, 'README.md');

    // Clean up
    deleteFallbackFilesByWorkspace(wsId);
  });

  it('should recover orphaned files at root without throwing in tree generation', () => {
    const files: FileNode[] = [
      {
        id: 'f_valid',
        workspaceId: 'ws_orphan',
        name: 'valid.ts',
        path: '/valid.ts',
        type: 'file',
        parentId: null,
        size: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'f_orphaned',
        workspaceId: 'ws_orphan',
        name: 'orphaned.ts',
        path: '/orphaned.ts',
        type: 'file',
        parentId: 'non_existent_parent_id',
        size: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const tree = buildFileTree(files);
    assert.equal(tree.length, 2);
    assert.ok(tree.some((t) => t.id === 'f_valid'));
    assert.ok(tree.some((t) => t.id === 'f_orphaned'));
  });

  it('should prevent circular parent references and self-referencing parents from crashing JSON serialization', () => {
    const cyclicalFiles: FileNode[] = [
      {
        id: 'node_self',
        workspaceId: 'ws_cycle',
        name: 'self.ts',
        path: '/self.ts',
        type: 'file',
        parentId: 'node_self', // self-referencing parentId
        size: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'node_a',
        workspaceId: 'ws_cycle',
        name: 'a',
        path: '/a',
        type: 'directory',
        parentId: 'node_b', // Cycle: A -> B -> A
        size: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'node_b',
        workspaceId: 'ws_cycle',
        name: 'b',
        path: '/b',
        type: 'directory',
        parentId: 'node_a', // Cycle: B -> A
        size: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const tree = buildFileTree(cyclicalFiles);
    assert.ok(Array.isArray(tree));
    // Verify JSON serialization does not throw TypeError (converting circular structure)
    assert.doesNotThrow(() => JSON.stringify(tree));
  });

  it('should trim whitespace when deleting fallback files by workspace ID', () => {
    const wsId = 'ws_padded_test';
    inMemoryFiles.set(wsId, [
      {
        id: 'f_pad',
        workspaceId: wsId,
        name: 'test.ts',
        path: '/test.ts',
        type: 'file',
        size: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    assert.equal(inMemoryFiles.has(wsId), true);
    // Delete using padded string
    const deleted = deleteFallbackFilesByWorkspace(`  ${wsId}  `);
    assert.equal(deleted, true);
    assert.equal(inMemoryFiles.has(wsId), false);
  });
});

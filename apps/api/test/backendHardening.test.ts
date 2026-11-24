import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { buildFileTree, inMemoryFiles, deleteFallbackFilesByWorkspace } from '../src/controllers/file.controller.js';

function createMockExpress() {
  const req: any = { method: 'GET', path: '/test' };
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
  const next = () => {};
  return { req, res, next };
}

describe('Backend Hardening, Error Resilience & Data Integrity (Week 1–4 Verification)', () => {
  it('should format Mongoose CastError as 400 INVALID_ID_FORMAT', () => {
    const { req, res, next } = createMockExpress();
    const castError: any = new Error('Cast to ObjectId failed');
    castError.name = 'CastError';
    castError.value = 'invalid_hex_id_123';

    errorHandler(castError, req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_ID_FORMAT');
    assert.ok(res.body.error.message.includes('invalid_hex_id_123'));
  });

  it('should format Mongoose ValidationError as 400 VALIDATION_ERROR', () => {
    const { req, res, next } = createMockExpress();
    const valError: any = new Error('Workspace validation failed: name is required');
    valError.name = 'ValidationError';
    valError.errors = { name: { message: 'name is required' } };

    errorHandler(valError, req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('should format MongoDB duplicate key error (11000) as 409 CONFLICT', () => {
    const { req, res, next } = createMockExpress();
    const dupError: any = new Error('E11000 duplicate key error');
    dupError.code = 11000;

    errorHandler(dupError, req, res, next);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('duplicate key'));
  });

  it('should format JSON SyntaxError from body parser as 400 MALFORMED_JSON', () => {
    const { req, res, next } = createMockExpress();
    const syntaxErr: any = new SyntaxError('Unexpected token in JSON');
    syntaxErr.status = 400;
    syntaxErr.body = '{"bad_json": }';

    errorHandler(syntaxErr, req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'MALFORMED_JSON');
    assert.equal(res.body.error.message, 'Malformed JSON payload in request body');
  });

  it('should suppress stack traces and internal errors in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const { req, res, next } = createMockExpress();
      const internalErr = new Error('Database password failed: supersecret123');

      errorHandler(internalErr as any, req, res, next);

      assert.equal(res.statusCode, 500);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INTERNAL_SERVER_ERROR');
      assert.equal(res.body.error.message, 'An unexpected internal error occurred');
      assert.equal(res.body.error.details, undefined);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('should build deeply nested file trees and handle orphaned items gracefully', () => {
    const files = [
      { id: 'dir_a', name: 'src', path: '/src', type: 'directory' as const, parentId: null },
      { id: 'dir_b', name: 'components', path: '/src/components', type: 'directory' as const, parentId: 'dir_a' },
      { id: 'file_c', name: 'App.tsx', path: '/src/components/App.tsx', type: 'file' as const, parentId: 'dir_b' },
      { id: 'file_orphan', name: 'orphan.ts', path: '/orphan.ts', type: 'file' as const, parentId: 'non_existent_dir' },
    ];

    const tree = buildFileTree(files);

    assert.equal(tree.length, 2); // 'src' directory and 'orphan.ts' placed at root
    const src = tree.find((t) => t.id === 'dir_a');
    assert.ok(src);
    assert.equal(src.children?.length, 1);
    assert.equal(src.children?.[0].id, 'dir_b');
    assert.equal(src.children?.[0].children?.length, 1);
    assert.equal(src.children?.[0].children?.[0].id, 'file_c');

    const orphan = tree.find((t) => t.id === 'file_orphan');
    assert.ok(orphan); // Orphaned node recovered at root without throwing
  });

  it('should clean up fallback store files upon workspace cascade deletion', () => {
    const testWsId = 'ws_cascade_test_01';
    inMemoryFiles.set(testWsId, [
      {
        id: 'file_test_01',
        workspaceId: testWsId,
        name: 'test.ts',
        path: '/test.ts',
        type: 'file',
        size: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    assert.ok(inMemoryFiles.has(testWsId));
    assert.equal(inMemoryFiles.get(testWsId)?.length, 1);

    // Call cascade cleanup
    deleteFallbackFilesByWorkspace(testWsId);

    assert.equal(inMemoryFiles.has(testWsId), false);
  });
});

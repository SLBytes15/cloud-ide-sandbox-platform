import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAndValidatePath } from '../src/utils/pathSecurity.js';
import {
  createFile,
  deleteFile,
  inMemoryFiles,
} from '../src/controllers/file.controller.js';

function createMockExpress(body: any = {}, params: any = {}) {
  const req: any = { body, params };
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
  return { req, res };
}

describe('Path Normalization, Traversal Rejection & File Integrity (25 Nov Verification)', () => {
  it('should normalize standard paths with clean leading slash', () => {
    const res1 = normalizeAndValidatePath('src/index.ts');
    assert.equal(res1.valid, true);
    if (res1.valid) assert.equal(res1.path, '/src/index.ts');

    const res2 = normalizeAndValidatePath('/components/Button.tsx');
    assert.equal(res2.valid, true);
    if (res2.valid) assert.equal(res2.path, '/components/Button.tsx');
  });

  it('should normalize Windows backslashes and collapse redundant slashes', () => {
    const res1 = normalizeAndValidatePath('src\\utils\\helper.ts');
    assert.equal(res1.valid, true);
    if (res1.valid) assert.equal(res1.path, '/src/utils/helper.ts');

    const res2 = normalizeAndValidatePath('///deep///nested////file.ts');
    assert.equal(res2.valid, true);
    if (res2.valid) assert.equal(res2.path, '/deep/nested/file.ts');
  });

  it('should strictly reject path traversal sequences (.. and .)', () => {
    const badPaths = [
      '../etc/passwd',
      '/src/../../secret.env',
      'components/../utils/../../root.key',
      '/./hidden.ts',
      '..\\windows\\system32',
    ];

    for (const p of badPaths) {
      const res = normalizeAndValidatePath(p);
      assert.equal(res.valid, false, `Expected path "${p}" to be rejected`);
      if (!res.valid) {
        assert.equal(res.code, 'PATH_TRAVERSAL_DETECTED');
      }
    }
  });

  it('should reject URL-encoded traversal sequences (%2e%2e)', () => {
    const res = normalizeAndValidatePath('/src/%2e%2e/config.json');
    assert.equal(res.valid, false);
    if (!res.valid) {
      assert.equal(res.code, 'PATH_TRAVERSAL_DETECTED');
    }
  });

  it('should reject null byte injection attempts', () => {
    const res1 = normalizeAndValidatePath('/safe/path.ts\0.exe');
    assert.equal(res1.valid, false);
    if (!res1.valid) assert.equal(res1.code, 'NULL_BYTE_DETECTED');

    const res2 = normalizeAndValidatePath('/safe/path.ts%00.exe');
    assert.equal(res2.valid, false);
    if (!res2.valid) assert.equal(res2.code, 'NULL_BYTE_DETECTED');
  });

  it('should reject empty path, root targeting, and oversized paths', () => {
    assert.equal(normalizeAndValidatePath('').valid, false);
    assert.equal(normalizeAndValidatePath('   ').valid, false);
    assert.equal(normalizeAndValidatePath('/').valid, false);
    assert.equal(normalizeAndValidatePath('/' + 'a'.repeat(501)).valid, false);
  });

  it('should enforce duplicate path conflict rejection in fallback store mode', async () => {
    const wsId = 'ws_duplicate_test_store';
    inMemoryFiles.set(wsId, []);

    const { req: req1, res: res1 } = createMockExpress(
      { name: 'app.ts', path: '/src/app.ts', type: 'file', content: 'console.log(1)' },
      { id: wsId }
    );
    let nextErr1: any = null;
    await createFile(req1, res1, (err) => { nextErr1 = err; });

    assert.equal(res1.statusCode, 201);
    assert.equal(res1.body.success, true);
    assert.equal(nextErr1, null);

    // Attempt to create duplicate path in same workspace
    const { req: req2, res: res2 } = createMockExpress(
      { name: 'app.ts', path: '/src/app.ts', type: 'file', content: 'console.log(2)' },
      { id: wsId }
    );
    let nextErr2: any = null;
    await createFile(req2, res2, (err) => { nextErr2 = err; });

    // Must trigger 409 ConflictError
    assert.ok(nextErr2);
    assert.equal(nextErr2.statusCode, 409);
    assert.equal(nextErr2.code, 'CONFLICT');
    assert.ok(nextErr2.message.includes('already exists'));
  });

  it('should recursively clean up descendant files when a directory is deleted in fallback store', async () => {
    const wsId = 'ws_dir_cascade_store';
    const dirId = 'dir_nested_src';

    inMemoryFiles.set(wsId, [
      {
        id: dirId,
        workspaceId: wsId,
        name: 'src',
        path: '/src',
        type: 'directory',
        size: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'file_child_1',
        workspaceId: wsId,
        name: 'index.ts',
        path: '/src/index.ts',
        type: 'file',
        size: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'file_child_2',
        workspaceId: wsId,
        name: 'helper.ts',
        path: '/src/utils/helper.ts',
        type: 'file',
        size: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'file_sibling',
        workspaceId: wsId,
        name: 'README.md',
        path: '/README.md',
        type: 'file',
        size: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const { req, res } = createMockExpress({}, { fileId: dirId });
    let nextErr: any = null;
    await deleteFile(req, res, (err) => { nextErr = err; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, dirId);
    assert.equal(nextErr, null);

    const remaining = inMemoryFiles.get(wsId) || [];
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].name, 'README.md');
    assert.equal(remaining[0].path, '/README.md');
  });
});

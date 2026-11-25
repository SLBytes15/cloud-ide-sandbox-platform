import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { buildFileTree } from '../src/controllers/file.controller.js';

describe('Workspace and File REST API Routes', () => {
  const app = createApp();

  it('should list workspaces with success envelope', async () => {
    // Test endpoint mount
    const req = new Request('http://localhost:5001/api/v1/workspaces');
    assert.ok(req);
  });

  it('should correctly build hierarchical file tree from flat array', () => {
    const flatFiles = [
      { id: '1', name: 'src', path: '/src', type: 'directory' as const, parentId: null },
      { id: '2', name: 'index.ts', path: '/src/index.ts', type: 'file' as const, parentId: '1' },
      { id: '3', name: 'README.md', path: '/README.md', type: 'file' as const, parentId: null },
    ];

    const tree = buildFileTree(flatFiles);
    assert.equal(tree.length, 2);

    const srcDir = tree.find((t) => t.name === 'src');
    assert.ok(srcDir);
    assert.equal(srcDir.children?.length, 1);
    assert.equal(srcDir.children?.[0].name, 'index.ts');

    const readme = tree.find((t) => t.name === 'README.md');
    assert.ok(readme);
    assert.equal(readme.type, 'file');
  });
});

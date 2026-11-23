import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mockUser,
  mockWorkspaceSummaries,
  mockCreateWorkspacePayload,
  mockFileNodes,
  mockFileTree,
  mockExecutionJob,
  mockHealthResponse,
  mockTerminalInputMessage,
  mockTerminalOutputMessage,
  mockTerminalResizeMessage,
  mockExecutionStartMessage,
  mockExecutionChunkMessage,
  mockExecutionDoneMessage,
} from '@cloud-ide/shared';
import { validateCreateWorkspaceDTO } from '../src/utils/workspaceValidation.js';

describe('Shared Contracts & Mock Fixtures Verification', () => {
  it('should export valid user fixture with expected shape', () => {
    assert.equal(typeof mockUser.id, 'string');
    assert.equal(typeof mockUser.username, 'string');
    assert.equal(typeof mockUser.email, 'string');
    assert.ok(mockUser.email.includes('@'));
  });

  it('should export valid workspace summaries with supported runtimes', () => {
    assert.ok(mockWorkspaceSummaries.length >= 2);
    for (const ws of mockWorkspaceSummaries) {
      assert.ok(['node', 'python', 'cpp', 'go', 'rust'].includes(ws.runtime));
      assert.equal(typeof ws.name, 'string');
      assert.equal(typeof ws.ownerId, 'string');
    }
  });

  it('should pass validation for mockCreateWorkspacePayload', () => {
    const validated = validateCreateWorkspaceDTO(mockCreateWorkspacePayload);
    assert.equal(validated.valid, true);
    if (validated.valid) {
      assert.equal(validated.value.name, mockCreateWorkspacePayload.name);
      assert.equal(validated.value.runtime, mockCreateWorkspacePayload.runtime);
    }
  });

  it('should export valid file nodes and tree structure', () => {
    assert.ok(mockFileNodes.length > 0);
    assert.ok(mockFileTree.length > 0);
    const rootDir = mockFileTree.find((item) => item.name === 'src');
    assert.ok(rootDir);
    assert.equal(rootDir.type, 'directory');
    assert.ok(Array.isArray(rootDir.children));
  });

  it('should export valid execution job and WebSocket messages', () => {
    assert.equal(mockExecutionJob.status, 'completed');
    assert.equal(mockTerminalInputMessage.event, 'terminal:input');
    assert.equal(mockTerminalOutputMessage.event, 'terminal:output');
    assert.equal(mockTerminalResizeMessage.event, 'terminal:resize');
    assert.equal(mockExecutionStartMessage.event, 'execution:start');
    assert.equal(mockExecutionChunkMessage.event, 'execution:chunk');
    assert.equal(mockExecutionDoneMessage.event, 'execution:done');
    assert.equal(mockHealthResponse.status, 'healthy');
  });
});

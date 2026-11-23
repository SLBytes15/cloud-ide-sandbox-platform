import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockContainerLifecycleManager } from '../src/mockManager.js';
import { DEFAULT_ISOLATION_LIMITS, getDockerHostConfig } from '../src/dockerDefaults.js';

describe('Container Lifecycle Manager & Isolation Controls (ADR-009)', () => {
  const manager = new MockContainerLifecycleManager();

  it('should enforce strict resource limits and security profile', () => {
    assert.equal(DEFAULT_ISOLATION_LIMITS.memoryBytes, 536870912); // 512MB
    assert.equal(DEFAULT_ISOLATION_LIMITS.nanoCpus, 1000000000); // 1.0 vCPU
    assert.equal(DEFAULT_ISOLATION_LIMITS.pidsLimit, 64);
    assert.equal(DEFAULT_ISOLATION_LIMITS.readOnlyRootfs, true);
    assert.equal(DEFAULT_ISOLATION_LIMITS.networkMode, 'none');
    assert.equal(DEFAULT_ISOLATION_LIMITS.user, '1000:1000');

    const hostConfig = getDockerHostConfig(DEFAULT_ISOLATION_LIMITS);
    assert.deepEqual(hostConfig.CapDrop, ['ALL']);
    assert.equal(hostConfig.ReadonlyRootfs, true);
    assert.ok(hostConfig.Tmpfs['/tmp']);
    assert.ok(hostConfig.Tmpfs['/workspace']);
  });

  it('should create an ephemeral container instance in created state', async () => {
    const container = await manager.createContainer({
      workspaceId: 'ws_test_week1',
      runtime: 'node',
    });

    assert.ok(container.id.startsWith('mock_cnt_'));
    assert.equal(container.workspaceId, 'ws_test_week1');
    assert.equal(container.runtime, 'node');
    assert.equal(container.state, 'created');
    assert.equal(container.limits.memoryBytes, 536870912);
  });

  it('should start and transition container to running state', async () => {
    const container = await manager.createContainer({
      workspaceId: 'ws_test_week1',
      runtime: 'python',
    });

    const started = await manager.startContainer(container.id);
    assert.equal(started.state, 'running');
    assert.ok(started.startedAt);
  });

  it('should stop and remove container cleanly', async () => {
    const container = await manager.createContainer({
      workspaceId: 'ws_test_week1',
      runtime: 'cpp',
    });

    await manager.startContainer(container.id);
    const stopped = await manager.stopContainer(container.id);
    assert.equal(stopped.state, 'stopped');

    const removed = await manager.removeContainer(container.id);
    assert.equal(removed, true);

    const lookup = await manager.getContainer(container.id);
    assert.equal(lookup, null);
  });

  it('should cleanup all active containers during shutdown', async () => {
    await manager.createContainer({ workspaceId: 'ws_1', runtime: 'node' });
    await manager.createContainer({ workspaceId: 'ws_2', runtime: 'go' });

    const activeBefore = await manager.listActiveContainers();
    assert.ok(activeBefore.length >= 2);

    const cleaned = await manager.cleanupAll();
    assert.ok(cleaned >= 2);

    const activeAfter = await manager.listActiveContainers();
    assert.equal(activeAfter.length, 0);
  });
});

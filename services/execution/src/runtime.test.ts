import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ExecutionJobManager,
  ExecutionRuntime,
  ExecutionTimeoutError,
  ExecutionValidationError,
  validateExecutionRequest,
  type ExecutionJob,
  type RuntimeAdapter,
  type RuntimeResult
} from './runtime.js';

class FakeRuntimeAdapter implements RuntimeAdapter {
  cleanedUp: string[] = [];
  constructor(private readonly result: RuntimeResult | Error) {}

  async run(_job: ExecutionJob, _signal: AbortSignal): Promise<RuntimeResult> {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }

  async cleanup(jobId: string): Promise<void> {
    this.cleanedUp.push(jobId);
  }
}

test('request validation rejects missing workspace and unsafe NUL values', () => {
  assert.throws(
    () => validateExecutionRequest({ workspaceId: '' }),
    ExecutionValidationError
  );
  assert.throws(
    () => validateExecutionRequest({ workspaceId: 'ws-1', command: 'echo ok\0' }),
    ExecutionValidationError
  );
});

test('job manager creates unique pending jobs and records state transitions', () => {
  let sequence = 0;
  const manager = new ExecutionJobManager(
    () => `job-${++sequence}`,
    () => Date.parse('2026-11-25T12:00:00.000Z')
  );
  const job = manager.create({ workspaceId: 'ws-1', command: 'echo hello' });

  assert.equal(job.status, 'pending');
  assert.equal(job.id, 'job-1');
  assert.equal(manager.transition(job.id, 'running').status, 'running');
});

test('fake-adapter success captures stdout, stderr, exit code, and cleanup', async () => {
  const adapter = new FakeRuntimeAdapter({
    exitCode: 0,
    stdout: 'hello\n',
    stderr: ''
  });
  const manager = new ExecutionJobManager(() => 'job-success');
  const runtime = new ExecutionRuntime(adapter, manager);

  const job = await runtime.execute({ workspaceId: 'ws-1', command: 'echo hello' });

  assert.equal(job.status, 'completed');
  assert.equal(job.exitCode, 0);
  assert.equal(job.stdout, 'hello\n');
  assert.deepEqual(adapter.cleanedUp, ['job-success']);
});

test('fake-adapter failure records status and cleans up', async () => {
  const adapter = new FakeRuntimeAdapter(new Error('adapter failed'));
  const manager = new ExecutionJobManager(() => 'job-failed');
  const runtime = new ExecutionRuntime(adapter, manager);

  const job = await runtime.execute({ workspaceId: 'ws-1', command: 'false' });

  assert.equal(job.status, 'failed');
  assert.equal(job.error, 'adapter failed');
  assert.deepEqual(adapter.cleanedUp, ['job-failed']);
});

test('fake-adapter cleanup failure is recorded without throwing to the caller', async () => {
  class CleanupFailureAdapter implements RuntimeAdapter {
    async run(_job: ExecutionJob, _signal: AbortSignal): Promise<RuntimeResult> {
      return { exitCode: 0, stdout: '', stderr: '' };
    }

    async cleanup(_jobId: string): Promise<void> {
      throw new Error('cleanup failed');
    }
  }

  const manager = new ExecutionJobManager(() => 'job-cleanup-failure');
  const runtime = new ExecutionRuntime(new CleanupFailureAdapter(), manager);

  const job = await runtime.execute({ workspaceId: 'ws-1', command: 'echo hello' });

  assert.equal(job.status, 'failed');
  assert.match(job.error ?? '', /Cleanup failed: cleanup failed/);
});

test('fake-adapter timeout aborts and cleans up', async () => {
  class TimeoutFakeAdapter implements RuntimeAdapter {
    cleanedUp = false;
    aborted = false;

    async run(_job: ExecutionJob, signal: AbortSignal): Promise<RuntimeResult> {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          this.aborted = true;
          reject(new ExecutionTimeoutError(_job.id));
        }, { once: true });
      });
    }

    async cleanup(_jobId: string): Promise<void> {
      this.cleanedUp = true;
    }
  }

  const adapter = new TimeoutFakeAdapter();
  const manager = new ExecutionJobManager(() => 'job-timeout');
  const runtime = new ExecutionRuntime(adapter, manager, { timeoutMs: 10 });

  const job = await runtime.execute({ workspaceId: 'ws-1', command: 'sleep 100' });

  assert.equal(job.status, 'timeout');
  assert.equal(adapter.aborted, true);
  assert.equal(adapter.cleanedUp, true);
});

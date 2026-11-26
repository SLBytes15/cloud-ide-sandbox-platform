import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionRunner } from '../src/scriptRunner.js';
import { RuntimeUnavailableError } from '../src/runtime.js';

describe('Execution runner', () => {
  const runner = new ExecutionRunner();

  it('refuses host execution when no isolated container adapter is configured', async () => {
    await assert.rejects(
      runner.execute({
        workspaceId: 'ws_test_subsecond',
        runtime: 'node',
        code: 'console.log("should not run")',
      }),
      (error: unknown) => {
        assert.ok(error instanceof RuntimeUnavailableError);
        assert.equal(error.statusCode, 503);
        assert.equal(error.code, 'RUNTIME_UNAVAILABLE');
        return true;
      }
    );
  });
});

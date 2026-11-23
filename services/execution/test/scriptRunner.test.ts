import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SubsecondScriptRunner } from '../src/scriptRunner.js';

describe('Subsecond Script Execution Microservice (Week 3.B)', () => {
  const runner = new SubsecondScriptRunner();

  it('should execute a simple script with subsecond latency and stream chunks', async () => {
    const chunks: string[] = [];
    const result = await runner.execute({
      workspaceId: 'ws_test_subsecond',
      runtime: 'node',
      code: 'console.log("Subsecond test output");',
      onChunk: (_, chunk) => chunks.push(chunk),
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.exitCode, 0);
    assert.ok(result.output.includes('Subsecond test output'));
    assert.ok(result.durationMs < 1000, `Execution took ${result.durationMs}ms, expected < 1000ms`);
    assert.ok(chunks.length > 0);
  });

  it('should enforce execution timeout for long-running scripts', async () => {
    const result = await runner.execute({
      workspaceId: 'ws_test_timeout',
      runtime: 'node',
      code: 'while(true){}',
      timeoutMs: 500, // 500ms timeout
    });

    assert.equal(result.status, 'timeout');
    assert.equal(result.exitCode, null);
    assert.ok(result.error?.includes('timed out'));
  });

  it('should capture syntax errors gracefully without crashing process', async () => {
    const result = await runner.execute({
      workspaceId: 'ws_test_err',
      runtime: 'node',
      code: 'throw new Error("Explicit runtime failure");',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.exitCode, 1);
    assert.ok(result.output.includes('Explicit runtime failure'));
  });
});

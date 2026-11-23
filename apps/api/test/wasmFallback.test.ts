import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateMathWasmBinary, executeWasmFallback } from '../../web/src/utils/wasmeval.js';

describe('Client-Side WebAssembly (WASM) Execution Fallback (Week 4.A)', () => {
  it('should generate valid WebAssembly binary with magic header', () => {
    const bytes = generateMathWasmBinary();
    assert.ok(bytes.length > 20);
    // Magic: 0x00 0x61 0x73 0x6d (\0asm)
    assert.equal(bytes[0], 0x00);
    assert.equal(bytes[1], 0x61);
    assert.equal(bytes[2], 0x73);
    assert.equal(bytes[3], 0x6d);
    // Version 1
    assert.equal(bytes[4], 0x01);
  });

  it('should instantiate and execute WASM fallback functions offline', async () => {
    const addResult = await executeWasmFallback('add', [15, 27]);
    assert.equal(addResult.success, true);
    assert.equal(addResult.result, 42);
    assert.ok(addResult.durationMs >= 0);

    const squareResult = await executeWasmFallback('square', [9]);
    assert.equal(squareResult.success, true);
    assert.equal(squareResult.result, 81);
  });
});

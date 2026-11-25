/**
 * Client-Side WebAssembly Execution Fallback
 * Provides instant in-browser offline compilation and execution for simple algorithms.
 */

export interface WasmExecutionResult {
  success: boolean;
  result?: number;
  output: string;
  durationMs: number;
}

/**
 * Minimal pre-compiled WebAssembly binary:
 * - add(a: i32, b: i32): i32
 * - square(n: i32): i32
 */
export function generateMathWasmBinary(): Uint8Array {
  return new Uint8Array([
    // Magic & Version (8 bytes)
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    // Type section (id 1, len 12, 2 types)
    0x01, 0x0c, 0x02,
    0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // Type 0: (i32, i32) -> i32
    0x60, 0x01, 0x7f, 0x01, 0x7f,       // Type 1: (i32) -> i32
    // Function section (id 3, len 3, 2 funcs)
    0x03, 0x03, 0x02, 0x00, 0x01,
    // Export section (id 7, len 16, 2 exports: "add", "square")
    0x07, 0x10, 0x02,
    0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
    0x06, 0x73, 0x71, 0x75, 0x61, 0x72, 0x65, 0x00, 0x01,
    // Code section (id 10, len 17, 2 bodies)
    0x0a, 0x11, 0x02,
    0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b, // body 0: add
    0x07, 0x00, 0x20, 0x00, 0x20, 0x00, 0x6c, 0x0b, // body 1: square
  ]);
}

export async function executeWasmFallback(
  functionName: 'add' | 'square',
  args: number[]
): Promise<WasmExecutionResult> {
  const start = performance.now();
  const binary = generateMathWasmBinary();

  try {
    const compiled = await WebAssembly.instantiate(binary);
    const instance: any = 'instance' in compiled ? compiled.instance : compiled;
    const fn = (instance.exports as any)[functionName];

    if (typeof fn !== 'function') {
      throw new Error(`WASM function "${functionName}" not exported in fallback module`);
    }

    const result = fn(...args);
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    return {
      success: true,
      result,
      output: `[Client-side WASM Fallback]\r\nExecuted ${functionName}(${args.join(', ')}) = ${result}\r\nRuntime: WebAssembly (Offline)\r\nLatency: ${durationMs}ms`,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    return {
      success: false,
      output: `WASM Execution Error: ${err.message}`,
      durationMs,
    };
  }
}

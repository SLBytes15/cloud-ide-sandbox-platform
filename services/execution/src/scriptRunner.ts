import { spawn } from 'node:child_process';
import type { WorkspaceRuntime, ExecutionStatus } from '@cloud-ide/shared';

export interface ScriptExecutionOptions {
  workspaceId: string;
  runtime: WorkspaceRuntime;
  code: string;
  timeoutMs?: number;
  onChunk?: (stream: 'stdout' | 'stderr', chunk: string) => void;
}

export interface ScriptExecutionResult {
  jobId: string;
  workspaceId: string;
  status: ExecutionStatus;
  output: string;
  error?: string;
  exitCode: number | null;
  durationMs: number;
}

export class SubsecondScriptRunner {
  public async execute(options: ScriptExecutionOptions): Promise<ScriptExecutionResult> {
    const startTime = performance.now();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timeoutMs = options.timeoutMs || 5000;

    let output = '';
    let errorOutput = '';

    return new Promise((resolve) => {
      let child: ReturnType<typeof spawn>;
      let hasTimedOut = false;

      // Select runtime binary and invocation arguments
      if (options.runtime === 'python') {
        child = spawn('python3', ['-c', options.code]);
      } else {
        // Default to node
        child = spawn('node', ['-e', options.code]);
      }

      const timer = setTimeout(() => {
        hasTimedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout?.on('data', (data: Buffer) => {
        const str = data.toString();
        output += str;
        options.onChunk?.('stdout', str);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const str = data.toString();
        errorOutput += str;
        options.onChunk?.('stderr', str);
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const durationMs = Math.round(performance.now() - startTime);
        resolve({
          jobId,
          workspaceId: options.workspaceId,
          status: 'failed',
          output,
          error: err.message,
          exitCode: 1,
          durationMs,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Math.round(performance.now() - startTime);

        if (hasTimedOut) {
          resolve({
            jobId,
            workspaceId: options.workspaceId,
            status: 'timeout',
            output,
            error: `Execution timed out after ${timeoutMs}ms`,
            exitCode: null,
            durationMs,
          });
          return;
        }

        const isSuccess = code === 0;
        resolve({
          jobId,
          workspaceId: options.workspaceId,
          status: isSuccess ? 'completed' : 'failed',
          output: output || errorOutput,
          error: isSuccess ? undefined : errorOutput,
          exitCode: code,
          durationMs,
        });
      });
    });
  }
}

export const scriptRunner = new SubsecondScriptRunner();

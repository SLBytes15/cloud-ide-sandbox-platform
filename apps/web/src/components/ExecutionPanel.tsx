import React from 'react';
import { X } from 'lucide-react';
import type { ExecutionJob } from '@cloud-ide/shared';
import type { ExecutionResult, ExecutionUiStatus } from '../utils/executionState.js';
import { adaptExecutionJob, getExecutionOutputSections, getExecutionStatusLabel, hasExecutionOutput } from '../utils/executionState.js';

interface ExecutionPanelProps {
  status?: ExecutionUiStatus;
  job?: ExecutionJob;
  result?: ExecutionResult;
  requestError?: string;
  workspaceId: string;
  filePath: string;
  onClose: () => void;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  status,
  job,
  result,
  requestError,
  workspaceId,
  filePath,
  onClose,
}) => {
  const jobState = job ? adaptExecutionJob(job) : undefined;
  const displayStatus = jobState?.status ?? status ?? 'idle';
  const displayResult = jobState?.result ?? result;
  const outputSections = displayResult ? getExecutionOutputSections(displayResult) : null;

  return (
    <section className="execution-panel" aria-label="Script execution results">
      <header className="execution-panel-header">
        <div className="execution-panel-heading">
          <strong>Script execution</strong>
          <span className={`execution-status-pill execution-status-${displayStatus}`} role="status" aria-live="polite">
            {getExecutionStatusLabel(displayStatus)}
          </span>
          <span className="execution-source">{workspaceId} · {filePath}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Hide execution results" title="Hide execution results">
          <X size={14} />
        </button>
      </header>

      {displayStatus === 'running' || displayStatus === 'pending' ? (
        <div className="execution-panel-message" role="status">Waiting for the execution API to finish…</div>
      ) : displayStatus === 'request-error' ? (
        <div className="execution-panel-message execution-panel-error" role="alert">{requestError || 'The execution request failed.'}</div>
      ) : displayStatus === 'idle' ? (
        <div className="execution-panel-message">
          Run is disabled while the team agrees on the execution API contract and isolated runtime. No code has been sent to the backend.
        </div>
      ) : displayResult && outputSections ? (
        <div className="execution-panel-content">
          <div className="execution-result-meta">
            {displayResult.durationMs !== undefined && <span>{displayResult.durationMs} ms</span>}
            <span>Exit code: {displayResult.exitCode === null ? 'not reported' : displayResult.exitCode}</span>
            {displayResult.jobId && <span>Job: {displayResult.jobId}</span>}
          </div>
          {outputSections.output && (
            <pre className="execution-output" aria-label="Execution output">{outputSections.output}</pre>
          )}
          {outputSections.error && (
            <pre className="execution-output execution-output-error" aria-label="Execution error">{outputSections.error}</pre>
          )}
          {!hasExecutionOutput(displayResult) && (
            <div className="execution-panel-message">The process returned no output.</div>
          )}
        </div>
      ) : null}

      <p className="execution-runtime-note">
        The current backend execution path is not confirmed as container-isolated. Do not run untrusted code.
      </p>
    </section>
  );
};

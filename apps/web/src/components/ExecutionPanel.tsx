import React from 'react';
import { X } from 'lucide-react';
import type { ExecutionResult, ExecutionUiStatus } from '../utils/executionState.js';
import { getExecutionOutputSections, getExecutionStatusLabel } from '../utils/executionState.js';

interface ExecutionPanelProps {
  status: ExecutionUiStatus;
  result?: ExecutionResult;
  requestError?: string;
  workspaceId: string;
  filePath: string;
  onClose: () => void;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  status,
  result,
  requestError,
  workspaceId,
  filePath,
  onClose,
}) => {
  const outputSections = result ? getExecutionOutputSections(result) : null;

  return (
    <section className="execution-panel" aria-label="Script execution results">
      <header className="execution-panel-header">
        <div className="execution-panel-heading">
          <strong>Script execution</strong>
          <span className={`execution-status-pill execution-status-${status}`} role="status" aria-live="polite">
            {getExecutionStatusLabel(status)}
          </span>
          <span className="execution-source">{workspaceId} · {filePath}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Hide execution results" title="Hide execution results">
          <X size={14} />
        </button>
      </header>

      {status === 'running' ? (
        <div className="execution-panel-message" role="status">Waiting for the execution API to finish…</div>
      ) : status === 'request-error' ? (
        <div className="execution-panel-message execution-panel-error" role="alert">{requestError || 'The execution request failed.'}</div>
      ) : status === 'idle' ? (
        <div className="execution-panel-message">
          Run is disabled while the team agrees on the execution API contract and isolated runtime. No code has been sent to the backend.
        </div>
      ) : result && outputSections ? (
        <div className="execution-panel-content">
          <div className="execution-result-meta">
            <span>{result.durationMs} ms</span>
            <span>Exit code: {result.exitCode === null ? 'not reported' : result.exitCode}</span>
            {result.jobId && <span>Job: {result.jobId}</span>}
          </div>
          {outputSections.output ? (
            <pre className="execution-output" aria-label="Execution output">{outputSections.output}</pre>
          ) : (
            <div className="execution-panel-message">The process returned no output.</div>
          )}
          {outputSections.error && (
            <pre className="execution-output execution-output-error" aria-label="Execution error">{outputSections.error}</pre>
          )}
        </div>
      ) : null}

      <p className="execution-runtime-note">
        The current backend execution path is not confirmed as container-isolated. Do not run untrusted code.
      </p>
    </section>
  );
};

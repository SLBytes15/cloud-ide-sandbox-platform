export function getExecutionOutputSections(result) {
  const error = result.error && result.error !== result.output ? result.error : '';
  return { output: result.output, error };
}

export function hasExecutionOutput(result) {
  const sections = getExecutionOutputSections(result);
  return Boolean(sections.output || sections.error);
}

export function adaptExecutionJob(job) {
  if (job.status === 'pending' || job.status === 'running') {
    return { status: job.status };
  }

  return {
    status: job.status,
    result: {
      jobId: job.id,
      status: job.status,
      output: job.output || '',
      error: job.error,
      exitCode: job.exitCode ?? null,
      durationMs: job.durationMs,
    },
  };
}

export function getExecutionStatusLabel(status) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'running': return 'Running';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'timeout': return 'Timed out';
    case 'request-error': return 'Unavailable';
    default: return 'Idle';
  }
}

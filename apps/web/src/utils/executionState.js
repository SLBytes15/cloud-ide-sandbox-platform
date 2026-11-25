export function getExecutionOutputSections(result) {
  const error = result.error && result.error !== result.output ? result.error : '';
  return { output: result.output, error };
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

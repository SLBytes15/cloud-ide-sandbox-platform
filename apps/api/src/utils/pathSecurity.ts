/**
 * Path Security & Normalization Utilities
 * Protects workspace file operations against directory traversal, null-byte injection, and malformed paths.
 */

export interface PathValidationSuccess {
  valid: true;
  path: string;
}

export interface PathValidationFailure {
  valid: false;
  error: string;
  code: string;
}

export type PathValidationResult = PathValidationSuccess | PathValidationFailure;

const MAX_PATH_LENGTH = 500;

export function normalizeAndValidatePath(inputPath: unknown): PathValidationResult {
  if (typeof inputPath !== 'string') {
    return {
      valid: false,
      error: 'Path must be a non-empty string',
      code: 'INVALID_PATH_TYPE',
    };
  }

  const raw = inputPath.trim();
  if (raw.length === 0) {
    return {
      valid: false,
      error: 'Path cannot be empty',
      code: 'EMPTY_PATH',
    };
  }

  if (raw.length > MAX_PATH_LENGTH) {
    return {
      valid: false,
      error: `Path exceeds maximum allowed length of ${MAX_PATH_LENGTH} characters`,
      code: 'PATH_TOO_LONG',
    };
  }

  // Detect null byte injection (\0 or URL-encoded %00)
  if (raw.includes('\0') || raw.toLowerCase().includes('%00')) {
    return {
      valid: false,
      error: 'Null byte injection detected in file path',
      code: 'NULL_BYTE_DETECTED',
    };
  }

  // Detect URL encoded traversal attempts (%2e%2e)
  if (raw.toLowerCase().includes('%2e%2e')) {
    return {
      valid: false,
      error: 'Encoded path traversal sequence detected',
      code: 'PATH_TRAVERSAL_DETECTED',
    };
  }

  // Normalize backslashes to forward slashes
  let normalized = raw.replace(/\\/g, '/');

  // Collapse consecutive forward slashes
  normalized = normalized.replace(/\/+/g, '/');

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // Parse path segments to strictly detect relative traversal (.. or .)
  const segments = normalized.split('/').filter(Boolean);

  for (const segment of segments) {
    if (segment === '..' || segment === '.') {
      return {
        valid: false,
        error: `Path traversal token "${segment}" is strictly prohibited`,
        code: 'PATH_TRAVERSAL_DETECTED',
      };
    }

    // Check for ASCII control characters
    for (let i = 0; i < segment.length; i++) {
      if (segment.charCodeAt(i) < 32) {
        return {
          valid: false,
          error: 'Control characters are not allowed in file paths',
          code: 'ILLEGAL_CONTROL_CHAR',
        };
      }
    }
  }

  if (segments.length === 0) {
    return {
      valid: false,
      error: 'Path must refer to an entity inside workspace root, not root itself',
      code: 'CANNOT_TARGET_ROOT',
    };
  }

  const cleanPath = `/${segments.join('/')}`;

  return {
    valid: true,
    path: cleanPath,
  };
}

import { CreateWorkspaceDTO, WorkspaceRuntime } from '@cloud-ide/shared';

const ALLOWED_RUNTIMES: readonly WorkspaceRuntime[] = ['node', 'python', 'cpp', 'go', 'rust'] as const;

export interface ValidationSuccess<T> {
  valid: true;
  value: T;
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Pure validation function for CreateWorkspaceDTO payload.
 * Validates input shape, string lengths, and runtime enum without database dependencies.
 */
export function validateCreateWorkspaceDTO(input: unknown): ValidationResult<CreateWorkspaceDTO> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      valid: false,
      errors: ['Request payload must be a non-null JSON object'],
    };
  }

  const record = input as Record<string, unknown>;

  // 1. Validate name
  if (typeof record.name !== 'string') {
    errors.push('Field "name" is required and must be a string');
  } else {
    const trimmedName = record.name.trim();
    if (trimmedName.length === 0) {
      errors.push('Field "name" cannot be empty');
    } else if (trimmedName.length > 100) {
      errors.push('Field "name" cannot exceed 100 characters');
    }
  }

  // 2. Validate runtime
  if (typeof record.runtime !== 'string') {
    errors.push(`Field "runtime" is required and must be one of: ${ALLOWED_RUNTIMES.join(', ')}`);
  } else if (!ALLOWED_RUNTIMES.includes(record.runtime as WorkspaceRuntime)) {
    errors.push(`Invalid runtime "${record.runtime}". Allowed runtimes are: ${ALLOWED_RUNTIMES.join(', ')}`);
  }

  // 3. Validate description (optional)
  if (record.description !== undefined && record.description !== null) {
    if (typeof record.description !== 'string') {
      errors.push('Field "description", if provided, must be a string');
    } else if (record.description.length > 500) {
      errors.push('Field "description" cannot exceed 500 characters');
    }
  }

  // 4. Validate isPublic (optional)
  if (record.isPublic !== undefined && record.isPublic !== null) {
    if (typeof record.isPublic !== 'boolean') {
      errors.push('Field "isPublic", if provided, must be a boolean');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const sanitized: CreateWorkspaceDTO = {
    name: (record.name as string).trim(),
    runtime: record.runtime as WorkspaceRuntime,
    ...(typeof record.description === 'string' ? { description: record.description.trim() } : {}),
    ...(typeof record.isPublic === 'boolean' ? { isPublic: record.isPublic } : {}),
  };

  return {
    valid: true,
    value: sanitized,
  };
}

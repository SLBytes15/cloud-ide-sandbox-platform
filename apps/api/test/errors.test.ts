import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../src/utils/errors.js';

describe('API Error Classes', () => {
  it('should initialize ApiError with default status and code', () => {
    const error = new ApiError('Something broke');
    assert.equal(error.message, 'Something broke');
    assert.equal(error.statusCode, 500);
    assert.equal(error.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(error.name, 'ApiError');
    assert.equal(error.details, undefined);
  });

  it('should initialize BadRequestError with 400 and BAD_REQUEST', () => {
    const error = new BadRequestError('Invalid query', { field: 'search' });
    assert.equal(error.message, 'Invalid query');
    assert.equal(error.statusCode, 400);
    assert.equal(error.code, 'BAD_REQUEST');
    assert.deepEqual(error.details, { field: 'search' });
  });

  it('should initialize ValidationError with 400 and VALIDATION_ERROR', () => {
    const error = new ValidationError('Validation failed', ['name is required']);
    assert.equal(error.message, 'Validation failed');
    assert.equal(error.statusCode, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.deepEqual(error.details, ['name is required']);
  });

  it('should initialize UnauthorizedError with 401 and UNAUTHORIZED', () => {
    const error = new UnauthorizedError();
    assert.equal(error.message, 'Unauthorized access');
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, 'UNAUTHORIZED');
  });

  it('should initialize ForbiddenError with 403 and FORBIDDEN', () => {
    const error = new ForbiddenError();
    assert.equal(error.message, 'Access forbidden');
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, 'FORBIDDEN');
  });

  it('should initialize NotFoundError with 404 and NOT_FOUND', () => {
    const error = new NotFoundError('Workspace not found');
    assert.equal(error.message, 'Workspace not found');
    assert.equal(error.statusCode, 404);
    assert.equal(error.code, 'NOT_FOUND');
  });

  it('should initialize ConflictError with 409 and CONFLICT', () => {
    const error = new ConflictError('Workspace name already in use');
    assert.equal(error.message, 'Workspace name already in use');
    assert.equal(error.statusCode, 409);
    assert.equal(error.code, 'CONFLICT');
  });

  it('should initialize InternalServerError with 500 and INTERNAL_SERVER_ERROR', () => {
    const error = new InternalServerError();
    assert.equal(error.message, 'Internal server error');
    assert.equal(error.statusCode, 500);
    assert.equal(error.code, 'INTERNAL_SERVER_ERROR');
  });
});

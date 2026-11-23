import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateWorkspaceDTO } from '../src/utils/workspaceValidation.js';

describe('Workspace Input Validation (validateCreateWorkspaceDTO)', () => {
  it('should accept valid workspace creation payloads for all supported runtimes', () => {
    const runtimes = ['node', 'python', 'cpp', 'go', 'rust'] as const;

    for (const runtime of runtimes) {
      const result = validateCreateWorkspaceDTO({
        name: `My ${runtime} project`,
        runtime,
        description: 'Test project description',
        isPublic: true,
      });

      assert.equal(result.valid, true);
      if (result.valid) {
        assert.equal(result.value.name, `My ${runtime} project`);
        assert.equal(result.value.runtime, runtime);
        assert.equal(result.value.description, 'Test project description');
        assert.equal(result.value.isPublic, true);
      }
    }
  });

  it('should trim whitespace from workspace name and description', () => {
    const result = validateCreateWorkspaceDTO({
      name: '   Trimmed Project   ',
      runtime: 'node',
      description: '   Trimmed description   ',
    });

    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.value.name, 'Trimmed Project');
      assert.equal(result.value.description, 'Trimmed description');
    }
  });

  it('should reject non-object inputs', () => {
    assert.equal(validateCreateWorkspaceDTO(null).valid, false);
    assert.equal(validateCreateWorkspaceDTO(undefined).valid, false);
    assert.equal(validateCreateWorkspaceDTO('string').valid, false);
    assert.equal(validateCreateWorkspaceDTO([]).valid, false);
  });

  it('should reject empty or whitespace-only names', () => {
    const result = validateCreateWorkspaceDTO({
      name: '   ',
      runtime: 'node',
    });

    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some((err) => err.includes('cannot be empty')));
    }
  });

  it('should reject names exceeding 100 characters', () => {
    const result = validateCreateWorkspaceDTO({
      name: 'A'.repeat(101),
      runtime: 'node',
    });

    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some((err) => err.includes('cannot exceed 100 characters')));
    }
  });

  it('should reject unsupported execution runtimes', () => {
    const result = validateCreateWorkspaceDTO({
      name: 'Ruby Project',
      runtime: 'ruby',
    });

    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some((err) => err.includes('Invalid runtime')));
    }
  });

  it('should reject descriptions exceeding 500 characters', () => {
    const result = validateCreateWorkspaceDTO({
      name: 'Valid Project',
      runtime: 'node',
      description: 'D'.repeat(501),
    });

    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some((err) => err.includes('cannot exceed 500 characters')));
    }
  });

  it('should reject non-boolean isPublic field', () => {
    const result = validateCreateWorkspaceDTO({
      name: 'Valid Project',
      runtime: 'node',
      isPublic: 'yes' as any,
    });

    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.ok(result.errors.some((err) => err.includes('must be a boolean')));
    }
  });
});

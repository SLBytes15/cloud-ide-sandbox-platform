import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sendSuccess, sendError } from '../src/utils/apiResponse.js';

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('API Response Helpers (sendSuccess & sendError)', () => {
  it('should format successful response conforming to ApiResponse envelope', () => {
    const res = createMockResponse();
    const data = { id: 'ws-123', name: 'Demo Workspace' };

    sendSuccess(res, data, 'Workspace fetched successfully', 200);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Workspace fetched successfully');
    assert.deepEqual(res.body.data, data);
    assert.ok(typeof res.body.timestamp === 'string');
  });

  it('should format error response conforming to ApiResponse envelope', () => {
    const res = createMockResponse();

    sendError(res, 'Entity not found', 404, 'NOT_FOUND', { entityId: 'ws-999' });

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.equal(res.body.error.message, 'Entity not found');
    assert.deepEqual(res.body.error.details, { entityId: 'ws-999' });
    assert.ok(typeof res.body.timestamp === 'string');
  });
});

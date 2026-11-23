import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidateEnv } from '../src/config/env.js';

describe('Environment Configuration Validation (parseAndValidateEnv)', () => {
  it('should use safe defaults when environment variables are missing', () => {
    const config = parseAndValidateEnv({});

    assert.equal(config.NODE_ENV, 'development');
    assert.equal(config.PORT, 5001);
    assert.equal(config.CLIENT_ORIGIN, 'http://localhost:5173');
    assert.equal(config.MONGODB_URI, 'mongodb://127.0.0.1:27017/cloud_ide');
    assert.equal(config.MONGODB_DEBUG, false);
    assert.equal(config.LOG_LEVEL, 'debug');
  });

  it('should parse valid custom environment variables correctly', () => {
    const config = parseAndValidateEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      CLIENT_ORIGIN: 'https://ide.zaalima.com',
      MONGODB_URI: 'mongodb://atlas-host:27017/prod_ide',
      MONGODB_DEBUG: 'true',
      LOG_LEVEL: 'info',
    });

    assert.equal(config.NODE_ENV, 'production');
    assert.equal(config.PORT, 8080);
    assert.equal(config.CLIENT_ORIGIN, 'https://ide.zaalima.com');
    assert.equal(config.MONGODB_URI, 'mongodb://atlas-host:27017/prod_ide');
    assert.equal(config.MONGODB_DEBUG, true);
    assert.equal(config.LOG_LEVEL, 'info');
  });

  it('should fall back to safe defaults when port is invalid or out of range', () => {
    assert.equal(parseAndValidateEnv({ PORT: 'invalid' }).PORT, 5001);
    assert.equal(parseAndValidateEnv({ PORT: '-1' }).PORT, 5001);
    assert.equal(parseAndValidateEnv({ PORT: '70000' }).PORT, 5001);
    assert.equal(parseAndValidateEnv({ PORT: '0' }).PORT, 5001);
    assert.equal(parseAndValidateEnv({ PORT: '3000' }).PORT, 3000);
  });

  it('should fall back to development when NODE_ENV is invalid', () => {
    assert.equal(parseAndValidateEnv({ NODE_ENV: 'staging' as any }).NODE_ENV, 'development');
    assert.equal(parseAndValidateEnv({ NODE_ENV: 'test' }).NODE_ENV, 'test');
  });

  it('should normalize and validate LOG_LEVEL case-insensitively', () => {
    assert.equal(parseAndValidateEnv({ LOG_LEVEL: 'WARN' }).LOG_LEVEL, 'warn');
    assert.equal(parseAndValidateEnv({ LOG_LEVEL: 'INVALID' }).LOG_LEVEL, 'debug');
  });
});

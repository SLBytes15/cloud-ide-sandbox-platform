import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local workspace
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  CLIENT_ORIGIN: string;
  MONGODB_URI: string;
  MONGODB_DEBUG: boolean;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

const VALID_NODE_ENVS = ['development', 'production', 'test'] as const;
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

/**
 * Validates and parses raw process environment variables safely.
 */
export function parseAndValidateEnv(rawEnv: NodeJS.ProcessEnv = process.env): EnvironmentConfig {
  // Validate NODE_ENV
  const rawNodeEnv = rawEnv.NODE_ENV || 'development';
  const nodeEnv = (VALID_NODE_ENVS as readonly string[]).includes(rawNodeEnv)
    ? (rawNodeEnv as EnvironmentConfig['NODE_ENV'])
    : 'development';

  // Validate PORT (must be an integer between 1 and 65535)
  const parsedPort = parseInt(rawEnv.PORT || '5001', 10);
  const port = !isNaN(parsedPort) && parsedPort >= 1 && parsedPort <= 65535 ? parsedPort : 5001;

  // Validate CLIENT_ORIGIN
  const clientOrigin = rawEnv.CLIENT_ORIGIN?.trim() || 'http://localhost:5173';

  // Validate MONGODB_URI
  const mongodbUri = rawEnv.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/cloud_ide';

  // Validate MONGODB_DEBUG
  const mongodbDebug = rawEnv.MONGODB_DEBUG === 'true';

  // Validate LOG_LEVEL
  const rawLogLevel = rawEnv.LOG_LEVEL?.toLowerCase() || 'debug';
  const logLevel = (VALID_LOG_LEVELS as readonly string[]).includes(rawLogLevel)
    ? (rawLogLevel as EnvironmentConfig['LOG_LEVEL'])
    : 'debug';

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    CLIENT_ORIGIN: clientOrigin,
    MONGODB_URI: mongodbUri,
    MONGODB_DEBUG: mongodbDebug,
    LOG_LEVEL: logLevel,
  };
}

export const env: EnvironmentConfig = parseAndValidateEnv(process.env);

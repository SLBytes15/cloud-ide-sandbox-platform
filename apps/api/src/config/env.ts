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
  LOG_LEVEL: string;
}

export const env: EnvironmentConfig = {
  NODE_ENV: (process.env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || 'development',
  PORT: parseInt(process.env.PORT || '5001', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cloud_ide',
  MONGODB_DEBUG: process.env.MONGODB_DEBUG === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
};

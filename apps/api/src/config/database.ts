import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export type DBConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

class Database {
  private status: DBConnectionStatus = 'disconnected';

  public async connect(): Promise<void> {
    if (this.status === 'connected') {
      return;
    }

    this.status = 'connecting';
    mongoose.set('strictQuery', true);

    if (env.MONGODB_DEBUG) {
      mongoose.set('debug', true);
    }

    mongoose.connection.on('connected', () => {
      this.status = 'connected';
      logger.info('MongoDB connection established successfully', {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      });
    });

    mongoose.connection.on('error', (err) => {
      this.status = 'error';
      logger.error('MongoDB connection error', { message: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      if (this.status === 'connected') {
        this.status = 'disconnected';
        logger.warn('MongoDB connection lost. Attempting reconnect...');
      }
    });

    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
    } catch (err: unknown) {
      this.status = 'error';
      const msg = err instanceof Error ? err.message : 'Unknown database error';
      logger.warn(`Could not connect to MongoDB at ${env.MONGODB_URI}: ${msg}. (Continuing startup in degraded DB mode)`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.status !== 'disconnected') {
      await mongoose.disconnect();
      this.status = 'disconnected';
      logger.info('MongoDB disconnected gracefully');
    }
  }

  public getStatus(): DBConnectionStatus {
    const readyState = mongoose.connection.readyState;
    switch (readyState) {
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      default:
        return this.status === 'error' ? 'error' : 'disconnected';
    }
  }

  public getDatabaseName(): string | undefined {
    return mongoose.connection.name;
  }
}

export const db = new Database();

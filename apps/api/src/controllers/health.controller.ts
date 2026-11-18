import { Request, Response } from 'express';
import { db } from '../config/database.js';
import { env } from '../config/env.js';

export function getHealth(_req: Request, res: Response) {
  const dbStatus = db.getStatus();
  const isHealthy = dbStatus === 'connected' || dbStatus === 'connecting' || dbStatus === 'disconnected';

  res.status(isHealthy ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'cloud-ide-api',
    version: '0.1.0',
    environment: env.NODE_ENV,
    database: {
      status: dbStatus,
      name: db.getDatabaseName() || undefined,
    },
  });
}

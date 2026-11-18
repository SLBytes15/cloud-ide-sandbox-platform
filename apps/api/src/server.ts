import { createApp } from './app.js';
import { env } from './config/env.js';
import { db } from './config/database.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  const app = createApp();

  // Initialize MongoDB connection
  await db.connect();

  const server = app.listen(env.PORT, () => {
    logger.info(`Zaalima Cloud IDE API server running on port ${env.PORT}`, {
      env: env.NODE_ENV,
      port: env.PORT,
      healthEndpoint: `http://localhost:${env.PORT}/api/health`,
    });
  });

  // Graceful shutdown handling
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await db.disconnect();
        logger.info('HTTP server closed. Exiting process.');
        process.exit(0);
      });
    });
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start API server', { error: err });
  process.exit(1);
});

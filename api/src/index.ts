import 'reflect-metadata';
import baseLogger from './common/logger';
import { env } from './config/env';
import { AppDataSource } from './config/data-source';
import { registerListeners } from './modules/listeners';
import app from './server';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => baseLogger.info(data ?? {}, msg),
  warn: (msg: string, data?: Record<string, unknown>) => baseLogger.warn(data ?? {}, msg),
  err:  (msg: unknown, data?: Record<string, unknown>) => baseLogger.error(data ?? {}, typeof msg === 'string' ? msg : String((msg as Error)?.message ?? msg)),
};

function assertProductionSecrets() {
  if (!env.isProd) return;
  const defaults: Array<[string, string, string]> = [
    ['JWT_SECRET', env.JWT_SECRET, 'change-me'],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET, 'change-me-refresh'],
  ];
  const offenders = defaults.filter(([, val, def]) => val === def).map(([name]) => name);
  if (offenders.length > 0) {
    logger.err(`FATAL: ${offenders.join(', ')} must be set to non-default values in production`);
    process.exit(1);
  }
  if (env.ADMIN_PASSWORD === 'admin123') {
    logger.err('FATAL: ADMIN_PASSWORD must be set to a non-default value in production');
    process.exit(1);
  }
}

async function bootstrap() {
  try {
    assertProductionSecrets();

    await AppDataSource.initialize();
    logger.info('Database connected');

    registerListeners();
    logger.info('Event listeners registered');

    const server = app.listen(env.PORT, () => {
      logger.info(`Server started on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      const timeout = setTimeout(() => {
        logger.err('Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30_000);
      timeout.unref();
      server.close((err) => {
        if (err) logger.err(err as any);
      });
      try {
        await AppDataSource.destroy();
      } catch (err) {
        logger.err(err as any);
      }
      try {
        await baseLogger.flush?.();
      } catch {
        // never let log flush block shutdown
      }
      clearTimeout(timeout);
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    logger.err('Failed to start server:');
    logger.err(error as any);
    process.exit(1);
  }
}

bootstrap();

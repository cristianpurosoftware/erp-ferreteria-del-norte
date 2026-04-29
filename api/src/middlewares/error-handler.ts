import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';
import { RouteError, BusinessLogicError } from '../common/errors';
import { env } from '../config/env';
import { logger } from '../common/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de solicitud inválidos',
        details: err.errors,
      },
    });
    return;
  }

  // Business logic errors (422)
  if (err instanceof BusinessLogicError) {
    res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.detail && { detail: err.detail }),
      },
    });
    return;
  }

  // Route errors (4xx)
  if (err instanceof RouteError) {
    res.status(err.status).json({
      success: false,
      error: {
        code: 'REQUEST_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // TypeORM query errors
  if (err instanceof QueryFailedError) {
    const detail = (err as any).driverError?.detail;
    res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error en la base de datos',
        ...(env.isDev && detail && { details: detail }),
      },
    });
    return;
  }

  // Unknown errors
  logger.error({ err, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isDev ? err.message : 'Error interno del servidor',
    },
  });
}

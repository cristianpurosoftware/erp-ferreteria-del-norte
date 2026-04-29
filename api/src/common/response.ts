import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function successResponse(res: Response, data: any, meta?: Record<string, any>, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

export function paginatedResponse<T>(res: Response, items: T[], meta: PaginationMeta): void {
  res.status(200).json({
    success: true,
    data: items,
    meta,
  });
}

export function createdResponse(res: Response, data: any): void {
  successResponse(res, data, undefined, 201);
}

export function noContentResponse(res: Response): void {
  res.status(204).send();
}

export function errorResponse(res: Response, status: number, code: string, message: string, details?: any): void {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  });
}

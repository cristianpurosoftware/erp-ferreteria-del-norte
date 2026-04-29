import { Request, Response } from 'express';
import * as service from './returns.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) { return successResponse(res, await service.findById(req.params.id)); }
export async function create(req: Request, res: Response) { return createdResponse(res, await service.create(req.body)); }
export async function confirm(req: Request, res: Response) { return successResponse(res, await service.confirm(req.params.id)); }
export async function receive(req: Request, res: Response) { return successResponse(res, await service.receive(req.params.id)); }
export async function inspect(req: Request, res: Response) { return successResponse(res, await service.inspect(req.params.id, req.body)); }
export async function close(req: Request, res: Response) { return successResponse(res, await service.close(req.params.id)); }
export async function cancel(req: Request, res: Response) { return successResponse(res, await service.cancel(req.params.id)); }

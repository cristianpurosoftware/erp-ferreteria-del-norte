import { Request, Response } from 'express';
import * as service from './picking.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  return successResponse(res, await service.findById(req.params.id));
}

export async function create(req: Request, res: Response) {
  return createdResponse(res, await service.create(req.body));
}

export async function assign(req: Request, res: Response) {
  return successResponse(res, await service.assign(req.params.id, req.body.userId));
}

export async function start(req: Request, res: Response) {
  return successResponse(res, await service.start(req.params.id));
}

export async function pickItem(req: Request, res: Response) {
  return successResponse(res, await service.pickItem(req.params.id, req.params.itemId, req.body));
}

export async function complete(req: Request, res: Response) {
  return successResponse(res, await service.complete(req.params.id));
}

export async function stage(req: Request, res: Response) {
  return successResponse(res, await service.stage(req.params.id));
}

export async function cancel(req: Request, res: Response) {
  return successResponse(res, await service.cancel(req.params.id));
}

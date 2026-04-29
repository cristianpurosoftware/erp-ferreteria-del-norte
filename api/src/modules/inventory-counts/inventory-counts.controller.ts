import { Request, Response } from 'express';
import * as service from './inventory-counts.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) { return successResponse(res, await service.findById(req.params.id)); }
export async function create(req: Request, res: Response) { return createdResponse(res, await service.create(req.body)); }
export async function start(req: Request, res: Response) { return successResponse(res, await service.start(req.params.id)); }
export async function finish(req: Request, res: Response) { return successResponse(res, await service.finish(req.params.id)); }
export async function addLines(req: Request, res: Response) { return successResponse(res, await service.addLines(req.params.id, req.body)); }
export async function approve(req: Request, res: Response) { return successResponse(res, await service.approve(req.params.id, req.user?.id)); }
export async function apply(req: Request, res: Response) { return successResponse(res, await service.apply(req.params.id)); }
export async function cancel(req: Request, res: Response) { return successResponse(res, await service.cancel(req.params.id)); }
export async function recreateFromStock(req: Request, res: Response) { return createdResponse(res, await service.recreateFromStock(req.params.id)); }

import { Request, Response } from 'express';
import * as service from './supplier-claims.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) { return successResponse(res, await service.findById(req.params.id)); }
export async function create(req: Request, res: Response) { return createdResponse(res, await service.create(req.body, req.user?.id)); }
export async function update(req: Request, res: Response) { return successResponse(res, await service.update(req.params.id, req.body)); }
export async function send(req: Request, res: Response) { return successResponse(res, await service.send(req.params.id)); }
export async function acknowledge(req: Request, res: Response) { return successResponse(res, await service.acknowledge(req.params.id)); }
export async function creditReceived(req: Request, res: Response) { return successResponse(res, await service.creditReceived(req.params.id)); }
export async function resolve(req: Request, res: Response) { return successResponse(res, await service.resolve(req.params.id)); }
export async function reject(req: Request, res: Response) { return successResponse(res, await service.reject(req.params.id)); }

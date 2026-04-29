import { Request, Response } from 'express';
import * as service from './customers.service';
import { successResponse, createdResponse, paginatedResponse, noContentResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getSummary(req: Request, res: Response) {
  const data = await service.findSummary(req.query as Record<string, unknown>);
  return successResponse(res, data);
}

export async function getById(req: Request, res: Response) {
  const item = await service.findById(req.params.id);
  return successResponse(res, item);
}

export async function create(req: Request, res: Response) {
  const item = await service.create(req.body);
  return createdResponse(res, item);
}

export async function update(req: Request, res: Response) {
  const item = await service.update(req.params.id, req.body);
  return successResponse(res, item);
}

export async function activate(req: Request, res: Response) {
  const item = await service.changeStatus(req.params.id, 'active');
  return successResponse(res, item);
}

export async function block(req: Request, res: Response) {
  const item = await service.changeStatus(req.params.id, 'blocked');
  return successResponse(res, item);
}

export async function unblock(req: Request, res: Response) {
  const item = await service.changeStatus(req.params.id, 'active');
  return successResponse(res, item);
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  return noContentResponse(res);
}

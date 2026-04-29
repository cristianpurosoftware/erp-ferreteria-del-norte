import { Request, Response } from 'express';
import * as service from './payments.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

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

export async function register(req: Request, res: Response) {
  const item = await service.register(req.params.id);
  return successResponse(res, item);
}

export async function apply(req: Request, res: Response) {
  const item = await service.apply(req.params.id);
  return successResponse(res, item);
}

export async function reconcile(req: Request, res: Response) {
  const item = await service.reconcile(req.params.id);
  return successResponse(res, item);
}

export async function cancel(req: Request, res: Response) {
  const item = await service.cancel(req.params.id);
  return successResponse(res, item);
}

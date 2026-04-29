import { Request, Response } from 'express';
import * as service from './commissions.service';
import { successResponse, paginatedResponse } from '../../common/response';

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

export async function approve(req: Request, res: Response) {
  const item = await service.approve(req.params.id);
  return successResponse(res, item);
}

export async function reverse(req: Request, res: Response) {
  const item = await service.reverse(req.params.id);
  return successResponse(res, item);
}

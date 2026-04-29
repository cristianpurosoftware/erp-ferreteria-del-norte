import { Request, Response } from 'express';
import * as service from './supplier-invoices.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getSummary(req: Request, res: Response) {
  const data = await service.findSummary(req.query as Record<string, unknown>);
  return successResponse(res, data);
}

export async function getById(req: Request, res: Response) { return successResponse(res, await service.findById(req.params.id)); }
export async function create(req: Request, res: Response) { return createdResponse(res, await service.create(req.body)); }
export async function update(req: Request, res: Response) { return successResponse(res, await service.update(req.params.id, req.body)); }
export async function submit(req: Request, res: Response) { return successResponse(res, await service.submit(req.params.id)); }
export async function approve(req: Request, res: Response) { return successResponse(res, await service.approve(req.params.id)); }
export async function dispute(req: Request, res: Response) { return successResponse(res, await service.dispute(req.params.id)); }
export async function cancel(req: Request, res: Response) { return successResponse(res, await service.cancel(req.params.id)); }

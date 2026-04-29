import { Request, Response } from 'express';
import * as service from './payment-orders.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) { return successResponse(res, await service.findById(req.params.id)); }
export async function create(req: Request, res: Response) { return createdResponse(res, await service.create(req.body)); }
export async function approve(req: Request, res: Response) { return successResponse(res, await service.approve(req.params.id)); }
export async function pay(req: Request, res: Response) { return successResponse(res, await service.pay(req.params.id)); }
export async function cancel(req: Request, res: Response) { return successResponse(res, await service.cancel(req.params.id)); }

export async function getAllBatches(req: Request, res: Response) {
  const { items, meta } = await service.findAllBatches(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getBatchById(req: Request, res: Response) { return successResponse(res, await service.findBatchById(req.params.id)); }
export async function createBatch(req: Request, res: Response) { return createdResponse(res, await service.createBatch(req.body)); }
export async function generateFile(req: Request, res: Response) { return successResponse(res, await service.generateFile(req.params.id)); }
export async function markProcessed(req: Request, res: Response) { return successResponse(res, await service.markProcessed(req.params.id)); }

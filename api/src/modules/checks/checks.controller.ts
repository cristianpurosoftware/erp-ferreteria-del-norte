import { Request, Response } from 'express';
import * as service from './checks.service';
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
export async function deposit(req: Request, res: Response) { return successResponse(res, await service.deposit(req.params.id, req.body.bankAccountId)); }
export async function clear(req: Request, res: Response) { return successResponse(res, await service.clear(req.params.id)); }
export async function bounce(req: Request, res: Response) { return successResponse(res, await service.bounce(req.params.id, req.body.reason)); }
export async function endorse(req: Request, res: Response) { return successResponse(res, await service.endorse(req.params.id, req.body.supplierId)); }
export async function returnToCustomer(req: Request, res: Response) { return successResponse(res, await service.returnToCustomer(req.params.id)); }
export async function cancel(req: Request, res: Response) { return successResponse(res, await service.cancel(req.params.id)); }
export async function portfolio(_req: Request, res: Response) { return successResponse(res, await service.findPortfolio()); }

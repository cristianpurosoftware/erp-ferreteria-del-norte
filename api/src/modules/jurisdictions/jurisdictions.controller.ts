import { Request, Response } from 'express';
import * as service from './jurisdictions.service';
import { successResponse, createdResponse, paginatedResponse, noContentResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) { return successResponse(res, await service.findById(req.params.id)); }
export async function create(req: Request, res: Response) { return createdResponse(res, await service.create(req.body)); }
export async function update(req: Request, res: Response) { return successResponse(res, await service.update(req.params.id, req.body)); }
export async function remove(req: Request, res: Response) { await service.remove(req.params.id); return noContentResponse(res); }

export async function getByCustomer(req: Request, res: Response) {
  const items = await service.findByCustomer(req.params.customerId);
  return successResponse(res, items);
}

export async function addForCustomer(req: Request, res: Response) {
  return createdResponse(res, await service.addCustomerJurisdiction(req.params.customerId, req.body));
}

export async function removeForCustomer(req: Request, res: Response) {
  await service.removeCustomerJurisdiction(req.params.customerId, req.params.id);
  return noContentResponse(res);
}

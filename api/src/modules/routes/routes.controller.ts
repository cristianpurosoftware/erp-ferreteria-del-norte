import { Request, Response } from 'express';
import * as service from './routes.service';
import { successResponse, createdResponse, paginatedResponse, noContentResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
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

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id);
  return noContentResponse(res);
}

export async function listVisits(req: Request, res: Response) {
  const items = await service.listVisits(req.params.id);
  return successResponse(res, items);
}

export async function addVisit(req: Request, res: Response) {
  const item = await service.addVisit(req.params.id, req.body);
  return createdResponse(res, item);
}

export async function removeVisit(req: Request, res: Response) {
  await service.removeVisit(req.params.id, req.params.visitId);
  return noContentResponse(res);
}

export async function createCustomerVisit(req: Request, res: Response) {
  const item = await service.createCustomerVisit(req.body);
  return createdResponse(res, item);
}

export async function getCustomerVisits(req: Request, res: Response) {
  const { items, meta } = await service.findCustomerVisits(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

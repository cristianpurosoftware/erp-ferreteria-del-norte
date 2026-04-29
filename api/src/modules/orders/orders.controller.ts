import { Request, Response } from 'express';
import * as service from './orders.service';
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
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.findById(uuid);
  return successResponse(res, item);
}

export async function create(req: Request, res: Response) {
  const userPermissions: string[] = (req as any).user?.permissions ?? [];
  const item = await service.create(req.body, userPermissions);
  return createdResponse(res, item);
}

export async function update(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.update(uuid, req.body);
  return successResponse(res, item);
}

export async function submit(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.submit(uuid);
  return successResponse(res, item);
}

export async function confirm(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.confirm(uuid);
  return successResponse(res, item);
}

export async function reject(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.reject(uuid);
  return successResponse(res, item);
}

export async function reserveStock(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.reserveStock(uuid);
  return successResponse(res, item);
}

export async function startPreparation(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.startPreparation(uuid);
  return successResponse(res, item);
}

export async function readyToDispatch(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.readyToDispatch(uuid);
  return successResponse(res, item);
}

export async function dispatch(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.dispatch(uuid);
  return successResponse(res, item);
}

export async function deliver(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.deliver(uuid);
  return successResponse(res, item);
}

export async function complete(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.complete(uuid);
  return successResponse(res, item);
}

export async function cancel(req: Request, res: Response) {
  const uuid = await service.resolveToUUID(req.params.id);
  const item = await service.cancel(uuid);
  return successResponse(res, item);
}

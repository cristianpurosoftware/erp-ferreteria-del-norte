import { Request, Response } from 'express';
import * as service from './shipments.service';
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
export async function load(req: Request, res: Response) { return successResponse(res, await service.load(req.params.id)); }
export async function depart(req: Request, res: Response) { return successResponse(res, await service.depart(req.params.id)); }
export async function complete(req: Request, res: Response) { return successResponse(res, await service.complete(req.params.id)); }
export async function cancel(req: Request, res: Response) { return successResponse(res, await service.cancel(req.params.id)); }

export async function addStop(req: Request, res: Response) { return createdResponse(res, await service.addStop(req.params.id, req.body)); }
export async function arriveStop(req: Request, res: Response) { return successResponse(res, await service.arriveStop(req.params.id, req.params.stopId)); }
export async function deliverStop(req: Request, res: Response) { return successResponse(res, await service.deliverStop(req.params.id, req.params.stopId, req.body)); }
export async function rejectStop(req: Request, res: Response) { return successResponse(res, await service.rejectStop(req.params.id, req.params.stopId, req.body)); }
export async function partialStop(req: Request, res: Response) { return successResponse(res, await service.partialStop(req.params.id, req.params.stopId, req.body)); }

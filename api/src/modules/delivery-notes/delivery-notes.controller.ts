import { Request, Response } from 'express';
import * as service from './delivery-notes.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) { return successResponse(res, await service.findById(req.params.id)); }
export async function create(req: Request, res: Response) { return createdResponse(res, await service.create(req.body)); }
export async function issue(req: Request, res: Response) { return successResponse(res, await service.issue(req.params.id)); }
export async function cancel(req: Request, res: Response) { return successResponse(res, await service.cancel(req.params.id)); }
export async function fromStop(req: Request, res: Response) { return createdResponse(res, await service.createFromShipmentStop(req.params.stopId)); }

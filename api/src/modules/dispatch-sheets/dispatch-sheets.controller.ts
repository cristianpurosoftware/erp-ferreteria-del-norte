import { Request, Response } from 'express';
import * as service from './dispatch-sheets.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) { return successResponse(res, await service.findById(req.params.id)); }
export async function create(req: Request, res: Response) { return createdResponse(res, await service.create(req.body)); }
export async function update(req: Request, res: Response) { return successResponse(res, await service.update(req.params.id, req.body)); }
export async function print(req: Request, res: Response) { return successResponse(res, await service.print(req.params.id)); }
export async function dispatch(req: Request, res: Response) { return successResponse(res, await service.dispatch(req.params.id)); }
export async function close(req: Request, res: Response) { return successResponse(res, await service.close(req.params.id)); }
export async function getPrintData(req: Request, res: Response) { return successResponse(res, await service.getPrintData(req.params.id)); }

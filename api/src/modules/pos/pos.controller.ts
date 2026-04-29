import { Request, Response } from 'express';
import * as service from './pos.service';
import { successResponse, createdResponse } from '../../common/response';

export async function createSale(req: Request, res: Response) {
  const userId: string = (req as any).user?.id ?? '';
  const result = await service.createSale(req.body, userId);
  return createdResponse(res, result);
}

export async function voidSale(req: Request, res: Response) {
  const userId: string = (req as any).user?.id ?? '';
  const sale = await service.voidSale(req.params.id, userId);
  return successResponse(res, sale);
}

export async function getById(req: Request, res: Response) {
  const sale = await service.getOne(req.params.id);
  return successResponse(res, sale);
}

export async function listToday(req: Request, res: Response) {
  const userId: string = (req as any).user?.id ?? '';
  const items = await service.listToday(userId);
  return successResponse(res, items);
}

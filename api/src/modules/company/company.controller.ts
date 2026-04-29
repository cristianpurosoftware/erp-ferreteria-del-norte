import { Request, Response } from 'express';
import * as service from './company.service';
import { successResponse } from '../../common/response';

export async function get(_req: Request, res: Response) {
  const item = await service.findFirst();
  return successResponse(res, item);
}

export async function update(req: Request, res: Response) {
  const item = await service.update(req.body);
  return successResponse(res, item);
}

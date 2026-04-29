import { Request, Response } from 'express';
import * as service from './three-way-match.service';
import { successResponse } from '../../common/response';

export async function getById(req: Request, res: Response) {
  return successResponse(res, await service.findById(req.params.id));
}

export async function override(req: Request, res: Response) {
  const userId = req.user?.id ?? '';
  return successResponse(res, await service.override(req.params.id, userId, req.body.reason, req.body.notes));
}

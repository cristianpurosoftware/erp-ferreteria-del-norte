import { Request, Response } from 'express';
import { successResponse } from '../../common/response';
import * as permissionsService from './permissions.service';

export async function getAll(_req: Request, res: Response) {
  const permissions = await permissionsService.findAll();
  return successResponse(res, permissions);
}

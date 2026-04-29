import { Request, Response } from 'express';
import * as service from './reconciliation.service';
import { successResponse, createdResponse } from '../../common/response';

export async function suggestions(req: Request, res: Response) {
  const bankStatementId = req.query.bankStatementId as string;
  return successResponse(res, await service.findSuggestions(bankStatementId));
}

export async function confirm(req: Request, res: Response) {
  return createdResponse(res, await service.confirm(req.body, req.user?.id));
}

export async function reject(req: Request, res: Response) {
  return successResponse(res, await service.reject(req.params.id));
}

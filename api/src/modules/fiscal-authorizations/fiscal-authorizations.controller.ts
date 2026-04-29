import { Request, Response } from 'express';
import * as service from './fiscal-authorizations.service';
import { successResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const items = await service.findAll({
    documentId: req.query.documentId as string | undefined,
    documentType: req.query.documentType as string | undefined,
  });
  return successResponse(res, items);
}

export async function getById(req: Request, res: Response) {
  return successResponse(res, await service.findById(req.params.id));
}

export async function requestCae(req: Request, res: Response) {
  return successResponse(res, await service.requestCaeForInvoice(req.params.invoiceId));
}

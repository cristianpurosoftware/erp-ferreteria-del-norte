import { Request, Response } from 'express';
import * as service from './accounts.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAllCustomerAccounts(req: Request, res: Response) {
  const search = req.query.search as string | undefined;
  const items = await service.findAllCustomerAccounts(search);
  return successResponse(res, items);
}

export async function getByEntity(req: Request, res: Response) {
  const entityType = req.query.entityType as string || 'customer';
  const entityId = req.params.entityId;
  const account = await service.findByEntity(entityType, entityId);
  return successResponse(res, account);
}

export async function getEntries(req: Request, res: Response) {
  const { items, meta } = await service.getEntries(
    req.params.accountId,
    req.query as Record<string, unknown>,
  );
  return paginatedResponse(res, items, meta);
}

export async function getEntriesSummary(req: Request, res: Response) {
  const data = await service.findEntriesSummary(
    req.params.accountId,
    req.query as Record<string, unknown>,
  );
  return successResponse(res, data);
}

export async function createEntry(req: Request, res: Response) {
  const entry = await service.createEntry(req.body);
  return createdResponse(res, entry);
}

export async function settleEntry(req: Request, res: Response) {
  const entry = await service.settleEntry(req.params.entryId, req.body.amount);
  return successResponse(res, entry);
}

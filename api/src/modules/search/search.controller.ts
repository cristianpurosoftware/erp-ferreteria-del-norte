import { Request, Response } from 'express';
import * as service from './search.service';
import { successResponse } from '../../common/response';
import { SearchQueryInput } from './search.schema';

export async function search(req: Request, res: Response) {
  const { q, types, limit } = req.query as unknown as SearchQueryInput;
  const permissions = req.user?.permissions ?? [];
  const result = await service.search(q, permissions, limit, types);
  return successResponse(res, { groups: result.groups }, result.meta);
}

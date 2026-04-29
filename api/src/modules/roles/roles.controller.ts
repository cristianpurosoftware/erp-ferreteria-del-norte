import { Request, Response } from 'express';
import { successResponse, createdResponse, paginatedResponse, noContentResponse } from '../../common/response';
import { PaginationQuery } from '../../common/pagination';
import * as rolesService from './roles.service';

export async function getAll(req: Request, res: Response) {
  const query = new PaginationQuery(req.query);
  const { items, meta } = await rolesService.findAll(query);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  const role = await rolesService.findById(req.params.id);
  return successResponse(res, role);
}

export async function create(req: Request, res: Response) {
  const role = await rolesService.create(req.body);
  return createdResponse(res, role);
}

export async function update(req: Request, res: Response) {
  const role = await rolesService.update(req.params.id, req.body);
  return successResponse(res, role);
}

export async function remove(req: Request, res: Response) {
  await rolesService.remove(req.params.id);
  return noContentResponse(res);
}

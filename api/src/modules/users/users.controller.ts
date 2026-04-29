import { Request, Response } from 'express';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';
import * as usersService from './users.service';

export async function getMe(req: Request, res: Response) {
  const user = await usersService.findByIdWithPermissions(req.user!.id);
  return successResponse(res, user);
}

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await usersService.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  const user = await usersService.findById(req.params.id);
  return successResponse(res, user);
}

export async function create(req: Request, res: Response) {
  const user = await usersService.create(req.body);
  return createdResponse(res, user);
}

export async function update(req: Request, res: Response) {
  const user = await usersService.update(req.params.id, req.body);
  return successResponse(res, user);
}

export async function deactivate(req: Request, res: Response) {
  const user = await usersService.deactivate(req.params.id);
  return successResponse(res, user);
}

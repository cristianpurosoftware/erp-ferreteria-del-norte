import { Request, Response } from 'express';
import * as service from './purchases.service';
import { successResponse, createdResponse, paginatedResponse } from '../../common/response';

export async function getAll(req: Request, res: Response) {
  const { items, meta } = await service.findAll(req.query as Record<string, unknown>);
  return paginatedResponse(res, items, meta);
}

export async function getSummary(req: Request, res: Response) {
  const data = await service.findSummary(req.query as Record<string, unknown>);
  return successResponse(res, data);
}

export async function getById(req: Request, res: Response) {
  const item = await service.findById(req.params.id);
  return successResponse(res, item);
}

export async function create(req: Request, res: Response) {
  const item = await service.create(req.body);
  return createdResponse(res, item);
}

export async function update(req: Request, res: Response) {
  const item = await service.update(req.params.id, req.body);
  return successResponse(res, item);
}

export async function approve(req: Request, res: Response) {
  const item = await service.approve(req.params.id);
  return successResponse(res, item);
}

export async function send(req: Request, res: Response) {
  const item = await service.send(req.params.id);
  return successResponse(res, item);
}

export async function receive(req: Request, res: Response) {
  const item = await service.receive(req.params.id);
  return successResponse(res, item);
}

export async function cancel(req: Request, res: Response) {
  const item = await service.cancel(req.params.id);
  return successResponse(res, item);
}

export async function createReception(req: Request, res: Response) {
  const reception = await service.createReception(req.params.id, req.body);
  return createdResponse(res, reception);
}

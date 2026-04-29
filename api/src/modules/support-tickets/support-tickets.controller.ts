import { Request, Response } from 'express';
import * as service from './support-tickets.service';
import * as chat from './support-chat.service';
import * as attachments from './support-attachments.service';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  noContentResponse,
} from '../../common/response';
import { BusinessLogicError } from '../../common/errors';

type UploadedFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

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
  const files = ((req as any).files as UploadedFile[] | undefined) ?? undefined;
  const item = await service.create(req.body, files, req.user?.id);
  return createdResponse(res, item);
}

export async function getAgentStatus(_req: Request, res: Response) {
  return successResponse(res, chat.agentStatus());
}

export async function update(req: Request, res: Response) {
  const item = await service.update(req.params.id, req.body);
  return successResponse(res, item);
}

export async function transition(req: Request, res: Response) {
  const { to, note } = req.body;
  const userPermissions = req.user?.permissions ?? [];
  const item = await service.transition(req.params.id, to, note, userPermissions);
  return successResponse(res, item);
}

// ─── Chat ──────────────────────────────────────────────────────────

/**
 * Accepts either a JSON body or multipart/form-data. When multipart, the
 * operator can attach files to the specific message they're sending.
 */
export async function sendCustomerMessage(req: Request, res: Response) {
  const body = typeof req.body?.body === 'string' ? req.body.body : '';
  if (!body.trim()) {
    throw new BusinessLogicError('EMPTY_MESSAGE', 'El mensaje no puede estar vacío');
  }
  const files = ((req as any).files as UploadedFile[] | undefined) ?? undefined;
  const item = await service.sendCustomerMessage(req.params.id, body, files, req.user?.id);
  return successResponse(res, item);
}

export async function sendSupportHumanMessage(req: Request, res: Response) {
  const item = await service.sendSupportHumanMessage(req.params.id, req.body.body, req.user?.id);
  return successResponse(res, item);
}

export async function reopen(req: Request, res: Response) {
  const item = await service.reopen(req.params.id);
  return successResponse(res, item);
}

export async function escalateHuman(req: Request, res: Response) {
  const item = await service.escalateToHuman(req.params.id, req.body?.note);
  return successResponse(res, item);
}

export async function returnToAgent(req: Request, res: Response) {
  const item = await service.returnToAgent(req.params.id, req.body?.note);
  return successResponse(res, item);
}

// ─── Attachments ───────────────────────────────────────────────────

export async function uploadAttachment(req: Request, res: Response) {
  if (!attachments.attachmentsEnabled()) {
    throw new BusinessLogicError(
      'ATTACHMENTS_DISABLED',
      'El almacenamiento de adjuntos no está configurado en este ambiente',
    );
  }
  const file = (req as any).file as UploadedFile | undefined;
  if (!file) {
    throw new BusinessLogicError('NO_FILE', 'Falta el campo `file` en el form-data');
  }
  const att = await attachments.uploadAttachment(req.params.id, file, req.user?.id);
  return createdResponse(res, att);
}

export async function listAttachments(req: Request, res: Response) {
  const items = await attachments.listAttachments(req.params.id);
  return successResponse(res, items);
}

export async function downloadAttachment(req: Request, res: Response) {
  const { url } = await attachments.getDownloadUrl(req.params.attachmentId);
  res.redirect(302, url);
}

export async function removeAttachment(req: Request, res: Response) {
  await attachments.deleteAttachment(req.params.attachmentId);
  return noContentResponse(res);
}

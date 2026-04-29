import { Router } from 'express';
import multer from 'multer';
import * as controller from './support-tickets.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { env } from '../../config/env';
import {
  CreateSupportTicketSchema,
  UpdateSupportTicketSchema,
  ChatMessageSchema,
  AgentActionNoteSchema,
} from './support-tickets.schema';
import { z } from 'zod';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.ATTACHMENT_MAX_BYTES },
});

const TransitionSchema = z.object({
  to: z.enum(['in_progress', 'review', 'resolved']),
  note: z.string().trim().max(5000).optional(),
});

const router = Router();

router.get('/',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.VIEW),
  controller.getAll);

router.get('/summary',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.VIEW),
  controller.getSummary);

router.get('/agent/status',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.VIEW),
  controller.getAgentStatus);

router.get('/:id',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.VIEW),
  controller.getById);

router.post('/',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.CREATE),
  upload.array('attachments', 10),
  validateBody(CreateSupportTicketSchema),
  controller.create);

router.put('/:id',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.UPDATE),
  validateBody(UpdateSupportTicketSchema),
  controller.update);

router.post('/:id/status',
  requirePermission([
    PERMISSIONS.SUPPORT_TICKETS.UPDATE,
    PERMISSIONS.SUPPORT_TICKETS.RESOLVE,
  ]),
  validateBody(TransitionSchema),
  controller.transition);

// ─── Chat ──────────────────────────────────────────────────────────
router.post('/:id/messages',
  requirePermission([
    PERMISSIONS.SUPPORT_TICKETS.COMMENT,
    PERMISSIONS.SUPPORT_TICKETS.UPDATE,
  ]),
  upload.array('attachments', 10),
  validateBody(ChatMessageSchema),
  controller.sendCustomerMessage);

router.post('/:id/support-messages',
  requirePermission([
    PERMISSIONS.SUPPORT_TICKETS.UPDATE,
    PERMISSIONS.SUPPORT_TICKETS.RESOLVE,
  ]),
  validateBody(ChatMessageSchema),
  controller.sendSupportHumanMessage);

router.post('/:id/reopen',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.RESOLVE),
  controller.reopen);

router.post('/:id/agent-actions/escalate-human',
  requirePermission([
    PERMISSIONS.SUPPORT_TICKETS.UPDATE,
    PERMISSIONS.SUPPORT_TICKETS.RESOLVE,
  ]),
  validateBody(AgentActionNoteSchema),
  controller.escalateHuman);

router.post('/:id/agent-actions/return-to-agent',
  requirePermission([
    PERMISSIONS.SUPPORT_TICKETS.UPDATE,
    PERMISSIONS.SUPPORT_TICKETS.RESOLVE,
  ]),
  validateBody(AgentActionNoteSchema),
  controller.returnToAgent);

// ─── Attachments ───────────────────────────────────────────────────
router.get('/:id/attachments',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.VIEW),
  controller.listAttachments);

router.post('/:id/attachments',
  requirePermission([
    PERMISSIONS.SUPPORT_TICKETS.UPDATE,
    PERMISSIONS.SUPPORT_TICKETS.COMMENT,
  ]),
  upload.single('file'),
  controller.uploadAttachment);

router.get('/:id/attachments/:attachmentId/download',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.VIEW),
  controller.downloadAttachment);

router.delete('/:id/attachments/:attachmentId',
  requirePermission(PERMISSIONS.SUPPORT_TICKETS.UPDATE),
  controller.removeAttachment);

export default router;

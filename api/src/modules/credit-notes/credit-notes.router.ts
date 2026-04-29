import { Router } from 'express';
import * as controller from './credit-notes.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateCreditNoteSchema } from './credit-notes.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.CREDIT_NOTES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.CREDIT_NOTES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.CREDIT_NOTES.CREATE), validateBody(CreateCreditNoteSchema), controller.create);
router.post('/:id/issue', requirePermission(PERMISSIONS.CREDIT_NOTES.ISSUE), controller.issue);
router.post('/:id/apply', requirePermission(PERMISSIONS.CREDIT_NOTES.APPLY), controller.apply);
router.post('/:id/cancel', requirePermission(PERMISSIONS.CREDIT_NOTES.CANCEL), controller.cancel);

export default router;

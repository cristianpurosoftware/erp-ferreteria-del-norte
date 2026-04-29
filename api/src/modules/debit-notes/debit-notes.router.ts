import { Router } from 'express';
import * as controller from './debit-notes.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateDebitNoteSchema } from './debit-notes.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.DEBIT_NOTES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.DEBIT_NOTES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.DEBIT_NOTES.CREATE), validateBody(CreateDebitNoteSchema), controller.create);
router.post('/:id/issue', requirePermission(PERMISSIONS.DEBIT_NOTES.ISSUE), controller.issue);
router.post('/:id/cancel', requirePermission(PERMISSIONS.DEBIT_NOTES.CANCEL), controller.cancel);

export default router;

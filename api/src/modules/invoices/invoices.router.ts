import { Router } from 'express';
import * as controller from './invoices.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateInvoiceSchema } from './invoices.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.INVOICES.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.INVOICES.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.INVOICES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.INVOICES.CREATE), validateBody(CreateInvoiceSchema), controller.create);
router.post('/:id/issue', requirePermission(PERMISSIONS.INVOICES.ISSUE), controller.issue);
router.post('/:id/void', requirePermission(PERMISSIONS.INVOICES.VOID), controller.voidInvoice);
router.post('/:id/cancel', requirePermission(PERMISSIONS.INVOICES.CANCEL), controller.cancel);

export default router;

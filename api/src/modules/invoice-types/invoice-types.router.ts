import { Router } from 'express';
import * as controller from './invoice-types.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateInvoiceTypeSchema, UpdateInvoiceTypeSchema } from './invoice-types.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.INVOICE_TYPES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.INVOICE_TYPES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.INVOICE_TYPES.CREATE), validateBody(CreateInvoiceTypeSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.INVOICE_TYPES.UPDATE), validateBody(UpdateInvoiceTypeSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.INVOICE_TYPES.DELETE), controller.remove);

export default router;

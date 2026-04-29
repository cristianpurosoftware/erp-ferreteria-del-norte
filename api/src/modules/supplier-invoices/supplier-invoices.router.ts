import { Router } from 'express';
import * as controller from './supplier-invoices.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateSupplierInvoiceSchema, UpdateSupplierInvoiceSchema } from './supplier-invoices.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.CREATE), validateBody(CreateSupplierInvoiceSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.UPDATE), validateBody(UpdateSupplierInvoiceSchema), controller.update);
router.post('/:id/submit-for-approval', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.SUBMIT), controller.submit);
router.post('/:id/approve', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.APPROVE), controller.approve);
router.post('/:id/dispute', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.DISPUTE), controller.dispute);
router.post('/:id/cancel', requirePermission(PERMISSIONS.SUPPLIER_INVOICES.CANCEL), controller.cancel);

export default router;

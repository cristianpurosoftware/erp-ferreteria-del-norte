import { Router } from 'express';
import * as controller from './supplier-delivery-notes.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateSupplierDeliveryNoteSchema, UpdateSupplierDeliveryNoteSchema } from './supplier-delivery-notes.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.SUPPLIER_DELIVERY_NOTES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.SUPPLIER_DELIVERY_NOTES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.SUPPLIER_DELIVERY_NOTES.CREATE), validateBody(CreateSupplierDeliveryNoteSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.SUPPLIER_DELIVERY_NOTES.UPDATE), validateBody(UpdateSupplierDeliveryNoteSchema), controller.update);
router.post('/:id/receive', requirePermission(PERMISSIONS.SUPPLIER_DELIVERY_NOTES.RECEIVE), controller.receive);
router.post('/:id/close', requirePermission(PERMISSIONS.SUPPLIER_DELIVERY_NOTES.RECEIVE), controller.close);

export default router;

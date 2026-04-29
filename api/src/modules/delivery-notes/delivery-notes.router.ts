import { Router } from 'express';
import * as controller from './delivery-notes.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateDeliveryNoteSchema } from './delivery-notes.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.DELIVERY_NOTES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.DELIVERY_NOTES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.DELIVERY_NOTES.CREATE), validateBody(CreateDeliveryNoteSchema), controller.create);
router.post('/:id/issue', requirePermission(PERMISSIONS.DELIVERY_NOTES.ISSUE), controller.issue);
router.post('/:id/cancel', requirePermission(PERMISSIONS.DELIVERY_NOTES.CANCEL), controller.cancel);
router.post('/from-shipment-stop/:stopId', requirePermission(PERMISSIONS.DELIVERY_NOTES.CREATE), controller.fromStop);

export default router;

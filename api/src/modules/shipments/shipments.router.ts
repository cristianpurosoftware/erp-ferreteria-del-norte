import { Router } from 'express';
import * as controller from './shipments.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateShipmentSchema, UpdateShipmentSchema, AddStopSchema, DeliverStopSchema, RejectStopSchema } from './shipments.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.SHIPMENTS.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.SHIPMENTS.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.SHIPMENTS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.SHIPMENTS.CREATE), validateBody(CreateShipmentSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.SHIPMENTS.UPDATE), validateBody(UpdateShipmentSchema), controller.update);
router.post('/:id/load', requirePermission(PERMISSIONS.SHIPMENTS.LOAD), controller.load);
router.post('/:id/depart', requirePermission(PERMISSIONS.SHIPMENTS.DEPART), controller.depart);
router.post('/:id/complete', requirePermission(PERMISSIONS.SHIPMENTS.COMPLETE), controller.complete);
router.post('/:id/cancel', requirePermission(PERMISSIONS.SHIPMENTS.CANCEL), controller.cancel);

router.post('/:id/stops', requirePermission(PERMISSIONS.SHIPMENTS.UPDATE), validateBody(AddStopSchema), controller.addStop);
router.post('/:id/stops/:stopId/arrive', requirePermission(PERMISSIONS.SHIPMENTS.DELIVER_STOP), controller.arriveStop);
router.post('/:id/stops/:stopId/deliver', requirePermission(PERMISSIONS.SHIPMENTS.DELIVER_STOP), validateBody(DeliverStopSchema), controller.deliverStop);
router.post('/:id/stops/:stopId/reject', requirePermission(PERMISSIONS.SHIPMENTS.REJECT_STOP), validateBody(RejectStopSchema), controller.rejectStop);
router.post('/:id/stops/:stopId/partial', requirePermission(PERMISSIONS.SHIPMENTS.REJECT_STOP), controller.partialStop);

export default router;

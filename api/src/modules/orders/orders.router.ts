import { Router } from 'express';
import * as controller from './orders.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateOrderSchema, UpdateOrderSchema } from './orders.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.ORDERS.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.ORDERS.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.ORDERS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.ORDERS.CREATE), validateBody(CreateOrderSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.ORDERS.UPDATE), validateBody(UpdateOrderSchema), controller.update);
router.post('/:id/submit', requirePermission(PERMISSIONS.ORDERS.CREATE), controller.submit);
router.post('/:id/confirm', requirePermission(PERMISSIONS.ORDERS.CONFIRM), controller.confirm);
router.post('/:id/reject', requirePermission(PERMISSIONS.ORDERS.REJECT), controller.reject);
router.post('/:id/reserve-stock', requirePermission(PERMISSIONS.ORDERS.CONFIRM), controller.reserveStock);
router.post('/:id/start-preparation', requirePermission(PERMISSIONS.ORDERS.DISPATCH), controller.startPreparation);
router.post('/:id/ready-to-dispatch', requirePermission(PERMISSIONS.ORDERS.DISPATCH), controller.readyToDispatch);
router.post('/:id/dispatch', requirePermission(PERMISSIONS.ORDERS.DISPATCH), controller.dispatch);
router.post('/:id/deliver', requirePermission(PERMISSIONS.ORDERS.DELIVER), controller.deliver);
router.post('/:id/complete', requirePermission(PERMISSIONS.ORDERS.COMPLETE), controller.complete);
router.post('/:id/cancel', requirePermission(PERMISSIONS.ORDERS.CANCEL), controller.cancel);

export default router;

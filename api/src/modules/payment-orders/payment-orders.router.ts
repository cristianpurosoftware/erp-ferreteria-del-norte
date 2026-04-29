import { Router } from 'express';
import * as controller from './payment-orders.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePaymentOrderSchema, CreatePaymentBatchSchema } from './payment-orders.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PAYMENT_ORDERS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_ORDERS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PAYMENT_ORDERS.CREATE), validateBody(CreatePaymentOrderSchema), controller.create);
router.post('/:id/approve', requirePermission(PERMISSIONS.PAYMENT_ORDERS.APPROVE), controller.approve);
router.post('/:id/pay', requirePermission(PERMISSIONS.PAYMENT_ORDERS.PAY), controller.pay);
router.post('/:id/cancel', requirePermission(PERMISSIONS.PAYMENT_ORDERS.CANCEL), controller.cancel);

export default router;

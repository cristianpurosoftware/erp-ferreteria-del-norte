import { Router } from 'express';
import * as controller from './payment-methods.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePaymentMethodSchema, UpdatePaymentMethodSchema } from './payment-methods.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PAYMENT_METHODS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_METHODS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PAYMENT_METHODS.CREATE), validateBody(CreatePaymentMethodSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.PAYMENT_METHODS.UPDATE), validateBody(UpdatePaymentMethodSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.PAYMENT_METHODS.DELETE), controller.remove);

export default router;

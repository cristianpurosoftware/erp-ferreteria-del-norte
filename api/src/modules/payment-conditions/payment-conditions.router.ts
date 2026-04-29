import { Router } from 'express';
import * as controller from './payment-conditions.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePaymentConditionSchema, UpdatePaymentConditionSchema } from './payment-conditions.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PAYMENT_CONDITIONS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_CONDITIONS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PAYMENT_CONDITIONS.CREATE), validateBody(CreatePaymentConditionSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.PAYMENT_CONDITIONS.UPDATE), validateBody(UpdatePaymentConditionSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.PAYMENT_CONDITIONS.DELETE), controller.remove);

export default router;

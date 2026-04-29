import { Router } from 'express';
import * as controller from './payments.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePaymentSchema } from './payments.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PAYMENTS.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.PAYMENTS.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.PAYMENTS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PAYMENTS.CREATE), validateBody(CreatePaymentSchema), controller.create);
router.post('/:id/register', requirePermission(PERMISSIONS.PAYMENTS.APPLY), controller.register);
router.post('/:id/apply', requirePermission(PERMISSIONS.PAYMENTS.APPLY), controller.apply);
router.post('/:id/reconcile', requirePermission(PERMISSIONS.PAYMENTS.RECONCILE), controller.reconcile);
router.post('/:id/cancel', requirePermission(PERMISSIONS.PAYMENTS.CANCEL), controller.cancel);

export default router;

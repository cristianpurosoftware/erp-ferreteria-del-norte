import { Router } from 'express';
import * as controller from './payment-orders.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePaymentBatchSchema } from './payment-orders.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PAYMENT_BATCHES.VIEW), controller.getAllBatches);
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_BATCHES.VIEW), controller.getBatchById);
router.post('/', requirePermission(PERMISSIONS.PAYMENT_BATCHES.CREATE), validateBody(CreatePaymentBatchSchema), controller.createBatch);
router.post('/:id/generate-file', requirePermission(PERMISSIONS.PAYMENT_BATCHES.GENERATE_FILE), controller.generateFile);
router.post('/:id/mark-processed', requirePermission(PERMISSIONS.PAYMENT_BATCHES.MARK_PROCESSED), controller.markProcessed);

export default router;

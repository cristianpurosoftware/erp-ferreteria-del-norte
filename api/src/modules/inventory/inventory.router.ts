import { Router } from 'express';
import * as controller from './inventory.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateMovementSchema, AdjustStockSchema, TransferSchema } from './inventory.schema';

const router = Router();

router.get('/stock', requirePermission(PERMISSIONS.INVENTORY.VIEW), controller.getStock);
router.get('/movements', requirePermission(PERMISSIONS.INVENTORY.VIEW), controller.getMovements);
router.get('/movements/summary', requirePermission(PERMISSIONS.INVENTORY.VIEW), controller.getMovementsSummary);
router.post('/movements', requirePermission(PERMISSIONS.INVENTORY.VIEW), validateBody(CreateMovementSchema), controller.createMovement);
router.post('/adjustments', requirePermission(PERMISSIONS.INVENTORY.ADJUST), validateBody(AdjustStockSchema), controller.adjustStock);
router.post('/transfers', requirePermission(PERMISSIONS.INVENTORY.TRANSFER), validateBody(TransferSchema), controller.transferStock);

export default router;

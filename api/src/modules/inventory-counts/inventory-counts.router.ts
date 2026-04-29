import { Router } from 'express';
import * as controller from './inventory-counts.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateInventoryCountSchema, AddLinesSchema } from './inventory-counts.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.INVENTORY_COUNTS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.INVENTORY_COUNTS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.INVENTORY_COUNTS.CREATE), validateBody(CreateInventoryCountSchema), controller.create);
router.post('/:id/start', requirePermission(PERMISSIONS.INVENTORY_COUNTS.START), controller.start);
router.post('/:id/lines', requirePermission(PERMISSIONS.INVENTORY_COUNTS.COUNT), validateBody(AddLinesSchema), controller.addLines);
router.post('/:id/finish', requirePermission(PERMISSIONS.INVENTORY_COUNTS.COUNT), controller.finish);
router.post('/:id/approve', requirePermission(PERMISSIONS.INVENTORY_COUNTS.APPROVE), controller.approve);
router.post('/:id/apply', requirePermission(PERMISSIONS.INVENTORY_COUNTS.APPLY), controller.apply);
router.post('/:id/cancel', requirePermission(PERMISSIONS.INVENTORY_COUNTS.CANCEL), controller.cancel);
router.post('/:id/recreate-from-stock', requirePermission(PERMISSIONS.INVENTORY_COUNTS.CREATE), controller.recreateFromStock);

export default router;

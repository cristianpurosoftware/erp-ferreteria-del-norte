import { Router } from 'express';
import * as controller from './picking.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePickingTaskSchema, AssignPickingTaskSchema, PickItemSchema } from './picking.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PICKING.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.PICKING.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PICKING.CREATE), validateBody(CreatePickingTaskSchema), controller.create);
router.post('/:id/assign', requirePermission(PERMISSIONS.PICKING.ASSIGN), validateBody(AssignPickingTaskSchema), controller.assign);
router.post('/:id/start', requirePermission(PERMISSIONS.PICKING.START), controller.start);
router.post('/:id/items/:itemId/pick', requirePermission(PERMISSIONS.PICKING.PICK), validateBody(PickItemSchema), controller.pickItem);
router.post('/:id/complete', requirePermission(PERMISSIONS.PICKING.COMPLETE), controller.complete);
router.post('/:id/stage', requirePermission(PERMISSIONS.PICKING.COMPLETE), controller.stage);
router.post('/:id/cancel', requirePermission(PERMISSIONS.PICKING.CANCEL), controller.cancel);

export default router;

import { Router } from 'express';
import * as controller from './warehouses.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateWarehouseSchema, UpdateWarehouseSchema } from './warehouses.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.WAREHOUSES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.WAREHOUSES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.WAREHOUSES.CREATE), validateBody(CreateWarehouseSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.WAREHOUSES.UPDATE), validateBody(UpdateWarehouseSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.WAREHOUSES.DELETE), controller.remove);

export default router;

import { Router } from 'express';
import * as controller from './warehouse-locations.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateWarehouseLocationSchema, UpdateWarehouseLocationSchema } from './warehouse-locations.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.WAREHOUSE_LOCATIONS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.WAREHOUSE_LOCATIONS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.WAREHOUSE_LOCATIONS.CREATE), validateBody(CreateWarehouseLocationSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.WAREHOUSE_LOCATIONS.UPDATE), validateBody(UpdateWarehouseLocationSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.WAREHOUSE_LOCATIONS.DELETE), controller.remove);

export default router;

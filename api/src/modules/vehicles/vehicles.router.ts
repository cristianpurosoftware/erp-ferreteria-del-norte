import { Router } from 'express';
import * as controller from './vehicles.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateVehicleSchema, UpdateVehicleSchema } from './vehicles.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.VEHICLES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.VEHICLES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.VEHICLES.CREATE), validateBody(CreateVehicleSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.VEHICLES.UPDATE), validateBody(UpdateVehicleSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.VEHICLES.DELETE), controller.remove);

export default router;

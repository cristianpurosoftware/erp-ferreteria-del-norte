import { Router } from 'express';
import * as controller from './drivers.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateDriverSchema, UpdateDriverSchema } from './drivers.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.DRIVERS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.DRIVERS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.DRIVERS.CREATE), validateBody(CreateDriverSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.DRIVERS.UPDATE), validateBody(UpdateDriverSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.DRIVERS.DELETE), controller.remove);

export default router;

import { Router } from 'express';
import * as controller from './units.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateUnitSchema, UpdateUnitSchema } from './units.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.UNITS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.UNITS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.UNITS.CREATE), validateBody(CreateUnitSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.UNITS.UPDATE), validateBody(UpdateUnitSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.UNITS.DELETE), controller.remove);

export default router;

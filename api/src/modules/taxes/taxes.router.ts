import { Router } from 'express';
import * as controller from './taxes.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateTaxSchema, UpdateTaxSchema } from './taxes.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.TAXES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.TAXES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.TAXES.CREATE), validateBody(CreateTaxSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.TAXES.UPDATE), validateBody(UpdateTaxSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.TAXES.DELETE), controller.remove);

export default router;

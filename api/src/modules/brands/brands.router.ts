import { Router } from 'express';
import * as controller from './brands.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateBrandSchema, UpdateBrandSchema } from './brands.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.BRANDS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.BRANDS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.BRANDS.CREATE), validateBody(CreateBrandSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.BRANDS.UPDATE), validateBody(UpdateBrandSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.BRANDS.DELETE), controller.remove);

export default router;

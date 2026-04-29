import { Router } from 'express';
import * as controller from './categories.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateCategorySchema, UpdateCategorySchema } from './categories.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.CATEGORIES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.CATEGORIES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.CATEGORIES.CREATE), validateBody(CreateCategorySchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.CATEGORIES.UPDATE), validateBody(UpdateCategorySchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.CATEGORIES.DELETE), controller.remove);

export default router;

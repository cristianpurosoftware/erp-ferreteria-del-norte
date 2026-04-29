import { Router } from 'express';
import * as controller from './branches.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateBranchSchema, UpdateBranchSchema } from './branches.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.BRANCHES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.BRANCHES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.BRANCHES.CREATE), validateBody(CreateBranchSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.BRANCHES.UPDATE), validateBody(UpdateBranchSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.BRANCHES.DELETE), controller.remove);

export default router;

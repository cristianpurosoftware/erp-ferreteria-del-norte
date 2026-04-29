import { Router } from 'express';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateRoleSchema, UpdateRoleSchema } from './roles.schema';
import * as rolesController from './roles.controller';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.ROLES.VIEW) as any, rolesController.getAll as any);
router.get('/:id', requirePermission(PERMISSIONS.ROLES.VIEW) as any, rolesController.getById as any);
router.post('/', requirePermission(PERMISSIONS.ROLES.CREATE) as any, validateBody(CreateRoleSchema), rolesController.create as any);
router.put('/:id', requirePermission(PERMISSIONS.ROLES.UPDATE) as any, validateBody(UpdateRoleSchema), rolesController.update as any);
router.delete('/:id', requirePermission(PERMISSIONS.ROLES.DELETE) as any, rolesController.remove as any);

export default router;

import { Router } from 'express';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateUserSchema, UpdateUserSchema } from './users.schema';
import * as usersController from './users.controller';

const router = Router();

router.get('/me', usersController.getMe as any);
router.get('/', requirePermission(PERMISSIONS.USERS.VIEW) as any, usersController.getAll as any);
router.get('/:id', requirePermission(PERMISSIONS.USERS.VIEW) as any, usersController.getById as any);
router.post('/', requirePermission(PERMISSIONS.USERS.CREATE) as any, validateBody(CreateUserSchema), usersController.create as any);
router.put('/:id', requirePermission(PERMISSIONS.USERS.UPDATE) as any, validateBody(UpdateUserSchema), usersController.update as any);
router.delete('/:id', requirePermission(PERMISSIONS.USERS.DELETE) as any, usersController.deactivate as any);

export default router;

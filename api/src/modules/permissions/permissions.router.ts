import { Router } from 'express';
import { requirePermission } from '../../middlewares/permissions';
import { PERMISSIONS } from './permissions.constants';
import * as permissionsController from './permissions.controller';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.ROLES.VIEW) as any, permissionsController.getAll as any);

export default router;

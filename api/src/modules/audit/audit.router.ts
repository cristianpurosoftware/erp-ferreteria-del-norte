import { Router } from 'express';
import * as controller from './audit.controller';
import { requirePermission } from '../../middlewares/permissions';
import { PERMISSIONS } from '../permissions/permissions.constants';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.AUDIT.VIEW), controller.getAll);
router.get('/facets', requirePermission(PERMISSIONS.AUDIT.VIEW), controller.getFacets);
router.get('/entity/:entityType/:entityId', requirePermission(PERMISSIONS.AUDIT.VIEW), controller.getByEntity);
router.get('/:id', requirePermission(PERMISSIONS.AUDIT.VIEW), controller.getById);

export default router;

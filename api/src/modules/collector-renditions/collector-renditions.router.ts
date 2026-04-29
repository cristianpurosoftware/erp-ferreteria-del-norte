import { Router } from 'express';
import * as controller from './collector-renditions.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateCollectorRenditionSchema, ApproveRenditionSchema } from './collector-renditions.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.COLLECTOR_RENDITIONS.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.COLLECTOR_RENDITIONS.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.COLLECTOR_RENDITIONS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.COLLECTOR_RENDITIONS.CREATE), validateBody(CreateCollectorRenditionSchema), controller.create);
router.post('/:id/submit', requirePermission(PERMISSIONS.COLLECTOR_RENDITIONS.SUBMIT), controller.submit);
router.post('/:id/approve', requirePermission(PERMISSIONS.COLLECTOR_RENDITIONS.APPROVE), validateBody(ApproveRenditionSchema), controller.approve);
router.post('/:id/reject', requirePermission(PERMISSIONS.COLLECTOR_RENDITIONS.REJECT), controller.reject);

export default router;

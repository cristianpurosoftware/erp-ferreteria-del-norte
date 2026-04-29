import { Router } from 'express';
import * as controller from './integrations.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateIntegrationSchema, UpdateIntegrationSchema } from './integrations.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.INTEGRATIONS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.INTEGRATIONS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.INTEGRATIONS.CREATE), validateBody(CreateIntegrationSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.INTEGRATIONS.UPDATE), validateBody(UpdateIntegrationSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.INTEGRATIONS.DELETE), controller.remove);
router.post('/:id/webhook', controller.webhook); // Public endpoint for webhooks

export default router;

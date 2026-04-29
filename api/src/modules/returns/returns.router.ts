import { Router } from 'express';
import * as controller from './returns.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateReturnSchema, InspectItemsSchema } from './returns.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.RETURNS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.RETURNS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.RETURNS.CREATE), validateBody(CreateReturnSchema), controller.create);
router.post('/:id/confirm', requirePermission(PERMISSIONS.RETURNS.CONFIRM), controller.confirm);
router.post('/:id/receive', requirePermission(PERMISSIONS.RETURNS.RECEIVE), controller.receive);
router.post('/:id/inspect', requirePermission(PERMISSIONS.RETURNS.INSPECT), validateBody(InspectItemsSchema), controller.inspect);
router.post('/:id/close', requirePermission(PERMISSIONS.RETURNS.CLOSE), controller.close);
router.post('/:id/cancel', requirePermission(PERMISSIONS.RETURNS.CANCEL), controller.cancel);

export default router;

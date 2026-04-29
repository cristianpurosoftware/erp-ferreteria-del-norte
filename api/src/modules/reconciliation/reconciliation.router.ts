import { Router } from 'express';
import * as controller from './reconciliation.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { ConfirmMatchSchema } from './reconciliation.schema';

const router = Router();

router.get('/suggestions', requirePermission(PERMISSIONS.RECONCILIATION.VIEW), controller.suggestions);
router.post('/confirm', requirePermission(PERMISSIONS.RECONCILIATION.CONFIRM), validateBody(ConfirmMatchSchema), controller.confirm);
router.post('/:id/reject', requirePermission(PERMISSIONS.RECONCILIATION.REJECT), controller.reject);

export default router;

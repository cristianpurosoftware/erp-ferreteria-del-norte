import { Router } from 'express';
import * as controller from './commissions.controller';
import { requirePermission } from '../../middlewares/permissions';
import { PERMISSIONS } from '../permissions/permissions.constants';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.COMMISSIONS.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.COMMISSIONS.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.COMMISSIONS.VIEW), controller.getById);
router.post('/:id/approve', requirePermission(PERMISSIONS.COMMISSIONS.APPROVE), controller.approve);
router.post('/:id/reverse', requirePermission(PERMISSIONS.COMMISSIONS.REVERSE), controller.reverse);

export default router;

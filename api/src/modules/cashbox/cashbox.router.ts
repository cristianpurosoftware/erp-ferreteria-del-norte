import { Router } from 'express';
import * as controller from './cashbox.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateCashboxSchema, UpdateCashboxSchema, OpenCashboxSchema, CloseCashboxSchema } from './cashbox.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.CASHBOX.VIEW), controller.getAll);
router.get('/sessions', requirePermission(PERMISSIONS.CASHBOX.VIEW), controller.getAllSessions);
router.post('/', requirePermission(PERMISSIONS.CASHBOX.MANAGE), validateBody(CreateCashboxSchema), controller.create);
router.get('/:id', requirePermission(PERMISSIONS.CASHBOX.VIEW), controller.getById);
router.put('/:id', requirePermission(PERMISSIONS.CASHBOX.MANAGE), validateBody(UpdateCashboxSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.CASHBOX.MANAGE), controller.remove);
router.post('/:id/open', requirePermission(PERMISSIONS.CASHBOX.OPEN), validateBody(OpenCashboxSchema), controller.open);
router.post('/:id/close', requirePermission(PERMISSIONS.CASHBOX.CLOSE), validateBody(CloseCashboxSchema), controller.close);

export default router;

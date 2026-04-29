import { Router } from 'express';
import * as controller from './bank-statements.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateBankStatementSchema } from './bank-statements.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.BANK_STATEMENTS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.BANK_STATEMENTS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.BANK_STATEMENTS.IMPORT), validateBody(CreateBankStatementSchema), controller.create);
router.post('/:id/reconcile', requirePermission(PERMISSIONS.BANK_STATEMENTS.RECONCILE), controller.markReconciled);

export default router;

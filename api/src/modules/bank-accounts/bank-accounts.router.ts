import { Router } from 'express';
import * as controller from './bank-accounts.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateBankAccountSchema, UpdateBankAccountSchema } from './bank-accounts.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.BANK_ACCOUNTS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.BANK_ACCOUNTS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.BANK_ACCOUNTS.CREATE), validateBody(CreateBankAccountSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.BANK_ACCOUNTS.UPDATE), validateBody(UpdateBankAccountSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.BANK_ACCOUNTS.DELETE), controller.remove);

export default router;

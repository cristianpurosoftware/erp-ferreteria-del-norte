import { Router } from 'express';
import * as controller from './accounts.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateAccountEntrySchema } from './accounts.schema';

const router = Router();

router.get('/customers', requirePermission(PERMISSIONS.ACCOUNTS.VIEW), controller.getAllCustomerAccounts);
router.get('/customer/:entityId', requirePermission(PERMISSIONS.ACCOUNTS.VIEW), controller.getByEntity);
router.get('/:accountId/entries/summary', requirePermission(PERMISSIONS.ACCOUNTS.VIEW), controller.getEntriesSummary);
router.get('/:accountId/entries', requirePermission(PERMISSIONS.ACCOUNTS.VIEW), controller.getEntries);
router.post('/entries', requirePermission(PERMISSIONS.ACCOUNTS.CREATE_ENTRY), validateBody(CreateAccountEntrySchema), controller.createEntry);
router.post('/entries/:entryId/settle', requirePermission(PERMISSIONS.ACCOUNTS.SETTLE), controller.settleEntry);

export default router;

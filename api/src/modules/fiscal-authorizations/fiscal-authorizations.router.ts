import { Router } from 'express';
import * as controller from './fiscal-authorizations.controller';
import { requirePermission } from '../../middlewares/permissions';
import { PERMISSIONS } from '../permissions/permissions.constants';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.FISCAL.VIEW_AUTHORIZATIONS), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.FISCAL.VIEW_AUTHORIZATIONS), controller.getById);
router.post('/request-cae/:invoiceId', requirePermission(PERMISSIONS.INVOICES.REQUEST_CAE), controller.requestCae);

export default router;

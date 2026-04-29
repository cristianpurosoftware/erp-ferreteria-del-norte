import { Router } from 'express';
import * as controller from './supplier-claims.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateSupplierClaimSchema, UpdateSupplierClaimSchema } from './supplier-claims.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.CREATE), validateBody(CreateSupplierClaimSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.CREATE), validateBody(UpdateSupplierClaimSchema), controller.update);
router.post('/:id/send', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.SEND), controller.send);
router.post('/:id/acknowledge', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.RESOLVE), controller.acknowledge);
router.post('/:id/credit-received', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.RESOLVE), controller.creditReceived);
router.post('/:id/resolve', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.RESOLVE), controller.resolve);
router.post('/:id/reject', requirePermission(PERMISSIONS.SUPPLIER_CLAIMS.REJECT), controller.reject);

export default router;

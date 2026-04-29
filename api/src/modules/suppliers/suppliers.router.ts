import { Router } from 'express';
import * as controller from './suppliers.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateSupplierSchema, UpdateSupplierSchema } from './suppliers.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.SUPPLIERS.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.SUPPLIERS.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.SUPPLIERS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.SUPPLIERS.CREATE), validateBody(CreateSupplierSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.SUPPLIERS.UPDATE), validateBody(UpdateSupplierSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.SUPPLIERS.DELETE), controller.remove);

export default router;

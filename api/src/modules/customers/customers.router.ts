import { Router } from 'express';
import * as controller from './customers.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateCustomerSchema, UpdateCustomerSchema } from './customers.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.CUSTOMERS.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.CUSTOMERS.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.CUSTOMERS.CREATE), validateBody(CreateCustomerSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.CUSTOMERS.UPDATE), validateBody(UpdateCustomerSchema), controller.update);
router.post('/:id/activate', requirePermission(PERMISSIONS.CUSTOMERS.UPDATE), controller.activate);
router.post('/:id/block', requirePermission(PERMISSIONS.CUSTOMERS.BLOCK), controller.block);
router.post('/:id/unblock', requirePermission(PERMISSIONS.CUSTOMERS.UNBLOCK), controller.unblock);
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMERS.DELETE), controller.remove);

export default router;

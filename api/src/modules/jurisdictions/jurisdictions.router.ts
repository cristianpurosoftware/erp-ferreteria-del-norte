import { Router } from 'express';
import * as controller from './jurisdictions.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateJurisdictionSchema, UpdateJurisdictionSchema, AddCustomerJurisdictionSchema } from './jurisdictions.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.JURISDICTIONS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.JURISDICTIONS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.JURISDICTIONS.CREATE), validateBody(CreateJurisdictionSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.JURISDICTIONS.UPDATE), validateBody(UpdateJurisdictionSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.JURISDICTIONS.DELETE), controller.remove);

// customer nested
router.get('/customers/:customerId', requirePermission(PERMISSIONS.JURISDICTIONS.VIEW), controller.getByCustomer);
router.post('/customers/:customerId', requirePermission(PERMISSIONS.JURISDICTIONS.UPDATE), validateBody(AddCustomerJurisdictionSchema), controller.addForCustomer);
router.delete('/customers/:customerId/:id', requirePermission(PERMISSIONS.JURISDICTIONS.UPDATE), controller.removeForCustomer);

export default router;

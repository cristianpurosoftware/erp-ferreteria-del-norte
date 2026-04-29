import { Router } from 'express';
import * as controller from './routes.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateCustomerVisitSchema } from './routes.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.CUSTOMER_VISITS.VIEW), controller.getCustomerVisits);
router.post('/', requirePermission(PERMISSIONS.CUSTOMER_VISITS.CREATE), validateBody(CreateCustomerVisitSchema), controller.createCustomerVisit);

export default router;

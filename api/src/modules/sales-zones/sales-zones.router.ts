import { Router } from 'express';
import * as controller from './sales-zones.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateSalesZoneSchema, UpdateSalesZoneSchema } from './sales-zones.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.SALES_ZONES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.SALES_ZONES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.SALES_ZONES.CREATE), validateBody(CreateSalesZoneSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.SALES_ZONES.UPDATE), validateBody(UpdateSalesZoneSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.SALES_ZONES.DELETE), controller.remove);

export default router;

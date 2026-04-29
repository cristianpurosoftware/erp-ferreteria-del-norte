import { Router } from 'express';
import * as controller from './pos.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePosSaleSchema } from './pos.schema';

const router = Router();

// /pos/today must come before /pos/:id to avoid ":id" swallowing the literal
router.get('/today', requirePermission(PERMISSIONS.POS.READ), controller.listToday);
router.get('/:id', requirePermission(PERMISSIONS.POS.READ), controller.getById);
router.post('/', requirePermission(PERMISSIONS.POS.CREATE), validateBody(CreatePosSaleSchema), controller.createSale);
router.post('/:id/void', requirePermission(PERMISSIONS.POS.VOID), controller.voidSale);

export default router;

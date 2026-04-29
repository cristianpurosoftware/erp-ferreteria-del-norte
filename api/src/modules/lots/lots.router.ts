import { Router } from 'express';
import * as controller from './lots.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateLotSchema } from './lots.schema';

const router = Router();

router.get('/expiring', requirePermission(PERMISSIONS.LOTS.VIEW), controller.expiring);
router.get('/stock-by-lot', requirePermission(PERMISSIONS.LOTS.VIEW), controller.stockByLot);
router.post('/expire-job', requirePermission(PERMISSIONS.LOTS.UPDATE), controller.runExpireJob);
router.get('/summary', requirePermission(PERMISSIONS.LOTS.VIEW), controller.getSummary);
router.get('/', requirePermission(PERMISSIONS.LOTS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.LOTS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.LOTS.CREATE), validateBody(CreateLotSchema), controller.create);
router.post('/:id/block', requirePermission(PERMISSIONS.LOTS.BLOCK), controller.block);
router.post('/:id/unblock', requirePermission(PERMISSIONS.LOTS.UNBLOCK), controller.unblock);

export default router;

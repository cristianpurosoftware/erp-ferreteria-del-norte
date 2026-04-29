import { Router } from 'express';
import * as controller from './purchases.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePurchaseOrderSchema, UpdatePurchaseOrderSchema, CreateReceptionSchema } from './purchases.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PURCHASES.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.PURCHASES.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.PURCHASES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PURCHASES.CREATE), validateBody(CreatePurchaseOrderSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.PURCHASES.UPDATE), validateBody(UpdatePurchaseOrderSchema), controller.update);
router.post('/:id/approve', requirePermission(PERMISSIONS.PURCHASES.APPROVE), controller.approve);
router.post('/:id/send', requirePermission(PERMISSIONS.PURCHASES.SEND), controller.send);
router.post('/:id/receive', requirePermission(PERMISSIONS.PURCHASES.RECEIVE), controller.receive);
router.post('/:id/cancel', requirePermission(PERMISSIONS.PURCHASES.CANCEL), controller.cancel);
router.post('/:id/receptions', requirePermission(PERMISSIONS.PURCHASES.RECEIVE), validateBody(CreateReceptionSchema), controller.createReception);

export default router;

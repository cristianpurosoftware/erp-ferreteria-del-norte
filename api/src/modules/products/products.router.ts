import { Router } from 'express';
import * as controller from './products.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateProductSchema, UpdateProductSchema } from './products.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PRODUCTS.VIEW), controller.getAll);
router.get('/by-sku/:sku', requirePermission(PERMISSIONS.PRODUCTS.VIEW), controller.getBySku);
router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PRODUCTS.CREATE), validateBody(CreateProductSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS.UPDATE), validateBody(UpdateProductSchema), controller.update);
router.post('/:id/activate', requirePermission(PERMISSIONS.PRODUCTS.UPDATE), controller.activate);
router.post('/:id/discontinue', requirePermission(PERMISSIONS.PRODUCTS.DISCONTINUE), controller.discontinue);
router.get('/:id/prices', requirePermission(PERMISSIONS.PRODUCTS.VIEW), controller.getPrices);
router.get('/:id/orders', requirePermission(PERMISSIONS.PRODUCTS.VIEW), controller.getOrders);
router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS.DELETE), controller.remove);

export default router;

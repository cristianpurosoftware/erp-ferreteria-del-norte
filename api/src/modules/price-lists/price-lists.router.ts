import { Router } from 'express';
import * as controller from './price-lists.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePriceListSchema, UpdatePriceListSchema, AddPriceListItemSchema } from './price-lists.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.PRICE_LISTS.VIEW), controller.getAll);
router.get('/summary', requirePermission(PERMISSIONS.PRICE_LISTS.VIEW), controller.getSummary);
router.get('/:id', requirePermission(PERMISSIONS.PRICE_LISTS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PRICE_LISTS.CREATE), validateBody(CreatePriceListSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.PRICE_LISTS.UPDATE), validateBody(UpdatePriceListSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.PRICE_LISTS.DELETE), controller.remove);

// Price list items
router.post('/:id/items', requirePermission(PERMISSIONS.PRICE_LISTS.UPDATE), validateBody(AddPriceListItemSchema), controller.addItem);
router.delete('/:id/items/:itemId', requirePermission(PERMISSIONS.PRICE_LISTS.UPDATE), controller.removeItem);

export default router;

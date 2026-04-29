import { Router } from 'express';
import * as controller from './promotions.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreatePromotionSchema, UpdatePromotionSchema, AddPromotionItemSchema } from './promotions.schema';

const router = Router();

router.get('/active', requirePermission(PERMISSIONS.PROMOTIONS.VIEW), controller.getActive);
router.get('/', requirePermission(PERMISSIONS.PROMOTIONS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.PROMOTIONS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.PROMOTIONS.CREATE), validateBody(CreatePromotionSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.PROMOTIONS.UPDATE), validateBody(UpdatePromotionSchema), controller.update);
router.post('/:id/activate', requirePermission(PERMISSIONS.PROMOTIONS.ACTIVATE), controller.activate);
router.post('/:id/expire', requirePermission(PERMISSIONS.PROMOTIONS.UPDATE), controller.expire);
router.post('/:id/cancel', requirePermission(PERMISSIONS.PROMOTIONS.UPDATE), controller.cancel);
router.post('/:id/items', requirePermission(PERMISSIONS.PROMOTIONS.UPDATE), validateBody(AddPromotionItemSchema), controller.addItem);
router.delete('/:id/items/:itemId', requirePermission(PERMISSIONS.PROMOTIONS.UPDATE), controller.removeItem);

export default router;

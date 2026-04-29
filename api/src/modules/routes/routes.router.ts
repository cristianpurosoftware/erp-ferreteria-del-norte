import { Router } from 'express';
import * as controller from './routes.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateRouteSchema, UpdateRouteSchema, AddRouteVisitSchema } from './routes.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.ROUTES.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.ROUTES.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.ROUTES.CREATE), validateBody(CreateRouteSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.ROUTES.UPDATE), validateBody(UpdateRouteSchema), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.ROUTES.DELETE), controller.remove);

router.get('/:id/visits', requirePermission(PERMISSIONS.ROUTES.VIEW), controller.listVisits);
router.post('/:id/visits', requirePermission(PERMISSIONS.ROUTES.ASSIGN), validateBody(AddRouteVisitSchema), controller.addVisit);
router.delete('/:id/visits/:visitId', requirePermission(PERMISSIONS.ROUTES.ASSIGN), controller.removeVisit);

export default router;
